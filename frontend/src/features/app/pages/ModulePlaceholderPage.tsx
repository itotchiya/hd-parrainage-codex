import type { AppModuleRoute } from '../../../app/navigation'
import { useAuthSession } from '../../auth/session'
import { useTranslation } from 'react-i18next'

export function ModulePlaceholderPage({
  route,
}: {
  route: AppModuleRoute
}) {
  const { t } = useTranslation()
  const { user } = useAuthSession()

  const roleNames = user?.roles
    .map((role) => role.name ?? role.slug ?? t('common.unknown'))
    .join(' / ')

  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <article className="rounded-[2rem] border border-border bg-card/90 p-8 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
          {t(route.eyebrowKey)}
        </p>
        <h1 className="app-dialog-title mt-4">{t(route.titleKey)}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          {t(route.descriptionKey)}
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-border bg-muted/30 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {t('system.modulePlaceholder.currentOperator')}
            </p>
            <p className="mt-3 text-lg font-semibold text-foreground">
              {user?.display_name ?? t('system.modulePlaceholder.unknownUser')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{roleNames}</p>
          </div>
          <div className="rounded-[1.5rem] border border-border bg-muted/30 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {t('system.modulePlaceholder.activeBusinessScope')}
            </p>
            <p className="mt-3 text-lg font-semibold text-foreground">
              {user?.primary_business?.display_name ?? t('system.modulePlaceholder.globalPlatformScope')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('system.modulePlaceholder.scopeDescription')}
            </p>
          </div>
        </div>
      </article>

      <aside className="space-y-5">
        <article className="rounded-[2rem] border border-border bg-foreground p-7 text-background shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-background/70">
            {t('system.modulePlaceholder.integrationReadyBoundary')}
          </p>
          <p className="mt-4 text-sm leading-7 text-background/80">
            {t('system.modulePlaceholder.integrationDescription')}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {route.permissions.map((permissionId) => (
              <span
                key={permissionId}
                className="rounded-full border border-background/15 px-3 py-1 text-xs text-background/85"
              >
                {permissionId}
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] border border-dashed border-border bg-card/70 p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {t('system.modulePlaceholder.nextImplementationFocus')}
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
            <li>{t('system.modulePlaceholder.focus.connectEndpoints')}</li>
            <li>{t('system.modulePlaceholder.focus.states')}</li>
            <li>{t('system.modulePlaceholder.focus.permissions')}</li>
          </ul>
        </article>
      </aside>
    </section>
  )
}
