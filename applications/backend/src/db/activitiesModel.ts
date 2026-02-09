import type { Activity, ActivityPeriod } from "@yet-another-habit-app/shared-types";
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
