import {
  createContext,
  useContext,
  useEffect,
  type PropsWithChildren,
  type ReactNode,
} from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Navigate, useLocation } from 'react-router-dom'
import { ApiError, apiRequest, ensureCsrfCookie } from '../../lib/api'
import { fetchBusinessIacrmSettings } from '../settings/api'
import { clearIacrmConfig, saveIacrmConfig, setIacrmScope } from '../iacrm/api'
import type {
  AuthEnvelope,
  AuthenticatedUser,
  LoginPayload,
} from '../../types/auth'

const authQueryKey = ['auth', 'session']

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthSessionContextValue {
  status: AuthStatus
  isLoading: boolean
  isAuthenticated: boolean
  user: AuthenticatedUser | null
  loginPending: boolean
  logoutPending: boolean
  login: (payload: LoginPayload) => Promise<AuthenticatedUser>
  logout: () => Promise<void>
  hasPermission: (...permissionIds: string[]) => boolean
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null)

async function fetchCurrentUser() {
  try {
    const response = await apiRequest<AuthEnvelope>('/auth/me')
    return response.data
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }

    throw error
  }
}

async function loginRequest(payload: LoginPayload) {
  await ensureCsrfCookie()

  const response = await apiRequest<AuthEnvelope>('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return response.data
}

async function logoutRequest() {
  try {
    await ensureCsrfCookie()
    await apiRequest<{ message: string }>('/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return
    }

    throw error
  }
}

function AuthBootstrapScreen({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-3xl rounded-[2rem] border border-border bg-card/90 p-8 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
          {eyebrow}
        </p>
        <h1 className="app-dialog-title mt-4">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          {description}
        </p>
        <div className="mt-8 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/5 animate-pulse rounded-full bg-amber-600" />
        </div>
      </section>
    </main>
  )
}

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()

  const sessionQuery = useQuery({
    queryKey: authQueryKey,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 60_000,
  })

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (user) => {
      setIacrmScope(user.current_business_id ?? null)
      queryClient.setQueryData(authQueryKey, user)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      setIacrmScope(null)
      queryClient.setQueryData(authQueryKey, null)
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: authQueryKey,
      })
    },
  })

  const user = sessionQuery.data ?? null

  useEffect(() => {
    if (sessionQuery.isPending) {
      return
    }

    setIacrmScope(user?.current_business_id ?? null)

    if (user === null) {
      return
    }

    const canHydrateBusinessIacrm =
      user.current_business_id !== null &&
      (user.permissions.includes('settings.view-business') || user.permissions.includes('settings.update-business'))

    if (!canHydrateBusinessIacrm) {
      if (user.current_business_id !== null) {
        clearIacrmConfig()
      }
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const response = await fetchBusinessIacrmSettings()
        if (!cancelled) {
          saveIacrmConfig(response.data)
        }
      } catch {
        if (!cancelled) {
          clearIacrmConfig()
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [sessionQuery.isPending, user])

  const status: AuthStatus = sessionQuery.isPending
    ? 'loading'
    : user === null
      ? 'unauthenticated'
      : 'authenticated'

  const permissionSet = new Set(user?.permissions ?? [])

  return (
    <AuthSessionContext.Provider
      value={{
        status,
        isLoading: status === 'loading',
        isAuthenticated: status === 'authenticated',
        user,
        loginPending: loginMutation.isPending,
        logoutPending: logoutMutation.isPending,
        login: loginMutation.mutateAsync,
        logout: logoutMutation.mutateAsync,
        hasPermission: (...permissionIds: string[]) =>
          permissionIds.some((permissionId) => permissionSet.has(permissionId)),
      }}
    >
      {children}
    </AuthSessionContext.Provider>
  )
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext)

  if (context === null) {
    throw new Error('useAuthSession must be used within AuthSessionProvider.')
  }

  return context
}

export function AuthEntryRedirect() {
  const { status } = useAuthSession()

  if (status === 'loading') {
    return (
      <AuthBootstrapScreen
        eyebrow="Session bootstrap"
        title="Reading the active workspace session."
        description="The production frontend checks the live backend auth session before it chooses a public or protected route."
      />
    )
  }

  return <Navigate to={status === 'authenticated' ? '/dashboard' : '/login'} replace />
}

export function PublicOnly({ children }: { children: ReactNode }) {
  const { status } = useAuthSession()

  if (status === 'loading') {
    return (
      <AuthBootstrapScreen
        eyebrow="Public route"
        title="Checking whether a user session already exists."
        description="If a valid session is present, the app will return to the protected workspace instead of showing a public auth screen."
      />
    )
  }

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuthSession()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <AuthBootstrapScreen
        eyebrow="Protected route"
        title="Rehydrating the authenticated workspace."
        description="The app is loading the current user, business scope, and permission payload before protected routes render."
      />
    )
  }

  if (status !== 'authenticated') {
    const redirectTo = `${location.pathname}${location.search}${location.hash}`

    return <Navigate to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} replace />
  }

  return <>{children}</>
}

export function PermissionBoundary({
  anyOf,
  children,
}: {
  anyOf: string[]
  children: ReactNode
}) {
  const { hasPermission } = useAuthSession()

  if (!hasPermission(...anyOf)) {
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}
