import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import { fetchPointsByProgram, fetchPointsLedger, fetchPointsSummary } from '../api'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  PointsLedgerEntryStatus,
  PointsLedgerRecord,
  PointsProgramBalanceRecord,
} from '../../../types/points'

const statusPresentation: Record<
  PointsLedgerEntryStatus,
  { label: string; className: string }
> = {
  pending: { label: 'Pending', className: 'border-border bg-blue-500/10 text-blue-800 dark:text-blue-300' },
  available: { label: 'Available', className: 'border-border bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' },
  locked: { label: 'Locked', className: 'border-border bg-amber-500/10 text-amber-800 dark:text-amber-300' },
  consumed: { label: 'Consumed', className: 'border-border bg-muted text-muted-foreground' },
  reversed: { label: 'Reversed', className: 'border-border bg-rose-500/10 text-rose-800 dark:text-rose-300' },
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
      <article className="app-panel text-sm text-muted-foreground">
        Loading point balances and ledger history...
      </article>
    )
  }

  if (summaryQuery.isError) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(summaryQuery.error as ApiError).message}
      </article>
    )
  }

  if (byProgramQuery.isError) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(byProgramQuery.error as ApiError).message}
      </article>
    )
  }

  if (ledgerQuery.isError) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(ledgerQuery.error as ApiError).message}
      </article>
    )
  }

  return (
    <section className="app-section">
      <PageHeader
        title="Points"
        right={
          <PageHeaderToolbar>
            <Field className="w-full sm:min-w-[200px] sm:max-w-[340px] sm:flex-1">
              <FieldLabel htmlFor="points-ledger-search" className="sr-only">
                Search ledger
              </FieldLabel>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="points-ledger-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Program, prospect, agent, transaction..."
                  className="pl-9"
                />
              </div>
            </Field>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as 'all' | PointsLedgerEntryStatus)}
            >
              <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-[140px] sm:shrink-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Ledger status</SelectLabel>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.entries(statusPresentation).map(([key, status]) => (
                    <SelectItem key={key} value={key}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </PageHeaderToolbar>
        }
      />
      <p className="app-copy text-muted-foreground">
        Forecast, available balance, and immutable ledger events from live records.
      </p>

      <div className="grid gap-3 lg:grid-cols-[1fr_minmax(220px,280px)]">
        <article className="rounded-lg border border-border bg-muted/15 px-4 py-3 md:px-5 md:py-4">
          <p className="app-eyebrow">Scope</p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {user?.primary_business?.display_name ?? 'Global platform'}
          </p>
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            <p>Forecast prospects: {summary?.open_prospect_count ?? 0}</p>
            <p>Ledger entries: {summary?.ledger_entry_count ?? 0}</p>
            <p>Active exchanges: {summary?.active_exchange_request_count ?? 0}</p>
          </div>
        </article>
      </div>

      <div className="app-grid md:grid-cols-2 xl:grid-cols-3">
        <BalanceCard label="Forecast" value={summary?.forecast_points ?? 0} />
        <BalanceCard label="Pending" value={summary?.pending_points ?? 0} />
        <BalanceCard label="Available" value={summary?.available_points ?? 0} highlight />
        <BalanceCard label="Locked" value={summary?.locked_points ?? 0} />
        <BalanceCard label="Consumed" value={summary?.consumed_points ?? 0} />
        <BalanceCard label="Reversed" value={summary?.reversed_points ?? 0} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-lg border border-border bg-card app-card-padding">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-eyebrow">Program balances</p>
              <h2 className="mt-1 text-base font-semibold text-foreground">Available by program</h2>
            </div>
            <span className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {programBalances.length} programs
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {programBalances.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/15 px-4 py-5 text-sm text-muted-foreground">
                No program balances available.
              </div>
            ) : (
              programBalances.map((program) => (
                <ProgramBalanceCard key={program.program_id} program={program} />
              ))
            )}
          </div>
        </article>

        <article className="rounded-lg border border-border bg-muted/15 app-card-padding">
          <p className="app-eyebrow">Exchange readiness</p>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>Immutable accrual — live</p>
            <p>Lock / consume / reverse — live</p>
            <p>Program-level balances — live</p>
            <p className="text-foreground">Request workflow — use Exchanges (payouts)</p>
          </div>
        </article>
      </div>

      <div className="rounded-lg border border-border bg-muted/10 px-3 py-2 text-center text-xs text-muted-foreground md:text-left">
        Immutable ledger history
      </div>

      {filteredLedger.length === 0 ? (
        <article className="rounded-lg border border-dashed border-border bg-muted/15 app-card-padding">
          <p className="app-eyebrow">Ledger history</p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">No ledger entries match the current filter.</h2>
        </article>
      ) : (
        <div className="app-section">
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
          ? 'rounded-lg border border-foreground/20 bg-foreground px-5 py-4 text-background'
          : 'rounded-lg border border-border bg-card px-5 py-4'
      }
    >
      <p
        className={
          highlight
            ? 'text-[11px] uppercase tracking-wide text-background/80'
            : 'text-[11px] uppercase tracking-wide text-muted-foreground'
        }
      >
        {label}
      </p>
      <p
        className={
          highlight
            ? 'mt-2 text-2xl font-semibold tracking-tight text-background'
            : 'mt-2 text-2xl font-semibold tracking-tight text-foreground'
        }
      >
        {value.toLocaleString('en-GB')}
      </p>
    </article>
  )
}

function ProgramBalanceCard({ program }: { program: PointsProgramBalanceRecord }) {
  return (
    <article className="rounded-lg border border-border bg-muted/15 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="app-eyebrow">{program.program_slug ?? 'Program'}</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            {program.program_name ?? 'Unnamed program'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {program.exchange_mode ?? 'Not configured'}
            {program.exchange_pack_name ? ` / ${program.exchange_pack_name}` : ''}
          </p>
        </div>
        <span className="rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </article>
  )
}

function LedgerCard({ entry }: { entry: PointsLedgerRecord }) {
  const status = statusPresentation[entry.entry_status]

  return (
    <article className="rounded-lg border border-border bg-card app-card-padding">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div>
            <p className="app-eyebrow">
              {entry.program_name ?? 'Program'} / {entry.source}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {entry.description ?? 'Ledger activity'}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${status.className}`}
            >
              {status.label}
            </span>
            <span className="rounded-md border border-border bg-muted/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {entry.entry_type}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/15 px-5 py-4 text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Points delta</p>
          <p
            className={`mt-2 text-2xl font-semibold tracking-tight ${
              entry.points_delta >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
            }`}
          >
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
