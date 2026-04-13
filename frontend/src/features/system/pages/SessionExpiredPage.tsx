import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function SessionExpiredPage() {
  const { t } = useTranslation()

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-3xl rounded-[2rem] border border-border bg-card/90 p-8 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
          {t('system.sessionExpired.eyebrow')}
        </p>
        <h1 className="app-dialog-title mt-4">{t('system.sessionExpired.title')}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          {t('system.sessionExpired.description')}
        </p>
        <div className="mt-8">
          <Link
            to="/login"
            className="inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            {t('system.sessionExpired.action')}
          </Link>
        </div>
      </section>
    </main>
  )
}
