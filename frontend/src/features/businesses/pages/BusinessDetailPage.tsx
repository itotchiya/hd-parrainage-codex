import { useQuery } from '@tanstack/react-query'
import { FolderKanban, Receipt, UserCircle, Users } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import { KpiCard, kpiSnapshotBadge } from '../../dashboard/components/KpiCard'
import { fetchBusiness } from '../api'

function formatDate(value: string | null, withTime = false) {
  if (!value) {
    return 'Not available'
  }

  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
        }
      : {}),
  })
}

export function BusinessDetailPage() {
  const { businessId = '' } = useParams()

  const query = useQuery({
    queryKey: ['businesses', 'detail', businessId],
    queryFn: () => fetchBusiness(businessId),
    enabled: businessId.length > 0,
  })

  if (query.isPending) {
    return (
      <article className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading business profile...
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
        Business detail is unavailable.
      </article>
    )
  }

  return (
    <section className="space-y-5">
      <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Business
            </p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                {business.display_name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {business.legal_name} / {business.industry ?? 'Industry not specified'} /{' '}
                {business.country_code ?? 'Country pending'}
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
              Back
            </Link>
          </div>
        </div>
      </article>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Programs"
          value={business.summary.program_count.toString()}
          description="Programs attached to this tenant"
          badge={kpiSnapshotBadge('Catalog')}
          icon={FolderKanban}
          tone="primary"
        />
        <KpiCard
          title="Active agents"
          value={business.summary.active_agent_count.toString()}
          description="Affiliates currently active"
          badge={kpiSnapshotBadge('Network')}
          icon={Users}
          tone="info"
        />
        <KpiCard
          title="Prospects"
          value={business.summary.prospect_count.toString()}
          description="Pipeline records in scope"
          badge={kpiSnapshotBadge('Funnel')}
          icon={UserCircle}
          tone="warning"
        />
        <KpiCard
          title="Transactions"
          value={business.summary.transaction_count.toString()}
          description="Commercial outcomes linked"
          badge={kpiSnapshotBadge('Revenue')}
          icon={Receipt}
          tone="success"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Governance
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <DataCell label="Created" value={formatDate(business.created_at, true)} />
            <DataCell label="Approved" value={formatDate(business.approved_at, true)} />
            <DataCell label="Rejected" value={formatDate(business.rejected_at, true)} />
            <DataCell label="Last sync" value={formatDate(business.last_synced_at, true)} />
            <DataCell label="Approved by" value={business.approved_by?.display_name ?? 'Not approved'} />
            <DataCell label="Rejected by" value={business.rejected_by?.display_name ?? 'Not rejected'} />
            <DataCell label="IACRM ID" value={business.iacrm_business_id ?? 'Not mapped'} />
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Owners
            </p>
            <span className="text-xs text-muted-foreground">{business.owners.length} assignments</span>
          </div>
          <div className="mt-4 space-y-3">
            {business.owners.length === 0 ? (
              <EmptyState message="No owner assignments were found for this business." />
            ) : (
              business.owners.map((owner) => (
                <article key={owner.assignment_id} className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-foreground px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-background">
                      {owner.is_primary ? 'Primary' : 'Owner'}
                    </span>
                    <span className="rounded-md bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {owner.status}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-foreground">
                    {owner.user?.display_name ?? 'Invitation pending'}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{owner.user?.email ?? 'No email available'}</p>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <p>Invited {formatDate(owner.invited_at, true)}</p>
                    <p>Activated {formatDate(owner.activated_at, true)}</p>
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
            Linked programs
          </p>
          <span className="text-xs text-muted-foreground">{business.linked_programs.length} programs</span>
        </div>

        <div className="mt-4 space-y-3">
          {business.linked_programs.length === 0 ? (
            <EmptyState message="No programs are attached to this business yet." />
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
                    Open
                  </Link>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  <p>Status {program.status}</p>
                  <p>Pts / tx {program.points_per_transaction ?? 'n/a'}</p>
                  <p>Pts / € {program.points_per_euro ?? 'n/a'}</p>
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
