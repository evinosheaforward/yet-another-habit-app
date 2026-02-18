import { getApiBaseUrl } from '@/api/baseUrl';
import { auth } from '@/auth/firebaseClient';

export type AuthedContext = {
  uid: string;
  token: string;
};

export async function getAuthedContext(): Promise<AuthedContext> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken(true);
  return { uid: user.uid, token };
}

export function buildUrl(path: string, params?: Record<string, string>) {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const url = new URL(`${base}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return url.toString();
}

export async function apiFetch<T>(
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
    const text = await resp.text().catch(() => '');
    throw new Error(text || `Request failed (${resp.status})`);
  }

  return (await resp.json()) as T;
}
