import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
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

import { CelebrationModal } from '@/components/celebration-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCelebration } from '@/hooks/use-celebration';

import { Activity, ActivityPeriod, CompletedAchievement, TodoItem } from '@yet-another-habit-app/shared-types';

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
  const { current: celebrationAchievement, celebrate, dismiss: dismissCelebration } = useCelebration();
   
  const listRef = useRef<any>(null);
  const [items, setItems] = useState<TodoItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

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

  // Inline create task form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

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
      },
      () => {
        refresh();
      },
    );
  }

  async function handleCreateTask() {
    const title = newTaskTitle.trim();
    if (!title) return;

    try {
      setCreatingTask(true);
      const activity = await createActivity({
        title,
        period: ActivityPeriod.Daily,
        goalCount: 1,
        task: true,
        archiveTask: false,
      });
      const item = await addTodoItem(activity.id);
      setItems((prev) => [...prev, item]);
      setNewTaskTitle('');
      setShowCreateForm(false);
      setAddedToast(true);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      // best effort
    } finally {
      setCreatingTask(false);
    }
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
            onPress={() => router.push('/todo-settings')}
            accessibilityRole="button"
            className="rounded-full border border-black/10 bg-black/10 px-3 py-2 dark:border-white/10 dark:bg-white/10"
          >
            <ThemedText className="text-[13px] font-semibold text-neutral-900 dark:text-white">
              Schedule
            </ThemedText>
          </Pressable>
          <Pressable
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

      {/* Picker modal */}
      <Modal
        visible={pickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ThemedView className="rounded-t-[20px] border-t border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-950">
              <View className="flex-row items-center justify-between mb-3">
                <ThemedText type="subtitle" className="text-neutral-900 dark:text-white">
                  Add to Todo List
                </ThemedText>
                <Pressable
                  onPress={() => {
                    setPickerOpen(false);
                    setShowCreateForm(false);
                    setNewTaskTitle('');
                  }}
                  className="rounded-full bg-black/10 px-3 py-1.5 dark:bg-white/10"
                >
                  <ThemedText className="text-[13px] font-semibold text-neutral-900 dark:text-white">
                    Close
                  </ThemedText>
                </Pressable>
              </View>

              {/* Create new task inline */}
              {!showCreateForm ? (
                <Pressable
                  onPress={() => setShowCreateForm(true)}
                  className="mb-3 flex-row items-center rounded-[12px] border border-dashed border-black/20 bg-black/5 px-3 py-2.5 dark:border-white/20 dark:bg-white/10"
                >
                  <ThemedText className="text-[14px] font-semibold text-indigo-600 dark:text-indigo-400">
                    + Create new task
                  </ThemedText>
                </Pressable>
              ) : (
                <View className="mb-3 rounded-[12px] border border-indigo-500/30 bg-indigo-500/5 p-3 dark:border-indigo-400/30 dark:bg-indigo-400/5">
                  <TextInput
                    value={newTaskTitle}
                    onChangeText={setNewTaskTitle}
                    placeholder="Task title"
                    placeholderTextColor="#8E8E93"
                    editable={!creatingTask}
                    className="rounded-[10px] border border-black/10 bg-white px-3 py-2 text-[15px] text-neutral-900 dark:border-white/10 dark:bg-neutral-900 dark:text-white"
                    autoFocus
                  />
                  <View className="mt-2 flex-row gap-2">
                    <Pressable
                      onPress={() => {
                        setShowCreateForm(false);
                        setNewTaskTitle('');
                      }}
                      disabled={creatingTask}
                      className="rounded-[10px] bg-black/5 px-3 py-2 dark:bg-white/10"
                    >
                      <ThemedText className="text-[13px] text-neutral-900 dark:text-white">
                        Cancel
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={handleCreateTask}
                      disabled={creatingTask || !newTaskTitle.trim()}
                      className={[
                        'rounded-[10px] px-3 py-2',
                        newTaskTitle.trim()
                          ? 'bg-indigo-600 dark:bg-indigo-500'
                          : 'bg-black/10 dark:bg-white/10',
                      ].join(' ')}
                    >
                      <ThemedText
                        className={[
                          'text-[13px] font-semibold',
                          newTaskTitle.trim()
                            ? 'text-white'
                            : 'text-neutral-400 dark:text-neutral-500',
                        ].join(' ')}
                      >
                        {creatingTask ? 'Creating...' : 'Create & Add'}
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Activities list */}
              <FlatList
                data={allActivities}
                keyExtractor={(a) => a.id}
                style={{ maxHeight: 350 }}
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
                    onPress={() => handleAdd(activity.id)}
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
          </KeyboardAvoidingView>
        </View>
      </Modal>

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
