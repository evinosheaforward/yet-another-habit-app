import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

import { useColorScheme } from 'nativewind';

type CollapsibleProps = PropsWithChildren & {
  title: string;

  // Controlled behavior (recommended)
  isOpen?: boolean;
  onToggle?: () => void;

  // 0..100 progress fill for the header row only
  progressPct?: number;

  // Optional small badge shown next to the title
  badge?: string;
};

function clampPct(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

export function Collapsible({
  children,
  title,
  isOpen,
  onToggle,
  progressPct = 0,
  badge,
}: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const controlled = typeof isOpen === 'boolean';
  const open = controlled ? isOpen : internalOpen;

  const { colorScheme } = useColorScheme();

  const handlePress = useMemo(() => {
    if (controlled) return () => onToggle?.();
    return () => setInternalOpen((v) => !v);
  }, [controlled, onToggle]);

  const pct = clampPct(progressPct);

  const rotation = useSharedValue(open ? 90 : 0);

  useEffect(() => {
    rotation.value = withTiming(open ? 90 : 0, { duration: 200 });
  }, [open, rotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <ThemedView className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-neutral-950">
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85} className="relative">
        {/* Header row background */}
        <View className="absolute inset-0 bg-black/[0.03] dark:bg-white/[0.06]" />

        <ProgressFill pct={pct} />

        <View className="flex-row items-center gap-2.5 px-3.5 py-3.5">
          <Animated.View style={chevronStyle}>
            <IconSymbol
              name="chevron.right"
              size={18}
              weight="medium"
              color={colorScheme === 'dark' ? '#FFFFFF' : '#52525B'}
            />
          </Animated.View>

          <View className="flex-1 flex-row items-baseline justify-between gap-2.5">
            <View className="flex-row items-center gap-1.5">
              <ThemedText
                type="defaultSemiBold"
                className="text-[16px] leading-5 text-neutral-900 dark:text-white"
              >
                {title}
              </ThemedText>
              {badge ? (
                <View className="rounded-full bg-emerald-600/15 px-2 py-0.5 dark:bg-emerald-500/20">
                  <ThemedText className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    {badge}
                  </ThemedText>
                </View>
              ) : null}
            </View>
            <ThemedText className="text-[13px] opacity-65 text-neutral-700 dark:text-neutral-300">
              {pct}%
            </ThemedText>
          </View>
        </View>
      </TouchableOpacity>

      {open && (
        <ThemedView className="px-3.5 pb-3.5">
          <View className="border-t border-black/10 pt-3 dark:border-white/10">{children}</View>
        </ThemedView>
      )}
    </ThemedView>
  );
}

function ProgressFill({ pct }: { pct: number }) {
  const blocks = 50;
  const filled = Math.round((pct / 100) * blocks);

  return (
    <View className="absolute inset-0 flex-row">
      {Array.from({ length: blocks }).map((_, i) => (
        <View
          key={i}
          className={[
            'flex-1',
            i < filled ? 'bg-emerald-500/20 dark:bg-emerald-500/25' : 'bg-transparent',
          ].join(' ')}
        />
      ))}
    </View>
  );
}
