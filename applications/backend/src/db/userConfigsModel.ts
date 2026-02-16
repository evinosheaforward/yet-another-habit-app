import type { UserConfig } from '@yet-another-habit-app/shared-types';
import { db } from './knex.js';

export async function getUserConfig(userId: string): Promise<UserConfig> {
  const row = await db('user_configs').where({ user_id: userId }).first();
  return { dayEndOffsetMinutes: row ? Number(row.day_end_offset_minutes) : 0 };
}

export async function upsertUserConfig(
  userId: string,
  config: UserConfig,
): Promise<UserConfig> {
  await db.raw(
    `INSERT INTO user_configs (user_id, day_end_offset_minutes, created_at, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       day_end_offset_minutes = ?,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, config.dayEndOffsetMinutes, config.dayEndOffsetMinutes],
  );

  return getUserConfig(userId);
}
