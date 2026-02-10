import type { Activity, ActivityHistoryEntry, ActivityPeriod } from "@yet-another-habit-app/shared-types";
import { db } from "./knex.js";
import { randomUUID } from "crypto";

/**
 * Compute the UTC start date (YYYY-MM-DD) for the current period window.
 */
export function computePeriodStart(
  period: string,
  now: Date = new Date()
): string {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();

  const normalized = period.toLowerCase();
  if (normalized === "daily") {
    return fmtDate(y, m, d);
  }
  if (normalized === "weekly") {
    // ISO 8601: Monday = 1, Sunday = 7
    const day = now.getUTCDay(); // 0=Sun, 1=Mon, ...
    const diff = day === 0 ? 6 : day - 1; // days since Monday
    const mon = new Date(Date.UTC(y, m, d - diff));
    return fmtDate(
      mon.getUTCFullYear(),
      mon.getUTCMonth(),
      mon.getUTCDate()
    );
  }
  // monthly
  return fmtDate(y, m, 1);
}

function fmtDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export async function getActivitiesForUser(
  userId: string,
  period: ActivityPeriod
): Promise<Activity[]> {
  const startDate = computePeriodStart(period);

  const rows = await db("activities")
    .leftJoin("activities_history", function () {
      this.on("activities.id", "=", "activities_history.activity_id").andOn(
        "activities_history.start_date",
        "=",
        db.raw("?", [startDate])
      );
    })
    .select([
      "activities.id",
      "activities.title",
      "activities.description",
      "activities.goal_count",
      "activities.period",
      db.raw("COALESCE(activities_history.count, 0) as count"),
    ])
    .where({ "activities.user_id": userId, "activities.period": period })
    .orderBy("activities.title", "asc");

  return rows.map(
    (r: {
      id: string;
      title: string;
      description: string;
      goal_count: number;
      period: ActivityPeriod;
      count: number;
    }) => {
      const goalCount = Number(r.goal_count);
      const count = Number(r.count);
      const completionPercent = goalCount > 0 ? Math.min(100, Math.round((count / goalCount) * 100)) : 0;
      return {
        id: r.id,
        title: r.title,
        description: r.description,
        goalCount,
        count,
        completionPercent,
        period: r.period,
      };
    }
  );
}

export async function createActivityForUser(
  userId: string,
  input: {
    title: string;
    description: string | null;
    period: ActivityPeriod;
    goalCount: number;
  }
): Promise<Activity> {
  const id = randomUUID();

  await db("activities").insert({
    id,
    user_id: userId,
    title: input.title,
    description: input.description,
    goal_count: input.goalCount,
    period: input.period,
  });

  const row = await db("activities")
    .select(["id", "title", "description", "goal_count", "period"])
    .where({ id, user_id: userId })
    .first();

  if (!row) {
    throw new Error("Insert succeeded but activity could not be loaded");
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    goalCount: Number(row.goal_count),
    count: 0,
    completionPercent: 0,
    period: row.period,
  };
}

export async function updateActivityCount(
  activityId: string,
  userId: string,
  period: string,
  delta: number
): Promise<number> {
  const startDate = computePeriodStart(period);
  const id = randomUUID();

  // Verify the activity belongs to this user
  const activity = await db("activities")
    .where({ id: activityId, user_id: userId })
    .first();
  if (!activity) {
    throw new Error("Activity not found");
  }

  // SQLite-compatible upsert
  await db.raw(
    `INSERT INTO activities_history (id, activity_id, user_id, start_date, count, created_at, updated_at)
     VALUES (?, ?, ?, ?, MAX(0, ?), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(activity_id, start_date) DO UPDATE SET
       count = MAX(0, activities_history.count + ?),
       updated_at = CURRENT_TIMESTAMP`,
    [id, activityId, userId, startDate, delta, delta]
  );

  const row = await db("activities_history")
    .where({ activity_id: activityId, start_date: startDate })
    .first();

  return row ? Number(row.count) : 0;
}

const DEFAULT_LIMITS: Record<string, number> = {
  daily: 7,
  weekly: 8,
  monthly: 6,
};

export function generatePeriodStarts(
  period: string,
  count: number,
  now: Date = new Date()
): string[] {
  const normalized = period.toLowerCase();
  const dates: string[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const d = now.getUTCDate();

    if (normalized === "daily") {
      const dt = new Date(Date.UTC(y, m, d - i));
      dates.push(
        fmtDate(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())
      );
    } else if (normalized === "weekly") {
      const day = now.getUTCDay();
      const diff = day === 0 ? 6 : day - 1;
      const monday = new Date(Date.UTC(y, m, d - diff - i * 7));
      dates.push(
        fmtDate(
          monday.getUTCFullYear(),
          monday.getUTCMonth(),
          monday.getUTCDate()
        )
      );
    } else {
      // monthly
      const dt = new Date(Date.UTC(y, m - i, 1));
      dates.push(
        fmtDate(dt.getUTCFullYear(), dt.getUTCMonth(), 1)
      );
    }
  }

  return dates;
}

export async function getActivityHistory(
  activityId: string,
  userId: string,
  limit?: number
): Promise<{ period: string; history: ActivityHistoryEntry[] }> {
  const activity = await db("activities")
    .where({ id: activityId, user_id: userId })
    .first();

  if (!activity) {
    throw new Error("Activity not found");
  }

  const period = (activity.period as string).toLowerCase();
  const count = limit ?? DEFAULT_LIMITS[period] ?? 7;
  const dates = generatePeriodStarts(period, count);

  const rows = await db("activities_history")
    .select("start_date", "count")
    .where({ activity_id: activityId })
    .whereIn("start_date", dates);

  const countMap = new Map<string, number>();
  for (const row of rows) {
    countMap.set(row.start_date, Number(row.count));
  }

  const history: ActivityHistoryEntry[] = dates.map((startDate) => ({
    startDate,
    count: countMap.get(startDate) ?? 0,
  }));

  return { period, history };
}

export async function updateActivityForUser(
  activityId: string,
  userId: string,
  updates: { title?: string; description?: string; goalCount?: number }
): Promise<Activity | null> {
  const existing = await db("activities")
    .where({ id: activityId, user_id: userId })
    .first();

  if (!existing) return null;

  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.goalCount !== undefined) patch.goal_count = updates.goalCount;

  if (Object.keys(patch).length > 0) {
    await db("activities").where({ id: activityId, user_id: userId }).update(patch);
  }

  const startDate = computePeriodStart(existing.period);
  const row = await db("activities")
    .leftJoin("activities_history", function () {
      this.on("activities.id", "=", "activities_history.activity_id").andOn(
        "activities_history.start_date",
        "=",
        db.raw("?", [startDate])
      );
    })
    .select([
      "activities.id",
      "activities.title",
      "activities.description",
      "activities.goal_count",
      "activities.period",
      db.raw("COALESCE(activities_history.count, 0) as count"),
    ])
    .where({ "activities.id": activityId })
    .first();

  if (!row) return null;

  const goalCount = Number(row.goal_count);
  const count = Number(row.count);
  const completionPercent =
    goalCount > 0 ? Math.min(100, Math.round((count / goalCount) * 100)) : 0;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    goalCount,
    count,
    completionPercent,
    period: row.period,
  };
}
