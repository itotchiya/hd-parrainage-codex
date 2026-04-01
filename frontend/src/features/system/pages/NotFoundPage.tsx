import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-3xl rounded-[2rem] border border-border bg-card/90 p-8 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
          Route inventory
        </p>
        <h1 className="app-dialog-title mt-4">The requested page is not part of the current app surface.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          Use the authenticated navigation or return to the login screen to restart the flow cleanly.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/dashboard"
            className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Open dashboard
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            Open login
          </Link>
        </div>
      </section>
    </main>
  )
}
