import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Link, router } from 'expo-router';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { deleteUser, getAuth, signOut } from 'firebase/auth';
import { app } from '@/auth/firebaseClient';
import { deleteAccount } from '@/api/activities';
import { BannerAdView } from '@/components/banner-ad';

export default function HomeScreen() {
  const auth = useMemo(() => getAuth(app), []);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const email = auth.currentUser?.email ?? '';
  const displayName =
    auth.currentUser?.displayName ?? (email ? email.split('@')[0] : null) ?? 'there';

  async function handleLogout() {
    if (isSigningOut) return;

    try {
      setIsSigningOut(true);
      await signOut(auth);
      router.replace('/login');
    } catch (e: any) {
      Alert.alert('Logout failed', e?.message ?? 'Unknown error');
    } finally {
      setIsSigningOut(false);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account?',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteAccount();
              // Belt-and-suspenders: also delete client-side Firebase user
              try {
                if (auth.currentUser) await deleteUser(auth.currentUser);
              } catch {
                // Backend already deleted — ignore
              }
              await signOut(auth);
              router.replace('/login');
            } catch (e: any) {
              Alert.alert('Delete failed', e?.message ?? 'Unknown error');
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#0B1220', dark: '#0B1220' }}
      headerImage={
        <View className="h-[240px] w-full overflow-hidden">
          <Image
            source={require('@/assets/images/icon-partial.png')}
            className="absolute inset-0"
            contentFit="cover"
            transition={200}
          />

          {/* Readability overlay */}
          <View className="absolute inset-0 bg-[#0B1220]/55" />

          {/* Branding */}
          <View className="flex-1 justify-end gap-1.5 px-[18px] pb-[18px]">
            <ThemedText className="text-white/90 tracking-[0.3px]">
              Yet Another Habit App
            </ThemedText>

            <ThemedText type="title" className="text-white leading-[40px]">
              Welcome, {displayName}
            </ThemedText>

            <ThemedText className="max-w-[420px] text-white/85 leading-5">
              Keep it simple. Track what matters. Build momentum.
            </ThemedText>
          </View>
        </View>
      }
    >
      <ThemedView className="gap-3.5 pb-7 pt-1">
        {/* Status / account */}
        <ThemedView className="gap-2.5 rounded-[18px] border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-950">
          <ThemedText type="subtitle" className="mb-0.5 text-neutral-900 dark:text-white">
            Your account
          </ThemedText>

          <ThemedText className="opacity-75 leading-5 text-neutral-700 dark:text-neutral-300">
            {email ? `Signed in as ${email}` : 'Signed in'}
          </ThemedText>

          <Link href="/privacy-policy" asChild>
            <Pressable>
              <ThemedText className="text-[14px] text-indigo-500">Privacy Policy</ThemedText>
            </Pressable>
          </Link>

          <View className="my-1.5 h-px bg-black/10 dark:bg-white/10" />

          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1 gap-0.5">
              <ThemedText type="defaultSemiBold" className="text-neutral-900 dark:text-white">
                Today
              </ThemedText>
              <ThemedText className="opacity-75 leading-5 text-neutral-700 dark:text-neutral-300">
                Ready to check in?
              </ThemedText>
            </View>

            <Link href="/(tabs)/activities" asChild>
              <Pressable
                className="rounded-[14px] border border-white/20 bg-white/10 px-3.5 py-2.5 dark:border-white/15 dark:bg-white/10"
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <ThemedText type="defaultSemiBold" className="text-white/95">
                  View activities
                </ThemedText>
              </Pressable>
            </Link>
          </View>
        </ThemedView>

        {/* Ad banner */}
        <BannerAdView />

        {/* Logout */}
        <ThemedView className="mt-0.5">
          <Pressable
            onPress={handleLogout}
            disabled={isSigningOut || isDeleting}
            className={[
              'items-center justify-center rounded-[16px] border px-4 py-[13px]',
              'border-black/15 bg-transparent dark:border-white/15',
              isSigningOut || isDeleting ? 'opacity-55' : 'opacity-100',
            ].join(' ')}
            style={({ pressed }) => ({
              opacity: pressed && !isSigningOut && !isDeleting ? 0.85 : undefined,
            })}
          >
            <ThemedText type="defaultSemiBold" className="text-neutral-900 dark:text-white">
              {isSigningOut ? 'Logging out…' : 'Logout'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        {/* Delete account */}
        <ThemedView>
          <Pressable
            onPress={handleDeleteAccount}
            disabled={isDeleting || isSigningOut}
            className={[
              'items-center justify-center rounded-[16px] border px-4 py-[13px]',
              'border-red-500/30 bg-red-500/10',
              isDeleting || isSigningOut ? 'opacity-55' : 'opacity-100',
            ].join(' ')}
          >
            <ThemedText type="defaultSemiBold" className="text-red-600 dark:text-red-400">
              {isDeleting ? 'Deleting account…' : 'Delete Account'}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>
    </ParallaxScrollView>
  );
}
