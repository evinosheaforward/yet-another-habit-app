import type { TodoItem } from "@yet-another-habit-app/shared-types";
import { db } from "./knex.js";
import { randomUUID } from "crypto";

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
