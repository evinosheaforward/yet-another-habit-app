import { useCallback, useEffect, useState } from 'react';
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
import { createActivity, getActivities, debouncedUpdateActivityCount } from '@/api/activities';

import { ActivityCountControls } from '@/components/activity-count-controls';
import { Collapsible } from '@/components/ui/collapsible';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Activity, ActivityPeriod } from '@yet-another-habit-app/shared-types';

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ActivitiesScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<ActivityPeriod>(ActivityPeriod.Daily);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newGoalCount, setNewGoalCount] = useState('');
  const [newStackedActivityId, setNewStackedActivityId] = useState<string | null>(null);
  const [showCreateStackPicker, setShowCreateStackPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await getActivities(period, { force: true });
    setActivities(data);
  }, [period]);

  async function onCreate() {
    setCreateError(null);

    const title = newTitle.trim();
    if (!title) {
      setCreateError('Title is required.');
      return;
    }

    const rawGoal = newGoalCount.trim();
    if (rawGoal === '' || !/^\d+$/.test(rawGoal)) {
      setCreateError('Goal count must be a positive whole number.');
      return;
    }
    const goalCount = Number(rawGoal);
    if (goalCount < 1) {
      setCreateError('Goal count must be at least 1.');
      return;
    }

    try {
      setSaving(true);
      await createActivity({
        title,
        description: newDescription.trim(),
        period,
        goalCount,
        stackedActivityId: newStackedActivityId,
      });

      setCreateOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewGoalCount('');
      setNewStackedActivityId(null);
      setShowCreateStackPicker(false);
      await refresh();
    } catch (e: any) {
      setCreateError(e?.message ?? 'Failed to create activity.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const data = await getActivities(period);
      if (!cancelled) {
        setActivities(data);
        setOpenId(null);
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

  function toggleActivity(id: string) {
    setOpenId((cur) => (cur === id ? null : id));
  }

  function handleDelta(activityId: string, delta: number) {
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

    debouncedUpdateActivityCount(
      activityId,
      delta,
      () => {
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
          onPress={() => setCreateOpen(true)}
          accessibilityRole="button"
          className="rounded-full border border-black/10 bg-black/10 px-3 py-2 dark:border-white/10 dark:bg-white/10"
        >
          <ThemedText className="text-[13px] font-semibold text-neutral-900 dark:text-white">
            + Create
          </ThemedText>
        </Pressable>
      </View>

      {/* Period pills */}
      <View className="mt-4 flex-row gap-1 rounded-full border border-black/10 bg-black/5 p-1 dark:border-white/10 dark:bg-white/10">
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

              <ThemedText className="mb-2 opacity-70 text-neutral-700 dark:text-neutral-300">
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

              <TextInput
                value={newGoalCount}
                onChangeText={setNewGoalCount}
                placeholder="Goal count (times per period)"
                placeholderTextColor="#8E8E93"
                editable={!saving}
                keyboardType="number-pad"
                className="mt-2 rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 text-[15px] text-neutral-900 dark:border-white/10 dark:bg-white/10 dark:text-white"
              />

              <ThemedText className="mb-1 mt-3 text-[13px] font-semibold uppercase tracking-wide opacity-60 text-neutral-700 dark:text-neutral-300">
                Stack with (optional)
              </ThemedText>
              <Pressable
                onPress={() => setShowCreateStackPicker((v) => !v)}
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
                  {activities.find((a) => a.id === newStackedActivityId)?.title ?? 'None'}
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
                  {activities.map((a) => (
                    <Pressable
                      key={a.id}
                      onPress={() => {
                        setNewStackedActivityId(a.id);
                        setShowCreateStackPicker(false);
                      }}
                      className={[
                        'mt-1 rounded-[10px] border px-3 py-2',
                        newStackedActivityId === a.id
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/10',
                      ].join(' ')}
                    >
                      <ThemedText className="text-[14px] text-neutral-900 dark:text-white">
                        {a.title}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {createError ? (
                <ThemedText className="mt-2 text-[13px] text-red-500">{createError}</ThemedText>
              ) : null}

              <View className="mt-4 flex-row justify-end gap-2.5">
                <Pressable
                  onPress={() => setCreateOpen(false)}
                  disabled={saving}
                  className={[
                    'rounded-[12px] px-3.5 py-2.5',
                    'bg-black/5 dark:bg-white/10',
                    saving ? 'opacity-60' : 'opacity-100',
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

      {/* List */}
      <FlatList
        data={activities}
        keyExtractor={(a) => a.id}
        contentContainerClassName="pt-4 pb-7"
        ItemSeparatorComponent={() => <View className="h-3 dark:text-white" />}
        renderItem={({ item }) => (
          <Collapsible
            title={item.title}
            progressPct={item.completionPercent}
            isOpen={openId === item.id}
            onToggle={() => toggleActivity(item.id)}
          >
            {item.description ? (
              <ThemedText className="opacity-85 leading-5 text-neutral-700 dark:text-neutral-300">
                {item.description}
              </ThemedText>
            ) : null}

            {item.stackedActivityTitle ? (
              <ThemedText className="mt-1.5 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
                Next up: {item.stackedActivityTitle}
              </ThemedText>
            ) : null}

            <View className="mt-2.5">
              <ActivityCountControls
                count={item.count}
                goalCount={item.goalCount}
                completionPercent={item.completionPercent}
                onIncrement={() => handleDelta(item.id, 1)}
                onDecrement={() => handleDelta(item.id, -1)}
              />
            </View>

            <Pressable
              onPress={() =>
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
                })
              }
              accessibilityRole="button"
              className="mt-3 items-center rounded-[10px] border border-black/10 bg-black/5 px-3 py-2 dark:border-white/10 dark:bg-white/10"
            >
              <ThemedText className="text-[13px] font-semibold text-neutral-900 dark:text-white">
                Details
              </ThemedText>
            </Pressable>
          </Collapsible>
        )}
      />
    </ThemedView>
  );
}
