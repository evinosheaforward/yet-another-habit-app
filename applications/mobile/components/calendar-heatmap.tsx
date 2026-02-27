import { Platform, View } from 'react-native';
import type { ActivityCalendar } from '@yet-another-habit-app/shared-types';
import { ActivityPeriod } from '@yet-another-habit-app/shared-types';
import { ThemedText } from '@/components/themed-text';

type Props = {
  data: ActivityCalendar;
  year: number;
  month: number; // 1-based
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function dateStr(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function getCompletionForDay(
  dayDate: string,
  data: ActivityCalendar,
): { count: number; goalCount: number; periodCount?: number } | null {
  const { period, entries, goalCount, completionDates } = data;

  if (period === ActivityPeriod.Daily) {
    const entry = entries.find((e) => e.startDate === dayDate);
    return entry ? { count: entry.count, goalCount } : { count: 0, goalCount };
  }

  // For weekly/monthly: use per-day completion dates if available
  if (completionDates) {
    const dayCount = completionDates.filter((d) => d === dayDate).length;

    // Find the period-level entry to get the overall period count
    let periodEntry: { count: number } | undefined;
    if (period === ActivityPeriod.Weekly) {
      const dayTime = new Date(dayDate + 'T00:00:00Z').getTime();
      periodEntry = entries.find((e) => {
        const startTime = new Date(e.startDate + 'T00:00:00Z').getTime();
        const endTime = startTime + 7 * 86400000;
        return dayTime >= startTime && dayTime < endTime;
      });
    } else {
      periodEntry = entries[0];
    }

    return {
      count: dayCount,
      goalCount,
      periodCount: periodEntry?.count ?? 0,
    };
  }

  if (period === ActivityPeriod.Weekly) {
    const dayTime = new Date(dayDate + 'T00:00:00Z').getTime();
    for (const entry of entries) {
      const startTime = new Date(entry.startDate + 'T00:00:00Z').getTime();
      const endTime = startTime + 7 * 86400000;
      if (dayTime >= startTime && dayTime < endTime) {
        return { count: entry.count, goalCount };
      }
    }
    return { count: 0, goalCount };
  }

  // Monthly: use the single entry for the month
  if (entries.length > 0) {
    return { count: entries[0].count, goalCount };
  }
  return { count: 0, goalCount };
}

type CellColor = 'gray' | 'red' | 'yellow' | 'green' | 'empty';

function getCellColor(
  dayDate: string,
  data: ActivityCalendar,
): CellColor {
  // Check if day is before activity creation
  const createdDate = data.createdAt.slice(0, 10); // YYYY-MM-DD
  if (dayDate < createdDate) return 'gray';

  // Check if day is in the future
  const today = new Date();
  const todayStr = dateStr(
    today.getUTCFullYear(),
    today.getUTCMonth() + 1,
    today.getUTCDate(),
  );
  if (dayDate > todayStr) return 'gray';

  const result = getCompletionForDay(dayDate, data);
  if (!result) return 'red';

  const { count, goalCount, periodCount } = result;

  // When we have per-day data (weekly/monthly with completionDates)
  if (periodCount !== undefined) {
    if (count === 0) return 'gray'; // no completions on this day → N/A
    if (goalCount > 0 && periodCount >= goalCount) return 'green'; // period goal met
    return 'yellow'; // partial progress
  }

  // Daily or fallback (no completionDates)
  if (count === 0) return 'red';
  if (goalCount > 0 && count >= goalCount) return 'green';
  return 'yellow';
}

const COLOR_CLASSES: Record<CellColor, string> = {
  gray: 'bg-neutral-300 dark:bg-neutral-700',
  red: 'bg-red-400',
  yellow: 'bg-amber-400',
  green: 'bg-emerald-500',
  empty: '',
};

export function CalendarHeatmap({ data, year, month }: Props) {
  const monthIndex = month - 1;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay(); // 0=Sun
  const startOffset = firstDow;

  // Build grid cells: padding + real days
  const totalCells = startOffset + daysInMonth;
  const rows = Math.ceil(totalCells / 7);

  const grid: { day: number | null; date: string | null }[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: { day: number | null; date: string | null }[] = [];
    for (let c = 0; c < 7; c++) {
      const idx = r * 7 + c;
      if (idx < startOffset || idx >= startOffset + daysInMonth) {
        row.push({ day: null, date: null });
      } else {
        const d = idx - startOffset + 1;
        row.push({ day: d, date: dateStr(year, month, d) });
      }
    }
    grid.push(row);
  }

  const webStyle = Platform.OS === 'web' ? { maxWidth: '75%' as const, alignSelf: 'center' as const, width: '100%' as const } : undefined;

  return (
    <View style={webStyle}>
      {/* Month title */}
      <ThemedText className="mb-3 text-center text-[16px] font-bold text-neutral-900 dark:text-white">
        {MONTH_NAMES[monthIndex]} {year}
      </ThemedText>

      {/* Day-of-week headers */}
      <View className="mb-1 flex-row">
        {DAY_LABELS.map((label) => (
          <View key={label} className="flex-1 items-center">
            <ThemedText className="text-[11px] font-semibold opacity-50">{label}</ThemedText>
          </View>
        ))}
      </View>

      {/* Grid rows */}
      {grid.map((row, rowIdx) => (
        <View key={rowIdx} className="flex-row">
          {row.map((cell, colIdx) => {
            if (cell.day === null) {
              return <View key={colIdx} className="flex-1 items-center p-0.5" />;
            }
            const color = getCellColor(cell.date!, data);
            return (
              <View key={colIdx} className="flex-1 items-center p-0.5">
                <View
                  className={`aspect-square w-full items-center justify-center rounded-md ${COLOR_CLASSES[color]}`}
                >
                  <ThemedText className="text-[12px] font-medium text-neutral-900 dark:text-white">
                    {cell.day}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </View>
      ))}

      {/* Legend */}
      <View className="mt-3 flex-row flex-wrap justify-center gap-3">
        <View className="flex-row items-center gap-1">
          <View className="h-3 w-3 rounded-sm bg-neutral-300 dark:bg-neutral-700" />
          <ThemedText className="text-[11px] opacity-50">N/A</ThemedText>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="h-3 w-3 rounded-sm bg-red-400" />
          <ThemedText className="text-[11px] opacity-50">None</ThemedText>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="h-3 w-3 rounded-sm bg-amber-400" />
          <ThemedText className="text-[11px] opacity-50">Partial</ThemedText>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="h-3 w-3 rounded-sm bg-emerald-500" />
          <ThemedText className="text-[11px] opacity-50">Complete</ThemedText>
        </View>
      </View>
    </View>
  );
}
