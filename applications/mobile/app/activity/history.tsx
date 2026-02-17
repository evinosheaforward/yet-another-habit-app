import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type {
  ActivityCalendar,
  ActivityHistoryEntry,
} from '@yet-another-habit-app/shared-types';

import { getActivityCalendar, getActivityHistory } from '@/api/activities';
import { CalendarHeatmap } from '@/components/calendar-heatmap';
import { ActivityHistoryChart } from '@/components/activity-history-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type ViewMode = 'calendar' | 'chart';

const DEFAULT_PERIOD_COUNTS: Record<string, string> = {
  daily: '7',
  weekly: '8',
  monthly: '6',
};

const PERIOD_LABELS: Record<string, string> = {
  daily: 'days',
  weekly: 'weeks',
  monthly: 'months',
};

export default function ActivityHistoryScreen() {
  const params = useLocalSearchParams<{
    activityId: string;
    period: string;
    goalCount: string;
    title: string;
  }>();

  const activityId = params.activityId;
  const period = params.period ?? 'daily';
  const goalCount = Number(params.goalCount) || 1;

  const [viewMode, setViewMode] = useState<ViewMode>('calendar');

  // Calendar state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getUTCFullYear());
  const [calMonth, setCalMonth] = useState(now.getUTCMonth() + 1); // 1-based
  const [calendarData, setCalendarData] = useState<ActivityCalendar | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Chart state
  const [periodCount, setPeriodCount] = useState(DEFAULT_PERIOD_COUNTS[period] ?? '7');
  const [chartData, setChartData] = useState<{
    history: ActivityHistoryEntry[];
    period: string;
  } | null>(null);
  const [chartLoading, setChartLoading] = useState(false);

  function prevMonth() {
    setCalendarData(null);
    if (calMonth === 1) {
      setCalMonth(12);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    setCalendarData(null);
    if (calMonth === 12) {
      setCalMonth(1);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  }

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  async function handleGraphCalendar() {
    setCalendarLoading(true);
    try {
      const data = await getActivityCalendar(activityId, calYear, calMonth);
      setCalendarData(data);
    } catch {
      // silently ignore
    } finally {
      setCalendarLoading(false);
    }
  }

  async function handleGraphChart() {
    const count = Math.floor(Number(periodCount));
    if (!Number.isFinite(count) || count < 1 || count > 365) return;

    setChartLoading(true);
    try {
      const data = await getActivityHistory(activityId, count);
      setChartData(data);
    } catch {
      // silently ignore
    } finally {
      setChartLoading(false);
    }
  }

  const activePill = 'border-emerald-500 bg-emerald-500/10';
  const inactivePill =
    'border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/10';

  return (
    <ThemedView className="flex-1">
      <ScrollView contentContainerClassName="p-4 pb-10" keyboardShouldPersistTaps="handled">
        {/* Title */}
        <ThemedText className="mb-4 text-[20px] font-bold text-neutral-900 dark:text-white">
          {params.title}
        </ThemedText>

        {/* View mode toggle */}
        <View className="mb-6 flex-row gap-2">
          <Pressable
            onPress={() => setViewMode('calendar')}
            className={`flex-1 items-center rounded-[10px] border px-3 py-2 ${viewMode === 'calendar' ? activePill : inactivePill}`}
          >
            <ThemedText className="text-[14px] font-semibold text-neutral-900 dark:text-white">
              Calendar
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('chart')}
            className={`flex-1 items-center rounded-[10px] border px-3 py-2 ${viewMode === 'chart' ? activePill : inactivePill}`}
          >
            <ThemedText className="text-[14px] font-semibold text-neutral-900 dark:text-white">
              Bar Chart
            </ThemedText>
          </Pressable>
        </View>

        {viewMode === 'calendar' ? (
          <View>
            {/* Month selector */}
            <View className="mb-4 flex-row items-center justify-center gap-4">
              <Pressable onPress={prevMonth} className="px-3 py-1">
                <ThemedText className="text-[20px] font-bold text-neutral-900 dark:text-white">
                  {'<'}
                </ThemedText>
              </Pressable>
              <ThemedText className="text-[16px] font-semibold text-neutral-900 dark:text-white">
                {MONTH_NAMES[calMonth - 1]} {calYear}
              </ThemedText>
              <Pressable onPress={nextMonth} className="px-3 py-1">
                <ThemedText className="text-[20px] font-bold text-neutral-900 dark:text-white">
                  {'>'}
                </ThemedText>
              </Pressable>
            </View>

            {/* Graph it button */}
            <Pressable
              onPress={handleGraphCalendar}
              disabled={calendarLoading}
              className="mb-4 items-center rounded-[12px] bg-black/90 px-4 py-3 dark:bg-white/90"
            >
              <ThemedText lightColor="#ffffff" darkColor="#171717" className="font-semibold">
                {calendarLoading ? 'Loading...' : 'Graph it'}
              </ThemedText>
            </Pressable>

            {/* Calendar heatmap */}
            {calendarLoading ? (
              <View className="items-center py-4">
                <ActivityIndicator size="small" />
              </View>
            ) : calendarData ? (
              <CalendarHeatmap data={calendarData} year={calYear} month={calMonth} />
            ) : null}
          </View>
        ) : (
          <View>
            {/* Period count input */}
            <ThemedText className="mb-1 text-[13px] font-semibold uppercase tracking-wide opacity-60 text-neutral-700 dark:text-neutral-300">
              Number of {PERIOD_LABELS[period] ?? 'periods'}
            </ThemedText>
            <TextInput
              value={periodCount}
              onChangeText={setPeriodCount}
              keyboardType="number-pad"
              className="mb-4 rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 text-[15px] text-neutral-900 dark:border-white/10 dark:bg-white/10 dark:text-white"
            />

            {/* Graph it button */}
            <Pressable
              onPress={handleGraphChart}
              disabled={chartLoading}
              className="mb-4 items-center rounded-[12px] bg-black/90 px-4 py-3 dark:bg-white/90"
            >
              <ThemedText lightColor="#ffffff" darkColor="#171717" className="font-semibold">
                {chartLoading ? 'Loading...' : 'Graph it'}
              </ThemedText>
            </Pressable>

            {/* Bar chart */}
            {chartLoading ? (
              <View className="items-center py-4">
                <ActivityIndicator size="small" />
              </View>
            ) : chartData ? (
              <ActivityHistoryChart
                history={chartData.history}
                goalCount={goalCount}
                period={chartData.period}
              />
            ) : null}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}
