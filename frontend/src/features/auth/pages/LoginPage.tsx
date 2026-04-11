import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, ChevronRight, Shield, Users2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
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

const createLoginSchema = (t: (key: string) => string) => z.object({
  email: z.email(t('auth.emailPlaceholder')),
  password: z.string().min(1, t('auth.passwordPlaceholder')),
  remember: z.boolean(),
})

type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>

const demoPassword = 'Password123!'

type DemoAccount = {
  id: string
  label: string
  subtitle: string
  email: string
  icon: 'shield' | 'building' | 'users'
}

type DemoAccountGroup = {
  title: string
  accounts: DemoAccount[]
}

const useDemoAccounts = (): DemoAccountGroup[] => {
  const { t } = useTranslation()
  return [
    {
      title: 'Demo with data',
      accounts: [
        {
          id: 'super-admin',
          label: t('auth.roles.superAdmin'),
          subtitle: t('auth.roleDescriptions.superAdmin'),
          email: 'superadmin@hd-parrainage.test',
          icon: 'shield',
        },
        {
          id: 'business-owner',
          label: t('auth.roles.businessOwner'),
          subtitle: t('auth.roleDescriptions.businessOwner'),
          email: 'owner@havetdigital.test',
          icon: 'building',
        },
        {
          id: 'agent',
          label: t('auth.roles.agent'),
          subtitle: t('auth.roleDescriptions.agent'),
          email: 'agent@havetdigital.test',
          icon: 'users',
        },
        {
          id: 'agent2',
          label: `${t('auth.roles.agent')} 2`,
          subtitle: t('auth.roleDescriptions.agent'),
          email: 'agent2@havetdigital.test',
          icon: 'users',
        },
      ],
    },
    {
      title: 'Empty demo accounts',
      accounts: [
        {
          id: 'empty-super-admin',
          label: `${t('auth.roles.superAdmin')} (empty)`,
          subtitle: 'Clean platform account with no data',
          email: 'empty-superadmin@hd-parrainage.test',
          icon: 'shield',
        },
        {
          id: 'empty-business-owner',
          label: `${t('auth.roles.businessOwner')} (empty)`,
          subtitle: 'Clean business account with no data',
          email: 'empty-owner@demo-business.test',
          icon: 'building',
        },
        {
          id: 'empty-agent1',
          label: `${t('auth.roles.agent')} 1 (empty)`,
          subtitle: 'Clean agent account with no data',
          email: 'empty-agent1@demo-business.test',
          icon: 'users',
        },
        {
          id: 'empty-agent2',
          label: `${t('auth.roles.agent')} 2 (empty)`,
          subtitle: 'Clean agent account with no data',
          email: 'empty-agent2@demo-business.test',
          icon: 'users',
        },
      ],
    },
  ]
}

function DemoIcon({ icon }: { icon: DemoAccount['icon'] }) {
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
  account: DemoAccount
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
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, loginPending } = useAuthSession()
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null)
  const demoAccountGroups = useDemoAccounts()

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
    resolver: zodResolver(createLoginSchema(t)),
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmissionMessage(null)

    try {
      await login(values)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'AUTH_EMAIL_UNVERIFIED') {
          navigate(`/verify-email?email=${encodeURIComponent(values.email)}`, { replace: true })
          return
        }

        const emailError = error.errors?.email?.[0]

        if (emailError) {
          setError('email', { message: emailError })
        }

        setSubmissionMessage(
          emailError ?? error.message ?? t('errors.loadFailed'),
        )

        return
      }

      setSubmissionMessage(t('errors.loadFailed'))
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
                  {t('auth.signIn')}
                </CardTitle>
                <CardDescription className="text-sm leading-6">
                  {t('auth.demoDescription')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="email">
                  {t('auth.email')}
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t('auth.emailPlaceholder')}
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
                    {t('auth.password')}
                  </label>
                  <Link
                    to="/password/forgot"
                    className="text-sm font-medium text-foreground transition hover:text-foreground/80"
                  >
                    {t('auth.forgotPassword')}
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder={t('auth.passwordPlaceholder')}
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
                {t('auth.rememberMe')}
              </label>

              {submissionMessage ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                  {submissionMessage}
                </div>
              ) : null}

              <Button type="submit" disabled={loginPending} className="h-10 w-full rounded-xl">
                {loginPending ? t('auth.signingIn') : t('auth.signIn')}
              </Button>
            </form>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {t('auth.demoAccess')}
                </p>
                <Badge variant="secondary" className="font-medium">
                  {t('auth.password')}: {demoPassword}
                </Badge>
              </div>

              <div className="space-y-4">
                {demoAccountGroups.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{group.title}</p>
                    <div className="grid gap-2">
                      {group.accounts.map((account) => (
                        <DemoAccountCard
                          key={account.id}
                          account={account}
                          selected={selectedEmail === account.email}
                          onSelect={() => applyDemoAccount(account.email)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-sm leading-6 text-muted-foreground">
                {t('auth.demoDescription')}
              </p>
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
              <Link className="font-medium text-foreground transition hover:text-foreground/80" to="/activate-invitation">
                {t('auth.activateInvitation')}
              </Link>
              <span className="text-border">/</span>
              <Link className="font-medium text-foreground transition hover:text-foreground/80" to="/password/reset">
                {t('auth.finishReset')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
