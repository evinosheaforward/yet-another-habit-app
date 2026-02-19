import { useCallback, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Switch, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';

import { getActivities, getUserConfig, updateUserConfig } from '@/api/activities';
import { addTodoItem } from '@/api/todoItems';
import {
  getDayConfigs,
  addDayConfig,
  removeDayConfig,
  reorderDayConfigs,
} from '@/api/todoDayConfigs';
import {
  getDateConfigs,
  addDateConfig,
  removeDateConfig,
  reorderDateConfigs,
  getScheduledDates,
} from '@/api/todoDateConfigs';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import type {
  Activity,
  TodoDayConfig,
  TodoDateConfig,
  UserConfig,
} from '@yet-another-habit-app/shared-types';
import { ActivityPeriod } from '@yet-another-habit-app/shared-types';

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
const CAL_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDate(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function getTodayStr(): string {
  const now = new Date();
  return formatDate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
}

const PERIOD_COLORS: Record<string, string> = {
  daily: 'bg-blue-500/20',
  weekly: 'bg-purple-500/20',
  monthly: 'bg-amber-500/20',
};

const PERIOD_TEXT_COLORS: Record<string, string> = {
  daily: 'text-blue-600 dark:text-blue-400',
  weekly: 'text-purple-600 dark:text-purple-400',
  monthly: 'text-amber-600 dark:text-amber-400',
};

type Tab = 'weekly' | 'calendar';

export default function TodoSettingsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('weekly');

  // --- Shared state ---
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [clearOnNewDay, setClearOnNewDay] = useState(true);
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);

  // --- Weekly tab state ---
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDay());
  const [dayConfigs, setDayConfigs] = useState<TodoDayConfig[]>([]);

  // --- Calendar tab state ---
  const [calYear, setCalYear] = useState(() => new Date().getUTCFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getUTCMonth() + 1); // 1-based
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateConfigs, setDateConfigs] = useState<TodoDateConfig[]>([]);
  const [scheduledDates, setScheduledDates] = useState<Set<string>>(new Set());

  // --- Data loading ---
  const loadDayConfigs = useCallback(async (day: number) => {
    try {
      const data = await getDayConfigs(day);
      setDayConfigs(data);
    } catch {
      // best effort
    }
  }, []);

  const loadDateConfigs = useCallback(async (date: string) => {
    try {
      const data = await getDateConfigs(date);
      setDateConfigs(data);
    } catch {
      // best effort
    }
  }, []);

  const loadScheduledDates = useCallback(async (year: number, month: number) => {
    try {
      const dates = await getScheduledDates(year, month);
      setScheduledDates(new Set(dates));
    } catch {
      // best effort
    }
  }, []);

  const loadUserConfig = useCallback(async () => {
    try {
      const config = await getUserConfig();
      setUserConfig(config);
      setClearOnNewDay(config.clearTodoOnNewDay);
    } catch {
      // best effort
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDayConfigs(selectedDay);
      loadUserConfig();
      loadScheduledDates(calYear, calMonth);
    }, [loadDayConfigs, loadUserConfig, loadScheduledDates, selectedDay, calYear, calMonth]),
  );

  // --- Weekly tab handlers ---
  function handleDaySelect(day: number) {
    setSelectedDay(day);
    loadDayConfigs(day);
  }

  async function handleAddDay(activityId: string) {
    try {
      const config = await addDayConfig(selectedDay, activityId);
      setDayConfigs((prev) => [...prev, config]);

      if (selectedDay === new Date().getDay()) {
        try {
          await addTodoItem(activityId);
        } catch {
          // best effort
        }
      }
    } catch {
      // best effort
    }
  }

  async function handleRemoveDay(configId: string) {
    setDayConfigs((prev) => prev.filter((c) => c.id !== configId));
    try {
      await removeDayConfig(configId);
    } catch {
      loadDayConfigs(selectedDay);
    }
  }

  function handleDayDragEnd({ data }: { data: TodoDayConfig[] }) {
    setDayConfigs(data);
    const orderedIds = data.map((c) => c.id);
    reorderDayConfigs(selectedDay, orderedIds).catch(() => loadDayConfigs(selectedDay));
  }

  // --- Calendar tab handlers ---
  function handleMonthPrev() {
    let y = calYear;
    let m = calMonth - 1;
    if (m < 1) {
      m = 12;
      y--;
    }
    setCalYear(y);
    setCalMonth(m);
    setSelectedDate(null);
    setDateConfigs([]);
    loadScheduledDates(y, m);
  }

  function handleMonthNext() {
    let y = calYear;
    let m = calMonth + 1;
    if (m > 12) {
      m = 1;
      y++;
    }
    setCalYear(y);
    setCalMonth(m);
    setSelectedDate(null);
    setDateConfigs([]);
    loadScheduledDates(y, m);
  }

  function handleDateSelect(date: string) {
    setSelectedDate(date);
    loadDateConfigs(date);
  }

  async function handleAddDate(activityId: string) {
    if (!selectedDate) return;
    try {
      const config = await addDateConfig(selectedDate, activityId);
      setDateConfigs((prev) => [...prev, config]);
      setScheduledDates((prev) => new Set([...prev, selectedDate]));
    } catch {
      // best effort
    }
  }

  async function handleRemoveDate(configId: string) {
    setDateConfigs((prev) => prev.filter((c) => c.id !== configId));
    try {
      await removeDateConfig(configId);
      // Refresh to check if date still has configs
      if (selectedDate) {
        const remaining = await getDateConfigs(selectedDate);
        if (remaining.length === 0) {
          setScheduledDates((prev) => {
            const next = new Set(prev);
            next.delete(selectedDate);
            return next;
          });
        }
      }
    } catch {
      if (selectedDate) loadDateConfigs(selectedDate);
    }
  }

  function handleDateDragEnd({ data }: { data: TodoDateConfig[] }) {
    setDateConfigs(data);
    if (!selectedDate) return;
    const orderedIds = data.map((c) => c.id);
    reorderDateConfigs(selectedDate, orderedIds).catch(() => {
      if (selectedDate) loadDateConfigs(selectedDate);
    });
  }

  // --- Shared handlers ---
  async function openPicker() {
    setPickerOpen(true);
    try {
      const [daily, weekly, monthly] = await Promise.all([
        getActivities(ActivityPeriod.Daily, { force: true }),
        getActivities(ActivityPeriod.Weekly, { force: true }),
        getActivities(ActivityPeriod.Monthly, { force: true }),
      ]);
      setAllActivities([...daily, ...weekly, ...monthly]);
    } catch {
      setAllActivities([]);
    }
  }

  function handlePickerAdd(activityId: string) {
    if (activeTab === 'weekly') {
      handleAddDay(activityId);
    } else {
      handleAddDate(activityId);
    }
  }

  async function handleToggleClear(value: boolean) {
    if (!userConfig) return;
    setClearOnNewDay(value);
    try {
      const updated = await updateUserConfig({ clearTodoOnNewDay: value });
      setUserConfig(updated);
    } catch {
      setClearOnNewDay(!value);
    }
  }

  // --- Calendar grid ---
  function renderCalendarGrid() {
    const monthIndex = calMonth - 1;
    const daysInMonth = new Date(Date.UTC(calYear, monthIndex + 1, 0)).getUTCDate();
    const firstDow = new Date(Date.UTC(calYear, monthIndex, 1)).getUTCDay(); // 0=Sun
    const startOffset = firstDow === 0 ? 6 : firstDow - 1; // Mon=0
    const totalCells = startOffset + daysInMonth;
    const rows = Math.ceil(totalCells / 7);
    const todayStr = getTodayStr();

    const grid: { day: number | null; date: string | null }[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: { day: number | null; date: string | null }[] = [];
      for (let c = 0; c < 7; c++) {
        const idx = r * 7 + c;
        if (idx < startOffset || idx >= startOffset + daysInMonth) {
          row.push({ day: null, date: null });
        } else {
          const d = idx - startOffset + 1;
          row.push({ day: d, date: formatDate(calYear, calMonth, d) });
        }
      }
      grid.push(row);
    }

    return (
      <View className="mb-4">
        {/* Month nav */}
        <View className="mb-3 flex-row items-center justify-between">
          <Pressable
            onPress={handleMonthPrev}
            className="rounded-full bg-black/10 px-3 py-1.5 dark:bg-white/10"
          >
            <ThemedText className="text-[14px] font-semibold text-neutral-900 dark:text-white">
              {'\u2039'}
            </ThemedText>
          </Pressable>
          <ThemedText className="text-[16px] font-bold text-neutral-900 dark:text-white">
            {MONTH_NAMES[monthIndex]} {calYear}
          </ThemedText>
          <Pressable
            onPress={handleMonthNext}
            className="rounded-full bg-black/10 px-3 py-1.5 dark:bg-white/10"
          >
            <ThemedText className="text-[14px] font-semibold text-neutral-900 dark:text-white">
              {'\u203A'}
            </ThemedText>
          </Pressable>
        </View>

        {/* Day headers */}
        <View className="mb-1 flex-row">
          {CAL_DAY_LABELS.map((label) => (
            <View key={label} className="flex-1 items-center">
              <ThemedText className="text-[11px] font-semibold opacity-50">{label}</ThemedText>
            </View>
          ))}
        </View>

        {/* Grid */}
        {grid.map((row, rowIdx) => (
          <View key={rowIdx} className="flex-row">
            {row.map((cell, colIdx) => {
              if (cell.day === null) {
                return <View key={colIdx} className="flex-1 items-center p-0.5" />;
              }

              const isFuture = cell.date! > todayStr;
              const isSelected = cell.date === selectedDate;
              const hasDot = scheduledDates.has(cell.date!);

              return (
                <View key={colIdx} className="flex-1 items-center p-0.5">
                  <Pressable
                    onPress={() => isFuture && handleDateSelect(cell.date!)}
                    disabled={!isFuture}
                    className={[
                      'aspect-square w-full items-center justify-center rounded-md',
                      isSelected
                        ? 'bg-indigo-600 dark:bg-indigo-500'
                        : isFuture
                          ? 'bg-black/5 dark:bg-white/10'
                          : 'bg-neutral-200 dark:bg-neutral-800',
                    ].join(' ')}
                  >
                    <ThemedText
                      className={[
                        'text-[12px] font-medium',
                        isSelected
                          ? 'text-white'
                          : isFuture
                            ? 'text-neutral-900 dark:text-white'
                            : 'text-neutral-400 dark:text-neutral-600',
                      ].join(' ')}
                    >
                      {cell.day}
                    </ThemedText>
                    {hasDot && !isSelected ? (
                      <View className="absolute bottom-0.5 h-1 w-1 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  }

  // --- Render config item (shared badge pattern) ---
  function renderDayConfigItem({ item, drag, isActive }: RenderItemParams<TodoDayConfig>) {
    return (
      <ScaleDecorator>
        <Pressable
          onLongPress={drag}
          disabled={isActive}
          className={[
            'flex-row items-center rounded-[14px] border px-3 py-3',
            isActive
              ? 'border-indigo-500/30 bg-indigo-500/10 dark:border-indigo-400/30 dark:bg-indigo-400/10'
              : 'border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900',
          ].join(' ')}
        >
          <View className="mr-2 items-center justify-center opacity-40">
            <ThemedText className="text-[18px] text-neutral-500">{'\u2261'}</ThemedText>
          </View>
          <View className="flex-1 flex-row flex-wrap items-center gap-1.5">
            <ThemedText className="text-[15px] font-medium text-neutral-900 dark:text-white">
              {item.activityTitle}
            </ThemedText>
            <View
              className={[
                'rounded-full px-2 py-0.5',
                PERIOD_COLORS[item.activityPeriod] ?? 'bg-black/10',
              ].join(' ')}
            >
              <ThemedText
                className={[
                  'text-[11px] font-semibold',
                  PERIOD_TEXT_COLORS[item.activityPeriod] ?? 'text-neutral-600',
                ].join(' ')}
              >
                {capitalize(item.activityPeriod)}
              </ThemedText>
            </View>
            {item.activityTask ? (
              <View className="rounded-full bg-orange-500/20 px-2 py-0.5">
                <ThemedText className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                  Task
                </ThemedText>
              </View>
            ) : (
              <View className="rounded-full bg-emerald-500/15 px-2 py-0.5">
                <ThemedText className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  Habit
                </ThemedText>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => handleRemoveDay(item.id)}
            className="items-center justify-center rounded-full bg-black/10 px-2.5 py-1.5 dark:bg-white/10"
            accessibilityRole="button"
            accessibilityLabel="Remove"
          >
            <ThemedText className="text-[13px] font-bold text-neutral-600 dark:text-neutral-300">
              {'\u2715'}
            </ThemedText>
          </Pressable>
        </Pressable>
      </ScaleDecorator>
    );
  }

  function renderDateConfigItem({ item, drag, isActive }: RenderItemParams<TodoDateConfig>) {
    return (
      <ScaleDecorator>
        <Pressable
          onLongPress={drag}
          disabled={isActive}
          className={[
            'flex-row items-center rounded-[14px] border px-3 py-3',
            isActive
              ? 'border-indigo-500/30 bg-indigo-500/10 dark:border-indigo-400/30 dark:bg-indigo-400/10'
              : 'border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900',
          ].join(' ')}
        >
          <View className="mr-2 items-center justify-center opacity-40">
            <ThemedText className="text-[18px] text-neutral-500">{'\u2261'}</ThemedText>
          </View>
          <View className="flex-1 flex-row flex-wrap items-center gap-1.5">
            <ThemedText className="text-[15px] font-medium text-neutral-900 dark:text-white">
              {item.activityTitle}
            </ThemedText>
            <View
              className={[
                'rounded-full px-2 py-0.5',
                PERIOD_COLORS[item.activityPeriod] ?? 'bg-black/10',
              ].join(' ')}
            >
              <ThemedText
                className={[
                  'text-[11px] font-semibold',
                  PERIOD_TEXT_COLORS[item.activityPeriod] ?? 'text-neutral-600',
                ].join(' ')}
              >
                {capitalize(item.activityPeriod)}
              </ThemedText>
            </View>
            {item.activityTask ? (
              <View className="rounded-full bg-orange-500/20 px-2 py-0.5">
                <ThemedText className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                  Task
                </ThemedText>
              </View>
            ) : (
              <View className="rounded-full bg-emerald-500/15 px-2 py-0.5">
                <ThemedText className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  Habit
                </ThemedText>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => handleRemoveDate(item.id)}
            className="items-center justify-center rounded-full bg-black/10 px-2.5 py-1.5 dark:bg-white/10"
            accessibilityRole="button"
            accessibilityLabel="Remove"
          >
            <ThemedText className="text-[13px] font-bold text-neutral-600 dark:text-neutral-300">
              {'\u2715'}
            </ThemedText>
          </Pressable>
        </Pressable>
      </ScaleDecorator>
    );
  }

  // --- Picker modal title ---
  const pickerTitle =
    activeTab === 'weekly'
      ? `Add to ${DAY_LABELS[selectedDay]}`
      : selectedDate
        ? `Add to ${selectedDate}`
        : 'Add to date';

  // --- Clear toggle section ---
  function renderClearToggle() {
    return (
      <View className="rounded-[14px] border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
        <View className="flex-row items-center justify-between">
          <ThemedText className="text-[15px] font-medium text-neutral-900 dark:text-white">
            Clear todo on new day
          </ThemedText>
          <Switch value={clearOnNewDay} onValueChange={handleToggleClear} />
        </View>
        <ThemedText className="mt-2 text-[13px] text-neutral-500 dark:text-neutral-400">
          {clearOnNewDay
            ? 'Wipes all items and repopulates from the schedule each day.'
            : 'Keeps all existing items and appends new scheduled items below.'}
        </ThemedText>
      </View>
    );
  }

  return (
    <ThemedView className="flex-1 px-4 pt-4">
      {/* Tab switcher */}
      <View className="mb-4 flex-row rounded-full bg-black/5 p-1 dark:bg-white/10">
        <Pressable
          onPress={() => setActiveTab('weekly')}
          className={[
            'flex-1 items-center rounded-full py-2',
            activeTab === 'weekly' ? 'bg-indigo-600 dark:bg-indigo-500' : '',
          ].join(' ')}
        >
          <ThemedText
            className={[
              'text-[14px] font-semibold',
              activeTab === 'weekly' ? 'text-white' : 'text-neutral-900 dark:text-white',
            ].join(' ')}
          >
            Weekly
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('calendar')}
          className={[
            'flex-1 items-center rounded-full py-2',
            activeTab === 'calendar' ? 'bg-indigo-600 dark:bg-indigo-500' : '',
          ].join(' ')}
        >
          <ThemedText
            className={[
              'text-[14px] font-semibold',
              activeTab === 'calendar' ? 'text-white' : 'text-neutral-900 dark:text-white',
            ].join(' ')}
          >
            Calendar
          </ThemedText>
        </Pressable>
      </View>

      {activeTab === 'weekly' ? (
        <>
          {/* Day pills */}
          <View className="mb-4 flex-row justify-between">
            {DAY_LABELS.map((label, i) => (
              <Pressable
                key={label}
                onPress={() => handleDaySelect(i)}
                className={[
                  'items-center rounded-full px-3 py-2',
                  selectedDay === i
                    ? 'bg-indigo-600 dark:bg-indigo-500'
                    : 'bg-black/10 dark:bg-white/10',
                ].join(' ')}
              >
                <ThemedText
                  className={[
                    'text-[13px] font-semibold',
                    selectedDay === i ? 'text-white' : 'text-neutral-900 dark:text-white',
                  ].join(' ')}
                >
                  {label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {/* Configured items list */}
          <DraggableFlatList
            data={dayConfigs}
            keyExtractor={(item) => item.id}
            renderItem={renderDayConfigItem}
            onDragEnd={handleDayDragEnd}
            containerStyle={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              <View className="items-center py-12">
                <ThemedText className="text-[15px] opacity-50 text-neutral-700 dark:text-neutral-300">
                  No items configured for {DAY_LABELS[selectedDay]}
                </ThemedText>
              </View>
            }
            ListFooterComponent={
              <View className="mt-4">
                <Pressable
                  onPress={openPicker}
                  className="mb-6 items-center rounded-[14px] border border-dashed border-black/20 bg-black/5 py-3 dark:border-white/20 dark:bg-white/10"
                >
                  <ThemedText className="text-[14px] font-semibold text-indigo-600 dark:text-indigo-400">
                    + Add
                  </ThemedText>
                </Pressable>
                {renderClearToggle()}
              </View>
            }
          />
        </>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }} style={{ flex: 1 }}>
          {/* Calendar grid */}
          {renderCalendarGrid()}

          {/* Date configs list */}
          {selectedDate ? (
            <>
              <ThemedText className="mb-2 text-[14px] font-semibold text-neutral-700 dark:text-neutral-300">
                Scheduled for {selectedDate}
              </ThemedText>
              <DraggableFlatList
                data={dateConfigs}
                keyExtractor={(item) => item.id}
                renderItem={renderDateConfigItem}
                onDragEnd={handleDateDragEnd}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                ListEmptyComponent={
                  <View className="items-center py-8">
                    <ThemedText className="text-[14px] opacity-50 text-neutral-700 dark:text-neutral-300">
                      No items scheduled for this date
                    </ThemedText>
                  </View>
                }
              />
              <Pressable
                onPress={openPicker}
                className="mt-4 mb-6 items-center rounded-[14px] border border-dashed border-black/20 bg-black/5 py-3 dark:border-white/20 dark:bg-white/10"
              >
                <ThemedText className="text-[14px] font-semibold text-indigo-600 dark:text-indigo-400">
                  + Add
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <View className="items-center py-8">
              <ThemedText className="text-[14px] opacity-50 text-neutral-700 dark:text-neutral-300">
                Select a future date to schedule items
              </ThemedText>
            </View>
          )}

          {renderClearToggle()}
        </ScrollView>
      )}

      {/* Activity picker modal */}
      <Modal
        visible={pickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <ThemedView className="rounded-t-[20px] border-t border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-950">
            <View className="flex-row items-center justify-between mb-3">
              <ThemedText type="subtitle" className="text-neutral-900 dark:text-white">
                {pickerTitle}
              </ThemedText>
              <Pressable
                onPress={() => setPickerOpen(false)}
                className="rounded-full bg-black/10 px-3 py-1.5 dark:bg-white/10"
              >
                <ThemedText className="text-[13px] font-semibold text-neutral-900 dark:text-white">
                  Close
                </ThemedText>
              </Pressable>
            </View>

            <FlatList
              data={allActivities}
              keyExtractor={(a) => a.id}
              style={{ maxHeight: 400 }}
              ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
              ListEmptyComponent={
                <View className="items-center py-8">
                  <ThemedText className="text-[14px] opacity-50 text-neutral-700 dark:text-neutral-300">
                    No activities found
                  </ThemedText>
                </View>
              }
              renderItem={({ item: activity }) => (
                <Pressable
                  onPress={() => handlePickerAdd(activity.id)}
                  className="flex-row items-center rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 dark:border-white/10 dark:bg-white/10"
                >
                  <View className="flex-1 flex-row flex-wrap items-center gap-1.5">
                    <ThemedText className="text-[14px] font-medium text-neutral-900 dark:text-white">
                      {activity.title}
                    </ThemedText>
                    <View
                      className={[
                        'rounded-full px-2 py-0.5',
                        PERIOD_COLORS[activity.period] ?? 'bg-black/10',
                      ].join(' ')}
                    >
                      <ThemedText
                        className={[
                          'text-[11px] font-semibold',
                          PERIOD_TEXT_COLORS[activity.period] ?? 'text-neutral-600',
                        ].join(' ')}
                      >
                        {capitalize(activity.period)}
                      </ThemedText>
                    </View>
                    {activity.task ? (
                      <View className="rounded-full bg-orange-500/20 px-2 py-0.5">
                        <ThemedText className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                          Task
                        </ThemedText>
                      </View>
                    ) : (
                      <View className="rounded-full bg-emerald-500/15 px-2 py-0.5">
                        <ThemedText className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          Habit
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText className="text-[18px] text-indigo-500 dark:text-indigo-400">
                    +
                  </ThemedText>
                </Pressable>
              )}
            />
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}
