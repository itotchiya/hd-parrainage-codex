import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, ChevronRight, Shield, Users2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { ApiError } from '../../../lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuthSession } from '../session'

const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  remember: z.boolean(),
})

type LoginFormValues = z.infer<typeof loginSchema>

const demoPassword = 'Password123!'

const demoAccounts = [
  {
    id: 'super-admin',
    label: 'Super Admin',
    subtitle: 'Platform governance and visibility',
    email: 'superadmin@hd-parrainage.test',
    icon: 'shield',
  },
  {
    id: 'business-owner',
    label: 'Business Owner',
    subtitle: 'Programs, agents, and approvals',
    email: 'owner@havetdigital.test',
    icon: 'building',
  },
  {
    id: 'agent',
    label: 'Affilie',
    subtitle: 'Assigned programs, prospects, and rewards',
    email: 'agent@havetdigital.test',
    icon: 'users',
  },
] as const

function DemoIcon({ icon }: { icon: (typeof demoAccounts)[number]['icon'] }) {
  if (icon === 'shield') {
    return <Shield className="size-4" />
  }

  if (icon === 'building') {
    return <Building2 className="size-4" />
  }

  return <Users2 className="size-4" />
}

function DemoAccountCard({
  account,
  selected,
  onSelect,
}: {
  account: (typeof demoAccounts)[number]
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
        selected
          ? 'border-ring bg-accent/50'
          : 'border-border bg-background hover:bg-muted/50',
      )}
    >
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <DemoIcon icon={account.icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{account.label}</span>
        <span className="block truncate text-xs text-muted-foreground">{account.subtitle}</span>
      </span>
      <ChevronRight className={cn('size-4 shrink-0 text-muted-foreground', selected && 'text-foreground')} />
    </button>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, loginPending } = useAuthSession()
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null)

  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  const {
    register,
    handleSubmit,
    clearErrors,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: true,
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmissionMessage(null)

    try {
      await login(values)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        const emailError = error.errors?.email?.[0]

        if (emailError) {
          setError('email', { message: emailError })
        }

        setSubmissionMessage(
          emailError ?? error.message ?? 'The workspace login could not be completed.',
        )

        return
      }

      setSubmissionMessage('The workspace login could not be completed.')
    }
  })

  const selectedEmail = watch('email')

  const applyDemoAccount = (email: string) => {
    setValue('email', email, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
    setValue('password', demoPassword, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
    setValue('remember', true, { shouldDirty: true, shouldTouch: true })
    clearErrors(['email', 'password'])
    setSubmissionMessage(null)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-6 sm:px-6">
        <Card className="w-full rounded-[1.5rem] border-border bg-card shadow-sm">
          <CardHeader className="space-y-4 px-5 pt-5 sm:px-6 sm:pt-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex justify-center">
                <img src="/Uploads/logo-light.svg" alt="Myhd" className="h-9 w-auto dark:hidden" />
                <img src="/Uploads/logo-dark.svg" alt="Myhd" className="hidden h-9 w-auto dark:block" />
              </div>

              <div className="space-y-1.5">
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  Sign in
                </CardTitle>
                <CardDescription className="text-sm leading-6">
                  Enter your credentials or choose a demo role.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="email">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="superadmin@hd-parrainage.test"
                  className="h-10 rounded-xl px-4"
                  {...register('email')}
                />
                {errors.email ? (
                  <p className="text-sm text-rose-700">{errors.email.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <label className="text-sm font-medium text-foreground" htmlFor="password">
                    Password
                  </label>
                  <Link
                    to="/password/forgot"
                    className="text-sm font-medium text-foreground transition hover:text-foreground/80"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="h-10 rounded-xl px-4"
                  {...register('password')}
                />
                {errors.password ? (
                  <p className="text-sm text-rose-700">{errors.password.message}</p>
                ) : null}
              </div>

              <label className="flex items-center gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input text-primary focus:ring-ring"
                  {...register('remember')}
                />
                Keep this browser signed in
              </label>

              {submissionMessage ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                  {submissionMessage}
                </div>
              ) : null}

              <Button type="submit" disabled={loginPending} className="h-10 w-full rounded-xl">
                {loginPending ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Demo access
                </p>
                <Badge variant="secondary" className="font-medium">
                  Password: {demoPassword}
                </Badge>
              </div>

              <div className="grid gap-2.5">
                {demoAccounts.map((account) => (
                  <DemoAccountCard
                    key={account.id}
                    account={account}
                    selected={selectedEmail === account.email}
                    onSelect={() => applyDemoAccount(account.email)}
                  />
                ))}
              </div>

              <p className="text-sm leading-6 text-muted-foreground">
                Choose a role to prefill the login form with demo credentials.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
              <Link className="font-medium text-foreground transition hover:text-foreground/80" to="/activate-invitation">
                Activate invitation
              </Link>
              <span className="text-border">/</span>
              <Link className="font-medium text-foreground transition hover:text-foreground/80" to="/password/reset">
                Finish reset
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
