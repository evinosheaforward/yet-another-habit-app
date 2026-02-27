import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  prepareIntegrityTokenProviderAsync,
  requestIntegrityCheckAsync,
} from '@expo/app-integrity';

type IntegrityStatus = 'loading' | 'passed' | 'failed';

export function usePlayIntegrity() {
  const [status, setStatus] = useState<IntegrityStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      setStatus('passed');
      return;
    }

    const cloudProjectNumber = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER;
    if (!cloudProjectNumber) {
      setStatus('passed');
      return;
    }

    let cancelled = false;

    async function check() {
      try {
        await prepareIntegrityTokenProviderAsync(cloudProjectNumber!);
        await requestIntegrityCheckAsync('app-launch');
        if (!cancelled) setStatus('passed');
      } catch (e) {
        if (!cancelled) {
          setStatus('failed');
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, error };
}
