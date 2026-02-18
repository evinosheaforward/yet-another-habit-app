import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { deleteUser, getAuth, signOut } from 'firebase/auth';
import { app } from '@/auth/firebaseClient';
import { deleteAccount, getUserConfig, updateUserConfig } from '@/api/activities';
import { BannerAdView } from '@/components/banner-ad';

export default function HomeScreen() {
  const auth = useMemo(() => getAuth(app), []);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dayEndOffsetMinutes, setDayEndOffsetMinutes] = useState<number | null>(null);
  const [showDayEndPicker, setShowDayEndPicker] = useState(false);

  useEffect(() => {
    getUserConfig()
      .then((config) => setDayEndOffsetMinutes(config.dayEndOffsetMinutes))
      .catch(() => {});
  }, []);

  const tzOffsetMinutes = new Date().getTimezoneOffset(); // UTC = local + offset
  const tzAbbreviation =
    Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value ?? '';

  function utcMinutesToLocalLabel(utcMinutes: number): string {
    const localMinutes = (((utcMinutes - tzOffsetMinutes) % 1440) + 1440) % 1440;
    const h = Math.floor(localMinutes / 60);
    const period = h < 12 ? 'AM' : 'PM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:00 ${period}`;
  }

  const handleSelectDayEnd = useCallback(
    async (localHour: number) => {
      setShowDayEndPicker(false);
      const localMinutes = localHour * 60;
      const utcMinutes = (((localMinutes + tzOffsetMinutes) % 1440) + 1440) % 1440;
      try {
        const config = await updateUserConfig({ dayEndOffsetMinutes: utcMinutes });
        setDayEndOffsetMinutes(config.dayEndOffsetMinutes);
      } catch (e: any) {
        Alert.alert('Failed to update', e?.message ?? 'Unknown error');
      }
    },
    [tzOffsetMinutes],
  );

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
            <Text className="text-[16px] leading-6 tracking-[0.3px] text-white/90">
              Yet Another Habit App
            </Text>

            <Text className="text-[32px] font-bold leading-[40px] text-white">
              Welcome, {displayName}
            </Text>

            <Text className="max-w-[420px] text-[16px] leading-5 text-white/85">
              Track your habits, manage your todos, and reward yourself!
            </Text>
          </View>
        </View>
      }
    >
      <ThemedView className="gap-3.5 pb-2 pt-1">
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
        </ThemedView>

        {/* Day End Time */}
        <Pressable
          onPress={() => setShowDayEndPicker(true)}
          className="rounded-[18px] border border-black/10 bg-white px-4 py-3.5 dark:border-white/10 dark:bg-neutral-950"
        >
          <View className="flex-row items-center justify-between">
            <ThemedText className="leading-5 text-neutral-700 dark:text-neutral-300">
              Your days end at{' '}
              <ThemedText type="defaultSemiBold" className="text-neutral-900 dark:text-white">
                {dayEndOffsetMinutes !== null ? utcMinutesToLocalLabel(dayEndOffsetMinutes) : '…'}{' '}
                {tzAbbreviation}
              </ThemedText>
            </ThemedText>
            <ThemedText className="text-[14px] text-indigo-500">Edit</ThemedText>
          </View>
        </Pressable>

        <Modal
          visible={showDayEndPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDayEndPicker(false)}
        >
          <View className="flex-1 justify-end bg-black/40">
            <View className="max-h-[60%] rounded-t-3xl bg-white pb-8 dark:bg-neutral-900">
              <View className="flex-row items-center justify-between border-b border-black/10 px-5 py-4 dark:border-white/10">
                <ThemedText type="subtitle" className="text-neutral-900 dark:text-white">
                  Select day end time
                </ThemedText>
                <Pressable onPress={() => setShowDayEndPicker(false)}>
                  <ThemedText className="text-indigo-500">Cancel</ThemedText>
                </Pressable>
              </View>

              <ScrollView>
                {Array.from({ length: 24 }, (_, h) => {
                  const period = h < 12 ? 'AM' : 'PM';
                  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                  const label = `${h12}:00 ${period}`;
                  return (
                    <Pressable
                      key={h}
                      onPress={() => handleSelectDayEnd(h)}
                      className="border-b border-black/5 px-5 py-3.5 dark:border-white/5"
                    >
                      <ThemedText className="text-base text-neutral-900 dark:text-white">
                        {label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <ThemedView className="mt-0.5">
          <Link href="/(tabs)/activities" asChild>
            <Pressable
              className="items-center justify-center rounded-[16px] border border-black/10 bg-black/10 px-4 py-[13px] dark:border-white/10 dark:bg-white/10"
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <ThemedText type="defaultSemiBold" className="text-neutral-900 dark:text-white">
                View activities
              </ThemedText>
            </Pressable>
          </Link>
        </ThemedView>

        {/* Logout */}
        <ThemedView className="mt-0.5">
          <Pressable
            onPress={handleLogout}
            disabled={isSigningOut || isDeleting}
            className={[
              'items-center justify-center rounded-[16px] border px-4 py-[13px]',
              'border-black/10 bg-black/5 dark:border-white/10',
              isSigningOut || isDeleting ? 'opacity-50' : 'opacity-100',
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
              isDeleting || isSigningOut ? 'opacity-50' : 'opacity-100',
            ].join(' ')}
          >
            <ThemedText type="defaultSemiBold" className="text-red-600 dark:text-red-400">
              {isDeleting ? 'Deleting account…' : 'Delete Account'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        {/* Ad banner */}
        <BannerAdView />
      </ThemedView>
    </ParallaxScrollView>
  );
}
