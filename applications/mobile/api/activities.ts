import type {
  Activity,
  ActivityHistoryEntry,
  ActivityPeriod,
  UserConfig,
} from '@yet-another-habit-app/shared-types';
import { getApiBaseUrl } from '@/api/baseUrl';
import { auth } from '@/auth/firebaseClient';

type CacheEntry = { data: Activity[]; fetchedAt: number };
const cache: Partial<Record<string, CacheEntry>> = {};
const TTL_MS = 60_000; // 1 minute

type AuthedContext = {
  uid: string;
  token: string;
};

async function getAuthedContext(): Promise<AuthedContext> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  // Force refresh so backend sees the latest auth state/claims
  const token = await user.getIdToken(true);
  return { uid: user.uid, token };
}

function buildUrl(path: string, params?: Record<string, string>) {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const url = new URL(`${base}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return url.toString();
}

async function apiFetch<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options?: {
    query?: Record<string, string>;
    body?: unknown;
    token?: string;
  },
): Promise<T> {
  const url = buildUrl(path, options?.query);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  let resp: Response;
  try {
    resp = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${options?.token ?? ''}`,
        ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    // Prefer backend-provided message; fall back to status text
    const text = await resp.text().catch(() => '');
    throw new Error(text || `Request failed (${resp.status})`);
  }

  return (await resp.json()) as T;
}

function invalidateActivitiesCache(period?: ActivityPeriod) {
  if (period) {
    delete cache[period];
    delete cache[`archived:${period}`];
    return;
  }
  for (const key of Object.keys(cache)) delete cache[key];
}

export async function getActivities(
  period: ActivityPeriod,
  opts?: { force?: boolean; archived?: boolean },
) {
  const archived = opts?.archived ?? false;
  const cacheKey = archived ? `archived:${period}` : period;
  const now = Date.now();
  const hit = cache[cacheKey];
  if (!opts?.force && hit && now - hit.fetchedAt < TTL_MS) return hit.data;

  const { uid, token } = await getAuthedContext();

  const query: Record<string, string> = { period, userId: uid };
  if (archived) query.archived = 'true';

  const json = await apiFetch<{ activities: Activity[] }>('GET', '/activities', {
    token,
    query,
  });

  cache[cacheKey] = { data: json.activities, fetchedAt: now };
  return json.activities;
}

export async function createActivity(input: {
  title: string;
  description?: string;
  period: ActivityPeriod;
  goalCount?: number;
  stackedActivityId?: string | null;
  task?: boolean;
  archiveTask?: boolean;
}): Promise<Activity> {
  const title = input.title.trim();
  if (!title) throw new Error('Title is required.');

  const { uid, token } = await getAuthedContext();

  const json = await apiFetch<{ activity: Activity }>('POST', '/activities', {
    token,
    body: {
      title,
      description: input.description?.trim() || undefined,
      period: input.period,
      goalCount: input.goalCount ?? 1,
      stackedActivityId: input.stackedActivityId ?? undefined,
      task: input.task || undefined,
      archiveTask: input.archiveTask || undefined,
      userId: uid,
    },
  });

  invalidateActivitiesCache(input.period);
  return json.activity;
}

export async function updateActivity(
  activityId: string,
  input: {
    title?: string;
    description?: string;
    goalCount?: number;
    stackedActivityId?: string | null;
    archived?: boolean;
  },
): Promise<Activity> {
  const { token } = await getAuthedContext();

  const json = await apiFetch<{ activity: Activity }>('PUT', `/activities/${activityId}`, {
    token,
    body: input,
  });

  invalidateActivitiesCache();
  return json.activity;
}

export async function archiveActivity(activityId: string): Promise<Activity> {
  return updateActivity(activityId, { archived: true });
}

export async function unarchiveActivity(activityId: string): Promise<Activity> {
  return updateActivity(activityId, { archived: false });
}

export async function getActivityHistory(
  activityId: string,
  limit?: number,
): Promise<{ period: string; history: ActivityHistoryEntry[] }> {
  const { token } = await getAuthedContext();

  return apiFetch<{ period: string; history: ActivityHistoryEntry[] }>(
    'GET',
    `/activities/${activityId}/history`,
    {
      token,
      query: limit !== undefined ? { limit: String(limit) } : undefined,
    },
  );
}

export async function deleteActivity(activityId: string): Promise<void> {
  const { token } = await getAuthedContext();

  await apiFetch<{ success: boolean }>('DELETE', `/activities/${activityId}`, { token });
  invalidateActivitiesCache();
}

export async function deleteAccount(): Promise<void> {
  const { token } = await getAuthedContext();

  await apiFetch<{ success: boolean }>('DELETE', '/account', { token });
  invalidateActivitiesCache();
}

// --- User config ---

export async function getUserConfig(): Promise<UserConfig> {
  const { token } = await getAuthedContext();
  return apiFetch<UserConfig>('GET', '/user-config', { token });
}

export async function updateUserConfig(config: UserConfig): Promise<UserConfig> {
  const { token } = await getAuthedContext();
  return apiFetch<UserConfig>('PUT', '/user-config', { token, body: config });
}

// --- Debounced activity count updates ---

type PendingDelta = {
  timer: ReturnType<typeof setTimeout>;
  accumulated: number;
};

const pendingDeltas = new Map<string, PendingDelta>();
const DEBOUNCE_MS = 500;

export async function updateActivityCount(
  activityId: string,
  delta: number,
): Promise<{ count: number }> {
  const { token } = await getAuthedContext();

  const json = await apiFetch<{ count: number }>('POST', `/activities/${activityId}/history`, {
    token,
    body: { delta },
  });

  invalidateActivitiesCache();
  return json;
}

export function debouncedUpdateActivityCount(
  activityId: string,
  delta: number,
  onResult: (count: number) => void,
  onError: (err: Error) => void,
): void {
  const existing = pendingDeltas.get(activityId);

  if (existing) {
    clearTimeout(existing.timer);
    existing.accumulated += delta;
  }

  const accumulated = existing ? existing.accumulated : delta;

  const timer = setTimeout(async () => {
    pendingDeltas.delete(activityId);
    if (accumulated === 0) return;

    // Send individual +1/-1 calls for the accumulated delta
    // This ensures the backend validates each step
    try {
      const sign = accumulated > 0 ? 1 : -1;
      let lastCount = 0;
      for (let i = 0; i < Math.abs(accumulated); i++) {
        const result = await updateActivityCount(activityId, sign);
        lastCount = result.count;
      }
      onResult(lastCount);
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  }, DEBOUNCE_MS);

  pendingDeltas.set(activityId, { timer, accumulated });
}
