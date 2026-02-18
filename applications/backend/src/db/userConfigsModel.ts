import type { UserConfig } from '@yet-another-habit-app/shared-types';
import { db } from './knex.js';

export async function getUserConfig(userId: string): Promise<UserConfig> {
  const row = await db('user_configs').where({ user_id: userId }).first();
  return {
    dayEndOffsetMinutes: row ? Number(row.day_end_offset_minutes) : 0,
    clearTodoOnNewDay: row ? !!row.clear_todo_on_new_day : true,
  };
}

export async function upsertUserConfig(
  userId: string,
  config: Partial<UserConfig>,
): Promise<UserConfig> {
  const current = await getUserConfig(userId);
  const dayEndOffsetMinutes = config.dayEndOffsetMinutes ?? current.dayEndOffsetMinutes;
  const clearTodoOnNewDay = config.clearTodoOnNewDay ?? current.clearTodoOnNewDay;

  await db.raw(
    `INSERT INTO user_configs (user_id, day_end_offset_minutes, clear_todo_on_new_day, created_at, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       day_end_offset_minutes = ?,
       clear_todo_on_new_day = ?,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, dayEndOffsetMinutes, clearTodoOnNewDay, dayEndOffsetMinutes, clearTodoOnNewDay],
  );

  return getUserConfig(userId);
}

export async function getLastPopulatedDate(userId: string): Promise<string | null> {
  const row = await db('user_configs').where({ user_id: userId }).select('last_populated_date').first();
  return row?.last_populated_date ?? null;
}

export async function setLastPopulatedDate(userId: string, date: string): Promise<void> {
  await db.raw(
    `INSERT INTO user_configs (user_id, day_end_offset_minutes, clear_todo_on_new_day, last_populated_date, created_at, updated_at)
     VALUES (?, 0, true, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       last_populated_date = ?,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, date, date],
  );
}
