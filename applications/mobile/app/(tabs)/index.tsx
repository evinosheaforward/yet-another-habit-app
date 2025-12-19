import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Link, router } from "expo-router";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { getAuth, signOut } from "firebase/auth";
import { app } from "@/auth/firebaseClient";

export default function HomeScreen() {
  const auth = useMemo(() => getAuth(app), []);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const email = auth.currentUser?.email ?? "";
  const displayName =
    auth.currentUser?.displayName ??
    (email ? email.split("@")[0] : null) ??
    "there";

  async function handleLogout() {
    if (isSigningOut) return;

    try {
      setIsSigningOut(true);
      await signOut(auth);

      // Send the user somewhere sensible after logout.
      // Change this route to your actual login screen.
      router.replace("/login");
    } catch (e: any) {
      Alert.alert("Logout failed", e?.message ?? "Unknown error");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#0B1220", dark: "#0B1220" }}
      headerImage={
        <View style={styles.hero}>
          <Image
            source={require("@/assets/images/icon-partial.png")}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={200}
          />

          {/* Readability overlay */}
          <View style={styles.heroOverlay} />

          {/* Branding */}
          <View style={styles.heroContent}>
            <ThemedText style={[styles.brandKicker, styles.heroText]}>
              Yet Another Habit App
            </ThemedText>

            <ThemedText type="title" style={[styles.heroTitle, styles.heroText]}>
              Welcome, {displayName}
            </ThemedText>

            <ThemedText style={[styles.heroSubtitle, styles.heroTextMuted]}>
              Keep it simple. Track what matters. Build momentum.
            </ThemedText>
          </View>
        </View>
      }
    >
      <ThemedView style={styles.container}>
        {/* Status / account */}
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Your account
          </ThemedText>

          <ThemedText style={styles.muted}>
            {email ? `Signed in as ${email}` : "Signed in"}
          </ThemedText>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <ThemedText type="defaultSemiBold">Today</ThemedText>
              <ThemedText style={styles.muted}>Ready to check in?</ThemedText>
            </View>

            <Link href="/(tabs)/activities" asChild>
              <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                  View activities
                </ThemedText>
              </Pressable>
            </Link>
          </View>
        </ThemedView>

        {/* Quick hint */}
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Tip
          </ThemedText>
          <ThemedText style={styles.muted}>
            Start small: pick one habit you can do in under 2 minutes. Consistency beats intensity.
          </ThemedText>
        </ThemedView>

        {/* Logout */}
        <ThemedView style={styles.footer}>
          <Pressable
            onPress={handleLogout}
            disabled={isSigningOut}
            style={({ pressed }) => [
              styles.logoutButton,
              isSigningOut && styles.disabled,
              pressed && !isSigningOut && styles.pressed,
            ]}
          >
            <ThemedText type="defaultSemiBold">
              {isSigningOut ? "Logging out…" : "Logout"}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  // --- layout ---
  container: {
    gap: 14,
    paddingBottom: 28,
    paddingTop: 4,
  },

  // --- hero ---
  hero: {
    height: 240,
    width: "100%",
    overflow: "hidden",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11,18,32,0.55)",
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 6,
  },
  brandKicker: {
    opacity: 0.9,
    letterSpacing: 0.3,
  },
  heroTitle: {
    lineHeight: 40,
  },
  heroSubtitle: {
    lineHeight: 20,
    maxWidth: 420,
  },
  heroText: {
    color: "#FFFFFF",
  },
  heroTextMuted: {
    color: "rgba(255,255,255,0.85)",
  },

  // --- cards ---
  card: {
    gap: 10,
    padding: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(127,127,127,0.28)",
  },
  cardTitle: {
    marginBottom: 2,
  },
  muted: {
    opacity: 0.75,
    lineHeight: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(127,127,127,0.22)",
    marginVertical: 6,
  },

  // --- row / actions ---
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  primaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  primaryButtonText: {
    opacity: 0.95,
  },

  // --- footer / logout ---
  footer: {
    marginTop: 2,
  },
  logoutButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(127,127,127,0.35)",
  },

  // --- states ---
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.55,
  },
});
