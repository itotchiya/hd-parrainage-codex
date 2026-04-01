import { Link } from 'react-router-dom'

export function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-3xl rounded-[2rem] border border-border bg-card/90 p-8 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-700">
          Access control
        </p>
        <h1 className="app-dialog-title mt-4">This route is outside the current permission scope.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          The frontend hid what it could, but the final route decision still respects the backend permission contract.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/dashboard"
            className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Return to dashboard
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            Switch session
          </Link>
        </div>
      </section>
    </main>
  )
}
