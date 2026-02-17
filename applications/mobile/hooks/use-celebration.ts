import { useCallback, useState } from 'react';
import * as Haptics from 'expo-haptics';
import type { CompletedAchievement } from '@yet-another-habit-app/shared-types';

export function useCelebration() {
  const [queue, setQueue] = useState<CompletedAchievement[]>([]);

  const celebrate = useCallback((achievements: CompletedAchievement[]) => {
    if (achievements.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setQueue((prev) => [...prev, ...achievements]);
  }, []);

  const dismiss = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  const current = queue.length > 0 ? queue[0] : null;

  return { current, celebrate, dismiss };
}
