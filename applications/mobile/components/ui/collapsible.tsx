import { PropsWithChildren, useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

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

  return (
    <ThemedView className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-neutral-950">
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85} className="relative">
        {/* Header row background */}
        <View className="absolute inset-0 bg-black/[0.03] dark:bg-white/[0.06]" />
        <View
          className="absolute inset-y-0 left-0 bg-emerald-500/20 dark:bg-emerald-500/25"
          style={undefined as any} // intentionally unused; see width component below
        />

        <ProgressFill pct={pct} />

        <View className="flex-row items-center gap-2.5 px-3.5 py-3.5">
          <View className={`text-neutral-700 dark:text-white ${open ? 'rotate-90' : 'rotate-0'}`}>
            <IconSymbol
              name="chevron.right"
              size={18}
              weight="medium"
              color={colorScheme === 'dark' ? '#FFFFFF' : '#52525B'}
            />
          </View>

          <View className="flex-1 flex-row items-baseline justify-between gap-2.5">
            <ThemedText
              type="defaultSemiBold"
              className="text-[16px] leading-5 text-neutral-900 dark:text-white"
            >
              {title}
            </ThemedText>
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

/**
 * ProgressFill
 * - Pure Tailwind/NativeWind (no style prop)
 * - Renders a smooth-ish bar using 50 blocks (2% granularity)
 * - Keeps your “subtle elegant green fill” vibe behind the header content
 */
function ProgressFill({ pct }: { pct: number }) {
  const blocks = 50; // 2% increments
  const filled = Math.round((pct / 100) * blocks);

  return (
    <View className="absolute inset-0 flex-row dark:text-white">
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
