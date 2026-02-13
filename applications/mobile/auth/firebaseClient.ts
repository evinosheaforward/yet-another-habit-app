import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, connectAuthEmulator, browserLocalPersistence } from 'firebase/auth';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
};

const alreadyInitialized = getApps().length > 0;
export const app = alreadyInitialized ? getApp() : initializeApp(firebaseConfig);

function createAuth() {
  if (alreadyInitialized) return getAuth(app);

  if (Platform.OS === 'web') {
    return initializeAuth(app, { persistence: browserLocalPersistence });
  }

  // On native, use React Native persistence with AsyncStorage.
  // These are imported inline because getReactNativePersistence is only
  // available under the react-native module condition (not on web).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getReactNativePersistence } = require('@firebase/auth');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
  return initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
}

export const auth = createAuth();

// Connect emulator eagerly at module scope — must happen before persistence
// restores a previously saved emulator session, otherwise Firebase tries to
// validate the token against production and fails with auth/emulator-config-failed.
if (!alreadyInitialized && process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  const host =
    Platform.OS === 'android'
      ? '10.0.2.2'
      : (process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1');
  const port = Number(process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT ?? '9099');
  connectAuthEmulator(auth, `http://${host}:${port}`, { disableWarnings: true });
}
