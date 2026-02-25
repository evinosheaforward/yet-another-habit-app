import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated, Pressable, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';

import { useRouter } from 'expo-router';

import {
  getActivities,
  createActivity,
  debouncedUpdateActivityCount,
  archiveActivity,
  deleteActivity,
} from '@/api/activities';
import {
  addTodoItem,
  removeTodoItem,
  reorderTodoItems,
  populateTodoItems,
} from '@/api/todoItems';

import { ActivityPickerModal } from '@/components/activity-picker-modal';
import { CelebrationModal } from '@/components/celebration-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCelebration } from '@/hooks/use-celebration';

import { Activity, ActivityPeriod, CompletedAchievement, TodoItem } from '@yet-another-habit-app/shared-types';
import { useOnboardingTarget } from '@/onboarding/useOnboardingTarget';
import { useOnboarding } from '@/onboarding/OnboardingProvider';

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

export default function TodoScreen() {
  const router = useRouter();
  const { advanceStep } = useOnboarding();
  const { current: celebrationAchievement, celebrate, dismiss: dismissCelebration } = useCelebration();
  const addBtnRef = useOnboardingTarget('todo-add-btn');
  const scheduleBtnRef = useOnboardingTarget('schedule-btn');
  const completeInfoRef = useOnboardingTarget('todo-complete-info');

  const listRef = useRef<any>(null);
  const [items, setItems] = useState<TodoItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Stacked habit prompt
  const [stackPrompt, setStackPrompt] = useState<{
    activityId: string;
    activityTitle: string;
  } | null>(null);

  // "Added!" toast
  const [addedToast, setAddedToast] = useState(false);
  const toastOpacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (addedToast) {
      RNAnimated.timing(toastOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        RNAnimated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          setAddedToast(false);
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [addedToast, toastOpacity]);

  const refresh = useCallback(async () => {
    try {
      setFetchError(null);
      const data = await populateTodoItems();
      setItems(data);
    } catch {
      setFetchError('Failed to load todo list.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

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
      const item = await addTodoItem(activityId);
      setItems((prev) => [...prev, item]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setAddedToast(true);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      // best effort
    }
  }

  async function handleRemove(todoItemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== todoItemId));
    try {
      await removeTodoItem(todoItemId);
    } catch {
      refresh();
    }
  }

  async function handleComplete(item: TodoItem) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Optimistically remove from list
    setItems((prev) => prev.filter((i) => i.id !== item.id));

    debouncedUpdateActivityCount(
      item.activityId,
      1,
      async (_count, habitAchievements) => {
        const allCompleted: CompletedAchievement[] = [...habitAchievements];
        // For tasks: auto-archive or delete
        if (item.activityTask) {
          try {
            if (item.activityArchiveTask) {
              await archiveActivity(item.activityId);
            } else {
              await deleteActivity(item.activityId);
            }
          } catch {
            // best effort
          }
        }
        try {
          const todoAchievements = await removeTodoItem(item.id);
          allCompleted.push(...todoAchievements);
        } catch {
          // already removed optimistically
        }
        celebrate(allCompleted);
        refresh();

        // Trigger stacked habit prompt if applicable
        if (item.stackedActivityId && item.stackedActivityTitle) {
          setStackPrompt({
            activityId: item.stackedActivityId,
            activityTitle: item.stackedActivityTitle,
          });
        }
      },
      () => {
        refresh();
      },
    );
  }

  function handleStackComplete() {
    if (!stackPrompt) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    debouncedUpdateActivityCount(
      stackPrompt.activityId,
      1,
      (_count, achievements) => {
        celebrate(achievements);
        refresh();
      },
      () => {
        refresh();
      },
    );
    setStackPrompt(null);
  }

  async function handleStackAddToTodo() {
    if (!stackPrompt) return;
    try {
      const item = await addTodoItem(stackPrompt.activityId);
      setItems((prev) => [...prev, item]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setAddedToast(true);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      // best effort
    }
    setStackPrompt(null);
  }

  async function handleCreateTask(title: string) {
    const activity = await createActivity({
      title,
      period: ActivityPeriod.Daily,
      goalCount: 1,
      task: true,
      archiveTask: false,
    });
    const item = await addTodoItem(activity.id);
    setItems((prev) => [...prev, item]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAddedToast(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function handleDragEnd({ data }: { data: TodoItem[] }) {
    setItems(data);
    const orderedIds = data.map((i) => i.id);
    reorderTodoItems(orderedIds).catch(() => refresh());
  }

  function renderItem({ item, drag, isActive }: RenderItemParams<TodoItem>) {
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

          {/* Actions */}
          <View className="flex-row items-center gap-1">
            <Pressable
              onPress={() => handleComplete(item)}
              className="items-center justify-center rounded-full bg-emerald-600 px-2.5 py-1.5 dark:bg-emerald-500"
              accessibilityRole="button"
              accessibilityLabel="Complete"
            >
              <ThemedText className="text-[13px] font-bold text-white">{'\u2713'}</ThemedText>
            </Pressable>
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
          </View>
        </Pressable>
      </ScaleDecorator>
    );
  }

  return (
    <ThemedView className="flex-1 px-4 pt-6">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-black/10 pb-2 dark:border-white/10">
        <ThemedText type="title" className="mb-3 text-neutral-900 dark:text-white">
          Todo List
        </ThemedText>

        <View className="flex-row items-center gap-2">
          <Pressable
            ref={scheduleBtnRef}
            onPress={() => {
              advanceStep();
              router.push('/todo-settings');
            }}
            accessibilityRole="button"
            className="rounded-full border border-black/10 bg-black/10 px-3 py-2 dark:border-white/10 dark:bg-white/10"
          >
            <ThemedText className="text-[13px] font-semibold text-neutral-900 dark:text-white">
              Schedule
            </ThemedText>
          </Pressable>
          <Pressable
            ref={addBtnRef}
            onPress={openPicker}
            accessibilityRole="button"
            className="rounded-full border border-black/10 bg-black/10 px-3 py-2 dark:border-white/10 dark:bg-white/10"
          >
            <ThemedText className="text-[13px] font-semibold text-neutral-900 dark:text-white">
              + Add
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Onboarding anchor for completion info */}
      <View ref={completeInfoRef} className="mt-1">
        <ThemedText className="text-[12px] opacity-50 text-neutral-500 dark:text-neutral-400">
          Complete items to track progress
        </ThemedText>
      </View>

      {fetchError ? (
        <View className="mt-4 items-center rounded-[12px] border border-red-500/20 bg-red-500/10 p-3">
          <ThemedText className="text-[13px] text-red-600 dark:text-red-400">
            {fetchError}
          </ThemedText>
          <Pressable
            onPress={refresh}
            className="mt-2 rounded-full bg-black/10 px-3 py-1.5 dark:bg-white/10"
          >
            <ThemedText className="text-[13px] font-semibold text-neutral-900 dark:text-white">
              Retry
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {/* Draggable list */}
      <DraggableFlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        containerStyle={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 28 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View className="items-center py-16">
            <ThemedText className="text-[15px] opacity-50 text-neutral-700 dark:text-neutral-300">
              No items in your todo list
            </ThemedText>
            <Pressable
              onPress={openPicker}
              className="mt-3 rounded-full bg-black/10 px-4 py-2 dark:bg-white/10"
            >
              <ThemedText className="text-[13px] font-semibold text-neutral-900 dark:text-white">
                + Add your first item
              </ThemedText>
            </Pressable>
          </View>
        }
      />

      <ActivityPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add to Todo List"
        activities={allActivities}
        onAdd={handleAdd}
        onCreateTask={handleCreateTask}
      />

      {/* Stacked habit prompt */}
      {stackPrompt ? (
        <View className="absolute bottom-6 left-4 right-4 rounded-[14px] border border-emerald-500/30 bg-emerald-500/10 p-3 dark:border-emerald-400/30 dark:bg-emerald-400/10">
          <ThemedText className="mb-2 text-center text-[14px] font-semibold text-emerald-700 dark:text-emerald-300">
            Stacked habit: {stackPrompt.activityTitle}
          </ThemedText>
          <View className="flex-row justify-center gap-2">
            <Pressable
              onPress={handleStackComplete}
              className="rounded-[10px] bg-emerald-600 px-3 py-2 dark:bg-emerald-500"
            >
              <ThemedText className="text-[13px] font-semibold text-white">
                Complete it now
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleStackAddToTodo}
              className="rounded-[10px] bg-indigo-600 px-3 py-2 dark:bg-indigo-500"
            >
              <ThemedText className="text-[13px] font-semibold text-white">
                Add to todo list
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setStackPrompt(null)}
              className="rounded-[10px] bg-black/10 px-3 py-2 dark:bg-white/10"
            >
              <ThemedText className="text-[13px] font-semibold text-neutral-900 dark:text-white">
                Close
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* "Added!" toast */}
      {addedToast ? (
        <RNAnimated.View
          style={{ opacity: toastOpacity }}
          className="absolute bottom-6 self-center rounded-full bg-emerald-600 px-4 py-2 dark:bg-emerald-500"
          pointerEvents="none"
        >
          <ThemedText className="text-[13px] font-semibold text-white">Added!</ThemedText>
        </RNAnimated.View>
      ) : null}

      <CelebrationModal achievement={celebrationAchievement} onDismiss={dismissCelebration} />
    </ThemedView>
  );
}
