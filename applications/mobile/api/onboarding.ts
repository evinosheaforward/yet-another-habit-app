import type { OnboardingState } from '@yet-another-habit-app/shared-types';
import { getAuthedContext, apiFetch } from '@/api/client';

export async function getOnboardingProgress(): Promise<OnboardingState> {
  const { token } = await getAuthedContext();
  return apiFetch<OnboardingState>('GET', '/onboarding', { token });
}

export async function completeOnboardingStep(stepId: string): Promise<OnboardingState> {
  const { token } = await getAuthedContext();
  return apiFetch<OnboardingState>('POST', '/onboarding/complete', {
    token,
    body: { stepId },
  });
}

export async function completeOnboardingSteps(stepIds: string[]): Promise<OnboardingState> {
  const { token } = await getAuthedContext();
  return apiFetch<OnboardingState>('POST', '/onboarding/complete', {
    token,
    body: { stepIds },
  });
}
