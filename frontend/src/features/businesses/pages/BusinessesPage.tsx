import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, LayoutGrid, Receipt, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import { KpiCard, kpiSnapshotBadge } from '../../dashboard/components/KpiCard'
import { approveBusiness, fetchBusinesses, rejectBusiness } from '../api'
import { useAuthSession } from '../../auth/session'
import type { BusinessRecord } from '../../../types/businesses'

const statusPresentation: Record<
  string,
  {
    label: string
    className: string
  }
> = {
  pending: {
    label: 'Pending approval',
    className: 'bg-amber-100 text-amber-700',
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-100 text-emerald-700',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-rose-100 text-rose-700',
  },
}

function formatDate(value: string | null, withTime = false) {
  if (value === null) {
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

export function BusinessesPage() {
  const queryClient = useQueryClient()
  const { hasPermission } = useAuthSession()
  const canApprove = hasPermission('business.approve')
  const canReject = hasPermission('business.reject')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  const query = useQuery({
    queryKey: ['businesses', 'list'],
    queryFn: fetchBusinesses,
  })

  const approveMutation = useMutation({
    mutationFn: approveBusiness,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['businesses'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: rejectBusiness,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['businesses'] })
    },
  })

  const records = query.data?.data ?? []

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return records.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.display_name.toLowerCase().includes(normalizedSearch) ||
        item.legal_name.toLowerCase().includes(normalizedSearch) ||
        item.slug.toLowerCase().includes(normalizedSearch) ||
        (item.industry ?? '').toLowerCase().includes(normalizedSearch) ||
        (item.owner?.display_name ?? '').toLowerCase().includes(normalizedSearch) ||
        (item.owner?.email ?? '').toLowerCase().includes(normalizedSearch)

      return matchesStatus && matchesSearch
    })
  }, [records, search, statusFilter])

  const summary = useMemo(() => {
    return records.reduce(
      (accumulator, business) => {
        accumulator.total += 1
        accumulator.pending += business.status === 'pending' ? 1 : 0
        accumulator.approved += business.status === 'approved' ? 1 : 0
        accumulator.rejected += business.status === 'rejected' ? 1 : 0
        accumulator.programs += business.program_count ?? 0
        accumulator.agents += business.agent_count ?? 0
        accumulator.transactions += business.transaction_count ?? 0
        return accumulator
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        programs: 0,
        agents: 0,
        transactions: 0,
      },
    )
  }, [records])

  if (query.isPending) {
    return (
      <article className="rounded-xl border border-border bg-card/90 p-6 text-sm text-muted-foreground">
        Loading governed business inventory from the live backend...
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

  return (
    <section className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Platform governance
          </p>
          <h1 className="app-page-title mt-2">
            Business inventory
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Approval state, owner context, and operational counts in one review surface.
          </p>
        </article>

        <article className="rounded-xl border border-border bg-foreground p-6 text-background shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-background/70">
            Review queue
          </p>
          <p className="app-stat-value mt-3 text-background">
            {summary.pending} pending
          </p>
          <div className="mt-5 space-y-2 text-sm text-background/80">
            <p>Approved businesses: {summary.approved}</p>
            <p>Rejected businesses: {summary.rejected}</p>
            <p>Total governed entities: {summary.total}</p>
          </div>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Businesses"
          value={summary.total.toString()}
          description="Governed tenant entities"
          badge={kpiSnapshotBadge('Directory')}
          icon={Building2}
          tone="primary"
        />
        <KpiCard
          title="Programs in scope"
          value={summary.programs.toString()}
          description="Programs across listed businesses"
          badge={kpiSnapshotBadge('Catalog')}
          icon={LayoutGrid}
          tone="info"
        />
        <KpiCard
          title="Agents in scope"
          value={summary.agents.toString()}
          description="Affiliates under governance"
          badge={kpiSnapshotBadge('Network')}
          icon={Users}
          tone="warning"
        />
        <KpiCard
          title="Transactions linked"
          value={summary.transactions.toString()}
          description="Commercial outcomes attributed"
          badge={kpiSnapshotBadge('Revenue')}
          icon={Receipt}
          tone="success"
        />
      </div>

      <article className="rounded-xl border border-border bg-card/90 p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="Search by business, slug, industry, owner, or owner email..."
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
              className="rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">
            Super-admin governance surface
          </div>
        </div>
      </article>

      {filtered.length === 0 ? (
        <article className="rounded-xl border border-dashed border-border bg-card/90 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Business inventory
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            No businesses match the current governance filter.
          </h2>
        </article>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <BusinessCard
              key={item.id}
              item={item}
              canApprove={canApprove}
              canReject={canReject}
              onApprove={(id) => approveMutation.mutate(id)}
              onReject={(id) => rejectMutation.mutate(id)}
              actionPending={approveMutation.isPending || rejectMutation.isPending}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function BusinessCard({
  item,
  canApprove,
  canReject,
  onApprove,
  onReject,
  actionPending,
}: {
  item: BusinessRecord
  canApprove: boolean
  canReject: boolean
  onApprove: (businessId: string) => void
  onReject: (businessId: string) => void
  actionPending: boolean
}) {
  const status = statusPresentation[item.status] ?? {
    label: item.status,
    className: 'bg-muted text-muted-foreground',
  }

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {item.slug}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {item.display_name}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.legal_name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.industry ?? 'Industry not specified'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${status.className}`}>
              {status.label}
            </span>
            <span className="rounded-md border border-border bg-muted/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {item.currency_code} / {item.timezone}
            </span>
          </div>
          <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-3">
            <p>Owner: {item.owner?.display_name ?? 'Owner not assigned'}</p>
            <p>Owner email: {item.owner?.email ?? 'Not available'}</p>
            <p>Pending exchanges: {item.pending_exchange_request_count ?? 0}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 xl:justify-end">
          <Link
            to={`/businesses/${item.id}`}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            Open details
          </Link>
          {item.status === 'pending' && canApprove ? (
            <button
              type="button"
              disabled={actionPending}
              onClick={() => onApprove(item.id)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              Approve
            </button>
          ) : null}
          {item.status === 'pending' && canReject ? (
            <button
              type="button"
              disabled={actionPending}
              onClick={() => onReject(item.id)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
            >
              Reject
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <BusinessStat label="Programs" value={(item.program_count ?? 0).toString()} />
        <BusinessStat label="Agents" value={(item.agent_count ?? 0).toString()} />
        <BusinessStat label="Prospects" value={(item.prospect_count ?? 0).toString()} />
        <BusinessStat label="Transactions" value={(item.transaction_count ?? 0).toString()} />
      </div>

      <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
        <p>Contact email: {item.contact_email ?? 'Not provided'}</p>
        <p>Website: {item.website_url ?? 'Not provided'}</p>
        <p>Last sync: {formatDate(item.last_synced_at, true)}</p>
      </div>
    </article>
  )
}

function BusinessStat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </article>
  )
}
