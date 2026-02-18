import type { Request, Response } from 'express';
import { Router } from 'express';
import type { ActivityPeriod } from '@yet-another-habit-app/shared-types';
import {
  createActivityForUser,
  deleteActivityForUser,
  deleteAllDataForUser,
  getActivitiesForUser,
  getActivityCalendar,
  getActivityHistory,
  updateActivityCount,
  updateActivityForUser,
  validateStackTarget,
  wouldCreateCycle,
} from '../db/activitiesModel';
import { getUserConfig, upsertUserConfig } from '../db/userConfigsModel';
import { checkHabitAchievements } from '../db/achievementsModel';
import { deleteFirebaseUser } from '../auth/firebase';
import { db } from '../db/knex.js';

const router = Router();

function isActivityPeriod(v: unknown): v is ActivityPeriod {
  return v === 'daily' || v === 'weekly' || v === 'monthly';
}

router.get('/activities', async (req: Request, res: Response) => {
  const { userId, period, archived } = req.query;

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

  const isArchived = archived === 'true';
  const activities = await getActivitiesForUser(userId, period, isArchived);
  return res.json({ activities });
});

router.post('/activities', async (req: Request, res: Response) => {
  // Auth required
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: 'Not authenticated' });

  const { title, description, period, goalCount, stackedActivityId, task, archiveTask } =
    req.body ?? {};

  if (typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'title is required' });
  }

  if (description != null && typeof description !== 'string') {
    return res.status(400).json({ error: 'description must be a string' });
  }

  if (!isActivityPeriod(period)) {
    return res.status(400).json({ error: 'period must be daily|weekly|monthly' });
  }

  const isTask = task === true;

  const parsedGoalCount = isTask ? 1 : (goalCount != null ? Math.floor(Number(goalCount)) : 1);
  if (!Number.isFinite(parsedGoalCount) || parsedGoalCount < 1) {
    return res.status(400).json({ error: 'goalCount must be a positive integer' });
  }

  if (stackedActivityId != null && typeof stackedActivityId === 'string') {
    const result = await validateStackTarget(stackedActivityId, authedUid);
    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }
  }

  const activity = await createActivityForUser(authedUid, {
    title: title.trim(),
    description: description?.trim() || '',
    period,
    goalCount: parsedGoalCount,
    stackedActivityId: stackedActivityId ?? null,
    task: isTask,
    archiveTask: isTask && archiveTask === true,
  });

  return res.status(201).json({ activity });
});

router.put('/activities/:activityId', async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: 'Not authenticated' });

  const { activityId } = req.params;
  const { title, description, goalCount, stackedActivityId, archived } = req.body ?? {};

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

  if (stackedActivityId !== undefined && stackedActivityId !== null) {
    if (stackedActivityId === activityId) {
      return res.status(400).json({ error: 'Cannot stack an activity with itself' });
    }

    const result = await validateStackTarget(stackedActivityId, authedUid);
    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }

    if (await wouldCreateCycle(activityId, stackedActivityId, authedUid)) {
      return res.status(400).json({ error: 'This would create a circular chain' });
    }
  }

  const updates: {
    title?: string;
    description?: string;
    goalCount?: number;
    stackedActivityId?: string | null;
    archived?: boolean;
  } = {};
  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description;
  if (goalCount !== undefined) updates.goalCount = Math.floor(Number(goalCount));
  if (stackedActivityId !== undefined) updates.stackedActivityId = stackedActivityId;
  if (typeof archived === 'boolean') updates.archived = archived;

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

router.get('/activities/:activityId/calendar', async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: 'Not authenticated' });

  const { activityId } = req.params;
  const rawYear = req.query.year;
  const rawMonth = req.query.month;

  const year = Math.floor(Number(rawYear));
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ error: 'year must be an integer between 2000 and 2100' });
  }

  const month = Math.floor(Number(rawMonth));
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: 'month must be an integer between 1 and 12' });
  }

  try {
    const result = await getActivityCalendar(activityId, authedUid, year, month);
    return res.json(result);
  } catch {
    return res.status(404).json({ error: 'Activity not found' });
  }
});

router.get('/activities/:activityId/history', async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: 'Not authenticated' });

  const { activityId } = req.params;
  const rawLimit = req.query.limit;
  let limit: number | undefined;

  if (rawLimit !== undefined) {
    limit = Math.floor(Number(rawLimit));
    if (!Number.isFinite(limit) || limit < 1 || limit > 365) {
      return res.status(400).json({ error: 'limit must be between 1 and 365' });
    }
  }

  try {
    const result = await getActivityHistory(activityId, authedUid, limit);
    return res.json(result);
  } catch {
    return res.status(404).json({ error: 'Activity not found' });
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

  const newCount = await updateActivityCount(activityId, authedUid, activity.period, delta);

  // Check if 100% boundary was crossed for achievement tracking
  const goalCount = Number(activity.goal_count);
  const oldCount = newCount - delta;
  const wasComplete = oldCount >= goalCount;
  const isNowComplete = newCount >= goalCount;

  let completedAchievements: { id: string; title: string; reward: string }[] = [];
  if (wasComplete !== isNowComplete) {
    completedAchievements = await checkHabitAchievements(authedUid, activityId, isNowComplete, activity.period);
  }

  return res.json({ count: newCount, completedAchievements });
});

router.delete('/activities/:activityId', async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: 'Not authenticated' });

  const { activityId } = req.params;
  const deleted = await deleteActivityForUser(activityId, authedUid);

  if (!deleted) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  return res.json({ success: true });
});

router.delete('/account', async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: 'Not authenticated' });

  try {
    await deleteAllDataForUser(authedUid);
    await deleteFirebaseUser(authedUid);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

router.get('/user-config', async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: 'Not authenticated' });

  const config = await getUserConfig(authedUid);
  return res.json(config);
});

router.put('/user-config', async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: 'Not authenticated' });

  const { dayEndOffsetMinutes, clearTodoOnNewDay } = req.body ?? {};

  if (
    typeof dayEndOffsetMinutes !== 'number' ||
    !Number.isInteger(dayEndOffsetMinutes) ||
    dayEndOffsetMinutes < 0 ||
    dayEndOffsetMinutes > 1439
  ) {
    return res
      .status(400)
      .json({ error: 'dayEndOffsetMinutes must be an integer between 0 and 1439' });
  }

  if (clearTodoOnNewDay !== undefined && typeof clearTodoOnNewDay !== 'boolean') {
    return res.status(400).json({ error: 'clearTodoOnNewDay must be a boolean' });
  }

  const patch: { dayEndOffsetMinutes: number; clearTodoOnNewDay?: boolean } = {
    dayEndOffsetMinutes,
  };
  if (clearTodoOnNewDay !== undefined) {
    patch.clearTodoOnNewDay = clearTodoOnNewDay;
  }

  const config = await upsertUserConfig(authedUid, patch);
  return res.json(config);
});

export default router;
