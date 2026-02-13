import { useColorScheme, View } from 'react-native';
import type { ActivityHistoryEntry } from '@yet-another-habit-app/shared-types';
import { ThemedText } from '@/components/themed-text';

type Props = {
  history: ActivityHistoryEntry[];
  goalCount: number;
  period: string;
};

function formatLabel(dateStr: string, period: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  const normalized = period.toLowerCase();
  if (normalized === 'monthly') {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return months[m - 1] ?? '';
  }
  return `${m}/${d}`;
}

const BAR_AREA_HEIGHT = 150;

export function ActivityHistoryChart({ history, goalCount, period }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (history.length === 0) {
    return (
      <View className="items-center py-6">
        <ThemedText className="text-[13px] opacity-60">No history data yet</ThemedText>
      </View>
    );
  }

  const barColor = isDark ? '#818cf8' : '#4f46e5';
  const goalLineColor = isDark ? '#f87171' : '#dc2626';

  const values = history.map((e) => e.count);
  const maxValue = Math.max(...values, goalCount, 1);

  const goalPct = goalCount > 0 ? (goalCount / maxValue) * 100 : null;

  return (
    <View className="mt-6">
      <ThemedText className="mb-2 text-[13px] font-semibold uppercase tracking-wide opacity-60 text-neutral-700 dark:text-neutral-300">
        History
      </ThemedText>

      {/* Chart area */}
      <View
        className="rounded-xl border border-black/5 bg-black/[0.02] p-3 dark:border-white/5 dark:bg-white/[0.02]"
      >
        <View style={{ height: BAR_AREA_HEIGHT, position: 'relative' }}>
          {/* Goal line */}
          {goalPct != null && (
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: `${goalPct}%`,
                height: 2,
                backgroundColor: goalLineColor,
                zIndex: 1,
              }}
            />
          )}

          {/* Bars */}
          <View className="flex-1 flex-row items-end gap-1">
            {history.map((entry, i) => {
              const heightPct = maxValue > 0 ? (entry.count / maxValue) * 100 : 0;
              return (
                <View key={i} className="flex-1 items-center">
                  <View className="w-full items-center">
                    {entry.count > 0 && (
                      <ThemedText className="mb-0.5 text-[10px] font-medium opacity-60">
                        {entry.count}
                      </ThemedText>
                    )}
                    <View
                      style={{
                        width: '70%',
                        height: Math.max(heightPct > 0 ? 4 : 0, (heightPct / 100) * BAR_AREA_HEIGHT),
                        backgroundColor: barColor,
                        borderRadius: 4,
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* X-axis labels */}
        <View className="mt-2 flex-row gap-1">
          {history.map((entry, i) => (
            <View key={i} className="flex-1 items-center">
              <ThemedText className="text-[10px] opacity-50">
                {formatLabel(entry.startDate, period)}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>

      {/* Legend */}
      {goalCount > 0 && (
        <View className="mt-2 flex-row items-center justify-center gap-2">
          <View style={{ width: 16, height: 2, backgroundColor: goalLineColor }} />
          <ThemedText className="text-[11px] opacity-60">Goal ({goalCount})</ThemedText>
        </View>
      )}
    </View>
  );
}
