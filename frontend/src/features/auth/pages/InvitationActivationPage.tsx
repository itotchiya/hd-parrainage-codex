import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError, ensureCsrfCookie } from '../../../lib/api'
import { activateInvitation, validateInvitationToken } from '../api'

export function InvitationActivationPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [token, setToken] = useState(searchParams.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null)

  const validateMutation = useMutation({
    mutationFn: validateInvitationToken,
    onSuccess: (response) => {
      setIsTokenValid(response.data.valid)
      setFeedback(response.data.message)
    },
    onError: (error) => {
      setIsTokenValid(false)
      setFeedback((error as ApiError).message)
    },
  })

  const activateMutation = useMutation({
    mutationFn: activateInvitation,
    onSuccess: async (response) => {
      // Re-sync the CSRF cookie after session regeneration so subsequent
      // API calls have the correct XSRF-TOKEN for the new session.
      await ensureCsrfCookie()
      queryClient.setQueryData(['auth', 'session'], response.data)
      navigate('/dashboard')
    },
    onError: (error) => {
      setFeedback((error as ApiError).message)
    },
  })

  useEffect(() => {
    if (email.trim() === '' || token.trim() === '') {
      return
    }

    validateMutation.mutate({
      email: email.trim(),
      token: token.trim(),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-3xl rounded-[2rem] border border-border bg-card/90 p-8 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
          Invitation activation
        </p>
        <h1 className="app-dialog-title mt-4">Activate your invitation and create your account password.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          Paste your invitation email and token, then choose a password. On success, your first authenticated session starts immediately.
        </p>
        <div className="mt-8 grid gap-4">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            className="rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
            placeholder="Invitation email"
          />
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
            placeholder="Invitation token"
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
            placeholder="Confirmer le mot de passe"
          />
          {feedback ? (
            <p className={`text-sm ${isTokenValid === false ? 'text-red-700' : 'text-foreground'}`}>{feedback}</p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                validateMutation.mutate({
                  email: email.trim(),
                  token: token.trim(),
                })
              }
              disabled={validateMutation.isPending}
              className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {validateMutation.isPending ? 'Checking...' : 'Validate token'}
            </button>
            <button
              type="button"
              onClick={() =>
                activateMutation.mutate({
                  email: email.trim(),
                  token: token.trim(),
                  password,
                  password_confirmation: passwordConfirmation,
                })
              }
              disabled={activateMutation.isPending || isTokenValid === false}
              className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activateMutation.isPending ? 'Activating...' : 'Activate account'}
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
