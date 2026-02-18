import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import knexLib from "knex";
import path from "path";
import { __setTestDb } from "./knex.js";

// Create an in-memory SQLite database for testing
const testDb = knexLib({
  client: "sqlite3",
  connection: { filename: ":memory:" },
  useNullAsDefault: true,
  migrations: {
    directory: path.resolve(import.meta.dirname, "../../migrations"),
  },
});

// Swap the global db before any model code runs queries
__setTestDb(testDb);

// Now import model functions — they'll use the test db via the live ESM binding
const { populateTodoForToday } = await import("./todoItemsModel.js");
const { upsertUserConfig, setLastPopulatedDate } = await import("./userConfigsModel.js");
const { addDayConfig } = await import("./todoDayConfigsModel.js");

const USER = "test-user-1";

/** Insert a bare activity row and return its id. */
async function createActivity(
  id: string,
  title: string,
  opts: { task?: boolean } = {},
) {
  await testDb("activities").insert({
    id,
    user_id: USER,
    title,
    description: "",
    period: "daily",
    goal_count: 1,
    task: opts.task ? 1 : 0,
    archive_task: 0,
    archived: 0,
  });
  return id;
}

/** Insert a todo_item row directly. */
async function insertTodoItem(activityId: string, sortOrder: number) {
  const id = `todo-${activityId}-${sortOrder}`;
  await testDb("todo_items").insert({
    id,
    user_id: USER,
    activity_id: activityId,
    sort_order: sortOrder,
  });
  return id;
}

beforeAll(async () => {
  await testDb.migrate.latest();
});

beforeEach(async () => {
  // Clear user-specific data between tests
  await testDb("todo_items").where({ user_id: USER }).del();
  await testDb("todo_day_configs").where({ user_id: USER }).del();
  await testDb("activities").where({ user_id: USER }).del();
  await testDb("user_configs").where({ user_id: USER }).del();
});

afterAll(async () => {
  await testDb.destroy();
});

describe("populateTodoForToday", () => {
  describe("clear mode (clearTodoOnNewDay = true)", () => {
    it("wipes all existing items and inserts scheduled habits", async () => {
      // Set up: user with clear mode ON, yesterday's populated date
      await upsertUserConfig(USER, {
        dayEndOffsetMinutes: 0,
        clearTodoOnNewDay: true,
      });
      await setLastPopulatedDate(USER, "1999-01-01"); // force repopulation

      // Create activities and pre-existing todo items
      await createActivity("habit-a", "Meditate");
      await createActivity("task-b", "Buy groceries", { task: true });
      await insertTodoItem("habit-a", 0);
      await insertTodoItem("task-b", 1);

      // Schedule habit-a for today's day of week
      const now = new Date();
      const dayOfWeek = now.getUTCDay();
      await addDayConfig(USER, dayOfWeek, "habit-a");

      // Act
      const items = await populateTodoForToday(USER);

      // Assert: only the scheduled habit should remain
      expect(items).toHaveLength(1);
      expect(items[0].activityId).toBe("habit-a");
    });
  });

  describe("keep mode (clearTodoOnNewDay = false)", () => {
    it("preserves all existing items including habits", async () => {
      await upsertUserConfig(USER, {
        dayEndOffsetMinutes: 0,
        clearTodoOnNewDay: false,
      });
      await setLastPopulatedDate(USER, "1999-01-01");

      await createActivity("habit-a", "Meditate");
      await createActivity("task-b", "Buy groceries", { task: true });
      await insertTodoItem("habit-a", 0);
      await insertTodoItem("task-b", 1);

      // No scheduled habits for today
      const items = await populateTodoForToday(USER);

      // Both the habit AND the task should still be present
      expect(items).toHaveLength(2);
      const ids = items.map((i) => i.activityId);
      expect(ids).toContain("habit-a");
      expect(ids).toContain("task-b");
    });

    it("appends new scheduled habits that are not already on the list", async () => {
      await upsertUserConfig(USER, {
        dayEndOffsetMinutes: 0,
        clearTodoOnNewDay: false,
      });
      await setLastPopulatedDate(USER, "1999-01-01");

      await createActivity("habit-a", "Meditate");
      await createActivity("habit-b", "Exercise");
      await createActivity("task-c", "Buy groceries", { task: true });
      await insertTodoItem("task-c", 0);

      // Schedule both habits for today
      const now = new Date();
      const dayOfWeek = now.getUTCDay();
      await addDayConfig(USER, dayOfWeek, "habit-a");
      await addDayConfig(USER, dayOfWeek, "habit-b");

      const items = await populateTodoForToday(USER);

      // Task preserved + two scheduled habits appended
      expect(items).toHaveLength(3);
      expect(items[0].activityId).toBe("task-c");
      expect(items[1].activityId).toBe("habit-a");
      expect(items[2].activityId).toBe("habit-b");
    });

    it("does not duplicate a scheduled habit already on the list", async () => {
      await upsertUserConfig(USER, {
        dayEndOffsetMinutes: 0,
        clearTodoOnNewDay: false,
      });
      await setLastPopulatedDate(USER, "1999-01-01");

      await createActivity("habit-a", "Meditate");
      await insertTodoItem("habit-a", 0);

      // Schedule habit-a for today (but it's already on the list)
      const now = new Date();
      const dayOfWeek = now.getUTCDay();
      await addDayConfig(USER, dayOfWeek, "habit-a");

      const items = await populateTodoForToday(USER);

      // Should NOT have a duplicate
      expect(items).toHaveLength(1);
      expect(items[0].activityId).toBe("habit-a");
    });

    it("preserves the sort order of existing items", async () => {
      await upsertUserConfig(USER, {
        dayEndOffsetMinutes: 0,
        clearTodoOnNewDay: false,
      });
      await setLastPopulatedDate(USER, "1999-01-01");

      await createActivity("habit-a", "Meditate");
      await createActivity("task-b", "Buy groceries", { task: true });
      await createActivity("habit-c", "Read");
      await insertTodoItem("habit-a", 0);
      await insertTodoItem("task-b", 1);
      await insertTodoItem("habit-c", 2);

      // Schedule a new habit
      await createActivity("habit-d", "Stretch");
      const now = new Date();
      const dayOfWeek = now.getUTCDay();
      await addDayConfig(USER, dayOfWeek, "habit-d");

      const items = await populateTodoForToday(USER);

      expect(items).toHaveLength(4);
      expect(items.map((i) => i.activityId)).toEqual([
        "habit-a",
        "task-b",
        "habit-c",
        "habit-d",
      ]);
    });
  });

  describe("same-day guard", () => {
    it("returns existing items without modification when already populated today", async () => {
      await upsertUserConfig(USER, {
        dayEndOffsetMinutes: 0,
        clearTodoOnNewDay: true, // clear mode, but should not run
      });

      await createActivity("habit-a", "Meditate");
      await createActivity("task-b", "Buy groceries", { task: true });
      await insertTodoItem("habit-a", 0);
      await insertTodoItem("task-b", 1);

      // Set lastPopulated to today so the guard kicks in
      const { computePeriodStart } = await import("./activitiesModel.js");
      const today = computePeriodStart("daily", new Date(), 0);
      await setLastPopulatedDate(USER, today);

      const items = await populateTodoForToday(USER);

      // Both items should remain untouched even though clear mode is on
      expect(items).toHaveLength(2);
    });
  });
});
