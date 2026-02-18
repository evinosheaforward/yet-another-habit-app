import type { TodoDateConfig } from '@yet-another-habit-app/shared-types';
import { db } from './knex.js';
import { randomUUID } from 'crypto';

export async function getDateConfigs(
  userId: string,
  date: string,
): Promise<TodoDateConfig[]> {
  const rows = await db('todo_date_configs')
    .join('activities', 'todo_date_configs.activity_id', 'activities.id')
    .select([
      'todo_date_configs.id',
      'todo_date_configs.activity_id',
      'activities.title as activity_title',
      'activities.period as activity_period',
      'activities.task as activity_task',
      'todo_date_configs.scheduled_date',
      'todo_date_configs.sort_order',
    ])
    .where({
      'todo_date_configs.user_id': userId,
      'todo_date_configs.scheduled_date': date,
    })
    .orderBy('todo_date_configs.sort_order', 'asc');

  return rows.map(
    (r: {
      id: string;
      activity_id: string;
      activity_title: string;
      activity_period: string;
      activity_task: boolean | number;
      scheduled_date: string;
      sort_order: number;
    }) => ({
      id: r.id,
      activityId: r.activity_id,
      activityTitle: r.activity_title,
      activityPeriod: r.activity_period as TodoDateConfig['activityPeriod'],
      activityTask: !!r.activity_task,
      scheduledDate: r.scheduled_date,
      sortOrder: r.sort_order,
    }),
  );
}

export async function addDateConfig(
  userId: string,
  date: string,
  activityId: string,
): Promise<TodoDateConfig> {
  const activity = await db('activities')
    .where({ id: activityId, user_id: userId, archived: false })
    .first();

  if (!activity) {
    throw new Error('Activity not found or is archived');
  }

  const maxRow = await db('todo_date_configs')
    .where({ user_id: userId, scheduled_date: date })
    .max('sort_order as maxOrder')
    .first();

  const sortOrder = (maxRow?.maxOrder ?? -1) + 1;
  const id = randomUUID();

  await db('todo_date_configs').insert({
    id,
    user_id: userId,
    activity_id: activityId,
    scheduled_date: date,
    sort_order: sortOrder,
  });

  return {
    id,
    activityId,
    activityTitle: activity.title,
    activityPeriod: activity.period,
    activityTask: !!activity.task,
    scheduledDate: date,
    sortOrder,
  };
}

export async function removeDateConfig(configId: string, userId: string): Promise<boolean> {
  const deleted = await db('todo_date_configs')
    .where({ id: configId, user_id: userId })
    .del();

  return deleted > 0;
}

export async function reorderDateConfigs(
  userId: string,
  date: string,
  orderedIds: string[],
): Promise<void> {
  const rows = await db('todo_date_configs')
    .where({ user_id: userId, scheduled_date: date })
    .whereIn('id', orderedIds)
    .select('id');

  if (rows.length !== orderedIds.length) {
    throw new Error('Some config IDs not found or do not belong to user/date');
  }

  await db.transaction(async (trx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await trx('todo_date_configs')
        .where({ id: orderedIds[i], user_id: userId })
        .update({ sort_order: i });
    }
  });
}

export async function removeDateConfigsByActivityId(activityId: string): Promise<void> {
  await db('todo_date_configs').where({ activity_id: activityId }).del();
}

export async function removeDateConfigsByUserId(userId: string): Promise<void> {
  await db('todo_date_configs').where({ user_id: userId }).del();
}

export async function getScheduledDates(
  userId: string,
  year: number,
  month: number,
): Promise<string[]> {
  const monthStr = String(month).padStart(2, '0');
  const prefix = `${year}-${monthStr}`;

  const rows = await db('todo_date_configs')
    .where({ user_id: userId })
    .andWhere('scheduled_date', 'like', `${prefix}%`)
    .distinct('scheduled_date')
    .orderBy('scheduled_date', 'asc');

  return rows.map((r: { scheduled_date: string }) => r.scheduled_date);
}

export async function removeDateConfigsForDate(
  userId: string,
  date: string,
): Promise<void> {
  await db('todo_date_configs')
    .where({ user_id: userId, scheduled_date: date })
    .del();
}
