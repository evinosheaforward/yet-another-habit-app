import type { TodoDayConfig } from '@yet-another-habit-app/shared-types';
import { getAuthedContext, apiFetch } from '@/api/client';

export async function getDayConfigs(dayOfWeek: number): Promise<TodoDayConfig[]> {
  const { token } = await getAuthedContext();
  const json = await apiFetch<{ configs: TodoDayConfig[] }>('GET', '/todo-day-configs', {
    token,
    query: { dayOfWeek: String(dayOfWeek) },
  });
  return json.configs;
}

export async function addDayConfig(
  dayOfWeek: number,
  activityId: string,
): Promise<TodoDayConfig> {
  const { token } = await getAuthedContext();
  const json = await apiFetch<{ config: TodoDayConfig }>('POST', '/todo-day-configs', {
    token,
    body: { dayOfWeek, activityId },
  });
  return json.config;
}

export async function removeDayConfig(configId: string): Promise<void> {
  const { token } = await getAuthedContext();
  await apiFetch<{ success: boolean }>('DELETE', `/todo-day-configs/${configId}`, { token });
}

export async function reorderDayConfigs(
  dayOfWeek: number,
  orderedIds: string[],
): Promise<void> {
  const { token } = await getAuthedContext();
  await apiFetch<{ success: boolean }>('PUT', '/todo-day-configs/reorder', {
    token,
    body: { dayOfWeek, orderedIds },
  });
}
