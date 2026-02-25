import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { IntegrityGate } from '@/components/integrity-gate';
import { OnboardingProvider } from '@/onboarding/OnboardingProvider';
import { useAuthState } from '@/auth/useAuthState';
// Importing firebaseClient eagerly ensures auth + emulator are initialized at module load
import '@/auth/firebaseClient';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppContent() {
  const { user } = useAuthState();

  const content = (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="activity/[id]" options={{ title: 'Activity Details' }} />
      <Stack.Screen name="achievement/[id]" options={{ title: 'Achievement' }} />
      <Stack.Screen name="activity/history" options={{ title: 'Activity History' }} />
      <Stack.Screen name="todo-settings" options={{ title: 'Todo Settings' }} />
      <Stack.Screen name="privacy-policy" options={{ title: 'Privacy Policy' }} />
    </Stack>
  );

  if (!user) return content;

  return <OnboardingProvider>{content}</OnboardingProvider>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();

  useEffect(() => {
    // Ensures Tailwind `dark:` variants respond to the app theme
    setColorScheme(colorScheme === 'dark' ? 'dark' : 'light');
  }, [colorScheme, setColorScheme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SafeAreaProvider>
          <IntegrityGate>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              <AppContent />
            </SafeAreaView>
          </IntegrityGate>
        </SafeAreaProvider>

        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
