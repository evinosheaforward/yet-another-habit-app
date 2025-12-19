import { PropsWithChildren, useMemo, useState } from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

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
  const theme = useColorScheme() ?? "light";

  const controlled = typeof isOpen === "boolean";
  const open = controlled ? isOpen : internalOpen;

  const handlePress = useMemo(() => {
    if (controlled) return () => onToggle?.();
    return () => setInternalOpen((v) => !v);
  }, [controlled, onToggle]);

  const pct = clampPct(progressPct);

  // Palette (kept simple + modern)
  const cardBg = theme === "light" ? "#FFFFFF" : "#0E0F12";
  const border = theme === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.10)";
  const headerBg = theme === "light" ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.06)";

  // “Green loading bar” fill — subtle, elegant
  const fill = theme === "light" ? "rgba(34,197,94,0.18)" : "rgba(34,197,94,0.22)";

  return (
    <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
      <TouchableOpacity
        style={styles.headerTouchable}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        {/* Header row background + progress fill (title only) */}
        <View style={[styles.headerBg, { backgroundColor: headerBg }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${pct}%`,
                backgroundColor: fill,
              },
            ]}
          />
        </View>

        <View style={styles.headerContent}>
          <IconSymbol
            name="chevron.right"
            size={18}
            weight="medium"
            color={theme === "light" ? Colors.light.icon : Colors.dark.icon}
            style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}
          />

          <View style={styles.titleWrap}>
            <ThemedText type="defaultSemiBold" style={styles.title}>
              {title}
            </ThemedText>
            <ThemedText style={styles.caption}>{pct}%</ThemedText>
          </View>
        </View>
      </TouchableOpacity>

      {open && (
        <ThemedView style={styles.body}>
          <View style={[styles.bodyInner, { borderTopColor: border }]}>{children}</View>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },

  headerTouchable: {
    position: "relative",
  },

  headerBg: {
    ...StyleSheet.absoluteFillObject,
  },

  progressFill: {
    height: "100%",
  },

  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },

  titleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
  },

  title: {
    fontSize: 16,
    lineHeight: 20,
  },

  caption: {
    fontSize: 13,
    opacity: 0.65,
  },

  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },

  bodyInner: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
