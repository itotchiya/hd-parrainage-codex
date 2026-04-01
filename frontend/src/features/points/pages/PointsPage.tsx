import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import { fetchPointsByProgram, fetchPointsLedger, fetchPointsSummary } from '../api'
import type {
  PointsLedgerEntryStatus,
  PointsLedgerRecord,
  PointsProgramBalanceRecord,
} from '../../../types/points'

const statusPresentation: Record<
  PointsLedgerEntryStatus,
  { label: string; className: string }
> = {
  pending: { label: 'Pending', className: 'bg-blue-100 text-blue-700' },
  available: { label: 'Available', className: 'bg-emerald-100 text-emerald-700' },
  locked: { label: 'Locked', className: 'bg-amber-100 text-amber-700' },
  consumed: { label: 'Consumed', className: 'bg-muted text-muted-foreground' },
  reversed: { label: 'Reversed', className: 'bg-rose-100 text-rose-700' },
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

function formatSignedPoints(value: number) {
  return `${value > 0 ? '+' : ''}${value.toLocaleString('en-GB')}`
}

export function PointsPage() {
  const { user } = useAuthSession()
  const [statusFilter, setStatusFilter] = useState<'all' | PointsLedgerEntryStatus>('all')
  const [search, setSearch] = useState('')

  const summaryQuery = useQuery({
    queryKey: ['points', 'summary'],
    queryFn: fetchPointsSummary,
  })

  const byProgramQuery = useQuery({
    queryKey: ['points', 'by-program'],
    queryFn: fetchPointsByProgram,
  })

  const ledgerQuery = useQuery({
    queryKey: ['points', 'ledger'],
    queryFn: fetchPointsLedger,
  })

  const summary = summaryQuery.data?.data
  const programBalances = byProgramQuery.data?.data ?? []
  const ledgerEntries = ledgerQuery.data?.data ?? []

  const filteredLedger = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return ledgerEntries.filter((entry) => {
      const matchesStatus = statusFilter === 'all' || entry.entry_status === statusFilter
      const matchesSearch =
        normalizedSearch.length === 0 ||
        (entry.program_name ?? '').toLowerCase().includes(normalizedSearch) ||
        (entry.agent_name ?? '').toLowerCase().includes(normalizedSearch) ||
        (entry.prospect_name ?? '').toLowerCase().includes(normalizedSearch) ||
        (entry.transaction_reference ?? '').toLowerCase().includes(normalizedSearch) ||
        (entry.description ?? '').toLowerCase().includes(normalizedSearch)

      return matchesStatus && matchesSearch
    })
  }, [ledgerEntries, search, statusFilter])

  if (summaryQuery.isPending || byProgramQuery.isPending || ledgerQuery.isPending) {
    return (
      <article className="rounded-xl border border-border bg-card/90 p-6 text-sm text-muted-foreground">
        Loading point balances and ledger history...
      </article>
    )
  }

  if (summaryQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(summaryQuery.error as ApiError).message}
      </article>
    )
  }

  if (byProgramQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(byProgramQuery.error as ApiError).message}
      </article>
    )
  }

  if (ledgerQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(ledgerQuery.error as ApiError).message}
      </article>
    )
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Points ledger
          </p>
          <h1 className="app-page-title mt-2">
            Points
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Forecast, available balance, and immutable ledger events from live backend records.
          </p>
        </article>

        <article className="rounded-xl border border-border bg-foreground p-6 text-background shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-background/70">
            Scope
          </p>
          <p className="app-stat-value mt-3 text-background">
            {user?.primary_business?.display_name ?? 'Global platform'}
          </p>
          <div className="mt-5 space-y-2 text-sm text-background/80">
            <p>Forecast prospects: {summary?.open_prospect_count ?? 0}</p>
            <p>Ledger entries: {summary?.ledger_entry_count ?? 0}</p>
            <p>Active exchanges: {summary?.active_exchange_request_count ?? 0}</p>
          </div>
        </article>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <BalanceCard label="Forecast" value={summary?.forecast_points ?? 0} />
        <BalanceCard label="Pending" value={summary?.pending_points ?? 0} />
        <BalanceCard label="Available" value={summary?.available_points ?? 0} highlight />
        <BalanceCard label="Locked" value={summary?.locked_points ?? 0} />
        <BalanceCard label="Consumed" value={summary?.consumed_points ?? 0} />
        <BalanceCard label="Reversed" value={summary?.reversed_points ?? 0} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Program balances
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                Available by program
              </h2>
            </div>
            <span className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {programBalances.length} programs
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {programBalances.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
                No program balances available.
              </div>
            ) : (
              programBalances.map((program) => (
                <ProgramBalanceCard key={program.program_id} program={program} />
              ))
            )}
          </div>
        </article>

        <article className="rounded-xl border border-border bg-foreground p-5 text-background shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-background/70">
            Exchange readiness
          </p>
          <div className="mt-4 space-y-3">
            <DarkInfo label="Immutable accrual" value="Live" />
            <DarkInfo label="Lock / consume / reverse" value="Live" />
            <DarkInfo label="Program-level balances" value="Live" />
            <DarkInfo label="Request workflow" value="Use Exchanges module" />
          </div>
        </article>
      </div>

      <article className="rounded-xl border border-border bg-card/90 p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="Search by program, prospect, agent, transaction, or description..."
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | PointsLedgerEntryStatus)}
              className="rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
            >
              <option value="all">All statuses</option>
              {Object.entries(statusPresentation).map(([key, status]) => (
                <option key={key} value={key}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">
            Immutable ledger history
          </div>
        </div>
      </article>

      {filteredLedger.length === 0 ? (
        <article className="rounded-xl border border-dashed border-border bg-card/90 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Ledger history
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            No ledger entries match the current filter.
          </h2>
        </article>
      ) : (
        <div className="space-y-4">
          {filteredLedger.map((entry) => (
            <LedgerCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  )
}

function BalanceCard({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <article
      className={
        highlight
          ? 'rounded-lg border border-border bg-foreground px-5 py-4 text-background shadow-sm'
          : 'rounded-lg border border-border bg-card px-5 py-4 shadow-sm'
      }
    >
      <p className={highlight ? 'text-[11px] uppercase tracking-[0.18em] text-background/70' : 'text-[11px] uppercase tracking-[0.18em] text-muted-foreground'}>
        {label}
      </p>
      <p className={highlight ? 'mt-2 text-2xl font-semibold tracking-tight text-background' : 'mt-2 text-2xl font-semibold tracking-tight text-foreground'}>
        {value.toLocaleString('en-GB')}
      </p>
    </article>
  )
}

function ProgramBalanceCard({ program }: { program: PointsProgramBalanceRecord }) {
  return (
    <article className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {program.program_slug ?? 'Program'}
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            {program.program_name ?? 'Unnamed program'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {program.exchange_mode ?? 'Not configured'}
            {program.exchange_pack_name ? ` / ${program.exchange_pack_name}` : ''}
          </p>
        </div>
        <span className="rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {program.open_prospect_count} prospects
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <MiniMetric label="Forecast" value={program.forecast_points.toLocaleString('en-GB')} />
        <MiniMetric label="Pending" value={program.pending_points.toLocaleString('en-GB')} />
        <MiniMetric label="Available" value={program.available_points.toLocaleString('en-GB')} />
        <MiniMetric label="Locked" value={program.locked_points.toLocaleString('en-GB')} />
        <MiniMetric label="Consumed" value={program.consumed_points.toLocaleString('en-GB')} />
        <MiniMetric label="Reversed" value={program.reversed_points.toLocaleString('en-GB')} />
      </div>
    </article>
  )
}

function DarkInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-background/10 bg-background/10 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-background/70">{label}</p>
      <p className="mt-1 font-medium text-background">{value}</p>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </article>
  )
}

function LedgerCard({ entry }: { entry: PointsLedgerRecord }) {
  const status = statusPresentation[entry.entry_status]

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {entry.program_name ?? 'Program'} / {entry.source}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {entry.description ?? 'Ledger activity'}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${status.className}`}>
              {status.label}
            </span>
            <span className="rounded-md border border-border bg-muted/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {entry.entry_type}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 px-5 py-4 text-right">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Points delta</p>
          <p className={`mt-2 text-2xl font-semibold tracking-tight ${entry.points_delta >= 0 ? 'text-emerald-700' : 'text-foreground'}`}>
            {formatSignedPoints(entry.points_delta)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <MiniMetric label="Agent" value={entry.agent_name ?? 'Not available'} />
        <MiniMetric label="Prospect" value={entry.prospect_name ?? 'Not linked'} />
        <MiniMetric label="Transaction" value={entry.transaction_reference ?? 'No reference'} />
        <MiniMetric label="Effective at" value={formatDate(entry.effective_at, true)} />
      </div>
    </article>
  )
}
