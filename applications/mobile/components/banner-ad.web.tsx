import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

const publisherId = process.env.EXPO_PUBLIC_ADSENSE_PUBLISHER_ID;
const slotId = process.env.EXPO_PUBLIC_ADSENSE_SLOT_ID;

function ensureAdSenseScript(pubId: string) {
  const id = 'adsense-script';
  if (document.getElementById(id)) return;

  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pubId}`;
  document.head.appendChild(script);
}

export function BannerAdView() {
  const insRef = useRef<HTMLModElement>(null);
  const [pushed, setPushed] = useState(false);

  const isProduction = !__DEV__ && !!publisherId && !!slotId;

  useEffect(() => {
    if (!isProduction) return;

    ensureAdSenseScript(publisherId!);

    if (!pushed && insRef.current) {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        setPushed(true);
      } catch {
        // AdSense not ready yet — harmless
      }
    }
  }, [isProduction, pushed]);

  // Dev mode: show placeholder since AdSense won't serve on localhost
  if (__DEV__) {
    return (
      <View className="items-center justify-center rounded-[18px] border border-dashed border-black/20 bg-black/5 py-6 dark:border-white/20 dark:bg-white/5">
        <ThemedText className="text-[13px] opacity-50">Ad placeholder (dev)</ThemedText>
      </View>
    );
  }

  if (!publisherId || !slotId) return null;

  return (
    <View className="items-center overflow-hidden rounded-[18px]">
      <ins
        ref={insRef as any}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client={publisherId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </View>
  );
}
