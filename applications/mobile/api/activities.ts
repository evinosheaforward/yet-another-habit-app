import type { Activity, ActivityPeriod } from '@yet-another-habit-app/shared-types';
import { getApiBaseUrl } from '@/api/baseUrl';
import { auth } from '@/auth/firebaseClient';

type CacheEntry = { data: Activity[]; fetchedAt: number };
const cache: Partial<Record<ActivityPeriod, CacheEntry>> = {};
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
  const url = new URL(path, getApiBaseUrl());
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

  const resp = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${options?.token ?? ''}`,
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

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
    return;
  }
  for (const key of Object.keys(cache) as ActivityPeriod[]) delete cache[key];
}

export async function getActivities(period: ActivityPeriod, opts?: { force?: boolean }) {
  const now = Date.now();
  const hit = cache[period];
  if (!opts?.force && hit && now - hit.fetchedAt < TTL_MS) return hit.data;

  const { uid, token } = await getAuthedContext();

  const json = await apiFetch<{ activities: Activity[] }>('GET', '/activities', {
    token,
    query: { period, userId: uid },
  });

  cache[period] = { data: json.activities, fetchedAt: now };
  return json.activities;
}

export async function createActivity(input: {
  title: string;
  description?: string;
  period: ActivityPeriod;
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
      // keep parity with your existing backend GET signature
      userId: uid,
    },
  });

  invalidateActivitiesCache(input.period);
  return json.activity;
}
