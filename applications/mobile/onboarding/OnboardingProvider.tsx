import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import {
  getOnboardingProgress,
  completeOnboardingStep as apiCompleteStep,
  completeOnboardingSteps as apiCompleteSteps,
} from '@/api/onboarding';
import { ONBOARDING_STEPS } from './steps';
import type { OnboardingStep } from './steps';
import { OnboardingOverlay } from './OnboardingOverlay';

type TargetLayout = { x: number; y: number; width: number; height: number };

type OnboardingContextValue = {
  registerTarget: (key: string, ref: RefObject<View | null>) => void;
  unregisterTarget: (key: string) => void;
  advanceStep: () => void;
  skipSection: () => void;
  triggerHook: (hookId: string) => boolean;
  remeasure: () => void;
  isOnboardingActive: boolean;
  activeStepId: string | null;
};

const OnboardingContext = createContext<OnboardingContextValue>({
  registerTarget: () => {},
  unregisterTarget: () => {},
  advanceStep: () => {},
  skipSection: () => {},
  triggerHook: () => false,
  remeasure: () => {},
  isOnboardingActive: false,
  activeStepId: null,
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

/**
 * Normalize a screen path so tab-group segments are stripped for comparison.
 *  "/(tabs)/activities" → "/activities"
 *  "/(tabs)"            → "/"
 *  "/todo-settings"     → "/todo-settings"
 */
function normalizeScreen(path: string): string {
  let p = path.replace(/\/\([^)]+\)/g, ''); // strip (tabs) or any group
  p = p.replace(/\/index$/, '');
  return p || '/';
}

/**
 * Compare a current path against a step screen, supporting dynamic segments.
 *  "/activity/abc123" matches "/activity/[id]"
 */
function screensMatch(currentPath: string, stepScreen: string): boolean {
  const current = normalizeScreen(currentPath);
  const step = normalizeScreen(stepScreen);
  if (current === step) return true;
  const bracketIdx = step.indexOf('/[');
  if (bracketIdx >= 0) {
    const prefix = step.substring(0, bracketIdx + 1);
    return current.startsWith(prefix);
  }
  return false;
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<OnboardingStep | null>(null);
  const [targetLayout, setTargetLayout] = useState<TargetLayout | null>(null);
  const [hookStep, setHookStep] = useState<OnboardingStep | null>(null);

  // Bumped whenever a target registers, so the measure effect re-runs
  const [targetVersion, setTargetVersion] = useState(0);

  const targets = useRef<Map<string, RefObject<View | null>>>(new Map());
  const anchorRef = useRef<View>(null);
  // After completing a hook step, suppress auto-navigation persistently until
  // the user naturally arrives at the next step's screen. This prevents the
  // provider from calling router.dismiss() while the user is still navigating
  // within the hook flow (e.g. /activity/[id] → /activity/history → back).
  const suppressAutoNavRef = useRef(false);

  // Fetch initial progress
  useEffect(() => {
    let cancelled = false;
    getOnboardingProgress()
      .then((state) => {
        if (!cancelled) setCompletedSteps(new Set(state.completedSteps));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const registerTarget = useCallback((key: string, ref: RefObject<View | null>) => {
    targets.current.set(key, ref);
    setTargetVersion((v) => v + 1);
  }, []);

  const unregisterTarget = useCallback((key: string) => {
    targets.current.delete(key);
  }, []);

  // Determine the next linear step (excluding hook-triggered steps)
  const getNextLinearStep = useCallback(
    (completed: Set<string>): OnboardingStep | null => {
      for (const step of ONBOARDING_STEPS) {
        if (step.hookTrigger) continue;
        if (!completed.has(step.id)) return step;
      }
      return null;
    },
    [],
  );

  // Compute active step when completedSteps change
  useEffect(() => {
    if (loading) return;

    // Hook step takes priority
    if (hookStep && !completedSteps.has(hookStep.id)) {
      setActiveStep(hookStep);
      return;
    }
    if (hookStep && completedSteps.has(hookStep.id)) {
      // Chain: check for another uncompleted step with the same hookTrigger
      const nextHook = ONBOARDING_STEPS.find(
        (s) => s.hookTrigger === hookStep.hookTrigger && !completedSteps.has(s.id),
      );
      if (nextHook) {
        setHookStep(nextHook);
        return;
      }
      // Hook chain fully complete — suppress auto-navigation so we don't
      // conflict with user navigation (e.g. browsing /activity/history).
      suppressAutoNavRef.current = true;
      setHookStep(null);
    }

    const next = getNextLinearStep(completedSteps);
    setActiveStep(next);
  }, [loading, completedSteps, hookStep, getNextLinearStep]);

  // Navigate to the step's screen if needed, and measure target
  useEffect(() => {
    if (!activeStep) {
      setTargetLayout(null);
      return;
    }

    if (!screensMatch(pathname, activeStep.screen)) {
      setTargetLayout(null);

      // After completing a hook step, suppress auto-navigation until the user
      // naturally arrives at the next step's screen. This stays active across
      // multiple pathname changes (e.g. /activity/[id] → /activity/history → back).
      if (suppressAutoNavRef.current) {
        return;
      }

      // If the step uses a dynamic route (e.g. /activity/[id]), the external caller
      // is responsible for navigating — we can't construct the URL ourselves.
      if (activeStep.screen.includes('/[')) {
        return;
      }

      // If we're on a stack screen and need to go to a tab screen, dismiss first
      const currentNorm = normalizeScreen(pathname);
      const TAB_PATHS = ['/', '/activities', '/todo', '/achievements', '/archive'];
      const stepIsTab = activeStep.screen.startsWith('/(tabs)');
      const currentIsStack = !TAB_PATHS.includes(currentNorm);

      if (stepIsTab && currentIsStack) {
        router.dismiss();
        return;
      }

      router.push(activeStep.screen as any);
      return;
    }

    // User arrived at the correct screen — clear suppression
    suppressAutoNavRef.current = false;

    // On the correct screen — try to measure the target
    const ref = targets.current.get(activeStep.targetKey);
    if (!ref?.current) {
      // Target not registered yet; targetVersion will trigger a re-run when it is
      setTargetLayout(null);
      return;
    }

    // Small delay to let the layout settle after navigation
    const timer = setTimeout(() => {
      anchorRef.current?.measureInWindow((ax, ay) => {
        ref.current?.measureInWindow((tx, ty, width, height) => {
          if (width > 0 && height > 0) {
            setTargetLayout({ x: tx - ax, y: ty - ay, width, height });
          }
        });
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [activeStep, pathname, router, targetVersion]);

  const markComplete = useCallback((stepIds: string[]) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      for (const id of stepIds) next.add(id);
      return next;
    });

    // Fire-and-forget API call
    if (stepIds.length === 1) {
      apiCompleteStep(stepIds[0]).catch(() => {});
    } else {
      apiCompleteSteps(stepIds).catch(() => {});
    }
  }, []);

  const advanceStep = useCallback(() => {
    if (!activeStep) return;
    markComplete([activeStep.id]);
    // Hook step transitions (chaining + suppression) handled by the compute-active-step effect.
  }, [activeStep, markComplete]);

  const skipSection = useCallback(() => {
    if (!activeStep) return;
    const section = activeStep.section;
    const sectionStepIds = ONBOARDING_STEPS.filter(
      (s) => s.section === section && !s.hookTrigger,
    ).map((s) => s.id);
    markComplete(sectionStepIds);
  }, [activeStep, markComplete]);

  const triggerHook = useCallback(
    (hookId: string): boolean => {
      const step = ONBOARDING_STEPS.find(
        (s) => s.hookTrigger === hookId && !completedSteps.has(s.id),
      );
      if (step) {
        setHookStep(step);
        return true;
      }
      return false;
    },
    [completedSteps],
  );

  const remeasure = useCallback(() => {
    setTargetVersion((v) => v + 1);
  }, []);

  const isOnboardingActive = activeStep !== null && targetLayout !== null;

  // Check if there are more steps in the current section after the active step
  const hasMoreInSection =
    activeStep != null &&
    ONBOARDING_STEPS.some(
      (s) =>
        s.section === activeStep.section &&
        !s.hookTrigger &&
        s.id !== activeStep.id &&
        !completedSteps.has(s.id),
    );

  const contextValue: OnboardingContextValue = {
    registerTarget,
    unregisterTarget,
    advanceStep,
    skipSection,
    triggerHook,
    remeasure,
    isOnboardingActive,
    activeStepId: activeStep?.id ?? null,
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      <View
        ref={anchorRef}
        collapsable={false}
        style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0 }}
        pointerEvents="none"
      />
      {children}
      {activeStep && targetLayout ? (
        <OnboardingOverlay
          step={activeStep}
          targetLayout={targetLayout}
          onNext={advanceStep}
          onSkipSection={skipSection}
          showSkip={hasMoreInSection}
        />
      ) : null}
    </OnboardingContext.Provider>
  );
}
