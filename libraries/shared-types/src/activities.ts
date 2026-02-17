export enum ActivityPeriod {
  Daily = 'daily',
  Weekly = 'weekly',
  Monthly = 'monthly',
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  goalCount: number;
  count: number;
  completionPercent: number;
  period: ActivityPeriod;
  stackedActivityId: string | null;
  stackedActivityTitle: string | null;
  archived: boolean;
  task: boolean;
  archiveTask: boolean;
}

export interface TodoItem {
  id: string;
  activityId: string;
  activityTitle: string;
  activityPeriod: ActivityPeriod;
  activityTask: boolean;
  activityArchiveTask: boolean;
  sortOrder: number;
}

export interface ActivityHistoryEntry {
  startDate: string; // YYYY-MM-DD
  count: number;
}

export interface UserConfig {
  dayEndOffsetMinutes: number;
  clearTodoOnNewDay: boolean;
}
export interface TodoDayConfig {
  id: string;
  activityId: string;
  activityTitle: string;
  activityPeriod: ActivityPeriod;
  dayOfWeek: number;
  sortOrder: number;
}

export function isActivityPeriod(value: unknown): value is ActivityPeriod {
  return (
    value === ActivityPeriod.Daily ||
    value === ActivityPeriod.Weekly ||
    value === ActivityPeriod.Monthly
  );
}

export function parseActivityPeriod(value: unknown): ActivityPeriod | null {
  if (isActivityPeriod(value)) return value;
  return null;
}
