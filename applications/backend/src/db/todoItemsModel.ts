import type { TodoItem } from "@yet-another-habit-app/shared-types";
import { db } from "./knex.js";
import { randomUUID } from "crypto";
import { computePeriodStart } from "./activitiesModel.js";
import { getUserConfig, getLastPopulatedDate, setLastPopulatedDate } from "./userConfigsModel.js";
import { getDayConfigs } from "./todoDayConfigsModel.js";
import { getDateConfigs, removeDateConfigsForDate } from "./todoDateConfigsModel.js";

export async function getTodoItemsForUser(userId: string): Promise<TodoItem[]> {
  const rows = await db("todo_items")
    .join("activities", "todo_items.activity_id", "activities.id")
    .select([
      "todo_items.id",
      "todo_items.activity_id",
      "activities.title as activity_title",
      "activities.period as activity_period",
      "activities.task as activity_task",
      "activities.archive_task as activity_archive_task",
      "todo_items.sort_order",
    ])
    .where({ "todo_items.user_id": userId })
    .orderBy("todo_items.sort_order", "asc");

  return rows.map(
    (r: {
      id: string;
      activity_id: string;
      activity_title: string;
      activity_period: string;
      activity_task: boolean | number;
      activity_archive_task: boolean | number;
      sort_order: number;
    }) => ({
      id: r.id,
      activityId: r.activity_id,
      activityTitle: r.activity_title,
      activityPeriod: r.activity_period as TodoItem["activityPeriod"],
      activityTask: !!r.activity_task,
      activityArchiveTask: !!r.activity_archive_task,
      sortOrder: r.sort_order,
    }),
  );
}

export async function addTodoItem(userId: string, activityId: string): Promise<TodoItem> {
  // Verify activity belongs to user and is not archived
  const activity = await db("activities")
    .where({ id: activityId, user_id: userId, archived: false })
    .first();

  if (!activity) {
    throw new Error("Activity not found or is archived");
  }

  const maxRow = await db("todo_items")
    .where({ user_id: userId })
    .max("sort_order as maxOrder")
    .first();

  const sortOrder = (maxRow?.maxOrder ?? -1) + 1;
  const id = randomUUID();

  await db("todo_items").insert({
    id,
    user_id: userId,
    activity_id: activityId,
    sort_order: sortOrder,
  });

  return {
    id,
    activityId,
    activityTitle: activity.title,
    activityPeriod: activity.period,
    activityTask: !!activity.task,
    activityArchiveTask: !!activity.archive_task,
    sortOrder,
  };
}

export async function removeTodoItem(todoItemId: string, userId: string): Promise<boolean> {
  const deleted = await db("todo_items")
    .where({ id: todoItemId, user_id: userId })
    .del();

  return deleted > 0;
}

export async function reorderTodoItems(userId: string, orderedIds: string[]): Promise<void> {
  // Verify all IDs belong to user
  const rows = await db("todo_items")
    .where({ user_id: userId })
    .whereIn("id", orderedIds)
    .select("id");

  if (rows.length !== orderedIds.length) {
    throw new Error("Some todo items not found or do not belong to user");
  }

  await db.transaction(async (trx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await trx("todo_items")
        .where({ id: orderedIds[i], user_id: userId })
        .update({ sort_order: i });
    }
  });
}

export async function removeTodoItemsByActivityId(activityId: string): Promise<void> {
  await db("todo_items").where({ activity_id: activityId }).del();
}

export async function populateTodoForToday(userId: string): Promise<TodoItem[]> {
  const config = await getUserConfig(userId);
  const now = new Date();
  const today = computePeriodStart("daily", now, config.dayEndOffsetMinutes);
  const lastPopulated = await getLastPopulatedDate(userId);

  if (lastPopulated === today) {
    return getTodoItemsForUser(userId);
  }

  // Compute adjusted day of week
  const adjustedNow = new Date(now.getTime() - config.dayEndOffsetMinutes * 60_000);
  const dayOfWeek = adjustedNow.getUTCDay(); // 0=Sun .. 6=Sat

  const dayConfigs = await getDayConfigs(userId, dayOfWeek);
  const dateConfigs = await getDateConfigs(userId, today);

  // Merge both sources into a unified list of activity IDs
  const allConfigs = [
    ...dayConfigs.map((c) => ({ activityId: c.activityId, activityTask: c.activityTask })),
    ...dateConfigs.map((c) => ({ activityId: c.activityId, activityTask: c.activityTask })),
  ];

  if (config.clearTodoOnNewDay) {
    // Clear mode: wipe everything, insert from schedule
    await db("todo_items").where({ user_id: userId }).del();

    for (let i = 0; i < allConfigs.length; i++) {
      await db("todo_items").insert({
        id: randomUUID(),
        user_id: userId,
        activity_id: allConfigs[i].activityId,
        sort_order: i,
      });
    }
  } else {
    // Keep mode: preserve ALL existing items, only append new scheduled items
    const currentItems = await db("todo_items")
      .where({ user_id: userId })
      .select("activity_id");

    const existingActivityIds = new Set(
      currentItems.map((item: { activity_id: string }) => item.activity_id),
    );

    const maxRow = await db("todo_items")
      .where({ user_id: userId })
      .max("sort_order as maxOrder")
      .first();

    let nextOrder = (maxRow?.maxOrder ?? -1) + 1;

    for (const cfg of allConfigs) {
      if (!existingActivityIds.has(cfg.activityId)) {
        await db("todo_items").insert({
          id: randomUUID(),
          user_id: userId,
          activity_id: cfg.activityId,
          sort_order: nextOrder++,
        });
      }
    }
  }

  // One-shot cleanup: date configs are always one-shot
  await removeDateConfigsForDate(userId, today);

  // Day configs for tasks are one-shot — remove them after population
  const taskDayConfigs = dayConfigs.filter((c) => c.activityTask);
  if (taskDayConfigs.length > 0) {
    await db("todo_day_configs")
      .whereIn(
        "id",
        taskDayConfigs.map((c) => c.id),
      )
      .del();
  }

  await setLastPopulatedDate(userId, today);
  return getTodoItemsForUser(userId);
}
