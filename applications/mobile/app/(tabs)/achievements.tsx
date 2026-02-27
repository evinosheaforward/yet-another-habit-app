import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import {
  Achievement,
  AchievementType,
  Activity,
  ActivityPeriod,
} from '@yet-another-habit-app/shared-types';
import { getAchievements, createAchievement } from '@/api/achievements';
import { getActivities } from '@/api/activities';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useOnboardingTarget } from '@/onboarding/useOnboardingTarget';
import { useOnboarding } from '@/onboarding/OnboardingProvider';

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const TYPE_BADGE: Record<AchievementType, { label: string; color: string; darkColor: string }> = {
  [AchievementType.Habit]: {
    label: 'Habit',
    color: 'bg-emerald-500/15 border-emerald-500/30',
    darkColor: 'text-emerald-600 dark:text-emerald-400',
  },
  [AchievementType.Period]: {
    label: 'Period',
    color: 'bg-purple-500/15 border-purple-500/30',
    darkColor: 'text-purple-600 dark:text-purple-400',
  },
  [AchievementType.Todo]: {
    label: 'Todo',
    color: 'bg-blue-500/15 border-blue-500/30',
    darkColor: 'text-blue-600 dark:text-blue-400',
  },
};

export default function AchievementsScreen() {
  const router = useRouter();
  const headerRef = useOnboardingTarget('achievements-header');
  const createBtnRef = useOnboardingTarget('create-achievement-btn');
  const { advanceStep } = useOnboarding();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newReward, setNewReward] = useState('');
  const [newType, setNewType] = useState<AchievementType>(AchievementType.Habit);
  const [newActivityId, setNewActivityId] = useState<string | null>(null);
  const [newPeriod, setNewPeriod] = useState<ActivityPeriod>(ActivityPeriod.Daily);
  const [newGoalCount, setNewGoalCount] = useState('1');
  const [newRepeatable, setNewRepeatable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Activities for the habit picker
  const [availableActivities, setAvailableActivities] = useState<Activity[]>([]);
  const [showActivityPicker, setShowActivityPicker] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setFetchError(null);
      const data = await getAchievements();
      setAchievements(data);
    } catch {
      setFetchError('Failed to load achievements.');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Load activities when create modal opens with habit type
  useEffect(() => {
    if (!createOpen) return;
    let cancelled = false;

    async function loadActivities() {
      try {
        const daily = await getActivities(ActivityPeriod.Daily);
        const weekly = await getActivities(ActivityPeriod.Weekly);
        const monthly = await getActivities(ActivityPeriod.Monthly);
        if (!cancelled) {
          setAvailableActivities(
            [...daily, ...weekly, ...monthly].filter((a) => !a.task),
          );
        }
      } catch {
        // Best effort
      }
    }

    loadActivities();
    return () => {
      cancelled = true;
    };
  }, [createOpen]);

  function resetCreateForm() {
    setNewTitle('');
    setNewReward('');
    setNewType(AchievementType.Habit);
    setNewActivityId(null);
    setNewPeriod(ActivityPeriod.Daily);
    setNewGoalCount('1');
    setNewRepeatable(false);
    setCreateError(null);
    setShowActivityPicker(false);
  }

  async function onCreate() {
    setCreateError(null);

    const title = newTitle.trim();
    if (!title) {
      setCreateError('Title is required.');
      return;
    }

    const rawGoal = newGoalCount.trim();
    if (rawGoal === '' || !/^\d+$/.test(rawGoal) || Number(rawGoal) < 1) {
      setCreateError('Goal count must be a positive whole number.');
      return;
    }

    if (newType === AchievementType.Habit && !newActivityId) {
      setCreateError('Please select an activity.');
      return;
    }

    try {
      setSaving(true);
      await createAchievement({
        title,
        reward: newReward.trim(),
        type: newType,
        activityId: newType === AchievementType.Habit ? newActivityId : null,
        period: newType === AchievementType.Period ? newPeriod : null,
        goalCount: Number(rawGoal),
        repeatable: newRepeatable,
      });

      setCreateOpen(false);
      resetCreateForm();
      await refresh();
    } catch (e: any) {
      setCreateError(e?.message ?? 'Failed to create achievement.');
    } finally {
      setSaving(false);
    }
  }

  function renderProgressBar(achievement: Achievement) {
    const pct = achievement.completed
      ? 100
      : achievement.goalCount > 0
        ? Math.min(100, Math.round((achievement.count / achievement.goalCount) * 100))
        : 0;

    return (
      <View className="mt-2">
        <View className="flex-row items-center justify-between">
          <ThemedText className="text-[12px] text-neutral-600 dark:text-neutral-400">
            {achievement.count} / {achievement.goalCount}
          </ThemedText>
          <ThemedText className="text-[12px] font-semibold text-neutral-700 dark:text-neutral-300">
            {pct}%
          </ThemedText>
        </View>
        <View className="mt-1 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <View
            className={[
              'h-full rounded-full',
              achievement.completed
                ? 'bg-amber-500'
                : 'bg-indigo-500 dark:bg-indigo-400',
            ].join(' ')}
            style={{ width: `${pct}%` }}
          />
        </View>
      </View>
    );
  }

  function getSubtitle(a: Achievement): string {
    if (a.type === AchievementType.Habit) {
      if (!a.activityId) return 'Activity deleted';
      return a.activityTitle ?? 'Unknown activity';
    }
    if (a.type === AchievementType.Period) {
      return a.period ? capitalize(a.period) : 'Unknown period';
    }
    return 'Todo List';
  }

  return (
    <ThemedView className="flex-1 px-4 pt-6">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-black/10 pb-2 dark:border-white/10">
        <View ref={headerRef}>
          <ThemedText type="title" className="mb-3 text-neutral-900 dark:text-white">
            Rewards
          </ThemedText>
        </View>

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

      {/* Create modal */}
      <Modal
        visible={createOpen}
        animationType="fade"
        transparent
        onRequestClose={() => (saving ? null : setCreateOpen(false))}
      >
        <View className="flex-1 justify-center bg-black/50 p-[18px]">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <ThemedView className="rounded-[14px] border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-950">
                <ThemedText type="subtitle" className="mb-3 text-neutral-900 dark:text-white">
                  Create Achievement
                </ThemedText>

                <TextInput
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="Title"
                  placeholderTextColor="#8E8E93"
                  editable={!saving}
                  className="rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 text-[15px] text-neutral-900 dark:border-white/10 dark:bg-white/10 dark:text-white"
                />

                <TextInput
                  value={newReward}
                  onChangeText={setNewReward}
                  placeholder="Reward text (shown on completion)"
                  placeholderTextColor="#8E8E93"
                  editable={!saving}
                  multiline
                  textAlignVertical="top"
                  className="mt-2 min-h-[60px] rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 text-[15px] text-neutral-900 dark:border-white/10 dark:bg-white/10 dark:text-white"
                />

                {/* Type picker */}
                <ThemedText className="mb-1 mt-3 text-[13px] font-semibold uppercase tracking-wide opacity-50 text-neutral-700 dark:text-neutral-300">
                  Type
                </ThemedText>
                <View className="flex-row gap-2">
                  {Object.values(AchievementType).map((t) => {
                    const active = t === newType;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => {
                          setNewType(t);
                          setNewActivityId(null);
                          setShowActivityPicker(false);
                        }}
                        disabled={saving}
                        className={[
                          'flex-1 items-center rounded-[10px] border py-2.5',
                          active
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/10',
                        ].join(' ')}
                      >
                        <ThemedText
                          className={[
                            'text-[13px] font-semibold',
                            active
                              ? 'text-indigo-600 dark:text-indigo-400'
                              : 'text-neutral-900 dark:text-white',
                          ].join(' ')}
                        >
                          {capitalize(t)}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Activity picker (for habit type) */}
                {newType === AchievementType.Habit ? (
                  <View className="mt-2">
                    <ThemedText className="mb-1 text-[13px] font-semibold uppercase tracking-wide opacity-50 text-neutral-700 dark:text-neutral-300">
                      Activity
                    </ThemedText>
                    <Pressable
                      onPress={() => setShowActivityPicker((v) => !v)}
                      className="rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 dark:border-white/10 dark:bg-white/10"
                    >
                      <ThemedText
                        className={[
                          'text-[15px]',
                          newActivityId
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-neutral-500 dark:text-neutral-400',
                        ].join(' ')}
                      >
                        {availableActivities.find((a) => a.id === newActivityId)?.title ??
                          'Select activity'}
                      </ThemedText>
                    </Pressable>
                    {showActivityPicker ? (
                      <View className="mt-1 max-h-[200px]">
                        <ScrollView nestedScrollEnabled>
                          {availableActivities.map((a) => (
                            <Pressable
                              key={a.id}
                              onPress={() => {
                                setNewActivityId(a.id);
                                setShowActivityPicker(false);
                              }}
                              className={[
                                'mt-1 rounded-[10px] border px-3 py-2',
                                newActivityId === a.id
                                  ? 'border-emerald-500 bg-emerald-500/10'
                                  : 'border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/10',
                              ].join(' ')}
                            >
                              <ThemedText className="text-[14px] text-neutral-900 dark:text-white">
                                {a.title}
                              </ThemedText>
                              <ThemedText className="text-[12px] text-neutral-500 dark:text-neutral-400">
                                {capitalize(a.period)}
                              </ThemedText>
                            </Pressable>
                          ))}
                          {availableActivities.length === 0 ? (
                            <ThemedText className="py-2 text-center text-[13px] opacity-50 text-neutral-700 dark:text-neutral-300">
                              No activities available
                            </ThemedText>
                          ) : null}
                        </ScrollView>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Period picker (for period type) */}
                {newType === AchievementType.Period ? (
                  <View className="mt-2">
                    <ThemedText className="mb-1 text-[13px] font-semibold uppercase tracking-wide opacity-50 text-neutral-700 dark:text-neutral-300">
                      Period
                    </ThemedText>
                    <View className="flex-row gap-2">
                      {Object.values(ActivityPeriod).map((p) => {
                        const active = p === newPeriod;
                        return (
                          <Pressable
                            key={p}
                            onPress={() => setNewPeriod(p)}
                            disabled={saving}
                            className={[
                              'flex-1 items-center rounded-[10px] border py-2.5',
                              active
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/10',
                            ].join(' ')}
                          >
                            <ThemedText
                              className={[
                                'text-[13px] font-semibold',
                                active
                                  ? 'text-purple-600 dark:text-purple-400'
                                  : 'text-neutral-900 dark:text-white',
                              ].join(' ')}
                            >
                              {capitalize(p)}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {/* Goal count */}
                <TextInput
                  value={newGoalCount}
                  onChangeText={setNewGoalCount}
                  placeholder="Goal count"
                  placeholderTextColor="#8E8E93"
                  editable={!saving}
                  keyboardType="number-pad"
                  className="mt-2 rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 text-[15px] text-neutral-900 dark:border-white/10 dark:bg-white/10 dark:text-white"
                />

                {/* Repeatable toggle */}
                <Pressable
                  onPress={() => setNewRepeatable((v) => !v)}
                  disabled={saving}
                  className="mt-2 flex-row items-center justify-between rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 dark:border-white/10 dark:bg-white/10"
                >
                  <ThemedText className="text-[15px] text-neutral-900 dark:text-white">
                    Repeatable
                  </ThemedText>
                  <View
                    className={[
                      'h-6 w-6 items-center justify-center rounded-full',
                      newRepeatable
                        ? 'bg-emerald-600 dark:bg-emerald-500'
                        : 'border border-black/20 bg-transparent dark:border-white/20',
                    ].join(' ')}
                  >
                    {newRepeatable ? (
                      <ThemedText className="text-[13px] font-bold text-white">
                        {'\u2713'}
                      </ThemedText>
                    ) : null}
                  </View>
                </Pressable>
                <ThemedText className="mt-1 px-1 text-[12px] leading-4 opacity-50 text-neutral-700 dark:text-neutral-300">
                  Repeatable achievements reset to 0 on completion
                </ThemedText>

                {createError ? (
                  <ThemedText className="mt-2 text-[13px] text-red-600 dark:text-red-400">{createError}</ThemedText>
                ) : null}

                <View className="mt-4 flex-row justify-end gap-2.5">
                  <Pressable
                    onPress={() => {
                      setCreateOpen(false);
                      resetCreateForm();
                    }}
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
                    className="rounded-[12px] bg-black/90 px-3.5 py-2.5 opacity-100 dark:bg-white/90"
                  >
                    <ThemedText lightColor="#ffffff" darkColor="#171717">
                      {saving ? 'Creating...' : 'Create'}
                    </ThemedText>
                  </Pressable>
                </View>
              </ThemedView>
            </ScrollView>
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
        data={achievements}
        keyExtractor={(a) => a.id}
        contentContainerClassName="pt-4 pb-7"
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={
          <View className="items-center py-16">
            <ThemedText className="text-[15px] opacity-50 text-neutral-700 dark:text-neutral-300">
              No achievements yet
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => {
          const badge = TYPE_BADGE[item.type];
          const subtitle = getSubtitle(item);

          return (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/achievement/[id]',
                  params: {
                    id: item.id,
                    title: item.title,
                    reward: item.reward,
                    type: item.type,
                    activityId: item.activityId ?? '',
                    activityTitle: item.activityTitle ?? '',
                    period: item.period ?? '',
                    goalCount: String(item.goalCount),
                    count: String(item.count),
                    repeatable: item.repeatable ? 'true' : 'false',
                    completed: item.completed ? 'true' : 'false',
                  },
                })
              }
              className="rounded-[14px] border border-black/10 bg-black/5 p-3.5 dark:border-white/10 dark:bg-white/5"
            >
              <View className="flex-row items-center justify-between">
                <ThemedText
                  className="flex-1 text-[16px] font-semibold text-neutral-900 dark:text-white"
                  numberOfLines={1}
                >
                  {item.title}
                </ThemedText>
                <View className={`ml-2 rounded-full border px-2 py-0.5 ${badge.color}`}>
                  <ThemedText className={`text-[11px] font-semibold ${badge.darkColor}`}>
                    {badge.label}
                  </ThemedText>
                </View>
              </View>

              <ThemedText className="mt-0.5 text-[13px] text-neutral-600 dark:text-neutral-400">
                {subtitle}
                {item.type === AchievementType.Habit && !item.activityId
                  ? ''
                  : ''}
              </ThemedText>

              {item.repeatable ? (
                <ThemedText className="mt-0.5 text-[11px] font-semibold text-indigo-500 dark:text-indigo-400">
                  Repeatable
                </ThemedText>
              ) : null}

              {renderProgressBar(item)}

              {item.completed && item.reward ? (
                <View className="mt-2 rounded-[10px] border border-amber-500/30 bg-amber-500/10 p-2.5">
                  <ThemedText className="text-[13px] font-semibold text-amber-700 dark:text-amber-400">
                    {item.reward}
                  </ThemedText>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />
    </ThemedView>
  );
}
