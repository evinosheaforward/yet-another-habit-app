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
// react-native-draggable-flatlist – mock for todo list drag-and-drop
// ---------------------------------------------------------------------------
jest.mock('react-native-draggable-flatlist', () => {
  const { FlatList } = require('react-native');
  return {
    __esModule: true,
    default: FlatList,
    ScaleDecorator: ({ children }: { children: React.ReactNode }) => children,
  };
});

// ---------------------------------------------------------------------------
// react-native-gesture-handler – mock GestureHandlerRootView
// ---------------------------------------------------------------------------
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: View,
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    PanGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    NativeViewGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandlerComponent: View,
    FlatList: View,
    gestureHandlerRootHOC: (component: unknown) => component,
    Directions: {},
  };
});

// ---------------------------------------------------------------------------
// expo-symbols – stub types/components for icon-symbol imports
// ---------------------------------------------------------------------------
jest.mock('expo-symbols', () => ({
  SymbolView: 'SymbolView',
}));

// ---------------------------------------------------------------------------
// expo-constants – mock for banner-ad Expo Go detection
// ---------------------------------------------------------------------------
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: null },
}));

// ---------------------------------------------------------------------------
// react-native-google-mobile-ads – mock for banner-ad component
// ---------------------------------------------------------------------------
jest.mock('react-native-google-mobile-ads', () => ({
  BannerAd: 'BannerAd',
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' },
  TestIds: { BANNER: 'ca-app-pub-3940256099942544/6300978111' },
}));

// ---------------------------------------------------------------------------
// @expo/app-integrity – mock for Play Integrity gate
// ---------------------------------------------------------------------------
jest.mock('@expo/app-integrity', () => ({
  prepareIntegrityTokenProviderAsync: jest.fn(() => Promise.resolve()),
  requestIntegrityCheckAsync: jest.fn(() => Promise.resolve()),
}));

// ---------------------------------------------------------------------------
// Onboarding – mock provider and hook
// ---------------------------------------------------------------------------
jest.mock('@/onboarding/OnboardingProvider', () => ({
  OnboardingProvider: ({ children }: { children: React.ReactNode }) => children,
  useOnboarding: () => ({
    registerTarget: jest.fn(),
    unregisterTarget: jest.fn(),
    advanceStep: jest.fn(),
    skipSection: jest.fn(),
    triggerHook: jest.fn(),
    isOnboardingActive: false,
  }),
}));

jest.mock('@/onboarding/useOnboardingTarget', () => ({
  useOnboardingTarget: () => ({ current: null }),
}));


