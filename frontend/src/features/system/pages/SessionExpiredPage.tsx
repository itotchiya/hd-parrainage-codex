import { Link } from 'react-router-dom'

export function SessionExpiredPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-3xl rounded-[2rem] border border-border bg-card/90 p-8 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
          Session recovery
        </p>
        <h1 className="app-dialog-title mt-4">The workspace session is no longer valid.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          Re-authenticate to rebuild the current user, permission payload, and active business context.
        </p>
        <div className="mt-8">
          <Link
            to="/login"
            className="inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Re-enter the workspace
          </Link>
        </div>
      </section>
    </main>
  )
}
