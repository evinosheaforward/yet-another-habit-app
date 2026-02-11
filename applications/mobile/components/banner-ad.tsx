import { useState } from 'react';
import { Platform, View } from 'react-native';
import Constants from 'expo-constants';

// Detect Expo Go — native ads require a dev client build
const isExpoGo = Constants.appOwnership === 'expo';

// Conditionally require the native module (unavailable in Expo Go)
let BannerAd: any = null;
let BannerAdSize: any = null;

if (!isExpoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ads = require('react-native-google-mobile-ads');
    BannerAd = ads.BannerAd;
    BannerAdSize = ads.BannerAdSize;
  } catch {
    // Native module not linked — render nothing
  }
}

const TEST_AD_UNIT_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_AD_UNIT_IOS = 'ca-app-pub-3940256099942544/2934735716';

function getAdUnitId(): string | null {
  if (__DEV__) {
    return Platform.OS === 'ios' ? TEST_AD_UNIT_IOS : TEST_AD_UNIT_ANDROID;
  }

  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS || null;
  }
  return process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID || null;
}

export function BannerAdView() {
  const [failed, setFailed] = useState(false);

  if (!BannerAd || !BannerAdSize || failed) return null;

  const adUnitId = getAdUnitId();
  if (!adUnitId) return null;

  return (
    <View className="items-center overflow-hidden rounded-[18px]">
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}
