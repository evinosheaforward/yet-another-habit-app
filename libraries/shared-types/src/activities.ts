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
  stackedActivityId: string | null;
  stackedActivityTitle: string | null;
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
  activityTask: boolean;
  dayOfWeek: number;
  sortOrder: number;
}

export interface TodoDateConfig {
  id: string;
  activityId: string;
  activityTitle: string;
  activityPeriod: ActivityPeriod;
  activityTask: boolean;
  scheduledDate: string; // YYYY-MM-DD
  sortOrder: number;
}

export interface ActivityCalendar {
  period: ActivityPeriod;
  goalCount: number;
  createdAt: string;
  entries: ActivityHistoryEntry[];
  completionDates?: string[];
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

export enum AchievementType {
  Habit = 'habit',
  Period = 'period',
  Todo = 'todo',
}

export interface Achievement {
  id: string;
  title: string;
  reward: string;
  type: AchievementType;
  activityId: string | null;
  activityTitle: string | null;
  period: ActivityPeriod | null;
  goalCount: number;
  count: number;
  repeatable: boolean;
  completed: boolean;
}

export interface CompletedAchievement {
  id: string;
  title: string;
  reward: string;
}

export function isAchievementType(value: unknown): value is AchievementType {
  return (
    value === AchievementType.Habit ||
    value === AchievementType.Period ||
    value === AchievementType.Todo
  );
}
