import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AchievementType } from '@yet-another-habit-app/shared-types';
import { updateAchievement, deleteAchievement } from '@/api/achievements';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AchievementDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    reward: string;
    type: string;
    activityId: string;
    activityTitle: string;
    period: string;
    goalCount: string;
    count: string;
    repeatable: string;
    completed: string;
  }>();

  const achievementId = params.id;
  const isCompleted = params.completed === 'true';
  const type = params.type as AchievementType;
  const count = Number(params.count) || 0;
  const initialGoalCount = Number(params.goalCount) || 1;

  const [title, setTitle] = useState(params.title ?? '');
  const [reward, setReward] = useState(params.reward ?? '');
  const [goalCount, setGoalCount] = useState(String(initialGoalCount));
  const [repeatable, setRepeatable] = useState(params.repeatable === 'true');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const currentGoal = Number(goalCount) || 0;
  const pct = isCompleted
    ? 100
    : currentGoal > 0
      ? Math.min(100, Math.round((count / currentGoal) * 100))
      : 0;

  function getSubtitle(): string {
    if (type === AchievementType.Habit) {
      if (!params.activityId) return 'Activity deleted';
      return params.activityTitle || 'Unknown activity';
    }
    if (type === AchievementType.Period) {
      return params.period ? capitalize(params.period) : 'Unknown period';
    }
    return 'Todo List';
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
    if (rawGoal === '' || !/^\d+$/.test(rawGoal) || Number(rawGoal) < 1) {
      setError('Goal count must be a positive whole number.');
      return;
    }

    const updates: { title?: string; reward?: string; goalCount?: number; repeatable?: boolean } =
      {};
    if (trimmedTitle !== params.title) updates.title = trimmedTitle;
    if (reward.trim() !== (params.reward ?? '')) updates.reward = reward.trim();
    if (Number(rawGoal) !== initialGoalCount) updates.goalCount = Number(rawGoal);
    if (repeatable !== (params.repeatable === 'true')) updates.repeatable = repeatable;

    if (Object.keys(updates).length === 0) {
      setSaved(true);
      return;
    }

    try {
      setSaving(true);
      await updateAchievement(achievementId, updates);
      setSaved(true);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Delete Achievement?',
      'This will permanently delete this achievement and its progress.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteAchievement(achievementId);
              router.back();
            } catch (e: any) {
              setError(e?.message ?? 'Failed to delete achievement.');
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
          {/* Type badge + subtitle */}
          <View className="mb-4 flex-row items-center gap-2">
            <View className="rounded-full bg-black/10 px-3 py-1 dark:bg-white/10">
              <ThemedText className="text-[13px] font-semibold capitalize text-neutral-900 dark:text-white">
                {type}
              </ThemedText>
            </View>
            <ThemedText className="text-[13px] text-neutral-600 dark:text-neutral-400">
              {getSubtitle()}
            </ThemedText>
          </View>

          {/* Progress display */}
          <View className="mb-6 items-center">
            <ThemedText className="mb-2 text-[13px] font-semibold uppercase tracking-wide opacity-50 text-neutral-700 dark:text-neutral-300">
              Progress
            </ThemedText>
            <ThemedText className="text-[28px] font-bold text-neutral-900 dark:text-white">
              {count} / {currentGoal}
            </ThemedText>
            <View className="mt-2 w-full">
              <View className="h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <View
                  className={[
                    'h-full rounded-full',
                    isCompleted ? 'bg-amber-500' : 'bg-indigo-500 dark:bg-indigo-400',
                  ].join(' ')}
                  style={{ width: `${pct}%` }}
                />
              </View>
              <ThemedText className="mt-1 text-center text-[13px] font-semibold text-neutral-700 dark:text-neutral-300">
                {pct}%
              </ThemedText>
            </View>
          </View>

          {/* Completed reward */}
          {isCompleted && reward.trim() ? (
            <View className="mb-6 rounded-[12px] border border-amber-500/30 bg-amber-500/10 p-3">
              <ThemedText className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Reward
              </ThemedText>
              <ThemedText className="text-[15px] font-semibold text-amber-700 dark:text-amber-300">
                {reward.trim()}
              </ThemedText>
            </View>
          ) : null}

          {/* Settings */}
          <ThemedText type="subtitle" className="mb-1 text-neutral-900 dark:text-white">
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

          {/* Reward */}
          <ThemedText className="mb-1 mt-4 text-[13px] font-semibold uppercase tracking-wide opacity-50 text-neutral-700 dark:text-neutral-300">
            Reward
          </ThemedText>
          <TextInput
            value={reward}
            onChangeText={(t) => {
              setReward(t);
              setSaved(false);
            }}
            editable={!saving}
            multiline
            textAlignVertical="top"
            placeholder="Reward text"
            placeholderTextColor="#8E8E93"
            className="min-h-[60px] rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 text-[15px] text-neutral-900 dark:border-white/10 dark:bg-white/10 dark:text-white"
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

          {/* Repeatable toggle */}
          <Pressable
            onPress={() => {
              setRepeatable((v) => !v);
              setSaved(false);
            }}
            disabled={saving}
            className="mt-4 flex-row items-center justify-between rounded-[12px] border border-black/10 bg-black/5 px-3 py-2.5 dark:border-white/10 dark:bg-white/10"
          >
            <ThemedText className="text-[15px] text-neutral-900 dark:text-white">
              Repeatable
            </ThemedText>
            <View
              className={[
                'h-6 w-6 items-center justify-center rounded-full',
                repeatable
                  ? 'bg-emerald-600 dark:bg-emerald-500'
                  : 'border border-black/20 bg-transparent dark:border-white/20',
              ].join(' ')}
            >
              {repeatable ? (
                <ThemedText className="text-[13px] font-bold text-white">{'\u2713'}</ThemedText>
              ) : null}
            </View>
          </Pressable>

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

          {/* Delete button */}
          <Pressable
            onPress={handleDelete}
            disabled={deleting || saving}
            className={[
              'mt-3 items-center rounded-[12px] border border-red-500/30 bg-red-500/10 px-4 py-3',
              deleting || saving ? 'opacity-50' : 'opacity-100',
            ].join(' ')}
          >
            <ThemedText className="font-semibold text-red-600 dark:text-red-400">
              {deleting ? 'Deleting...' : 'Delete Achievement'}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
