import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { updateActivity, debouncedUpdateActivityCount } from '@/api/activities';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ActivityDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    description: string;
    goalCount: string;
    count: string;
    completionPercent: string;
    period: string;
  }>();

  const activityId = params.id;
  const initialGoalCount = Number(params.goalCount) || 1;

  const [title, setTitle] = useState(params.title ?? '');
  const [description, setDescription] = useState(params.description ?? '');
  const [goalCount, setGoalCount] = useState(String(initialGoalCount));
  const [count, setCount] = useState(Number(params.count) || 0);

  const currentGoal = Number(goalCount) || 0;
  const completionPercent =
    currentGoal > 0 ? Math.min(100, Math.round((count / currentGoal) * 100)) : 0;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleDelta(delta: number) {
    const newCount = Math.max(0, count + delta);
    setCount(newCount);

    debouncedUpdateActivityCount(
      activityId,
      delta,
      (serverCount) => setCount(serverCount),
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

    const updates: { title?: string; description?: string; goalCount?: number } = {};
    if (trimmedTitle !== params.title) updates.title = trimmedTitle;
    if (description !== (params.description ?? '')) updates.description = description;
    if (parsedGoal !== initialGoalCount) updates.goalCount = parsedGoal;

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

  return (
    <ThemedView className="flex-1">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="p-4 pb-10"
          keyboardShouldPersistTaps="handled"
        >
          {/* Period badge */}
          <View className="mb-4 flex-row">
            <View className="rounded-full bg-black/10 px-3 py-1 dark:bg-white/10">
              <ThemedText className="text-[13px] font-semibold capitalize text-neutral-900 dark:text-white">
                {params.period}
              </ThemedText>
            </View>
          </View>

          {/* Title */}
          <ThemedText className="mb-1 text-[13px] font-semibold uppercase tracking-wide opacity-60 text-neutral-700 dark:text-neutral-300">
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
          <ThemedText className="mb-1 mt-4 text-[13px] font-semibold uppercase tracking-wide opacity-60 text-neutral-700 dark:text-neutral-300">
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
          <ThemedText className="mb-1 mt-4 text-[13px] font-semibold uppercase tracking-wide opacity-60 text-neutral-700 dark:text-neutral-300">
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

          {/* Count controls */}
          <View className="mt-6 items-center">
            <ThemedText className="mb-2 text-[13px] font-semibold uppercase tracking-wide opacity-60 text-neutral-700 dark:text-neutral-300">
              Current Progress
            </ThemedText>
            <View className="flex-row items-center gap-4">
              <Pressable
                onPress={() => handleDelta(-1)}
                disabled={count <= 0}
                accessibilityRole="button"
                accessibilityLabel="Decrement count"
                className={[
                  'h-9 w-9 items-center justify-center rounded-full',
                  'border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/10',
                  count <= 0 ? 'opacity-30' : 'opacity-100',
                ].join(' ')}
              >
                <ThemedText className="text-[18px] font-bold text-neutral-900 dark:text-white">
                  -
                </ThemedText>
              </Pressable>

              <ThemedText className="text-[16px] font-semibold text-neutral-900 dark:text-white">
                {count} / {currentGoal || '?'}
              </ThemedText>

              <Pressable
                onPress={() => handleDelta(1)}
                disabled={currentGoal > 0 && count >= currentGoal}
                accessibilityRole="button"
                accessibilityLabel="Increment count"
                className={[
                  'h-9 w-9 items-center justify-center rounded-full',
                  'border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/10',
                  currentGoal > 0 && count >= currentGoal ? 'opacity-30' : 'opacity-100',
                ].join(' ')}
              >
                <ThemedText className="text-[18px] font-bold text-neutral-900 dark:text-white">
                  +
                </ThemedText>
              </Pressable>
            </View>
            <ThemedText className="mt-1 text-[13px] opacity-60 text-neutral-700 dark:text-neutral-300">
              {completionPercent}%
            </ThemedText>
          </View>

          {/* Error */}
          {error ? (
            <ThemedText className="mt-4 text-center text-[13px] text-red-500">{error}</ThemedText>
          ) : null}

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            disabled={saving}
            className="mt-6 items-center rounded-[12px] bg-black/90 px-4 py-3 dark:bg-white/90"
          >
            <ThemedText lightColor="#ffffff" darkColor="#171717" className="font-semibold">
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
