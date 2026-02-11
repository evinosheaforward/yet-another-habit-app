import type { ExpoConfig, ConfigContext } from 'expo/config';

const IS_PROD = process.env.EAS_BUILD_PROFILE === 'production';

const ADMOB_TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const ADMOB_PROD_ANDROID_APP_ID = 'ca-app-pub-7549827841883667~6201640633';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Yet Another Habit App',
  slug: 'yet-another-habit-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/favicon.png',
  scheme: 'mobile',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#000000',
      foregroundImage: './assets/images/favicon.png',
      backgroundImage: './assets/images/favicon.png',
      monochromeImage: './assets/images/favicon.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: 'com.evinosheasoftware.yetanotherhabitapp',
  },
  web: {
    favicon: './assets/images/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/favicon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#000000',
        dark: {
          backgroundColor: '#000000',
        },
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          buildToolsVersion: '36.0.0',
          ndkVersion: '27.1.12297006',
        },
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: IS_PROD ? ADMOB_PROD_ANDROID_APP_ID : ADMOB_TEST_ANDROID_APP_ID,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: '4ec27263-9ec6-4874-8be5-1557eb28e8dc',
    },
  },
  owner: 'evinosheasoftware',
});
