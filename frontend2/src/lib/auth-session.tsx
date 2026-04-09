import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ApiError, apiRequest } from '@/lib/api';
import type { AuthEnvelope, AuthenticatedUser, LoginPayload } from '@/types/auth';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthSessionContextValue {
  status: AuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthenticatedUser | null;
  loginPending: boolean;
  logoutPending: boolean;
  login: (payload: LoginPayload) => Promise<AuthenticatedUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<AuthenticatedUser | null>;
  hasPermission: (...permissionIds: string[]) => boolean;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

function resolvePrototypeRole(user: Omit<AuthenticatedUser, 'prototype_role'>): AuthenticatedUser['prototype_role'] {
  if (user.agent_profile !== null) {
    return 'agent';
  }

  const roleIds = user.roles
    .flatMap((role) => [role.slug, role.name])
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  if (roleIds.some((value) => value.includes('super-admin') || value.includes('super admin'))) {
    return 'super-admin';
  }

  return 'business-owner';
}

function normalizeUser(payload: AuthEnvelope['data']): AuthenticatedUser {
  return {
    ...payload,
    prototype_role: resolvePrototypeRole(payload),
  };
}

async function fetchCurrentUser() {
  try {
    const response = await apiRequest<AuthEnvelope>('/auth/me');
    return normalizeUser(response.data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

async function loginRequest(payload: LoginPayload) {
  const response = await apiRequest<AuthEnvelope>('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return normalizeUser(response.data);
}

async function logoutRequest() {
  try {
    await apiRequest<{ message: string }>('/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return;
    }

    throw error;
  }
}

function BootstrapScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[hsl(var(--myhd-light))] p-4">
      <section className="w-full max-w-xl rounded-3xl border border-white/60 bg-white p-8 shadow-xl">
        <div className="mb-6 flex justify-center">
          <img src="/logo.png" alt="Myhd Affiliation" className="h-14 w-auto" />
        </div>
        <h1 className="text-2xl font-bold text-[hsl(var(--myhd-dark))] text-center">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500 text-center">{description}</p>
        <div className="mt-8 h-2 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full w-2/5 animate-pulse rounded-full bg-[hsl(var(--myhd-primary))]" />
        </div>
      </section>
    </main>
  );
}

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loginPending, setLoginPending] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const nextUser = await fetchCurrentUser();

        if (cancelled) {
          return;
        }

        setUser(nextUser);
        setStatus(nextUser ? 'authenticated' : 'unauthenticated');
      } catch {
        if (cancelled) {
          return;
        }

        setUser(null);
        setStatus('unauthenticated');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const permissionSet = useMemo(() => new Set(user?.permissions ?? []), [user]);

  const value: AuthSessionContextValue = {
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    user,
    loginPending,
    logoutPending,
    login: async (payload) => {
      setLoginPending(true);
      try {
        const nextUser = await loginRequest(payload);
        setUser(nextUser);
        setStatus('authenticated');
        return nextUser;
      } finally {
        setLoginPending(false);
      }
    },
    logout: async () => {
      setLogoutPending(true);
      try {
        await logoutRequest();
        setUser(null);
        setStatus('unauthenticated');
      } finally {
        setLogoutPending(false);
      }
    },
    refreshSession: async () => {
      const nextUser = await fetchCurrentUser();
      setUser(nextUser);
      setStatus(nextUser ? 'authenticated' : 'unauthenticated');
      return nextUser;
    },
    hasPermission: (...permissionIds) => permissionIds.some((permissionId) => permissionSet.has(permissionId)),
  };

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);

  if (context === null) {
    throw new Error('useAuthSession must be used within AuthSessionProvider.');
  }

  return context;
}

export function PublicOnly({ children }: { children: ReactNode }) {
  const { status } = useAuthSession();

  if (status === 'loading') {
    return (
      <BootstrapScreen
        title="Verification de session"
        description="Le prototype verifie la session backend avant de montrer l ecran de connexion."
      />
    );
  }

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuthSession();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <BootstrapScreen
        title="Chargement de l espace de travail"
        description="Le prototype recharge la session utilisateur et les droits du backend."
      />
    );
  }

  if (status !== 'authenticated') {
    const redirectTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} replace />;
  }

  return <>{children}</>;
}
