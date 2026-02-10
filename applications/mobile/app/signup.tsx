import { useState } from 'react';
import { TextInput, TouchableOpacity } from 'react-native';
import { Link, router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

import { auth } from '@/auth/firebaseClient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function SignupScreen() {
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
    <ThemedView className="flex-1 justify-center px-5">
      <ThemedView className="rounded-[18px] border border-black/10 bg-white p-[18px] dark:border-white/10 dark:bg-neutral-950">
        <ThemedText type="title" className="mt-1 text-neutral-900 dark:text-white">
          Create account
        </ThemedText>
        <ThemedText className="mb-3 opacity-80 text-neutral-700 dark:text-neutral-300">
          Start building habits.
        </ThemedText>

        <ThemedView className="mt-1 gap-3">
          <TextInput
            className="rounded-[14px] border border-black/10 bg-white px-4 py-3 text-neutral-900 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
            placeholder="Display name (optional)"
            placeholderTextColor="#8E8E93"
            autoCapitalize="words"
            value={displayName}
            onChangeText={setDisplayName}
            editable={!busy}
          />

          <TextInput
            className="rounded-[14px] border border-black/10 bg-white px-4 py-3 text-neutral-900 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
            placeholder="Email"
            placeholderTextColor="#8E8E93"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!busy}
          />

          <TextInput
            className="rounded-[14px] border border-black/10 bg-white px-4 py-3 text-neutral-900 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
            placeholder="Password"
            placeholderTextColor="#8E8E93"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={onSignup}
            editable={!busy}
          />

          {error ? (
            <ThemedText className="-mt-1 text-[13px] text-red-500">{error}</ThemedText>
          ) : null}

          <TouchableOpacity
            onPress={onSignup}
            disabled={busy}
            activeOpacity={0.85}
            className={[
              'mt-1 rounded-[14px] border border-indigo-500/80 bg-indigo-500/10 py-3',
              'items-center justify-center',
              busy ? 'opacity-60' : 'opacity-100',
            ].join(' ')}
          >
            <ThemedText type="defaultSemiBold" className="text-neutral-900 dark:text-white">
              {busy ? 'Creating…' : 'Sign up'}
            </ThemedText>
          </TouchableOpacity>

          <ThemedView className="mt-2 flex-row items-center justify-center gap-2">
            <ThemedText className="opacity-80 text-neutral-700 dark:text-neutral-300">
              Already have an account?
            </ThemedText>

            <Link href="/login" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <ThemedText type="link" className="text-indigo-500">
                  Log in
                </ThemedText>
              </TouchableOpacity>
            </Link>
          </ThemedView>

          <ThemedView className="mt-2 items-center">
            <Link href="/privacy-policy" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <ThemedText className="text-[13px] text-indigo-500">Privacy Policy</ThemedText>
              </TouchableOpacity>
            </Link>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}
