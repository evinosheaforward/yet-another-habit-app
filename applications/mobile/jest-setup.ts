// Extend expect with RNTL matchers (toBeOnTheScreen, toHaveStyle, etc.)
require('@testing-library/react-native');

// ---------------------------------------------------------------------------
// react-native-reanimated mock (v4 inline mock)
// ---------------------------------------------------------------------------
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// ---------------------------------------------------------------------------
// nativewind – mock useColorScheme so components render without the full
// NativeWind runtime.
// ---------------------------------------------------------------------------
jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light', toggleColorScheme: jest.fn() }),
  styled: (c: unknown) => c,
}));

// ---------------------------------------------------------------------------
// expo-haptics – no-op in tests
// ---------------------------------------------------------------------------
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

// ---------------------------------------------------------------------------
// expo-router – mock navigation hooks and components
// ---------------------------------------------------------------------------
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: {
    Screen: () => null,
  },
  Tabs: {
    Screen: () => null,
  },
  Redirect: () => null,
}));

// ---------------------------------------------------------------------------
// Firebase – mock auth module
// ---------------------------------------------------------------------------
const mockAuth = {
  currentUser: null,
  onAuthStateChanged: jest.fn((_cb: unknown) => jest.fn()),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
};

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({})),
}));

jest.mock('firebase/auth', () => ({
  initializeAuth: jest.fn(() => mockAuth),
  getAuth: jest.fn(() => mockAuth),
  getReactNativePersistence: jest.fn(() => ({})),
  connectAuthEmulator: jest.fn(),
  onAuthStateChanged: jest.fn((auth, cb) => {
    // By default fire callback with null (no user) on next tick
    setTimeout(() => cb(null), 0);
    return jest.fn(); // unsubscribe
  }),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock('@firebase/auth', () => ({
  getReactNativePersistence: jest.fn(() => ({})),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// @react-native-firebase – mock native Firebase modules
// ---------------------------------------------------------------------------
jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: jest.fn(() => mockAuth),
}));

// ---------------------------------------------------------------------------
// expo-symbols – stub types/components for icon-symbol imports
// ---------------------------------------------------------------------------
jest.mock('expo-symbols', () => ({
  SymbolView: 'SymbolView',
}));


