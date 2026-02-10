import { Pressable, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

type Props = {
  count: number;
  goalCount: number;
  completionPercent: number;
  onIncrement: () => void;
  onDecrement: () => void;
};

export function ActivityCountControls({
  count,
  goalCount,
  completionPercent,
  onIncrement,
  onDecrement,
}: Props) {
  return (
    <>
      <View className="flex-row items-center justify-center gap-4">
        <Pressable
          onPress={onDecrement}
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
          {count} / {goalCount || '?'}
        </ThemedText>

        <Pressable
          onPress={onIncrement}
          accessibilityRole="button"
          accessibilityLabel="Increment count"
          className="h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/10"
        >
          <ThemedText className="text-[18px] font-bold text-neutral-900 dark:text-white">
            +
          </ThemedText>
        </Pressable>
      </View>
      <ThemedText className="mt-1 text-center text-[13px] opacity-60 text-neutral-700 dark:text-neutral-300">
        {completionPercent}%
      </ThemedText>
    </>
  );
}
