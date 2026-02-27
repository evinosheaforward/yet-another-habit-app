import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { deleteActivity, getActivities, unarchiveActivity } from '@/api/activities';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Activity, ActivityPeriod } from '@yet-another-habit-app/shared-types';
import { useOnboardingTarget } from '@/onboarding/useOnboardingTarget';

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ArchiveScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<ActivityPeriod>(ActivityPeriod.Daily);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const unarchiveRef = useOnboardingTarget('archive-unarchive-btn');
  const deleteRef = useOnboardingTarget('archive-delete-btn');

  const refresh = useCallback(async () => {
    try {
      setFetchError(null);
      const data = await getActivities(period, { force: true, archived: true });
      setActivities(data);
    } catch {
      setFetchError('Failed to load archived activities.');
    }
  }, [period]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setFetchError(null);
        const data = await getActivities(period, { archived: true });
        if (!cancelled) setActivities(data);
      } catch {
        if (!cancelled) setFetchError('Failed to load archived activities.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  async function handleUnarchive(id: string) {
    try {
      setUnarchivingId(id);
      await unarchiveActivity(id);
      await refresh();
    } catch {
      setFetchError('Failed to unarchive activity.');
    } finally {
      setUnarchivingId(null);
    }
  }

  function handleDelete(id: string) {
    Alert.alert(
      'Delete Activity?',
      'This will permanently delete this activity and all its history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(id);
              await deleteActivity(id);
              await refresh();
            } catch {
              setFetchError('Failed to delete activity.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  }

  return (
    <ThemedView className="flex-1 px-4 pt-6">
      {/* Header */}
      <View className="border-b border-black/10 pb-2 dark:border-white/10">
        <ThemedText type="title" className="mb-3 text-neutral-900 dark:text-white">
          Archive
        </ThemedText>
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
              No archived activities
            </ThemedText>
          </View>
        }
        renderItem={({ item, index }) => {
          const isFirst = index === 0;
          return (
            <View className="rounded-[14px] border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
              <ThemedText className="text-[16px] font-semibold text-neutral-900 dark:text-white">
                {item.title}
              </ThemedText>
              <View className="mt-1 flex-row gap-1.5">
                <View className="rounded-full bg-black/10 px-2.5 py-0.5 dark:bg-white/10">
                  <ThemedText className="text-[12px] font-semibold capitalize text-neutral-900 dark:text-white">
                    {item.period}
                  </ThemedText>
                </View>
                {item.task ? (
                  <View className="rounded-full bg-orange-500/20 px-2.5 py-0.5">
                    <ThemedText className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                      Task
                    </ThemedText>
                  </View>
                ) : (
                  <View className="rounded-full bg-emerald-500/15 px-2.5 py-0.5">
                    <ThemedText className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      Habit
                    </ThemedText>
                  </View>
                )}
              </View>

              <View className="mt-3 flex-row gap-2.5">
                <Pressable
                  ref={isFirst ? unarchiveRef : undefined}
                  onPress={() => handleUnarchive(item.id)}
                  disabled={unarchivingId === item.id}
                  className={[
                    'flex-1 items-center rounded-[10px] border border-black/10 bg-black/5 px-3 py-2 dark:border-white/10 dark:bg-white/10',
                    unarchivingId === item.id ? 'opacity-50' : 'opacity-100',
                  ].join(' ')}
                >
                  <ThemedText className="text-[13px] font-semibold text-neutral-900 dark:text-white">
                    {unarchivingId === item.id ? 'Unarchiving...' : 'Unarchive'}
                  </ThemedText>
                </Pressable>

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
                        archived: 'true',
                      },
                    })
                  }
                  accessibilityRole="button"
                  className="flex-1 items-center rounded-[10px] border border-black/10 bg-black/5 px-3 py-2 dark:border-white/10 dark:bg-white/10"
                >
                  <ThemedText className="text-[13px] font-semibold text-neutral-900 dark:text-white">
                    Details
                  </ThemedText>
                </Pressable>
              </View>

              <Pressable
                ref={isFirst ? deleteRef : undefined}
                onPress={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
                className={[
                  'mt-2 items-center rounded-[10px] border border-red-500/20 bg-red-500/10 px-3 py-2',
                  deletingId === item.id ? 'opacity-50' : 'opacity-100',
                ].join(' ')}
              >
                <ThemedText className="text-[13px] font-semibold text-red-600 dark:text-red-400">
                  {deletingId === item.id ? 'Deleting...' : 'Delete'}
                </ThemedText>
              </Pressable>
            </View>
          );
        }}
      />
    </ThemedView>
  );
}
