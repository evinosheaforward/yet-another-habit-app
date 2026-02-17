import type { Achievement, AchievementType, ActivityPeriod } from '@yet-another-habit-app/shared-types';
import { apiFetch, getAuthedContext } from '@/api/client';

export async function getAchievements(): Promise<Achievement[]> {
  const { token } = await getAuthedContext();
  const json = await apiFetch<{ achievements: Achievement[] }>('GET', '/achievements', { token });
  return json.achievements;
}

export async function createAchievement(input: {
  title: string;
  reward?: string;
  type: AchievementType;
  activityId?: string | null;
  period?: ActivityPeriod | null;
  goalCount?: number;
  repeatable?: boolean;
}): Promise<Achievement> {
  const { token } = await getAuthedContext();
  const json = await apiFetch<{ achievement: Achievement }>('POST', '/achievements', {
    token,
    body: input,
  });
  return json.achievement;
}

export async function updateAchievement(
  id: string,
  input: { title?: string; reward?: string; goalCount?: number; repeatable?: boolean },
): Promise<Achievement> {
  const { token } = await getAuthedContext();
  const json = await apiFetch<{ achievement: Achievement }>('PUT', `/achievements/${id}`, {
    token,
    body: input,
  });
  return json.achievement;
}

export async function deleteAchievement(id: string): Promise<void> {
  const { token } = await getAuthedContext();
  await apiFetch<{ success: boolean }>('DELETE', `/achievements/${id}`, { token });
}
