import type { Request, Response } from 'express';
import { Router } from 'express';
import {
  getOnboardingProgress,
  completeOnboardingStep,
  completeOnboardingSteps,
} from '../db/onboardingModel';

const router = Router();

router.get('/onboarding', async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: 'Not authenticated' });

  const completedSteps = await getOnboardingProgress(authedUid);
  res.json({ completedSteps });
});

router.post('/onboarding/complete', async (req: Request, res: Response) => {
  const authedUid = req.auth?.uid;
  if (!authedUid) return res.status(401).json({ error: 'Not authenticated' });

  const { stepId, stepIds } = req.body ?? {};

  if (stepIds && Array.isArray(stepIds)) {
    const valid = stepIds.every((id: unknown) => typeof id === 'string' && id.length > 0);
    if (!valid) return res.status(400).json({ error: 'stepIds must be an array of non-empty strings' });
    const completedSteps = await completeOnboardingSteps(authedUid, stepIds);
    return res.json({ completedSteps });
  }

  if (typeof stepId === 'string' && stepId.length > 0) {
    const completedSteps = await completeOnboardingStep(authedUid, stepId);
    return res.json({ completedSteps });
  }

  return res.status(400).json({ error: 'Provide stepId (string) or stepIds (string[])' });
});

export default router;
