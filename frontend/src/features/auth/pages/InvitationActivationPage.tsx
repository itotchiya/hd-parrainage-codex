import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import { activateInvitation, validateInvitationToken } from '../api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CheckCircle, Mail } from 'lucide-react'

export function InvitationActivationPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activated, setActivated] = useState(false)

  const validateMutation = useMutation({
    mutationFn: validateInvitationToken,
    onSuccess: (response) => {
      setTokenValid(response.data.valid)
      if (!response.data.valid) {
        setErrorMessage(response.data.message)
      } else {
        setDisplayName(response.data.display_name ?? null)
        setErrorMessage(null)
      }
    },
    onError: (error) => {
      setTokenValid(false)
      setErrorMessage((error as ApiError).message)
    },
  })

  const activateMutation = useMutation({
    mutationFn: activateInvitation,
    onSuccess: () => {
      setActivated(true)
    },
    onError: (error) => {
      setErrorMessage((error as ApiError).message)
    },
  })

  useEffect(() => {
    if (email.trim() !== '' && token.trim() !== '') {
      validateMutation.mutate({ email: email.trim(), token: token.trim() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (activated) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-4 py-6 sm:px-6">
          <Card className="w-full rounded-[1.5rem] border-border bg-card shadow-sm">
            <CardHeader className="space-y-4 px-5 pt-5 sm:px-6 sm:pt-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex justify-center">
                  <img src="/Uploads/logo-light.svg" alt="HD Parrainage" className="h-9 w-auto dark:hidden" />
                  <img src="/Uploads/logo-dark.svg" alt="HD Parrainage" className="hidden h-9 w-auto dark:block" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
                  <CheckCircle className="size-7" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    Account created
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Your account is ready. Before you can log in, please verify your email address.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Check your inbox</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      We sent a verification link to <strong>{email}</strong>. Click it to activate your login access.
                    </p>
                  </div>
                </div>
              </div>

              <Button asChild variant="outline" className="h-10 w-full rounded-xl">
                <Link to="/login">Return to login</Link>
              </Button>

              <p className="text-center text-xs leading-5 text-muted-foreground">
                Didn&apos;t receive the email?{' '}
                <Link to={`/verify-email?email=${encodeURIComponent(email)}`} className="font-medium text-foreground transition hover:text-foreground/80">
                  Resend verification
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-4 py-6 sm:px-6">
        <Card className="w-full rounded-[1.5rem] border-border bg-card shadow-sm">
          <CardHeader className="space-y-4 px-5 pt-5 sm:px-6 sm:pt-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex justify-center">
                <img src="/Uploads/logo-light.svg" alt="HD Parrainage" className="h-9 w-auto dark:hidden" />
                <img src="/Uploads/logo-dark.svg" alt="HD Parrainage" className="hidden h-9 w-auto dark:block" />
              </div>
              <div className="space-y-1.5">
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  {displayName ? `Welcome, ${displayName}` : 'Activate your account'}
                </CardTitle>
                <CardDescription className="text-sm leading-6">
                  Create your password to complete your invitation.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
            {tokenValid === false ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                {errorMessage ?? 'This invitation link is invalid or has expired.'}
                <div className="mt-3">
                  <Button asChild variant="outline" size="sm" className="rounded-lg">
                    <Link to="/login">Return to login</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  setErrorMessage(null)
                  activateMutation.mutate({
                    email: email.trim(),
                    token: token.trim(),
                    password,
                    password_confirmation: passwordConfirmation,
                  })
                }}
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="email">
                    Email address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="h-10 rounded-xl px-4 opacity-60"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="password">
                    New password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 rounded-xl px-4"
                    required
                    minLength={8}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="password-confirm">
                    Confirm password
                  </label>
                  <Input
                    id="password-confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    className="h-10 rounded-xl px-4"
                    required
                  />
                </div>

                {errorMessage ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                    {errorMessage}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={activateMutation.isPending || tokenValid !== true || validateMutation.isPending}
                  className="h-10 w-full rounded-xl"
                >
                  {activateMutation.isPending ? 'Creating account...' : 'Create account'}
                </Button>
              </form>
            )}

            <div className="flex flex-wrap gap-x-3 gap-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
              <Link
                className="font-medium text-foreground transition hover:text-foreground/80"
                to="/login"
              >
                Return to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
