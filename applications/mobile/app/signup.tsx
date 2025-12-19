import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Link, router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

import { auth } from '@/auth/firebaseClient';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function SignupScreen() {
  const theme = useColorScheme() ?? 'light';
  const c = theme === 'dark' ? Colors.dark : Colors.light;
  const styles = useMemo(() => makeStyles(c), [c]);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSignup() {
    setBusy(true);
    setError(null);

    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), password);

      if (displayName.trim()) {
        await updateProfile(res.user, { displayName: displayName.trim() });
      }

      router.replace('/');
    } catch (e: any) {
      setError(e?.message ?? 'Sign up failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.screen}>
      <ThemedView style={styles.card}>
        <ThemedText type="title" style={styles.title}>
          Create account
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Start building habits.
        </ThemedText>

        <ThemedView style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Display name (optional)"
            placeholderTextColor={c.tabIconDefault}
            autoCapitalize="words"
            value={displayName}
            onChangeText={setDisplayName}
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={c.tabIconDefault}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={c.tabIconDefault}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? (
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryButton, busy && styles.buttonDisabled]}
            onPress={onSignup}
            disabled={busy}
            activeOpacity={0.85}
          >
            <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
              {busy ? 'Creating…' : 'Sign up'}
            </ThemedText>
          </TouchableOpacity>

          <ThemedView style={styles.footerRow}>
            <ThemedText style={styles.footerText}>Already have an account?</ThemedText>
            <Link href="/login" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <ThemedText type="link">Log in</ThemedText>
              </TouchableOpacity>
            </Link>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

function makeStyles(c: typeof Colors.light) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      padding: 20,
      justifyContent: 'center',
    },
    card: {
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: c.tabIconDefault + '33',
      backgroundColor: c.background,
      gap: 6,
    },
    title: {
      marginTop: 4,
    },
    subtitle: {
      opacity: 0.8,
      marginBottom: 10,
    },
    form: {
      gap: 12,
      marginTop: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: c.tabIconDefault + '33',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: c.text,
      backgroundColor: c.background,
    },
    errorText: {
      color: '#ff4d4f',
      marginTop: -4,
    },
    primaryButton: {
      marginTop: 4,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.tint,
      backgroundColor: c.tint + '22',
    },
    primaryButtonText: {
      color: c.text,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    footerRow: {
      marginTop: 8,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    footerText: {
      opacity: 0.8,
    },
  });
}
