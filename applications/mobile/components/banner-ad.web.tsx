// banner-ad.web.tsx
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

const publisherId = process.env.EXPO_PUBLIC_ADSENSE_PUBLISHER_ID; // should be "ca-pub-...."
const slotId = process.env.EXPO_PUBLIC_ADSENSE_SLOT_ID;

function loadAdSenseScript(pubId: string) {
  const id = 'adsense-script';
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing) {
    // If it already exists, assume it will load / is loaded.
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pubId}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load AdSense script'));
    document.head.appendChild(script);
  });
}

export function BannerAdView() {
  const insRef = useRef<HTMLModElement>(null);
  const [attempt, setAttempt] = useState(0);

  const isProduction = !__DEV__ && !!publisherId && !!slotId;

  useEffect(() => {
    if (!isProduction) return;

    let cancelled = false;

    (async () => {
      try {
        await loadAdSenseScript(publisherId!);
        if (cancelled) return;

        // Ensure the <ins> exists and then push
        if (insRef.current) {
          (window as any).adsbygoogle = (window as any).adsbygoogle || [];
          (window as any).adsbygoogle.push({});
        }
      } catch {
        // Retry once or twice (script sometimes races)
        if (!cancelled && attempt < 3) {
          setTimeout(() => setAttempt((x) => x + 1), 500);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isProduction, attempt]);

  if (__DEV__) {
    return (
      <View className="items-center justify-center rounded-[18px] border border-dashed border-black/20 bg-black/5 py-6 dark:border-white/20 dark:bg-white/5">
        <ThemedText className="text-[13px] opacity-50">Ad placeholder (dev)</ThemedText>
      </View>
    );
  }

  if (!publisherId) return null;

  return (
    <View className="items-center overflow-hidden rounded-[18px]">
      <ins
        ref={insRef}
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
