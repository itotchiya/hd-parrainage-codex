import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../../lib/api'
import { requestPasswordResetToken } from '../api'

export function PasswordForgotPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [debugToken, setDebugToken] = useState<string | null>(null)

  const forgotMutation = useMutation({
    mutationFn: requestPasswordResetToken,
    onSuccess: (response) => {
      setFeedback(response.data.message)
      setDebugToken(response.data.reset_token ?? null)
    },
    onError: (error) => {
      setFeedback((error as ApiError).message)
      setDebugToken(null)
    },
  })

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-3xl rounded-[2rem] border border-border bg-card/90 p-8 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
          {t('system.passwordForgot.eyebrow')}
        </p>
        <h1 className="app-dialog-title mt-4">{t('system.passwordForgot.title')}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          {t('system.passwordForgot.description')}
        </p>
        <div className="mt-8 grid gap-4">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            className="rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
            placeholder={t('system.passwordForgot.emailPlaceholder')}
          />
          {feedback ? <p className="text-sm text-foreground">{feedback}</p> : null}
          {debugToken ? (
            <p className="text-sm text-amber-700">
              {t('system.passwordForgot.debugToken')}: <span className="font-semibold">{debugToken}</span>
            </p>
          ) : null}
          <div>
            <button
              type="button"
              onClick={() => forgotMutation.mutate({ email: email.trim() })}
              disabled={forgotMutation.isPending}
              className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {forgotMutation.isPending
                ? t('system.passwordForgot.requesting')
                : t('system.passwordForgot.submit')}
            </button>
          </div>
        </div>
        <div className="mt-8">
          <Link
            to="/login"
            className="inline-flex rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            {t('system.passwordForgot.backToLogin')}
          </Link>
        </div>
      </section>
    </main>
  )
}
