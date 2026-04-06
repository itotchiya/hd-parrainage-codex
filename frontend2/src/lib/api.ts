import { env } from '@/lib/env';

type ApiPayload = {
  code?: string;
  message?: string;
  errors?: Record<string, string | string[]>;
};

function buildApiUrl(path: string) {
  return `${env.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

function normalizeErrors(errors?: Record<string, string | string[]>) {
  if (!errors) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(errors).map(([field, value]) => [field, Array.isArray(value) ? value : [value]])
  );
}

async function readPayload(response: Response): Promise<ApiPayload | null> {
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    return null;
  }

  return (await response.json()) as ApiPayload;
}

async function executeRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const method = (init.method ?? 'GET').toUpperCase();

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (!headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'XMLHttpRequest');
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !headers.has('X-XSRF-TOKEN')) {
    const csrfToken = readCookie('XSRF-TOKEN');

    if (csrfToken !== null) {
      headers.set('X-XSRF-TOKEN', csrfToken);
    }
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    credentials: 'include',
    headers,
  });

  const payload = await readPayload(response);

  return {
    response,
    payload,
  };
}

function readCookie(name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match[1]);
}

function resolveOrigin(base: string): string {
  try {
    return new URL(base).origin;
  } catch {
    return window.location.origin;
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly errors?: Record<string, string[]>;

  constructor(status: number, payload: ApiPayload | null) {
    super(payload?.message ?? 'The request could not be completed.');
    this.name = 'ApiError';
    this.status = status;
    this.code = payload?.code;
    this.errors = normalizeErrors(payload?.errors);
  }
}

export async function ensureCsrfCookie() {
  const response = await fetch(`${resolveOrigin(env.apiBaseUrl)}/sanctum/csrf-cookie`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readPayload(response));
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}) {
  const method = (init.method ?? 'GET').toUpperCase();

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    await ensureCsrfCookie();
  }

  let { response, payload } = await executeRequest(path, init);

  if (!response.ok && response.status === 419 && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    await ensureCsrfCookie();
    ({ response, payload } = await executeRequest(path, init));
  }

  if (!response.ok) {
    throw new ApiError(response.status, payload);
  }

  return payload as T;
}
