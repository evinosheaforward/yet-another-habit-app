import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
  createActivity,
  getActivities,
  debouncedUpdateActivityCount,
  deleteActivity,
  archiveActivity,
} from '@/api/activities';

import { Collapsible } from '@/components/ui/collapsible';
import { CelebrationModal } from '@/components/celebration-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCelebration } from '@/hooks/use-celebration';

import { Activity, ActivityPeriod } from '@yet-another-habit-app/shared-types';
import { useOnboardingTarget } from '@/onboarding/useOnboardingTarget';
import { useOnboarding } from '@/onboarding/OnboardingProvider';

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ActivitiesScreen() {
  const router = useRouter();
  const {
    current: celebrationAchievement,
    celebrate,
    dismiss: dismissCelebration,
  } = useCelebration();
  const [period, setPeriod] = useState<ActivityPeriod>(ActivityPeriod.Daily);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const createBtnRef = useOnboardingTarget('create-activity-btn');
  const stackingInfoRef = useOnboardingTarget('stacking-info');
  const historyBtnRef = useOnboardingTarget('history-btn');
  const newHabitRef = useOnboardingTarget('new-habit-item');
  const newHabitCompleteRef = useOnboardingTarget('new-habit-complete-btn');
  const newHabitDetailsRef = useOnboardingTarget('new-habit-details-btn');
  const { advanceStep, triggerHook, activeStepId } = useOnboarding();
  const [newHabitId, setNewHabitId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newGoalCount, setNewGoalCount] = useState('');
  const [newStackedActivityId, setNewStackedActivityId] = useState<string | null>(null);
  const [showCreateStackPicker, setShowCreateStackPicker] = useState(false);
  const [stackPickerActivities, setStackPickerActivities] = useState<Activity[]>([]);
  const [isTask, setIsTask] = useState(false);
  const [archiveTask, setArchiveTask] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setFetchError(null);
      const data = await getActivities(period, { force: true });
      setActivities(data);
    } catch {
      setFetchError('Failed to load activities.');
    }
  }, [period]);

  async function onCreate() {
    setCreateError(null);

    const title = newTitle.trim();
    if (!title) {
      setCreateError('Title is required.');
      return;
    }

    let goalCount = 1;
    if (!isTask) {
      const rawGoal = newGoalCount.trim();
      if (rawGoal === '' || !/^\d+$/.test(rawGoal)) {
        setCreateError('Goal count must be a positive whole number.');
        return;
      }
      goalCount = Number(rawGoal);
      if (goalCount < 1) {
        setCreateError('Goal count must be at least 1.');
        return;
      }
    }

    try {
      setSaving(true);
      const created = await createActivity({
        title,
        description: newDescription.trim(),
        period,
        goalCount,
        stackedActivityId: newStackedActivityId,
        task: isTask || undefined,
        archiveTask: isTask && archiveTask ? true : undefined,
      });

      setCreateOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewGoalCount('');
      setNewStackedActivityId(null);
      setShowCreateStackPicker(false);
      setStackPickerActivities([]);
      setIsTask(false);
      setArchiveTask(false);
      await refresh();

      // Only trigger the onboarding hook for habits, not one-off tasks
      if (!created.task) {
        const hookTriggered = triggerHook('first-habit-created');
        if (hookTriggered) {
          setNewHabitId(created.id);
        }
      }
    } catch (e: any) {
      setCreateError(e?.message ?? 'Failed to create activity.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setFetchError(null);
        const data = await getActivities(period);
        if (!cancelled) {
          setActivities(data);
          setOpenId(null);
        }
      } catch {
        if (!cancelled) setFetchError('Failed to load activities.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [period]);

  // Re-fetch when screen regains focus (e.g. returning from detail page)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Auto-expand the new habit's collapsible when steps inside it activate
  useEffect(() => {
    if ((activeStepId === 'habit-complete' || activeStepId === 'habit-details') && newHabitId) {
      setOpenId(newHabitId);
    }
  }, [activeStepId, newHabitId]);

  // Navigate to detail page when habit-details step completes (via "Next" button)
  const prevStepRef = useRef(activeStepId);
  useEffect(() => {
    if (prevStepRef.current === 'habit-details' && activeStepId !== 'habit-details' && newHabitId) {
      const item = activities.find((a) => a.id === newHabitId);
      if (item) {
        router.push({
          pathname: '/activity/[id]',
          params: {
            id: item.id,
            title: item.title,
            description: item.description,
            goalCount: String(item.goalCount),
            count: String(item.count),
            completionPercent: String(item.completionPercent),
            period: item.period,
            stackedActivityId: item.stackedActivityId ?? '',
            stackedActivityTitle: item.stackedActivityTitle ?? '',
          },
        });
      }
    }
    prevStepRef.current = activeStepId;
  }, [activeStepId, newHabitId, activities, router]);

  function toggleActivity(id: string) {
    setOpenId((cur) => (cur === id ? null : id));
  }

  function handleDelta(activityId: string, delta: number) {
    const activity = activities.find((a) => a.id === activityId);

    // Optimistic update
    setActivities((prev) =>
      prev.map((a) => {
        if (a.id !== activityId) return a;
        const newCount = Math.max(0, a.count + delta);
        const completionPercent =
          a.goalCount > 0 ? Math.min(100, Math.round((newCount / a.goalCount) * 100)) : 0;
        return { ...a, count: newCount, completionPercent };
      }),
    );

    // For tasks: auto-remove on completion
    if (activity?.task && delta > 0 && activity.count + delta >= activity.goalCount) {
      // Optimistically remove from list
      setActivities((prev) => prev.filter((a) => a.id !== activityId));

      debouncedUpdateActivityCount(
        activityId,
        delta,
        async (_count, completedAchievements) => {
          celebrate(completedAchievements);
          try {
            if (activity.archiveTask) {
              await archiveActivity(activityId);
            } else {
              await deleteActivity(activityId);
            }
          } catch {
            // Best effort — refresh will reconcile
          }
          refresh();

          // Navigate to stacked activity
          if (activity.stackedActivityId) {
            const stacked = activities.find((a) => a.id === activity.stackedActivityId);
            if (stacked) {
              router.push({
                pathname: '/activity/[id]',
                params: {
                  id: stacked.id,
                  title: stacked.title,
                  description: stacked.description,
                  goalCount: String(stacked.goalCount),
                  count: String(stacked.count),
                  completionPercent: String(stacked.completionPercent),
                  period: stacked.period,
                  stackedActivityId: stacked.stackedActivityId ?? '',
                  stackedActivityTitle: stacked.stackedActivityTitle ?? '',
                  showStackPrompt: '1',
                },
              });
            }
          }
        },
        () => {
          refresh();
        },
      );
      return;
    }

    debouncedUpdateActivityCount(
      activityId,
      delta,
      (_count, completedAchievements) => {
        celebrate(completedAchievements);
        refresh();

        // Navigate to stacked activity on increment
        if (delta > 0) {
          const source = activities.find((a) => a.id === activityId);
          if (source?.stackedActivityId) {
            const stacked = activities.find((a) => a.id === source.stackedActivityId);
            if (stacked) {
              router.push({
                pathname: '/activity/[id]',
                params: {
                  id: stacked.id,
                  title: stacked.title,
                  description: stacked.description,
                  goalCount: String(stacked.goalCount),
                  count: String(stacked.count),
                  completionPercent: String(stacked.completionPercent),
                  period: stacked.period,
                  stackedActivityId: stacked.stackedActivityId ?? '',
                  stackedActivityTitle: stacked.stackedActivityTitle ?? '',
                  showStackPrompt: '1',
                },
              });
            }
          }
        }
      },
      () => {
        // Revert on error by refreshing
        refresh();
      },
    );
  }

  return (
    <ThemedView className="flex-1 px-4 pt-6">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-black/10 pb-2 dark:border-white/10">
        <ThemedText type="title" className="mb-3 text-neutral-900 dark:text-white">
          Activities
        </ThemedText>

        <Pressable
          ref={createBtnRef}
          onPress={() => {
            setCreateOpen(true);
            advanceStep();
          }}
          accessibilityRole="button"
          className="rounded-full border border-black/10 bg-black/10 px-3 py-2 dark:border-white/10 dark:bg-white/10"
        >
          <ThemedText className="text-[13px] font-semibold text-neutral-900 dark:text-white">
            + Create
          </ThemedText>
        </Pressable>
      </View>

      {/* Onboarding anchors */}
      <View className="mt-2 flex-row items-center justify-between">
        <View ref={historyBtnRef}>
          <ThemedText className="text-[12px] opacity-50 text-neutral-500 dark:text-neutral-400">
            Tap an activity for history
          </ThemedText>
        </View>
      </View>

      {/* Period pills */}
      <View className="mt-2 flex-row gap-1 rounded-full border border-black/10 bg-black/5 p-1 dark:border-white/10 dark:bg-white/10">
        {Object.values(ActivityPeriod).map((p) => {
          const active = p === period;
          return (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={[
                'flex-1 items-center justify-center rounded-full py-2.5',
                active ? 'bg-black/10 dark:bg-white/15' : 'bg-transparent',
              ].join(' ')}
            >
              <ThemedText
                className={[
                  'text-[13px] text-neutral-900 dark:text-white',
                  active ? 'opacity-100' : 'opacity-75',
                ].join(' ')}
              >
                {capitalize(p)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Create modal */}
      <Modal
        visible={createOpen}
        animationType="fade"
        transparent
        onRequestClose={() => (saving ? null : setCreateOpen(false))}
      >
        <View className="flex-1 justify-center bg-black/50 p-[18px]">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ThemedView className="rounded-[14px] border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-950">
              <ThemedText type="subtitle" className="mb-1 text-neutral-900 dark:text-white">
                Create activity
              </ThemedText>

              <ThemedText className="mb-2 opacity-75 text-neutral-700 dark:text-neutral-300">
                Period:{' '}
                <ThemedText className="font-semibold text-neutral-900 dark:text-white">
                  {capitalize(period)}
                </ThemedText>
              </ThemedText>

              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Title"
                placeholderTextColor="#8E8E93"
                editable={!saving}
                className="mt-2 rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 text-[15px] text-neutral-900 dark:border-white/10 dark:bg-white/10 dark:text-white"
              />

              <TextInput
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder="Description (optional)"
                placeholderTextColor="#8E8E93"
                editable={!saving}
                multiline
                textAlignVertical="top"
                className="mt-2 min-h-[90px] rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 text-[15px] text-neutral-900 dark:border-white/10 dark:bg-white/10 dark:text-white"
              />

              {!isTask ? (
                <TextInput
                  value={newGoalCount}
                  onChangeText={setNewGoalCount}
                  placeholder="Goal count (times per period)"
                  placeholderTextColor="#8E8E93"
                  editable={!saving}
                  keyboardType="number-pad"
                  className="mt-2 rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 text-[15px] text-neutral-900 dark:border-white/10 dark:bg-white/10 dark:text-white"
                />
              ) : null}

              <View>
                <Pressable
                  onPress={() => {
                    setIsTask((v) => !v);
                    if (!isTask) setArchiveTask(false);
                  }}
                  disabled={saving}
                  className="mt-2 flex-row items-center justify-between rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 dark:border-white/10 dark:bg-white/10"
                >
                  <ThemedText className="text-[15px] text-neutral-900 dark:text-white">
                    One-off task
                  </ThemedText>
                  <View
                    className={[
                      'h-6 w-6 items-center justify-center rounded-full',
                      isTask
                        ? 'bg-emerald-600 dark:bg-emerald-500'
                        : 'border border-black/20 bg-transparent dark:border-white/20',
                    ].join(' ')}
                  >
                    {isTask ? (
                      <ThemedText className="text-[13px] font-bold text-white">
                        {'\u2713'}
                      </ThemedText>
                    ) : null}
                  </View>
                </Pressable>
                <ThemedText
                  className={[
                    'mt-1 px-1 text-[12px] leading-4 text-neutral-700 dark:text-neutral-300',
                    isTask ? 'font-semibold opacity-70' : 'opacity-50',
                  ].join(' ')}
                >
                  (will be deleted/archived when complete)
                </ThemedText>
              </View>

              {isTask ? (
                <Pressable
                  onPress={() => setArchiveTask((v) => !v)}
                  disabled={saving}
                  className="mt-2 flex-row items-center justify-between rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 dark:border-white/10 dark:bg-white/10"
                >
                  <ThemedText className="text-[15px] text-neutral-900 dark:text-white">
                    Archive instead of delete?
                  </ThemedText>
                  <View
                    className={[
                      'h-6 w-6 items-center justify-center rounded-full',
                      archiveTask
                        ? 'bg-emerald-600 dark:bg-emerald-500'
                        : 'border border-black/20 bg-transparent dark:border-white/20',
                    ].join(' ')}
                  >
                    {archiveTask ? (
                      <ThemedText className="text-[13px] font-bold text-white">
                        {'\u2713'}
                      </ThemedText>
                    ) : null}
                  </View>
                </Pressable>
              ) : null}

              <ThemedText className="mb-1 mt-3 text-[13px] font-semibold uppercase tracking-wide opacity-50 text-neutral-700 dark:text-neutral-300">
                Stack with (optional)
              </ThemedText>
              <Pressable
                onPress={() => {
                  setShowCreateStackPicker((v) => {
                    if (!v) {
                      Promise.all([
                        getActivities(ActivityPeriod.Daily),
                        getActivities(ActivityPeriod.Weekly),
                        getActivities(ActivityPeriod.Monthly),
                      ])
                        .then(([d, w, m]) => setStackPickerActivities([...d, ...w, ...m]))
                        .catch(() => {});
                    }
                    return !v;
                  });
                }}
                className="rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 dark:border-white/10 dark:bg-white/10"
              >
                <ThemedText
                  className={[
                    'text-[15px]',
                    newStackedActivityId
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-neutral-500 dark:text-neutral-400',
                  ].join(' ')}
                >
                  {stackPickerActivities.find((a) => a.id === newStackedActivityId)?.title ??
                    activities.find((a) => a.id === newStackedActivityId)?.title ??
                    'None'}
                </ThemedText>
              </Pressable>
              {showCreateStackPicker ? (
                <View className="mt-1">
                  <Pressable
                    onPress={() => {
                      setNewStackedActivityId(null);
                      setShowCreateStackPicker(false);
                    }}
                    className={[
                      'rounded-[10px] border px-3 py-2',
                      !newStackedActivityId
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/10',
                    ].join(' ')}
                  >
                    <ThemedText className="text-[14px] text-neutral-900 dark:text-white">
                      None
                    </ThemedText>
                  </Pressable>
                  {stackPickerActivities.map((a) => (
                    <Pressable
                      key={a.id}
                      onPress={() => {
                        setNewStackedActivityId(a.id);
                        setShowCreateStackPicker(false);
                      }}
                      className={[
                        'mt-1 flex-row items-center gap-1.5 rounded-[10px] border px-3 py-2',
                        newStackedActivityId === a.id
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/10',
                      ].join(' ')}
                    >
                      <ThemedText className="text-[14px] text-neutral-900 dark:text-white">
                        {a.title}
                      </ThemedText>
                      <View className="rounded-full bg-black/10 px-1.5 py-0.5 dark:bg-white/10">
                        <ThemedText className="text-[11px] font-semibold capitalize text-neutral-600 dark:text-neutral-400">
                          {a.period}
                        </ThemedText>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {createError ? (
                <ThemedText className="mt-2 text-[13px] text-red-600 dark:text-red-400">
                  {createError}
                </ThemedText>
              ) : null}

              <View className="mt-4 flex-row justify-end gap-2.5">
                <Pressable
                  onPress={() => setCreateOpen(false)}
                  disabled={saving}
                  className={[
                    'rounded-[12px] px-3.5 py-2.5',
                    'bg-black/5 dark:bg-white/10',
                    saving ? 'opacity-50' : 'opacity-100',
                  ].join(' ')}
                >
                  <ThemedText className="text-neutral-900 dark:text-white">Cancel</ThemedText>
                </Pressable>

                <Pressable
                  onPress={onCreate}
                  disabled={saving}
                  className="rounded-[12px] px-3.5 py-2.5 bg-black/90 dark:bg-white/90 opacity-100"
                >
                  <ThemedText lightColor="#ffffff" darkColor="#171717">
                    {saving ? 'Creating...' : 'Create'}
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

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

      {/* List */}
      <FlatList
        data={activities}
        keyExtractor={(a) => a.id}
        contentContainerClassName="pt-4 pb-7"
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={
          <View className="items-center py-16">
            <ThemedText className="text-[15px] opacity-50 text-neutral-700 dark:text-neutral-300">
              No activities yet
            </ThemedText>
            <Pressable
              onPress={() => setCreateOpen(true)}
              className="mt-3 rounded-full bg-black/10 px-4 py-2 dark:bg-white/10"
            >
              <ThemedText className="text-[13px] font-semibold text-neutral-900 dark:text-white">
                + Create your first activity
              </ThemedText>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const isNewHabit = item.id === newHabitId;

          const collapsible = (
            <Collapsible
              title={item.title}
              progressPct={item.completionPercent}
              isOpen={openId === item.id}
              onToggle={() => {
                toggleActivity(item.id);
                if (isNewHabit && activeStepId === 'habit-expand') {
                  advanceStep();
                }
              }}
              badge={item.task ? 'Task' : 'Habit'}
            >
              {item.description ? (
                <ThemedText className="opacity-75 leading-5 text-neutral-700 dark:text-neutral-300">
                  {item.description}
                </ThemedText>
              ) : null}

              {item.stackedActivityTitle ? (
                <ThemedText className="mt-1.5 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Followed by: {item.stackedActivityTitle}
                </ThemedText>
              ) : null}

              <Pressable
                ref={isNewHabit ? newHabitCompleteRef : undefined}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  handleDelta(item.id, 1);
                }}
                accessibilityRole="button"
                className="mt-2.5 flex-row items-center justify-center gap-2 rounded-[10px] bg-emerald-600 px-4 py-2.5 dark:bg-emerald-500"
              >
                <ThemedText className="text-[14px] font-semibold text-white">
                  {item.completionPercent >= 100
                    ? '\u2713'
                    : `${item.count} / ${item.goalCount}`}
                </ThemedText>
                <ThemedText className="text-[14px] font-semibold text-white">
                  Complete
                </ThemedText>
              </Pressable>

              {!item.task ? (
                <Pressable
                  ref={isNewHabit ? newHabitDetailsRef : undefined}
                  onPress={() => {
                    if (isNewHabit && activeStepId === 'habit-details') {
                      advanceStep();
                      return;
                    }
                    router.push({
                      pathname: '/activity/[id]',
                      params: {
                        id: item.id,
                        title: item.title,
                        description: item.description,
                        goalCount: String(item.goalCount),
                        count: String(item.count),
                        completionPercent: String(item.completionPercent),
                        period: item.period,
                        stackedActivityId: item.stackedActivityId ?? '',
                        stackedActivityTitle: item.stackedActivityTitle ?? '',
                      },
                    });
                  }}
                  accessibilityRole="button"
                  className="mt-3 items-center rounded-[10px] border border-black/10 bg-black/5 px-3 py-2 dark:border-white/10 dark:bg-white/10"
                >
                  <ThemedText className="text-[13px] font-semibold text-neutral-900 dark:text-white">
                    Details
                  </ThemedText>
                </Pressable>
              ) : null}
            </Collapsible>
          );

          if (isNewHabit) {
            return (
              <View ref={newHabitRef} collapsable={false}>
                {collapsible}
              </View>
            );
          }
          return collapsible;
        }}
      />

      <CelebrationModal achievement={celebrationAchievement} onDismiss={dismissCelebration} />
    </ThemedView>
  );
}
