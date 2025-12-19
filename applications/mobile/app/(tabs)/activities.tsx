import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View, KeyboardAvoidingView, Modal, Platform, TextInput } from "react-native";
import { createActivity , getActivities } from "@/api/activities";


import { Collapsible } from "@/components/ui/collapsible";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";

import { Activity, ActivityPeriod } from "@yet-another-habit-app/shared-types";


export default function ActivitiesScreen() {
  const theme = useColorScheme() ?? "light";

  const [period, setPeriod] = useState<ActivityPeriod>(ActivityPeriod.Daily);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
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
      setCreateError("Title is required.");
      return;
    }

    try {
      setSaving(true);
      await createActivity({
        title,
        description: newDescription.trim() || undefined,
        period,
      });

      setCreateOpen(false);
      setNewTitle("");
      setNewDescription("");
      await refresh();
    } catch (e: any) {
      setCreateError(e?.message ?? "Failed to create activity.");
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
        setOpenId(null); // close any open dropdown when switching tabs
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [period]);

  function toggleActivity(id: string) {
    setOpenId((cur) => (cur === id ? null : id));
  }

  const colors = useMemo(() => {
    return {
      pillBg: theme === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.08)",
      pillActiveBg: theme === "light" ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.14)",
      pillBorder: theme === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.10)",
      headerRowBorder: theme === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)",
      modalOverlay: "rgba(0,0,0,0.45)",
      modalCardBg: theme === "light" ? "#fff" : "rgba(20,20,20,1)",
      inputBg: theme === "light" ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)",
      inputBorder: theme === "light" ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.14)",
      buttonBg: theme === "light" ? "rgba(0,0,0,0.90)" : "rgba(255,255,255,0.92)",
      buttonText: theme === "light" ? "#fff" : "#000",
      secondaryBtnBg: theme === "light" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.10)",
    };
  }, [theme]);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.headerRow, { borderColor: colors.headerRowBorder }]}>
        <ThemedText type="title" style={styles.headerTitle}>
          Activities
        </ThemedText>

        <Pressable
          onPress={() => setCreateOpen(true)}
          style={[styles.createBtn, { backgroundColor: colors.pillActiveBg, borderColor: colors.pillBorder }]}
          accessibilityRole="button"
        >
          <ThemedText style={styles.createBtnText}>+ Create</ThemedText>
        </Pressable>
      </View>

      {/* Period tabs */}
      <View style={[styles.pills, { borderColor: colors.pillBorder, backgroundColor: colors.pillBg }]}>
        {Object.values(ActivityPeriod).map((p) => {
          const active = p === period;
          return (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[
                styles.pill,
                active && { backgroundColor: colors.pillActiveBg },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <ThemedText style={[styles.pillText, active && styles.pillTextActive]}>
                {p}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

            <Modal
        visible={createOpen}
        animationType="fade"
        transparent
        onRequestClose={() => (saving ? null : setCreateOpen(false))}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ThemedView style={[styles.modalCard, { backgroundColor: colors.modalCardBg }]}>
              <ThemedText type="subtitle" style={styles.modalTitle}>
                Create activity
              </ThemedText>

              <ThemedText style={styles.modalHint}>
                Period: <ThemedText style={{ fontWeight: "600" }}>{period}</ThemedText>
              </ThemedText>

              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Title"
                placeholderTextColor={theme === "light" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.45)"}
                editable={!saving}
                style={[
                  styles.input,
                  { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: theme === "light" ? "#000" : "#fff" },
                ]}
              />

              <TextInput
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder="Description (optional)"
                placeholderTextColor={theme === "light" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.45)"}
                editable={!saving}
                multiline
                style={[
                  styles.input,
                  styles.textarea,
                  { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: theme === "light" ? "#000" : "#fff" },
                ]}
              />

              {createError ? <ThemedText style={styles.errorText}>{createError}</ThemedText> : null}

              <View style={styles.modalButtons}>
                <Pressable
                  onPress={() => setCreateOpen(false)}
                  disabled={saving}
                  style={[styles.secondaryBtn, { backgroundColor: colors.secondaryBtnBg }]}
                >
                  <ThemedText>Cancel</ThemedText>
                </Pressable>

                <Pressable
                  onPress={onCreate}
                  disabled={saving}
                  style={[styles.primaryBtn, { backgroundColor: colors.buttonBg }]}
                >
                  <ThemedText style={{ color: colors.buttonText }}>
                    {saving ? "Creating..." : "Create"}
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <FlatList
        data={activities}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <Collapsible
            title={item.title}
            progressPct={item.completionPercent}
            isOpen={openId === item.id}
            onToggle={() => toggleActivity(item.id)}
          >
            <ThemedText style={styles.description}>{item.description}</ThemedText>
            <View style={styles.metaRow}>
              <ThemedText style={styles.metaLabel}>Complete</ThemedText>
              <ThemedText style={styles.metaValue}>{item.completionPercent}%</ThemedText>
            </View>
          </Collapsible>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  headerTitle: {
    marginBottom: 12,
  },

  pills: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 999,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: {
    fontSize: 13,
    opacity: 0.75,
  },
  pillTextActive: {
    opacity: 1,
  },

  listContent: {
    paddingBottom: 28,
  },
  separator: {
    height: 12,
  },

  description: {
    opacity: 0.85,
    lineHeight: 20,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    opacity: 0.6,
    fontSize: 13,
  },
  metaValue: {
    fontSize: 13,
    opacity: 0.9,
  },
    headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  createBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },

  modalOverlay: {
    flex: 1,
    padding: 18,
    justifyContent: "center",
  },
  modalCard: {
    borderRadius: 14,
    padding: 14,
  },
  modalTitle: {
    marginBottom: 6,
  },
  modalHint: {
    opacity: 0.7,
    marginBottom: 10,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    fontSize: 15,
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  errorText: {
    marginTop: 10,
    opacity: 0.9,
  },
  modalButtons: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
});
