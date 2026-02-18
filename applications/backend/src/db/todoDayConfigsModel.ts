import type { TodoDayConfig } from '@yet-another-habit-app/shared-types';
import { db } from './knex.js';
import { randomUUID } from 'crypto';

export async function getDayConfigs(
  userId: string,
  dayOfWeek: number,
): Promise<TodoDayConfig[]> {
  const rows = await db('todo_day_configs')
    .join('activities', 'todo_day_configs.activity_id', 'activities.id')
    .select([
      'todo_day_configs.id',
      'todo_day_configs.activity_id',
      'activities.title as activity_title',
      'activities.period as activity_period',
      'activities.task as activity_task',
      'todo_day_configs.day_of_week',
      'todo_day_configs.sort_order',
    ])
    .where({
      'todo_day_configs.user_id': userId,
      'todo_day_configs.day_of_week': dayOfWeek,
    })
    .orderBy('todo_day_configs.sort_order', 'asc');

  return rows.map(
    (r: {
      id: string;
      activity_id: string;
      activity_title: string;
      activity_period: string;
      activity_task: boolean | number;
      day_of_week: number;
      sort_order: number;
    }) => ({
      id: r.id,
      activityId: r.activity_id,
      activityTitle: r.activity_title,
      activityPeriod: r.activity_period as TodoDayConfig['activityPeriod'],
      activityTask: !!r.activity_task,
      dayOfWeek: r.day_of_week,
      sortOrder: r.sort_order,
    }),
  );
}

export async function addDayConfig(
  userId: string,
  dayOfWeek: number,
  activityId: string,
): Promise<TodoDayConfig> {
  const activity = await db('activities')
    .where({ id: activityId, user_id: userId, archived: false })
    .first();

  if (!activity) {
    throw new Error('Activity not found or is archived');
  }

  const maxRow = await db('todo_day_configs')
    .where({ user_id: userId, day_of_week: dayOfWeek })
    .max('sort_order as maxOrder')
    .first();

  const sortOrder = (maxRow?.maxOrder ?? -1) + 1;
  const id = randomUUID();

  await db('todo_day_configs').insert({
    id,
    user_id: userId,
    day_of_week: dayOfWeek,
    activity_id: activityId,
    sort_order: sortOrder,
  });

  return {
    id,
    activityId,
    activityTitle: activity.title,
    activityPeriod: activity.period,
    activityTask: !!activity.task,
    dayOfWeek,
    sortOrder,
  };
}

export async function removeDayConfig(configId: string, userId: string): Promise<boolean> {
  const deleted = await db('todo_day_configs')
    .where({ id: configId, user_id: userId })
    .del();

  return deleted > 0;
}

export async function reorderDayConfigs(
  userId: string,
  dayOfWeek: number,
  orderedIds: string[],
): Promise<void> {
  const rows = await db('todo_day_configs')
    .where({ user_id: userId, day_of_week: dayOfWeek })
    .whereIn('id', orderedIds)
    .select('id');

  if (rows.length !== orderedIds.length) {
    throw new Error('Some config IDs not found or do not belong to user/day');
  }

  await db.transaction(async (trx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await trx('todo_day_configs')
        .where({ id: orderedIds[i], user_id: userId })
        .update({ sort_order: i });
    }
  });
}

export async function removeDayConfigsByActivityId(activityId: string): Promise<void> {
  await db('todo_day_configs').where({ activity_id: activityId }).del();
}

export async function removeDayConfigsByUserId(userId: string): Promise<void> {
  await db('todo_day_configs').where({ user_id: userId }).del();
}
