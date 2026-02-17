import type { Request, Response } from "express";
import { Router } from "express";
import {
  getTodoItemsForUser,
  addTodoItem,
  removeTodoItem,
  reorderTodoItems,
} from "../db/todoItemsModel";

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

router.delete("/todo-items/:id", async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: "Not authenticated" });

  const deleted = await removeTodoItem(req.params.id, authedUid);
  if (!deleted) {
    return res.status(404).json({ error: "Todo item not found" });
  }

  return res.json({ success: true });
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

export default router;
