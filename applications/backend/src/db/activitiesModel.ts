import type { Activity, ActivityPeriod } from "@yet-another-habit-app/shared-types";
import { db } from "./knex.js";
import { randomUUID } from "crypto";

export async function getActivitiesForUser(
  userId: string,
  period: ActivityPeriod
): Promise<Activity[]> {
  const rows = await db("activities")
    .select(["id", "title", "description", "completion_percent", "period"])
    .where({ user_id: userId, period }) // <-- uses idx_activities_user_period
    .orderBy("title", "asc");

  return rows.map((r: Activity) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    completionPercent: Number(r.completionPercent),
    period: r.period,
  }));
}

export async function createActivityForUser(
  userId: string,
  input: { title: string; description: string | null; period: ActivityPeriod }
): Promise<Activity> {
  const id = randomUUID();

  // Insert
  await db("activities").insert({
    id,
    user_id: userId,
    title: input.title,
    description: input.description,
    completion_percent: 0,
    period: input.period,
  });

  // Fetch the row back (works everywhere, avoids sqlite RETURNING quirks)
  const row = await db("activities")
    .select(["id", "title", "description", "completion_percent", "period"])
    .where({ id, user_id: userId })
    .first();

  if (!row) {
    throw new Error("Insert succeeded but activity could not be loaded");
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    completionPercent: Number(row.completion_percent),
    period: row.period,
  };
}

