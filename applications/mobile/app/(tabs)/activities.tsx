import { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { createActivity, getActivities } from '@/api/activities';

import { Collapsible } from '@/components/ui/collapsible';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Activity, ActivityPeriod } from '@yet-another-habit-app/shared-types';

export default function ActivitiesScreen() {
  const [period, setPeriod] = useState<ActivityPeriod>(ActivityPeriod.Daily);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function refresh() {
    const data = await getActivities(period);
    setActivities(data);
  }

  async function onCreate() {
    setCreateError(null);

    const title = newTitle.trim();
    if (!title) {
      setCreateError('Title is required.');
      return;
    }

    try {
      setSaving(true);
      await createActivity({
        title,
        description: newDescription.trim(),
        period,
      });

      setCreateOpen(false);
      setNewTitle('');
      setNewDescription('');
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

  function toggleActivity(id: string) {
    setOpenId((cur) => (cur === id ? null : id));
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
                {p}
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
                  {period}
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
                  <ThemedText className="text-neutral-50 dark:text-white">
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
            <ThemedText className="opacity-85 leading-5 text-neutral-700 dark:text-neutral-300">
              {item.description}
            </ThemedText>

            <View className="mt-2.5 flex-row items-center justify-between">
              <ThemedText className="text-[13px] opacity-60 text-neutral-700 dark:text-neutral-300">
                Complete
              </ThemedText>
              <ThemedText className="text-[13px] opacity-90 text-neutral-900 dark:text-white">
                {item.completionPercent}%
              </ThemedText>
            </View>
          </Collapsible>
        )}
      />
    </ThemedView>
  );
}
