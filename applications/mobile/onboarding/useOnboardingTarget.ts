import { useEffect, useRef } from 'react';
import type { View } from 'react-native';
import { useOnboarding } from './OnboardingProvider';

export function useOnboardingTarget(key: string) {
  const ref = useRef<View>(null);
  const { registerTarget, unregisterTarget } = useOnboarding();

  useEffect(() => {
    registerTarget(key, ref);
    return () => unregisterTarget(key);
  }, [key, registerTarget, unregisterTarget]);

  return ref;
}
