import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { ApiError } from '../../../lib/api'
import { env } from '../../../lib/env'
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
    subtitle: 'Gestion complete de la plateforme',
    email: 'superadmin@hd-parrainage.test',
    icon: 'shield',
  },
  {
    id: 'business-owner',
    label: 'Business Owner',
    subtitle: "Gerez vos programmes d'affiliation",
    email: 'owner@havetdigital.test',
    icon: 'building',
  },
  {
    id: 'agent',
    label: 'Affilie',
    subtitle: 'Suivez vos commissions et prospects',
    email: 'agent@havetdigital.test',
    icon: 'users',
  },
] as const

function DemoIcon({ icon }: { icon: (typeof demoAccounts)[number]['icon'] }) {
  if (icon === 'shield') {
    return (
      <svg className="h-5 w-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l7 3v6c0 4.2-2.8 8-7 9-4.2-1-7-4.8-7-9V6l7-3Z" />
      </svg>
    )
  }

  if (icon === 'building') {
    return (
      <svg className="h-5 w-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21h18" />
        <path d="M5 21V7l7-4 7 4v14" />
        <path d="M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />
      </svg>
    )
  }

  return (
    <svg className="h-5 w-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <path d="M8.5 11A3.5 3.5 0 1 0 8.5 4a3.5 3.5 0 0 0 0 7Z" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a3.5 3.5 0 0 1 0 6.74" />
    </svg>
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
    <main className="min-h-screen bg-background px-4 py-8 md:px-6 md:py-10">
      <section className="mx-auto w-full max-w-xl rounded-[1.6rem] border border-border bg-card px-5 py-6 shadow-sm sm:px-7 sm:py-8">
        <header className="space-y-3 text-center">
          <p className="text-3xl font-semibold leading-none tracking-tight text-foreground sm:text-4xl">
            Myhd
            <span className="ml-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground sm:text-sm">
              Affiliation
            </span>
          </p>
          <h1 className="app-page-title">Connexion</h1>
          <p className="text-sm text-muted-foreground">Connectez-vous a votre espace de travail</p>
        </header>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-[0.95rem] border border-input bg-background px-4 py-3 text-[0.96rem] text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="superadmin@hd-parrainage.test"
              {...register('email')}
            />
            {errors.email ? (
              <p className="text-sm text-rose-700">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold text-foreground" htmlFor="password">
                Mot de passe
              </label>
              <Link
                to="/password/forgot"
                className="text-sm font-semibold text-foreground transition hover:text-foreground/80"
              >
                Mot de passe oublie ?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-[0.95rem] border border-input bg-background px-4 py-3 text-[0.96rem] text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="Entrez votre mot de passe"
              {...register('password')}
            />
            {errors.password ? (
              <p className="text-sm text-rose-700">{errors.password.message}</p>
            ) : null}
          </div>

          <label className="flex items-center gap-3 rounded-[0.95rem] border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
              {...register('remember')}
            />
            Se souvenir de moi sur ce navigateur
          </label>

          {submissionMessage ? (
            <div className="rounded-[0.95rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
              {submissionMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loginPending}
            className="inline-flex w-full items-center justify-center rounded-[0.95rem] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loginPending ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <section className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Demo accounts
          </p>
          <div className="mt-3 space-y-3">
            {demoAccounts.map((account) => {
              const isSelected = selectedEmail === account.email

              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => applyDemoAccount(account.email)}
                  className={`flex w-full items-center gap-3 rounded-[0.95rem] border px-3 py-3 text-left transition ${
                    isSelected
                      ? 'border-ring bg-accent/40'
                      : 'border-border bg-card hover:border-ring/40'
                  }`}
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                    <DemoIcon icon={account.icon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.98rem] font-semibold text-foreground">{account.label}</span>
                    <span className="block truncate text-sm text-muted-foreground">{account.subtitle}</span>
                  </span>
                  <span
                    aria-hidden
                    className={`h-5 w-5 rounded-full border ${isSelected ? 'border-primary bg-primary' : 'border-input bg-background'}`}
                  />
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Cliquez un role pour remplir automatiquement l&apos;email et le mot de passe de demo.
          </p>
        </section>

        <footer className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
          <span>{env.appUrl}</span>
          <span>•</span>
          <span>{env.apiBaseUrl}</span>
          <span>•</span>
          <Link className="font-semibold text-foreground transition hover:text-foreground/80" to="/activate-invitation">
            Activer invitation
          </Link>
          <span>•</span>
          <Link className="font-semibold text-foreground transition hover:text-foreground/80" to="/password/reset">
            Finaliser reset
          </Link>
        </footer>
      </section>
    </main>
  )
}
