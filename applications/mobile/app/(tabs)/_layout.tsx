import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import { useAuthState } from '@/auth/useAuthState';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

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

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const t = colorScheme === 'dark' ? THEME.dark : THEME.light;

  const { user, initializing } = useAuthState();

  // avoid flicker while Firebase restores session
  if (initializing) return null;

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,

        tabBarActiveTintColor: t.tint,
        tabBarInactiveTintColor: t.inactive,

        // Tabs are styled via options objects (not Tailwind className)
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
          tabBarIcon: ({
            color,
          }: Parameters<NonNullable<BottomTabNavigationOptions['tabBarIcon']>>[0]) => (
            <IconSymbol size={28} name="paperplane.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          title: 'Archive',
          tabBarIcon: ({
            color,
          }: Parameters<NonNullable<BottomTabNavigationOptions['tabBarIcon']>>[0]) => (
            <IconSymbol size={28} name="archivebox.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
