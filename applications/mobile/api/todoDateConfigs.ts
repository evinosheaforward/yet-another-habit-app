import type { TodoDateConfig } from '@yet-another-habit-app/shared-types';
import { getAuthedContext, apiFetch } from '@/api/client';

export async function getDateConfigs(date: string): Promise<TodoDateConfig[]> {
  const { token } = await getAuthedContext();
  const json = await apiFetch<{ configs: TodoDateConfig[] }>('GET', '/todo-date-configs', {
    token,
    query: { date },
  });
  return json.configs;
}

export async function addDateConfig(
  date: string,
  activityId: string,
): Promise<TodoDateConfig> {
  const { token } = await getAuthedContext();
  const json = await apiFetch<{ config: TodoDateConfig }>('POST', '/todo-date-configs', {
    token,
    body: { date, activityId },
  });
  return json.config;
}

export async function removeDateConfig(configId: string): Promise<void> {
  const { token } = await getAuthedContext();
  await apiFetch<{ success: boolean }>('DELETE', `/todo-date-configs/${configId}`, { token });
}

export async function reorderDateConfigs(
  date: string,
  orderedIds: string[],
): Promise<void> {
  const { token } = await getAuthedContext();
  await apiFetch<{ success: boolean }>('PUT', '/todo-date-configs/reorder', {
    token,
    body: { date, orderedIds },
  });
}

export async function getScheduledDates(
  year: number,
  month: number,
): Promise<string[]> {
  const { token } = await getAuthedContext();
  const json = await apiFetch<{ dates: string[] }>('GET', '/todo-date-configs/dates', {
    token,
    query: { year: String(year), month: String(month) },
  });
  return json.dates;
}
