import { db } from './knex.js';

export async function getOnboardingProgress(userId: string): Promise<string[]> {
  const row = await db('user_configs').where({ user_id: userId }).select('completed_onboarding_steps').first();
  if (!row?.completed_onboarding_steps) return [];
  try {
    return JSON.parse(row.completed_onboarding_steps) as string[];
  } catch {
    return [];
  }
}

export async function completeOnboardingStep(userId: string, stepId: string): Promise<string[]> {
  return completeOnboardingSteps(userId, [stepId]);
}

export async function completeOnboardingSteps(userId: string, stepIds: string[]): Promise<string[]> {
  const current = await getOnboardingProgress(userId);
  const updated = [...new Set([...current, ...stepIds])];
  const json = JSON.stringify(updated);

  await db.raw(
    `INSERT INTO user_configs (user_id, day_end_offset_minutes, clear_todo_on_new_day, completed_onboarding_steps, created_at, updated_at)
     VALUES (?, 0, true, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       completed_onboarding_steps = ?,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, json, json],
  );

  return updated;
}
