import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import { resetPassword } from '../api'

export function PasswordResetPage() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [token, setToken] = useState(searchParams.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const resetMutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: (response) => {
      setFeedback(response.data.message)
      setPassword('')
      setPasswordConfirmation('')
    },
    onError: (error) => {
      setFeedback((error as ApiError).message)
    },
  })

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-3xl rounded-[2rem] border border-border bg-card/90 p-8 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
          Password replacement
        </p>
        <h1 className="app-dialog-title mt-4">Complete password replacement with your reset token.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          Provide email, reset token, and your new password. After success, return to login and sign in with the new credential.
        </p>
        <div className="mt-8 grid gap-4">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            className="rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
            placeholder="Account email"
          />
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
            placeholder="Reset token"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            className="rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
            placeholder="New password"
          />
          <input
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            type="password"
            className="rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
            placeholder="Confirm password"
          />
          {feedback ? <p className="text-sm text-foreground">{feedback}</p> : null}
          <div>
            <button
              type="button"
              onClick={() =>
                resetMutation.mutate({
                  email: email.trim(),
                  token: token.trim(),
                  password,
                  password_confirmation: passwordConfirmation,
                })
              }
              disabled={resetMutation.isPending}
              className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resetMutation.isPending ? 'Resetting...' : 'Reset password'}
            </button>
          </div>
        </div>
        <div className="mt-8">
          <Link
            to="/login"
            className="inline-flex rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            Return to login
          </Link>
        </div>
      </section>
    </main>
  )
}
