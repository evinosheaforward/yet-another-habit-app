import type { Request, Response } from "express";
import { Router } from "express";
import {
  getTodoItemsForUser,
  addTodoItem,
  removeTodoItem,
  reorderTodoItems,
  populateTodoForToday,
} from "../db/todoItemsModel";
import {
  getDayConfigs,
  addDayConfig,
  removeDayConfig,
  reorderDayConfigs,
} from "../db/todoDayConfigsModel";
import {
  getDateConfigs,
  addDateConfig,
  removeDateConfig,
  reorderDateConfigs,
  getScheduledDates,
} from "../db/todoDateConfigsModel";
import { checkTodoAchievements } from "../db/achievementsModel";
import { computePeriodStart } from "../db/activitiesModel";
import { getUserConfig } from "../db/userConfigsModel";
import { db } from "../db/knex.js";

const router = Router();

router.get("/todo-items", async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: "Not authenticated" });

  const todoItems = await getTodoItemsForUser(authedUid);
  return res.json({ todoItems });
});

router.post("/todo-items", async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: "Not authenticated" });

  const { activityId } = req.body ?? {};
  if (typeof activityId !== "string" || activityId.length === 0) {
    return res.status(400).json({ error: "activityId is required" });
  }

  try {
    const todoItem = await addTodoItem(authedUid, activityId);
    return res.status(201).json({ todoItem });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add todo item";
    return res.status(400).json({ error: message });
  }
});

// Populate must be before DELETE /todo-items/:id to avoid "populate" matching as :id
router.post("/todo-items/populate", async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: "Not authenticated" });

  try {
    const todoItems = await populateTodoForToday(authedUid);
    return res.json({ todoItems });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to populate todo";
    return res.status(500).json({ error: message });
  }
});

router.put("/todo-items/reorder", async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: "Not authenticated" });

  const { orderedIds } = req.body ?? {};
  if (!Array.isArray(orderedIds) || orderedIds.some((id: unknown) => typeof id !== "string")) {
    return res.status(400).json({ error: "orderedIds must be an array of strings" });
  }

  try {
    await reorderTodoItems(authedUid, orderedIds);
    return res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reorder";
    return res.status(400).json({ error: message });
  }
});

router.delete("/todo-items/:id", async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: "Not authenticated" });

  const deleted = await removeTodoItem(req.params.id, authedUid);
  if (!deleted) {
    return res.status(404).json({ error: "Todo item not found" });
  }

  // Check if todo list is now empty → trigger todo achievements
  let completedAchievements: { id: string; title: string; reward: string }[] = [];
  const remaining = await db("todo_items").where({ user_id: authedUid }).count("* as cnt").first();
  if (remaining && Number(remaining.cnt) === 0) {
    const { dayEndOffsetMinutes } = await getUserConfig(authedUid);
    const today = computePeriodStart("daily", new Date(), dayEndOffsetMinutes);
    completedAchievements = await checkTodoAchievements(authedUid, today);
  }

  return res.json({ success: true, completedAchievements });
});

// --- Day config routes ---

router.get("/todo-day-configs", async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: "Not authenticated" });

  const dayOfWeek = Number(req.query.dayOfWeek);
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return res.status(400).json({ error: "dayOfWeek must be an integer 0-6" });
  }

  const configs = await getDayConfigs(authedUid, dayOfWeek);
  return res.json({ configs });
});

router.post("/todo-day-configs", async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: "Not authenticated" });

  const { dayOfWeek, activityId } = req.body ?? {};
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return res.status(400).json({ error: "dayOfWeek must be an integer 0-6" });
  }
  if (typeof activityId !== "string" || activityId.length === 0) {
    return res.status(400).json({ error: "activityId is required" });
  }

  try {
    const config = await addDayConfig(authedUid, dayOfWeek, activityId);
    return res.status(201).json({ config });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add day config";
    return res.status(400).json({ error: message });
  }
});

router.delete("/todo-day-configs/:id", async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: "Not authenticated" });

  const deleted = await removeDayConfig(req.params.id, authedUid);
  if (!deleted) {
    return res.status(404).json({ error: "Day config not found" });
  }

  return res.json({ success: true });
});

router.put("/todo-day-configs/reorder", async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: "Not authenticated" });

  const { dayOfWeek, orderedIds } = req.body ?? {};
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return res.status(400).json({ error: "dayOfWeek must be an integer 0-6" });
  }
  if (!Array.isArray(orderedIds) || orderedIds.some((id: unknown) => typeof id !== "string")) {
    return res.status(400).json({ error: "orderedIds must be an array of strings" });
  }

  try {
    await reorderDayConfigs(authedUid, dayOfWeek, orderedIds);
    return res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reorder";
    return res.status(400).json({ error: message });
  }
});

// --- Date config routes ---

router.get("/todo-date-configs", async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: "Not authenticated" });

  const date = req.query.date as string | undefined;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  }

  const configs = await getDateConfigs(authedUid, date);
  return res.json({ configs });
});

router.post("/todo-date-configs", async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: "Not authenticated" });

  const { date, activityId } = req.body ?? {};
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  }
  if (typeof activityId !== "string" || activityId.length === 0) {
    return res.status(400).json({ error: "activityId is required" });
  }

  try {
    const config = await addDateConfig(authedUid, date, activityId);
    return res.status(201).json({ config });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add date config";
    return res.status(400).json({ error: message });
  }
});

router.get("/todo-date-configs/dates", async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: "Not authenticated" });

  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: "year and month (1-12) are required" });
  }

  const dates = await getScheduledDates(authedUid, year, month);
  return res.json({ dates });
});

router.put("/todo-date-configs/reorder", async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: "Not authenticated" });

  const { date, orderedIds } = req.body ?? {};
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  }
  if (!Array.isArray(orderedIds) || orderedIds.some((id: unknown) => typeof id !== "string")) {
    return res.status(400).json({ error: "orderedIds must be an array of strings" });
  }

  try {
    await reorderDateConfigs(authedUid, date, orderedIds);
    return res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reorder";
    return res.status(400).json({ error: message });
  }
});

router.delete("/todo-date-configs/:id", async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: "Not authenticated" });

  const deleted = await removeDateConfig(req.params.id, authedUid);
  if (!deleted) {
    return res.status(404).json({ error: "Date config not found" });
  }

  return res.json({ success: true });
});

export default router;
