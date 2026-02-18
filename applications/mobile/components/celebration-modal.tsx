import { Modal, Pressable, View } from 'react-native';
import type { CompletedAchievement } from '@yet-another-habit-app/shared-types';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface CelebrationModalProps {
  achievement: CompletedAchievement | null;
  onDismiss: () => void;
}

export function CelebrationModal({ achievement, onDismiss }: CelebrationModalProps) {
  return (
    <Modal visible={!!achievement} animationType="fade" transparent onRequestClose={onDismiss}>
      <View className="flex-1 items-center justify-center bg-black/60 p-6">
        <ThemedView className="w-full max-w-[320px] items-center rounded-[20px] border border-amber-500/30 bg-white p-6 dark:bg-neutral-950">
          <ThemedText className="text-[48px]">{'\uD83C\uDF89'}</ThemedText>

          <ThemedText className="mt-2 text-[18px] font-bold text-neutral-900 dark:text-white">
            Achievement Complete!
          </ThemedText>

          <ThemedText className="mt-2 text-center text-[16px] font-semibold text-amber-600 dark:text-amber-400">
            {achievement?.title}
          </ThemedText>

          {achievement?.reward ? (
            <View className="mt-3 w-full rounded-[12px] border border-amber-500/20 bg-amber-500/10 px-4 py-3">
              <ThemedText className="text-center text-[14px] text-amber-700 dark:text-amber-300">
                {achievement.reward}
              </ThemedText>
            </View>
          ) : null}

          <Pressable
            onPress={onDismiss}
            className="mt-5 rounded-[12px] bg-amber-500 px-8 py-3 dark:bg-amber-600"
          >
            <ThemedText className="text-[15px] font-semibold text-white">Awesome!</ThemedText>
          </Pressable>
        </ThemedView>
      </View>
    </Modal>
  );
}
