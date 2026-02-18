import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Link, router } from 'expo-router';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';

import { auth } from '@/auth/firebaseClient';
import { getAuthErrorMessage } from '@/auth/firebaseErrors';
import { BannerAdView } from '@/components/banner-ad';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetHint, setResetHint] = useState(false);

  async function onLogin() {
    setBusy(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/');
    } catch (e) {
      setError(getAuthErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    setError(null);
    setResetSent(false);
    setResetHint(false);
    if (!email.trim()) {
      setResetHint(true);
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (e) {
      setError(getAuthErrorMessage(e));
    }
  }

  return (
     <ParallaxScrollView
      headerBackgroundColor={{ light: '#0B1220', dark: '#0B1220' }}
      headerImage={
        <View className="h-[200px] w-full overflow-hidden">
          <Image
            source={require('@/assets/images/app-logo.png')}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />

          {/* Readability overlay */}
          <View className="absolute inset-0 bg-[#0B1220]/55" />

          {/* Branding */}
          <View className="flex-1 justify-end gap-1.5 px-[18px] pb-[18px]">
            <Text className="text-[32px] font-bold leading-[40px] text-white">
              Yet Another Habit App
            </Text>

            <Text className="max-w-[420px] text-[16px] leading-5 text-white/85">
              Keep it simple. Track what matters. Build momentum.
            </Text>
          </View>
        </View>
      }
    >    
      <ThemedView className="flex-1 justify-center px-5">
        <ThemedView className="rounded-[18px] border border-black/10 bg-white p-[18px] dark:border-white/10 dark:bg-neutral-900">
          <ThemedText type="title" className="mt-1 text-neutral-900 dark:text-white">
            Welcome back
          </ThemedText>
          <ThemedText className="mb-3 opacity-75 text-neutral-700 dark:text-neutral-300">
            Log in to continue.
          </ThemedText>

          <ThemedView className="mt-1 gap-3">
            <TextInput
              className="rounded-[14px] border border-black/10 bg-white px-4 py-3 text-neutral-900 dark:border-white/10 dark:bg-neutral-900 dark:text-white"
              placeholder="Email"
              placeholderTextColor="#8E8E93"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!busy}
            />

            <TextInput
              className="rounded-[14px] border border-black/10 bg-white px-4 py-3 text-neutral-900 dark:border-white/10 dark:bg-neutral-900 dark:text-white"
              placeholder="Password"
              placeholderTextColor="#8E8E93"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={onLogin}
              editable={!busy}
            />

            <ThemedView className="-mt-1 gap-1">
              <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                <ThemedText type="link" className="text-[13px] text-indigo-500">
                  Forgot password?
                </ThemedText>
              </TouchableOpacity>

              {resetHint ? (
                <ThemedText className="text-[12px] opacity-60 text-neutral-700 dark:text-neutral-300">
                  Enter your email above, then tap "Forgot password?" to send a reset link.
                </ThemedText>
              ) : null}

              {resetSent ? (
                <ThemedText className="text-[13px] text-green-600 dark:text-green-400">
                  Reset link sent! Check your email.
                </ThemedText>
              ) : null}
            </ThemedView>

            {error ? (
              <ThemedText className="-mt-1 text-[13px] text-red-600 dark:text-red-400">{error}</ThemedText>
            ) : null}

            <TouchableOpacity
              onPress={onLogin}
              disabled={busy}
              activeOpacity={0.85}
              className={[
                'mt-1 rounded-[14px] bg-indigo-500 py-3',
                'items-center justify-center',
                busy ? 'opacity-60' : 'opacity-100',
              ].join(' ')}
            >
              <Text className="text-[16px] font-semibold text-white">
                {busy ? 'Signing in…' : 'Log in'}
              </Text>
            </TouchableOpacity>

            <ThemedView className="mt-2 flex-row items-center justify-center gap-2">
              <ThemedText className="opacity-75 text-neutral-700 dark:text-neutral-300">
                New here?
              </ThemedText>

              <Link href="/signup" asChild>
                <TouchableOpacity activeOpacity={0.7}>
                  <ThemedText type="link" className="text-indigo-500">
                    Create account
                  </ThemedText>
                </TouchableOpacity>
              </Link>
            </ThemedView>

            {/* Ad banner */}
            <BannerAdView />
          </ThemedView>
        </ThemedView>
      </ThemedView>

    </ParallaxScrollView>
  );
}
