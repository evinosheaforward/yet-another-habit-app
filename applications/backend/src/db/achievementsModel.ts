import type { Achievement, AchievementType, ActivityPeriod, CompletedAchievement } from '@yet-another-habit-app/shared-types';
import { db } from './knex.js';
import { computePeriodStart } from './activitiesModel.js';
import { getUserConfig } from './userConfigsModel.js';
import { randomUUID } from 'crypto';

// --- Row → Achievement mapper ---

interface AchievementRow {
  id: string;
  user_id: string;
  title: string;
  reward: string;
  type: string;
  activity_id: string | null;
  activity_title?: string | null;
  period: string | null;
  goal_count: number;
  count: number;
  repeatable: boolean | number;
  completed: boolean | number;
}

function toAchievement(row: AchievementRow): Achievement {
  return {
    id: row.id,
    title: row.title,
    reward: row.reward,
    type: row.type as AchievementType,
    activityId: row.activity_id,
    activityTitle: row.activity_title ?? null,
    period: (row.period as ActivityPeriod) ?? null,
    goalCount: Number(row.goal_count),
    count: Number(row.count),
    repeatable: !!row.repeatable,
    completed: !!row.completed,
  };
}

// --- CRUD ---

export async function getAchievementsForUser(userId: string): Promise<Achievement[]> {
  const rows = await db('achievements')
    .leftJoin('activities', 'achievements.activity_id', 'activities.id')
    .select([
      'achievements.id',
      'achievements.user_id',
      'achievements.title',
      'achievements.reward',
      'achievements.type',
      'achievements.activity_id',
      'activities.title as activity_title',
      'achievements.period',
      'achievements.goal_count',
      'achievements.count',
      'achievements.repeatable',
      'achievements.completed',
    ])
    .where({ 'achievements.user_id': userId })
    .orderBy('achievements.created_at', 'asc');

  return rows.map(toAchievement);
}

export async function createAchievementForUser(
  userId: string,
  input: {
    title: string;
    reward?: string;
    type: AchievementType;
    activityId?: string | null;
    period?: ActivityPeriod | null;
    goalCount?: number;
    repeatable?: boolean;
  },
): Promise<Achievement> {
  const id = randomUUID();

  await db('achievements').insert({
    id,
    user_id: userId,
    title: input.title,
    reward: input.reward ?? '',
    type: input.type,
    activity_id: input.activityId ?? null,
    period: input.period ?? null,
    goal_count: input.goalCount ?? 1,
    count: 0,
    repeatable: input.repeatable ?? false,
    completed: false,
  });

  const row = await db('achievements')
    .leftJoin('activities', 'achievements.activity_id', 'activities.id')
    .select([
      'achievements.id',
      'achievements.user_id',
      'achievements.title',
      'achievements.reward',
      'achievements.type',
      'achievements.activity_id',
      'activities.title as activity_title',
      'achievements.period',
      'achievements.goal_count',
      'achievements.count',
      'achievements.repeatable',
      'achievements.completed',
    ])
    .where({ 'achievements.id': id })
    .first();

  return toAchievement(row);
}

export async function updateAchievementForUser(
  id: string,
  userId: string,
  updates: { title?: string; reward?: string; goalCount?: number; repeatable?: boolean },
): Promise<Achievement | null> {
  const existing = await db('achievements').where({ id, user_id: userId }).first();
  if (!existing) return null;

  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.reward !== undefined) patch.reward = updates.reward;
  if (updates.goalCount !== undefined) patch.goal_count = updates.goalCount;
  if (updates.repeatable !== undefined) patch.repeatable = updates.repeatable;

  if (Object.keys(patch).length > 0) {
    await db('achievements').where({ id, user_id: userId }).update(patch);
  }

  const row = await db('achievements')
    .leftJoin('activities', 'achievements.activity_id', 'activities.id')
    .select([
      'achievements.id',
      'achievements.user_id',
      'achievements.title',
      'achievements.reward',
      'achievements.type',
      'achievements.activity_id',
      'activities.title as activity_title',
      'achievements.period',
      'achievements.goal_count',
      'achievements.count',
      'achievements.repeatable',
      'achievements.completed',
    ])
    .where({ 'achievements.id': id })
    .first();

  return row ? toAchievement(row) : null;
}

export async function deleteAchievementForUser(id: string, userId: string): Promise<boolean> {
  const deleted = await db('achievements').where({ id, user_id: userId }).del();
  return deleted > 0;
}

export async function createDefaultAchievement(userId: string): Promise<void> {
  await createAchievementForUser(userId, {
    title: 'Complete all your daily habits',
    type: 'period' as AchievementType,
    period: 'daily' as ActivityPeriod,
    goalCount: 1,
  });
}

// --- Achievement progress helpers ---

async function incrementAchievement(id: string): Promise<CompletedAchievement | null> {
  const row = await db('achievements').where({ id }).first();
  if (!row || !!row.completed) return null;

  const newCount = Number(row.count) + 1;
  const goalCount = Number(row.goal_count);

  if (newCount >= goalCount) {
    if (row.repeatable) {
      // Repeatable: reset count to 0
      await db('achievements').where({ id }).update({ count: 0 });
    } else {
      // Non-repeatable: mark completed
      await db('achievements').where({ id }).update({ count: newCount, completed: true });
    }
    return { id: row.id, title: row.title, reward: row.reward };
  } else {
    await db('achievements').where({ id }).update({ count: newCount });
    return null;
  }
}

async function decrementAchievement(id: string): Promise<void> {
  const row = await db('achievements').where({ id }).first();
  if (!row || !!row.completed) return;

  const newCount = Math.max(0, Number(row.count) - 1);
  await db('achievements').where({ id }).update({ count: newCount });
}

// --- Hook functions ---

export async function checkHabitAchievements(
  userId: string,
  activityId: string,
  isNowComplete: boolean,
  period: string,
): Promise<CompletedAchievement[]> {
  const completed: CompletedAchievement[] = [];

  // Find relevant achievements: habit-type matching this activity, or period-type matching this period
  const achievements = await db('achievements')
    .where({ user_id: userId, completed: false })
    .andWhere(function () {
      this.where(function () {
        this.where({ type: 'habit', activity_id: activityId });
      }).orWhere(function () {
        this.where({ type: 'period', period });
      });
    });

  for (const ach of achievements) {
    if (ach.type === 'habit') {
      // Direct habit tracking
      if (isNowComplete) {
        const result = await incrementAchievement(ach.id);
        if (result) completed.push(result);
      } else {
        await decrementAchievement(ach.id);
      }
    } else if (ach.type === 'period') {
      // Period type: check if ALL non-archived, non-task habits of that period are at 100%
      const allComplete = await areAllPeriodHabitsComplete(userId, period);

      if (isNowComplete && allComplete) {
        const result = await incrementAchievement(ach.id);
        if (result) completed.push(result);
      } else if (!isNowComplete) {
        // The user just broke 100% — only decrement if we previously incremented
        // We decrement to undo a potential prior increment
        await decrementAchievement(ach.id);
      }
    }
  }

  return completed;
}

async function areAllPeriodHabitsComplete(userId: string, period: string): Promise<boolean> {
  const { dayEndOffsetMinutes } = await getUserConfig(userId);
  const startDate = computePeriodStart(period, new Date(), dayEndOffsetMinutes);

  // Get all non-archived, non-task activities for this period
  const activities = await db('activities')
    .where({ user_id: userId, period, archived: false, task: false });

  if (activities.length === 0) return false;

  for (const activity of activities) {
    const historyRow = await db('activities_history')
      .where({ activity_id: activity.id, start_date: startDate })
      .first();

    const count = historyRow ? Number(historyRow.count) : 0;
    const goalCount = Number(activity.goal_count);

    if (count < goalCount) return false;
  }

  return true;
}

export async function checkTodoAchievements(userId: string, today: string): Promise<CompletedAchievement[]> {
  const completed: CompletedAchievement[] = [];

  const achievements = await db('achievements')
    .where({ user_id: userId, type: 'todo', completed: false })
    .andWhere(function () {
      this.whereNull('last_todo_increment_date').orWhereNot('last_todo_increment_date', today);
    });

  for (const ach of achievements) {
    await db('achievements').where({ id: ach.id }).update({ last_todo_increment_date: today });
    const result = await incrementAchievement(ach.id);
    if (result) completed.push(result);
  }

  return completed;
}
