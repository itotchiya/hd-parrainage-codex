import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Clock, Lock, MinusCircle, MoreHorizontal, Search, TrendingUp, Undo2, Wallet } from 'lucide-react'
import { ApiError } from '../../../lib/api'
import { KpiCard, kpiSnapshotBadge } from '../../dashboard/components/KpiCard'
import { DashboardSectionHeader } from '../../dashboard/components/DashboardSectionHeader'
import { formatDashboardDateFr } from '../../dashboard/utils/semanticBadges'
import { fetchPointsByProgram, fetchPointsLedger, fetchPointsSummary } from '../api'
import { PageHeader } from '@/components/app/PageHeader'
import { TablePaginationBar } from '@/components/app/TablePaginationBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  PointsLedgerEntryStatus,
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

function formatSignedPoints(value: number) {
  return `${value > 0 ? '+' : ''}${value.toLocaleString('fr-FR')}`
}

export function PointsPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | PointsLedgerEntryStatus>('all')
  const [search, setSearch] = useState('')
  const [programPage, setProgramPage] = useState(1)
  const [programPageSize, setProgramPageSize] = useState(10)
  const [ledgerPage, setLedgerPage] = useState(1)
  const [ledgerPageSize, setLedgerPageSize] = useState(10)

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

  useEffect(() => {
    setLedgerPage(1)
  }, [search, statusFilter])

  const totalPrograms = programBalances.length
  const totalProgramPages = Math.max(1, Math.ceil(totalPrograms / programPageSize))
  const programPageSafe = Math.min(programPage, totalProgramPages)
  const programSlice = useMemo(() => {
    const start = (programPageSafe - 1) * programPageSize
    return programBalances.slice(start, start + programPageSize)
  }, [programBalances, programPageSafe, programPageSize])

  useEffect(() => {
    if (programPage !== programPageSafe) setProgramPage(programPageSafe)
  }, [programPage, programPageSafe])

  const totalLedger = filteredLedger.length
  const totalLedgerPages = Math.max(1, Math.ceil(totalLedger / ledgerPageSize))
  const ledgerPageSafe = Math.min(ledgerPage, totalLedgerPages)
  const ledgerSlice = useMemo(() => {
    const start = (ledgerPageSafe - 1) * ledgerPageSize
    return filteredLedger.slice(start, start + ledgerPageSize)
  }, [filteredLedger, ledgerPageSafe, ledgerPageSize])

  useEffect(() => {
    if (ledgerPage !== ledgerPageSafe) setLedgerPage(ledgerPageSafe)
  }, [ledgerPage, ledgerPageSafe])

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
      <PageHeader title="Commissions" />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title="Forecast"
          value={(summary?.forecast_points ?? 0).toLocaleString('fr-FR')}
          description="Attributed to open prospects"
          badge={kpiSnapshotBadge('Accrual')}
          icon={TrendingUp}
          tone="primary"
        />
        <KpiCard
          title="Pending"
          value={(summary?.pending_points ?? 0).toLocaleString('fr-FR')}
          description="Not yet available"
          badge={kpiSnapshotBadge('Hold')}
          icon={Clock}
          tone="warning"
        />
        <KpiCard
          title="Available"
          value={(summary?.available_points ?? 0).toLocaleString('fr-FR')}
          description="Ready for exchange"
          badge={kpiSnapshotBadge('Spend')}
          icon={Wallet}
          tone="success"
        />
        <KpiCard
          title="Locked"
          value={(summary?.locked_points ?? 0).toLocaleString('fr-FR')}
          description="Reserved for in-flight requests"
          badge={kpiSnapshotBadge('Reserved')}
          icon={Lock}
          tone="info"
        />
        <KpiCard
          title="Consumed"
          value={(summary?.consumed_points ?? 0).toLocaleString('fr-FR')}
          description="Redeemed or settled"
          badge={kpiSnapshotBadge('Spent')}
          icon={MinusCircle}
          tone="primary"
        />
        <KpiCard
          title="Reversed"
          value={(summary?.reversed_points ?? 0).toLocaleString('fr-FR')}
          description="Adjustments and clawbacks"
          badge={kpiSnapshotBadge('Ledger')}
          icon={Undo2}
          tone="warning"
        />
      </div>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <DashboardSectionHeader
          title="Program balances"
          description="Available points and usage split by program."
        />
        {programBalances.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/15 px-4 py-5 text-sm text-muted-foreground">
            No program balances available.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead className="hidden lg:table-cell">Exchange mode</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Pending</TableHead>
                    <TableHead className="hidden xl:table-cell text-right">Locked</TableHead>
                    <TableHead className="hidden xl:table-cell text-right">Consumed</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Open prospects</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programSlice.map((program, index) => {
                    const rank = (programPageSafe - 1) * programPageSize + index + 1
                    return (
                      <TableRow key={program.program_id}>
                        <TableCell className="text-center text-muted-foreground">{rank}</TableCell>
                        <TableCell>
                          <p className="truncate font-medium text-foreground">
                            {program.program_name ?? 'Unnamed program'}
                          </p>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {program.program_slug ?? '—'}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground lg:hidden">
                            {program.exchange_mode ?? 'Not configured'}
                          </p>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <p className="truncate text-sm text-muted-foreground">
                            {program.exchange_mode ?? 'Not configured'}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {program.exchange_pack_name ?? 'No active pack'}
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-primary">
                          {program.available_points.toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums md:table-cell">
                          {program.pending_points.toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums xl:table-cell">
                          {program.locked_points.toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums xl:table-cell">
                          {program.consumed_points.toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums md:table-cell">
                          {program.open_prospect_count.toLocaleString('fr-FR')}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <TablePaginationBar
              page={programPageSafe}
              pageSize={programPageSize}
              totalItems={totalPrograms}
              onPageChange={setProgramPage}
              onPageSizeChange={setProgramPageSize}
              pageSizeOptions={[10, 25, 50]}
            />
          </div>
        )}
      </article>

      <article className="rounded-lg bg-card p-3 sm:p-4">
        <DashboardSectionHeader
          title="Commission ledger"
          actions={
            <>
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
            </>
          }
        />

        {totalLedger === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/15 px-4 py-5 text-sm text-muted-foreground">
            No ledger entries match the current filter.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Delta</TableHead>
                    <TableHead className="hidden md:table-cell">Prospect</TableHead>
                    <TableHead className="hidden lg:table-cell">Transaction</TableHead>
                    <TableHead className="hidden xl:table-cell">Effective</TableHead>
                    <TableHead className="w-10 pe-2 text-end">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerSlice.map((entry, index) => {
                    const status = statusPresentation[entry.entry_status]
                    const rank = (ledgerPageSafe - 1) * ledgerPageSize + index + 1
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="text-center text-muted-foreground">{rank}</TableCell>
                        <TableCell>
                          <p className="truncate font-medium text-foreground">
                            {entry.description ?? 'Ledger activity'}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {(entry.program_name ?? 'Program') + ' · ' + entry.source}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {entry.agent_name ?? 'Unknown agent'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`w-fit text-xs capitalize ${status.className}`}>
                            {status.label}
                          </Badge>
                          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                            {entry.entry_type}
                          </p>
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold tabular-nums ${
                            entry.points_delta >= 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-foreground'
                          }`}
                        >
                          {formatSignedPoints(entry.points_delta)}
                        </TableCell>
                        <TableCell className="hidden max-w-[11rem] truncate text-muted-foreground md:table-cell">
                          {entry.prospect_name ?? '—'}
                        </TableCell>
                        <TableCell className="hidden max-w-[11rem] truncate lg:table-cell">
                          {entry.transaction_reference ? (
                            <Link
                              to={`/transactions/${entry.transaction_id}`}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              {entry.transaction_reference}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground xl:table-cell">
                          {formatDashboardDateFr(entry.effective_at)}
                        </TableCell>
                        <TableCell className="pe-2 text-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground"
                                aria-label={`Actions for ledger entry ${entry.id}`}
                              >
                                <MoreHorizontal className="size-4" aria-hidden />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[10rem]">
                              {entry.transaction_id ? (
                                <DropdownMenuItem asChild>
                                  <Link to={`/transactions/${entry.transaction_id}`}>Open transaction</Link>
                                </DropdownMenuItem>
                              ) : null}
                              {entry.prospect_id ? (
                                <DropdownMenuItem asChild>
                                  <Link to={`/prospects/${entry.prospect_id}`}>Open prospect</Link>
                                </DropdownMenuItem>
                              ) : null}
                              {entry.exchange_request_id ? (
                                <DropdownMenuItem asChild>
                                  <Link to={`/payouts/${entry.exchange_request_id}`}>Open payout request</Link>
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <TablePaginationBar
              page={ledgerPageSafe}
              pageSize={ledgerPageSize}
              totalItems={totalLedger}
              onPageChange={setLedgerPage}
              onPageSizeChange={setLedgerPageSize}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          </div>
        )}
      </article>
    </section>
  )
}
