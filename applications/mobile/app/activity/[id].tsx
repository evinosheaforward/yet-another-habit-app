import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type {
  Activity,
  ActivityHistoryEntry,
  ActivityPeriod,
} from '@yet-another-habit-app/shared-types';

import {
  archiveActivity,
  deleteActivity,
  getActivities,
  unarchiveActivity,
  updateActivity,
  debouncedUpdateActivityCount,
  getActivityHistory,
} from '@/api/activities';
import { ActivityCountControls } from '@/components/activity-count-controls';
import { ActivityHistoryChart } from '@/components/activity-history-chart';
import { CelebrationModal } from '@/components/celebration-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCelebration } from '@/hooks/use-celebration';

export default function ActivityDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    description: string;
    goalCount: string;
    count: string;
    completionPercent: string;
    period: string;
    stackedActivityId: string;
    stackedActivityTitle: string;
    showStackPrompt: string;
    archived: string;
  }>();

  const { current: celebrationAchievement, celebrate, dismiss: dismissCelebration } = useCelebration();
  const activityId = params.id;
  const initialGoalCount = Number(params.goalCount) || 1;

  const [title, setTitle] = useState(params.title ?? '');
  const [description, setDescription] = useState(params.description ?? '');
  const [goalCount, setGoalCount] = useState(String(initialGoalCount));
  const [count, setCount] = useState(Number(params.count) || 0);

  const currentGoal = Number(goalCount) || 0;
  const completionPercent =
    currentGoal > 0 ? Math.min(100, Math.round((count / currentGoal) * 100)) : 0;

  const [history, setHistory] = useState<ActivityHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const isArchived = params.archived === 'true';
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Stacking state
  const [stackedActivityId, setStackedActivityId] = useState<string | null>(
    params.stackedActivityId || null,
  );
  const [stackedActivityTitle, setStackedActivityTitle] = useState<string | null>(
    params.stackedActivityTitle || null,
  );
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [showStackPicker, setShowStackPicker] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    getActivityHistory(activityId)
      .then((result) => {
        if (!cancelled) setHistory(result.history);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  // Fetch all activities for the stack picker (cross-period)
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getActivities('daily' as ActivityPeriod),
      getActivities('weekly' as ActivityPeriod),
      getActivities('monthly' as ActivityPeriod),
    ])
      .then(([daily, weekly, monthly]) => {
        if (!cancelled) {
          setAllActivities(
            [...daily, ...weekly, ...monthly].filter((a) => a.id !== activityId),
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  function handleDelta(delta: number) {
    const newCount = Math.max(0, count + delta);
    setCount(newCount);

    debouncedUpdateActivityCount(
      activityId,
      delta,
      (serverCount, completedAchievements) => {
        setCount(serverCount);
        celebrate(completedAchievements);

        // Navigate to stacked activity on increment
        if (delta > 0 && stackedActivityId) {
          const stacked = allActivities.find((a) => a.id === stackedActivityId);
          if (stacked) {
            router.replace({
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
      () => {},
    );
  }

  async function handleSave() {
    setError(null);
    setSaved(false);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }

    const rawGoal = goalCount.trim();
    if (rawGoal === '' || !/^\d+$/.test(rawGoal)) {
      setError('Goal count must be a positive whole number.');
      return;
    }
    const parsedGoal = Number(rawGoal);
    if (parsedGoal < 1) {
      setError('Goal count must be at least 1.');
      return;
    }

    const updates: {
      title?: string;
      description?: string;
      goalCount?: number;
      stackedActivityId?: string | null;
    } = {};
    if (trimmedTitle !== params.title) updates.title = trimmedTitle;
    if (description !== (params.description ?? '')) updates.description = description;
    if (parsedGoal !== initialGoalCount) updates.goalCount = parsedGoal;

    const initialStackedId = params.stackedActivityId || null;
    if (stackedActivityId !== initialStackedId) updates.stackedActivityId = stackedActivityId;

    if (Object.keys(updates).length === 0) {
      setSaved(true);
      return;
    }

    try {
      setSaving(true);
      await updateActivity(activityId, updates);
      setSaved(true);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Delete Activity?',
      'This will permanently delete this activity and all its history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteActivity(activityId);
              router.back();
            } catch (e: any) {
              setError(e?.message ?? 'Failed to delete activity.');
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <ThemedView className="flex-1">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerClassName="p-4 pb-10" keyboardShouldPersistTaps="handled">
          {/* Stack prompt banner */}
          {params.showStackPrompt === '1' && !promptDismissed ? (
            <View className="mb-4 rounded-[12px] border border-emerald-500/30 bg-emerald-500/10 p-3">
              <ThemedText className="mb-2 text-center text-[15px] font-semibold text-emerald-700 dark:text-emerald-300">
                Did you complete {params.title}?
              </ThemedText>
              <View className="flex-row justify-center gap-3">
                <Pressable
                  onPress={() => {
                    handleDelta(1);
                    setPromptDismissed(true);
                  }}
                  className="rounded-[10px] bg-emerald-600 px-4 py-2 dark:bg-emerald-500"
                >
                  <ThemedText className="font-semibold text-white">Yes</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setPromptDismissed(true)}
                  className="rounded-[10px] bg-black/10 px-4 py-2 dark:bg-white/10"
                >
                  <ThemedText className="font-semibold text-neutral-900 dark:text-white">
                    No
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Period badge */}
          <View className="mb-4 flex-row">
            <View className="rounded-full bg-black/10 px-3 py-1 dark:bg-white/10">
              <ThemedText className="text-[13px] font-semibold capitalize text-neutral-900 dark:text-white">
                {params.period}
              </ThemedText>
            </View>
          </View>

          {/* History chart */}
          {historyLoading ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" />
            </View>
          ) : (
            <ActivityHistoryChart
              history={history}
              goalCount={currentGoal}
              period={params.period ?? 'daily'}
            />
          )}

          {/* Detailed History link */}
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/activity/history',
                params: {
                  activityId,
                  period: params.period ?? 'daily',
                  goalCount: String(currentGoal),
                  title: title || params.title || '',
                },
              })
            }
            className="mt-4 items-center rounded-[12px] border border-black/10 bg-black/5 px-4 py-2.5 dark:border-white/10 dark:bg-white/10"
          >
            <ThemedText className="text-[14px] font-semibold text-neutral-900 dark:text-white">
              Detailed History
            </ThemedText>
          </Pressable>

          {/* Count controls */}
          <View className="mt-6 items-center">
            <ThemedText className="mb-2 text-[13px] font-semibold uppercase tracking-wide opacity-50 text-neutral-700 dark:text-neutral-300">
              Current Progress
            </ThemedText>
            <ActivityCountControls
              count={count}
              goalCount={currentGoal}
              completionPercent={completionPercent}
              onIncrement={() => handleDelta(1)}
              onDecrement={() => handleDelta(-1)}
            />
          </View>

          {/* Settings section header */}
          <ThemedText type="subtitle" className="mb-1 mt-8 text-neutral-900 dark:text-white">
            Settings
          </ThemedText>

          {/* Title */}
          <ThemedText className="mb-1 mt-4 text-[13px] font-semibold uppercase tracking-wide opacity-50 text-neutral-700 dark:text-neutral-300">
            Title
          </ThemedText>
          <TextInput
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              setSaved(false);
            }}
            editable={!saving}
            className="rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 text-[15px] text-neutral-900 dark:border-white/10 dark:bg-white/10 dark:text-white"
          />

          {/* Description */}
          <ThemedText className="mb-1 mt-4 text-[13px] font-semibold uppercase tracking-wide opacity-50 text-neutral-700 dark:text-neutral-300">
            Description
          </ThemedText>
          <TextInput
            value={description}
            onChangeText={(t) => {
              setDescription(t);
              setSaved(false);
            }}
            editable={!saving}
            multiline
            textAlignVertical="top"
            placeholder="No description"
            placeholderTextColor="#8E8E93"
            className="min-h-[90px] rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 text-[15px] text-neutral-900 dark:border-white/10 dark:bg-white/10 dark:text-white"
          />

          {/* Goal count */}
          <ThemedText className="mb-1 mt-4 text-[13px] font-semibold uppercase tracking-wide opacity-50 text-neutral-700 dark:text-neutral-300">
            Goal Count
          </ThemedText>
          <TextInput
            value={goalCount}
            onChangeText={(t) => {
              setGoalCount(t);
              setSaved(false);
            }}
            editable={!saving}
            keyboardType="number-pad"
            className="rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 text-[15px] text-neutral-900 dark:border-white/10 dark:bg-white/10 dark:text-white"
          />

          {/* Stacked habit picker */}
          <ThemedText className="mb-1 mt-4 text-[13px] font-semibold uppercase tracking-wide opacity-50 text-neutral-700 dark:text-neutral-300">
            Stack With
          </ThemedText>
          <Pressable
            onPress={() => setShowStackPicker((v) => !v)}
            className="rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 dark:border-white/10 dark:bg-white/10"
          >
            <ThemedText
              className={[
                'text-[15px]',
                stackedActivityTitle
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-neutral-500 dark:text-neutral-400',
              ].join(' ')}
            >
              {stackedActivityTitle ?? 'None'}
            </ThemedText>
          </Pressable>

          {showStackPicker ? (
            <View className="mt-1">
              <Pressable
                onPress={() => {
                  setStackedActivityId(null);
                  setStackedActivityTitle(null);
                  setShowStackPicker(false);
                  setSaved(false);
                }}
                className={[
                  'rounded-[10px] border px-3 py-2',
                  !stackedActivityId
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/10',
                ].join(' ')}
              >
                <ThemedText className="text-[14px] text-neutral-900 dark:text-white">
                  None
                </ThemedText>
              </Pressable>
              {allActivities.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => {
                    setStackedActivityId(a.id);
                    setStackedActivityTitle(a.title);
                    setShowStackPicker(false);
                    setSaved(false);
                  }}
                  className={[
                    'mt-1 flex-row items-center gap-1.5 rounded-[10px] border px-3 py-2',
                    stackedActivityId === a.id
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

          {/* Error */}
          {error ? (
            <ThemedText className="mt-4 text-center text-[13px] text-red-600 dark:text-red-400">{error}</ThemedText>
          ) : null}

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            disabled={saving || deleting}
            className="mt-6 items-center rounded-[12px] bg-black/90 px-4 py-3 dark:bg-white/90"
          >
            <ThemedText lightColor="#ffffff" darkColor="#171717" className="font-semibold">
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </ThemedText>
          </Pressable>

          {/* Archive / Unarchive button */}
          <Pressable
            onPress={async () => {
              try {
                setArchiving(true);
                if (isArchived) {
                  await unarchiveActivity(activityId);
                } else {
                  await archiveActivity(activityId);
                }
                router.back();
              } catch (e: any) {
                setError(e?.message ?? 'Failed to update archive status.');
                setArchiving(false);
              }
            }}
            disabled={archiving || saving || deleting}
            className={[
              'mt-3 items-center rounded-[12px] border border-black/10 bg-black/5 px-4 py-3 dark:border-white/10 dark:bg-white/10',
              archiving || saving || deleting ? 'opacity-50' : 'opacity-100',
            ].join(' ')}
          >
            <ThemedText className="font-semibold text-neutral-900 dark:text-white">
              {isArchived
                ? archiving
                  ? 'Unarchiving...'
                  : 'Unarchive Activity'
                : archiving
                  ? 'Archiving...'
                  : 'Archive Activity'}
            </ThemedText>
          </Pressable>

          {/* Delete button */}
          <Pressable
            onPress={handleDelete}
            disabled={deleting || saving || archiving}
            className={[
              'mt-3 items-center rounded-[12px] border border-red-500/30 bg-red-500/10 px-4 py-3',
              deleting || saving || archiving ? 'opacity-50' : 'opacity-100',
            ].join(' ')}
          >
            <ThemedText className="font-semibold text-red-600 dark:text-red-400">
              {deleting ? 'Deleting...' : 'Delete Activity'}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <CelebrationModal achievement={celebrationAchievement} onDismiss={dismissCelebration} />
    </ThemedView>
  );
}
