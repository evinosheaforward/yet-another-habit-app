import type { Request, Response } from 'express';
import { Router } from 'express';
import { isAchievementType } from '@yet-another-habit-app/shared-types';
import type { AchievementType, ActivityPeriod } from '@yet-another-habit-app/shared-types';
import {
  getAchievementsForUser,
  createAchievementForUser,
  updateAchievementForUser,
  deleteAchievementForUser,
  createDefaultAchievement,
} from '../db/achievementsModel';
import { db } from '../db/knex.js';

const router = Router();

function isValidPeriod(v: unknown): v is ActivityPeriod {
  return v === 'daily' || v === 'weekly' || v === 'monthly';
}

router.get('/achievements', async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: 'Not authenticated' });

  let achievements = await getAchievementsForUser(authedUid);

  // If no achievements exist, create the default one
  if (achievements.length === 0) {
    await createDefaultAchievement(authedUid);
    achievements = await getAchievementsForUser(authedUid);
  }

  return res.json({ achievements });
});

router.post('/achievements', async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: 'Not authenticated' });

  const { title, reward, type, activityId, period, goalCount, repeatable } = req.body ?? {};

  if (typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'title is required' });
  }

  if (!isAchievementType(type)) {
    return res.status(400).json({ error: 'type must be habit|period|todo' });
  }

  if (type === 'habit') {
    if (typeof activityId !== 'string' || activityId.length === 0) {
      return res.status(400).json({ error: 'activityId is required for habit type' });
    }
    // Verify the activity belongs to this user
    const activity = await db('activities').where({ id: activityId, user_id: authedUid }).first();
    if (!activity) {
      return res.status(400).json({ error: 'Activity not found' });
    }
  }

  if (type === 'period') {
    if (!isValidPeriod(period)) {
      return res.status(400).json({ error: 'period must be daily|weekly|monthly for period type' });
    }
  }

  const parsedGoalCount = goalCount != null ? Math.floor(Number(goalCount)) : 1;
  if (!Number.isFinite(parsedGoalCount) || parsedGoalCount < 1) {
    return res.status(400).json({ error: 'goalCount must be a positive integer' });
  }

  const achievement = await createAchievementForUser(authedUid, {
    title: title.trim(),
    reward: typeof reward === 'string' ? reward.trim() : '',
    type: type as AchievementType,
    activityId: type === 'habit' ? activityId : null,
    period: type === 'period' ? period : null,
    goalCount: parsedGoalCount,
    repeatable: repeatable === true,
  });

  return res.status(201).json({ achievement });
});

router.put('/achievements/:id', async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: 'Not authenticated' });

  const { id } = req.params;
  const { title, reward, goalCount, repeatable } = req.body ?? {};

  const updates: { title?: string; reward?: string; goalCount?: number; repeatable?: boolean } = {};

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'title must be a non-empty string' });
    }
    updates.title = title.trim();
  }

  if (reward !== undefined) {
    if (typeof reward !== 'string') {
      return res.status(400).json({ error: 'reward must be a string' });
    }
    updates.reward = reward.trim();
  }

  if (goalCount !== undefined) {
    const parsed = Math.floor(Number(goalCount));
    if (!Number.isFinite(parsed) || parsed < 1) {
      return res.status(400).json({ error: 'goalCount must be a positive integer' });
    }
    updates.goalCount = parsed;
  }

  if (repeatable !== undefined) {
    if (typeof repeatable !== 'boolean') {
      return res.status(400).json({ error: 'repeatable must be a boolean' });
    }
    updates.repeatable = repeatable;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'At least one field must be provided' });
  }

  const achievement = await updateAchievementForUser(id, authedUid, updates);
  if (!achievement) {
    return res.status(404).json({ error: 'Achievement not found' });
  }

  return res.json({ achievement });
});

router.delete('/achievements/:id', async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: 'Not authenticated' });

  const deleted = await deleteAchievementForUser(req.params.id, authedUid);
  if (!deleted) {
    return res.status(404).json({ error: 'Achievement not found' });
  }

  return res.json({ success: true });
});

export default router;
