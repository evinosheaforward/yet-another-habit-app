import type { Request, Response } from "express";
import { Router } from "express";
import type { ActivityPeriod } from "@yet-another-habit-app/shared-types";
import { createActivityForUser, getActivitiesForUser } from "../db/activitiesModel";

const router = Router();

function isActivityPeriod(v: unknown): v is ActivityPeriod {
  return v === "daily" || v === "weekly" || v === "monthly";
}

router.get("/activities", async (req: Request, res: Response) => {
  const { userId, period } = req.query;

  if (typeof userId !== "string" || userId.length === 0) {
    return res.status(400).json({ error: "userId is required" });
  }
  if (!isActivityPeriod(period)) {
    return res.status(400).json({ error: "period must be daily|weekly|monthly" });
  }

  // Security guard: only allow the authenticated user to query their own activities
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: "Not authenticated" });
  if (userId !== authedUid) return res.status(403).json({ error: "Cannot query another user" });

  const activities = await getActivitiesForUser(userId, period);
  return res.json({ activities });
});

router.post("/activities", async (req: Request, res: Response) => {
  // Auth required
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: "Not authenticated" });

  const { title, description, period } = req.body ?? {};

  if (typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ error: "title is required" });
  }

  if (description != null && typeof description !== "string") {
    return res.status(400).json({ error: "description must be a string" });
  }

  if (!isActivityPeriod(period)) {
    return res.status(400).json({ error: "period must be daily|weekly|monthly" });
  }

  const activity = await createActivityForUser(authedUid, {
    title: title.trim(),
    description: description?.trim() || null,
    period,
  });

  return res.status(201).json({ activity });
});


export default router;
