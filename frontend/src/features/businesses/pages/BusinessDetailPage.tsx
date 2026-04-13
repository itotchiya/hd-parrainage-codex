import { useQuery } from '@tanstack/react-query'
import { FolderKanban, Receipt, UserCircle, Users } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../../lib/api'
import { KpiCard, kpiSnapshotBadge } from '../../dashboard/components/KpiCard'
import { fetchBusiness } from '../api'
import { formatAppDateTime } from '@/lib/locale'

function formatDate(value: string | null) {
  return formatAppDateTime(value)
}

export function BusinessDetailPage() {
  const { t } = useTranslation()
  const { businessId = '' } = useParams()

  const query = useQuery({
    queryKey: ['businesses', 'detail', businessId],
    queryFn: () => fetchBusiness(businessId),
    enabled: businessId.length > 0,
  })

  if (query.isPending) {
    return (
      <article className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        {t('businesses.detail.loading')}
      </article>
    )
  }

  if (query.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(query.error as ApiError).message}
      </article>
    )
  }

  const business = query.data?.data

  if (!business) {
    return (
      <article className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        {t('businesses.detail.unavailable')}
      </article>
    )
  }

  return (
    <section className="space-y-5">
      <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {t('businesses.detail.eyebrow')}
            </p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                {business.display_name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {business.legal_name} / {business.industry ?? t('businesses.detail.industryNotSpecified')} /{' '}
                {business.country_code ?? t('businesses.detail.countryPending')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-muted px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {business.status}
            </span>
            <span className="rounded-md bg-muted px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {business.currency_code} / {business.timezone}
            </span>
            <Link
              to="/businesses"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              {t('common.back')}
            </Link>
          </div>
        </div>
      </article>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t('businesses.detail.kpis.programs')}
          value={business.summary.program_count.toString()}
          description={t('businesses.detail.kpis.programsDescription')}
          badge={kpiSnapshotBadge('Catalog')}
          icon={FolderKanban}
          tone="primary"
        />
        <KpiCard
          title={t('businesses.detail.kpis.activeAgents')}
          value={business.summary.active_agent_count.toString()}
          description={t('businesses.detail.kpis.activeAgentsDescription')}
          badge={kpiSnapshotBadge('Network')}
          icon={Users}
          tone="info"
        />
        <KpiCard
          title={t('businesses.detail.kpis.prospects')}
          value={business.summary.prospect_count.toString()}
          description={t('businesses.detail.kpis.prospectsDescription')}
          badge={kpiSnapshotBadge('Funnel')}
          icon={UserCircle}
          tone="warning"
        />
        <KpiCard
          title={t('businesses.detail.kpis.transactions')}
          value={business.summary.transaction_count.toString()}
          description={t('businesses.detail.kpis.transactionsDescription')}
          badge={kpiSnapshotBadge('Revenue')}
          icon={Receipt}
          tone="success"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('businesses.detail.governance')}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <DataCell label={t('businesses.detail.fields.created')} value={formatDate(business.created_at)} />
            <DataCell label={t('businesses.detail.fields.approved')} value={formatDate(business.approved_at)} />
            <DataCell label={t('businesses.detail.fields.rejected')} value={formatDate(business.rejected_at)} />
            <DataCell label={t('businesses.detail.fields.lastSync')} value={formatDate(business.last_synced_at)} />
            <DataCell label={t('businesses.detail.fields.approvedBy')} value={business.approved_by?.display_name ?? t('businesses.detail.notApproved')} />
            <DataCell label={t('businesses.detail.fields.rejectedBy')} value={business.rejected_by?.display_name ?? t('businesses.detail.notRejected')} />
            <DataCell label={t('businesses.detail.fields.iacrmId')} value={business.iacrm_business_id ?? t('businesses.detail.notMapped')} />
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t('businesses.detail.owners')}
            </p>
            <span className="text-xs text-muted-foreground">
              {business.owners.length} {t('businesses.detail.assignments')}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {business.owners.length === 0 ? (
              <EmptyState message={t('businesses.detail.noOwnerAssignments')} />
            ) : (
              business.owners.map((owner) => (
                <article key={owner.assignment_id} className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-foreground px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-background">
                      {owner.is_primary ? t('businesses.detail.primaryOwner') : t('businesses.detail.owner')}
                    </span>
                    <span className="rounded-md bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {owner.status}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-foreground">
                    {owner.user?.display_name ?? t('businesses.detail.invitationPending')}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {owner.user?.email ?? t('businesses.detail.noEmailAvailable')}
                  </p>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <p>{t('businesses.detail.invitedAt', { value: formatDate(owner.invited_at) })}</p>
                    <p>{t('businesses.detail.activatedAt', { value: formatDate(owner.activated_at) })}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </article>
      </div>

      <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('businesses.detail.linkedPrograms')}
          </p>
          <span className="text-xs text-muted-foreground">
            {business.linked_programs.length} {t('programs.title').toLowerCase()}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {business.linked_programs.length === 0 ? (
            <EmptyState message={t('businesses.detail.noProgramsAttached')} />
          ) : (
            business.linked_programs.map((program) => (
              <article key={program.id} className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {program.slug}
                    </p>
                    <h3 className="mt-2 text-base font-semibold text-foreground">{program.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {program.commission_type} / {program.exchange_mode}
                    </p>
                  </div>
                  <Link
                    to={`/programs/${program.id}`}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground"
                  >
                    {t('common.open')}
                  </Link>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  <p>{t('businesses.detail.programStatus', { value: program.status })}</p>
                  <p>{t('businesses.detail.pointsPerTransaction', { value: program.points_per_transaction ?? 'n/a' })}</p>
                  <p>{t('businesses.detail.pointsPerEuro', { value: program.points_per_euro ?? 'n/a' })}</p>
                </div>
              </article>
            ))
          )}
        </div>
      </article>
    </section>
  )
}

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-muted/30 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </article>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <article className="rounded-lg border border-dashed border-border bg-card px-4 py-5 text-sm text-muted-foreground">
      {message}
    </article>
  )
}
