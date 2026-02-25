import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import { useAuthState } from '@/auth/useAuthState';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingTarget } from '@/onboarding/useOnboardingTarget';

const THEME = {
  light: {
    tint: '#6366F1', // indigo-500
    bg: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    inactive: 'rgba(0,0,0,0.55)',
  },
  dark: {
    tint: '#818CF8', // indigo-400
    bg: '#0A0A0A', // near-neutral-950
    border: 'rgba(255,255,255,0.10)',
    inactive: 'rgba(255,255,255,0.60)',
  },
} as const;

function ActivitiesTabIcon({
  color,
}: Parameters<NonNullable<BottomTabNavigationOptions['tabBarIcon']>>[0]) {
  const ref = useOnboardingTarget('activities-tab');
  return (
    <View ref={ref}>
      <IconSymbol size={28} name="paperplane.fill" color={color} />
    </View>
  );
}

function TodoTabIcon({
  color,
}: Parameters<NonNullable<BottomTabNavigationOptions['tabBarIcon']>>[0]) {
  const ref = useOnboardingTarget('todo-tab');
  return (
    <View ref={ref}>
      <IconSymbol size={28} name="list.bullet" color={color} />
    </View>
  );
}

function AchievementsTabIcon({
  color,
}: Parameters<NonNullable<BottomTabNavigationOptions['tabBarIcon']>>[0]) {
  const ref = useOnboardingTarget('achievements-tab');
  return (
    <View ref={ref}>
      <IconSymbol size={28} name="trophy.fill" color={color} />
    </View>
  );
}

function ArchiveTabIcon({
  color,
}: Parameters<NonNullable<BottomTabNavigationOptions['tabBarIcon']>>[0]) {
  const ref = useOnboardingTarget('archive-tab');
  return (
    <View ref={ref}>
      <IconSymbol size={28} name="archivebox.fill" color={color} />
    </View>
  );
}

function TabLayoutInner() {
  const colorScheme = useColorScheme() ?? 'light';
  const t = colorScheme === 'dark' ? THEME.dark : THEME.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,

        tabBarActiveTintColor: t.tint,
        tabBarInactiveTintColor: t.inactive,

        tabBarStyle: {
          backgroundColor: t.bg,
          borderTopColor: t.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({
            color,
          }: Parameters<NonNullable<BottomTabNavigationOptions['tabBarIcon']>>[0]) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activities',
          tabBarIcon: ActivitiesTabIcon,
        }}
      />
      <Tabs.Screen
        name="todo"
        options={{
          title: 'Todo',
          tabBarIcon: TodoTabIcon,
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: 'Achievements',
          tabBarIcon: AchievementsTabIcon,
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          title: 'Archive',
          tabBarIcon: ArchiveTabIcon,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { user, initializing } = useAuthState();

  if (initializing) return null;

  if (!user) {
    return <Redirect href="/login" />;
  }

  return <TabLayoutInner />;
}
