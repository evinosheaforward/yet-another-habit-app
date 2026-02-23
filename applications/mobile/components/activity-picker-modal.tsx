import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import type { Activity } from '@yet-another-habit-app/shared-types';

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

type ActivityPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  activities: Activity[];
  onAdd: (activityId: string) => void;
  onCreateTask: (title: string) => Promise<void>;
};

export function ActivityPickerModal({
  visible,
  onClose,
  title,
  activities,
  onAdd,
  onCreateTask,
}: ActivityPickerModalProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  function handleClose() {
    setShowCreateForm(false);
    setNewTaskTitle('');
    onClose();
  }

  async function handleCreateTask() {
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;

    try {
      setCreatingTask(true);
      await onCreateTask(trimmed);
      setNewTaskTitle('');
      setShowCreateForm(false);
    } catch {
      // best effort
    } finally {
      setCreatingTask(false);
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View className="flex-1 justify-end bg-black/50">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ThemedView className="rounded-t-[20px] border-t border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-950">
            <View className="mb-3 flex-row items-center justify-between">
              <ThemedText type="subtitle" className="text-neutral-900 dark:text-white">
                {title}
              </ThemedText>
              <Pressable
                onPress={handleClose}
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
              data={activities}
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
                  onPress={() => onAdd(activity.id)}
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
  );
}
