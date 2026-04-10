import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import { resendVerificationEmail } from '../api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CheckCircle, Mail, RefreshCw } from 'lucide-react'

export function EmailVerificationPendingPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const verified = searchParams.get('verified') === '1'

  const [resent, setResent] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const resendMutation = useMutation({
    mutationFn: resendVerificationEmail,
    onSuccess: () => {
      setResent(true)
      setErrorMessage(null)
    },
    onError: (error) => {
      setErrorMessage((error as ApiError).message)
    },
  })

  if (verified) {
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
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    Email verified
                  </CardTitle>
                  <CardDescription className="text-sm leading-6">
                    Your email address has been confirmed. You can now sign in to your account.
                  </CardDescription>
                </div>
              </div>

              <Button asChild className="h-10 w-full rounded-xl">
                <Link to="/login">Sign in</Link>
              </Button>
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
                  Verify your email
                </CardTitle>
                <CardDescription className="text-sm leading-6">
                  One last step before you can access your workspace.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Check your inbox</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {email
                      ? <>We sent a verification link to <strong>{email}</strong>.</>
                      : 'We sent a verification link to your email address.'}
                    {' '}Click it to activate your login access.
                  </p>
                </div>
              </div>
            </div>

            {resent ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800 dark:border-emerald-800/30 dark:bg-emerald-950/30 dark:text-emerald-400">
                Verification email resent. Please check your inbox.
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                {errorMessage}
              </div>
            ) : null}

            {email ? (
              <Button
                variant="outline"
                className="h-10 w-full rounded-xl"
                disabled={resendMutation.isPending || resent}
                onClick={() => resendMutation.mutate({ email })}
              >
                <RefreshCw className="mr-2 size-4" />
                {resendMutation.isPending ? 'Sending...' : 'Resend verification email'}
              </Button>
            ) : null}

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
