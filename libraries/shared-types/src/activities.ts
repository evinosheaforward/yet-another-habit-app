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
}

export interface ActivityHistoryEntry {
  startDate: string; // YYYY-MM-DD
  count: number;
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
