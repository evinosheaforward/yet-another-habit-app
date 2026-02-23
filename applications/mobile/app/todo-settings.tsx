import { useCallback, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';

import { createActivity, getActivities, getUserConfig, updateUserConfig } from '@/api/activities';
import { addTodoItem } from '@/api/todoItems';
import {
  getDayConfigs,
  addDayConfig,
  removeDayConfig,
  reorderDayConfigs,
} from '@/api/todoDayConfigs';

import { ActivityPickerModal } from '@/components/activity-picker-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import type { Activity, TodoDayConfig, UserConfig } from '@yet-another-habit-app/shared-types';
import { ActivityPeriod } from '@yet-another-habit-app/shared-types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
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

export default function TodoSettingsScreen() {
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDay());
  const [configs, setConfigs] = useState<TodoDayConfig[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [clearOnNewDay, setClearOnNewDay] = useState(true);
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);

  const loadConfigs = useCallback(async (day: number) => {
    try {
      const data = await getDayConfigs(day);
      setConfigs(data);
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
      loadConfigs(selectedDay);
      loadUserConfig();
    }, [loadConfigs, loadUserConfig, selectedDay]),
  );

  function handleDaySelect(day: number) {
    setSelectedDay(day);
    loadConfigs(day);
  }

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

  async function handleAdd(activityId: string) {
    try {
      const config = await addDayConfig(selectedDay, activityId);
      setConfigs((prev) => [...prev, config]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // If configuring today's day of week, also add to the active todo list
      if (selectedDay === new Date().getDay()) {
        try {
          await addTodoItem(activityId);
        } catch {
          // best effort — may already be in the todo list
        }
      }
    } catch {
      // best effort
    }
  }

  async function handleCreateTask(title: string) {
    const activity = await createActivity({
      title,
      period: ActivityPeriod.Daily,
      goalCount: 1,
      task: true,
      archiveTask: false,
    });
    const config = await addDayConfig(selectedDay, activity.id);
    setConfigs((prev) => [...prev, config]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (selectedDay === new Date().getDay()) {
      try {
        await addTodoItem(activity.id);
      } catch {
        // best effort — may already be in the todo list
      }
    }
  }

  async function handleRemove(configId: string) {
    setConfigs((prev) => prev.filter((c) => c.id !== configId));
    try {
      await removeDayConfig(configId);
    } catch {
      loadConfigs(selectedDay);
    }
  }

  function handleDragEnd({ data }: { data: TodoDayConfig[] }) {
    setConfigs(data);
    const orderedIds = data.map((c) => c.id);
    reorderDayConfigs(selectedDay, orderedIds).catch(() => loadConfigs(selectedDay));
  }

  async function handleToggleClear(value: boolean) {
    setClearOnNewDay(value);
    if (!userConfig) return;
    try {
      const updated = await updateUserConfig({ clearTodoOnNewDay: value });
      setUserConfig(updated);
    } catch {
      setClearOnNewDay(!value);
    }
  }

  function renderConfigItem({ item, drag, isActive }: RenderItemParams<TodoDayConfig>) {
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
          {/* Drag handle */}
          <View className="mr-2 items-center justify-center opacity-40">
            <ThemedText className="text-[18px] text-neutral-500">{'\u2261'}</ThemedText>
          </View>

          {/* Content */}
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
          </View>

          {/* Remove button */}
          <Pressable
            onPress={() => handleRemove(item.id)}
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

  return (
    <ThemedView className="flex-1 px-4 pt-4">
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

      {/* Configured habits list */}
      <DraggableFlatList
        data={configs}
        keyExtractor={(item) => item.id}
        renderItem={renderConfigItem}
        onDragEnd={handleDragEnd}
        containerStyle={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View className="items-center py-12">
            <ThemedText className="text-[15px] opacity-50 text-neutral-700 dark:text-neutral-300">
              No habits configured for {DAY_LABELS[selectedDay]}
            </ThemedText>
          </View>
        }
        ListFooterComponent={
          <View className="mt-4">
            {/* Add Habit button */}
            <Pressable
              onPress={openPicker}
              className="mb-6 items-center rounded-[14px] border border-dashed border-black/20 bg-black/5 py-3 dark:border-white/20 dark:bg-white/10"
            >
              <ThemedText className="text-[14px] font-semibold text-indigo-600 dark:text-indigo-400">
                + Add Habit
              </ThemedText>
            </Pressable>

            {/* Clear toggle */}
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
                  : 'Keeps leftover tasks at the top and appends scheduled habits below.'}
              </ThemedText>
            </View>
          </View>
        }
      />

      <ActivityPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={`Add to ${DAY_LABELS[selectedDay]}`}
        activities={allActivities}
        onAdd={handleAdd}
        onCreateTask={handleCreateTask}
      />
    </ThemedView>
  );
}
