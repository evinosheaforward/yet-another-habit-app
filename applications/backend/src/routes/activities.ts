import type { Request, Response } from 'express';
import { Router } from 'express';
import type { ActivityPeriod } from '@yet-another-habit-app/shared-types';
import {
  createActivityForUser,
  getActivitiesForUser,
  updateActivityCount,
  updateActivityForUser,
} from '../db/activitiesModel';
import { db } from '../db/knex.js';

const router = Router();

function isActivityPeriod(v: unknown): v is ActivityPeriod {
  return v === 'daily' || v === 'weekly' || v === 'monthly';
}

router.get('/activities', async (req: Request, res: Response) => {
  const { userId, period } = req.query;

  if (typeof userId !== 'string' || userId.length === 0) {
    return res.status(400).json({ error: 'userId is required' });
  }
  if (!isActivityPeriod(period)) {
    return res.status(400).json({ error: 'period must be daily|weekly|monthly' });
  }

  // Security guard: only allow the authenticated user to query their own activities
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: 'Not authenticated' });
  if (userId !== authedUid) return res.status(403).json({ error: 'Cannot query another user' });

  const activities = await getActivitiesForUser(userId, period);
  return res.json({ activities });
});

router.post('/activities', async (req: Request, res: Response) => {
  // Auth required
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: 'Not authenticated' });

  const { title, description, period, goalCount } = req.body ?? {};

  if (typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'title is required' });
  }

  if (description != null && typeof description !== 'string') {
    return res.status(400).json({ error: 'description must be a string' });
  }

  if (!isActivityPeriod(period)) {
    return res.status(400).json({ error: 'period must be daily|weekly|monthly' });
  }

  const parsedGoalCount = goalCount != null ? Math.floor(Number(goalCount)) : 1;
  if (!Number.isFinite(parsedGoalCount) || parsedGoalCount < 1) {
    return res.status(400).json({ error: 'goalCount must be a positive integer' });
  }

  const activity = await createActivityForUser(authedUid, {
    title: title.trim(),
    description: description?.trim() || '',
    period,
    goalCount: parsedGoalCount,
  });

  return res.status(201).json({ activity });
});

router.put('/activities/:activityId', async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: 'Not authenticated' });

  const { activityId } = req.params;
  const { title, description, goalCount } = req.body ?? {};

  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
    return res.status(400).json({ error: 'title must be a non-empty string' });
  }
  if (description !== undefined && typeof description !== 'string') {
    return res.status(400).json({ error: 'description must be a string' });
  }
  if (goalCount !== undefined) {
    const parsed = Math.floor(Number(goalCount));
    if (!Number.isFinite(parsed) || parsed < 1) {
      return res.status(400).json({ error: 'goalCount must be a positive integer' });
    }
  }

  const updates: { title?: string; description?: string; goalCount?: number } = {};
  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description;
  if (goalCount !== undefined) updates.goalCount = Math.floor(Number(goalCount));

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'At least one field must be provided' });
  }

  try {
    const activity = await updateActivityForUser(activityId, authedUid, updates);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    return res.json({ activity });
  } catch {
    return res.status(500).json({ error: 'Failed to update activity' });
  }
});

router.post('/activities/:activityId/history', async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: 'Not authenticated' });

  const { activityId } = req.params;
  const { delta } = req.body ?? {};

  if (delta !== 1 && delta !== -1) {
    return res.status(400).json({ error: 'delta must be 1 or -1' });
  }

  // Look up the activity to get its period
  const activity = await db('activities').where({ id: activityId, user_id: authedUid }).first();

  if (!activity) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  const count = await updateActivityCount(activityId, authedUid, activity.period, delta);
  return res.json({ count });
});

export default router;
