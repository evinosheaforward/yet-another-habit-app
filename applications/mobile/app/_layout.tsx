import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';

import { useColorScheme } from '@/hooks/use-color-scheme';
// Importing firebaseClient eagerly ensures auth + emulator are initialized at module load
import '@/auth/firebaseClient';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutInner() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();

  useEffect(() => {
    // Ensures Tailwind `dark:` variants respond to the app theme
    setColorScheme(colorScheme === 'dark' ? 'dark' : 'light');
  }, [colorScheme, setColorScheme]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="activity/[id]" options={{ title: 'Activity Details' }} />
          <Stack.Screen name="achievement/[id]" options={{ title: 'Achievement' }} />
          <Stack.Screen name="activity/history" options={{ title: 'Activity History' }} />
          <Stack.Screen name="todo-settings" options={{ title: 'Todo Settings' }} />
          <Stack.Screen name="privacy-policy" options={{ title: 'Privacy Policy' }} />
        </Stack>
      </View>

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RootLayoutInner />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
