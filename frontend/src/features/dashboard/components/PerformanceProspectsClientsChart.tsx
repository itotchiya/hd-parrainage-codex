import * as React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardSectionHeader } from './DashboardSectionHeader'
import type { ProspectRecord } from '@/types/prospects'
import type { TransactionRecord } from '@/types/transactions'

const MONTH_LABELS_FR = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
] as const

function isConvertedTransaction(t: TransactionRecord) {
  return t.status === 'validated' || t.status === 'paid'
}

function transactionMonthDate(t: TransactionRecord): Date | null {
  const raw = t.occurred_at ?? t.validated_at ?? t.paid_at ?? t.created_at
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

function collectYears(prospects: ProspectRecord[], transactions: TransactionRecord[]) {
  const ys = new Set<number>()
  const yNow = new Date().getFullYear()
  for (const p of prospects) {
    if (!p.submitted_at) continue
    const d = new Date(p.submitted_at)
    if (!Number.isNaN(d.getTime())) ys.add(d.getFullYear())
  }
  for (const t of transactions) {
    const d = transactionMonthDate(t)
    if (d) ys.add(d.getFullYear())
  }
  ys.add(yNow)
  return Array.from(ys).sort((a, b) => b - a)
}

function buildChartRows(
  prospects: ProspectRecord[],
  transactions: TransactionRecord[],
  year: number,
) {
  const prospectCounts = Array.from({ length: 12 }, () => 0)
  const clientSets = Array.from({ length: 12 }, () => new Set<string>())

  for (const p of prospects) {
    if (p.deleted_at) continue
    if (!p.submitted_at) continue
    const d = new Date(p.submitted_at)
    if (Number.isNaN(d.getTime()) || d.getFullYear() !== year) continue
    prospectCounts[d.getMonth()] += 1
  }

  for (const t of transactions) {
    if (!isConvertedTransaction(t) || !t.prospect_id) continue
    const d = transactionMonthDate(t)
    if (!d || d.getFullYear() !== year) continue
    clientSets[d.getMonth()].add(t.prospect_id)
  }

  return MONTH_LABELS_FR.map((month, index) => {
    const prospectsTotal = prospectCounts[index]
    const clients = clientSets[index].size
    const prospectsOpen = Math.max(0, prospectsTotal - clients)
    return {
      month,
      monthIndex: index,
      prospects: prospectsOpen,
      clients,
      prospectsTotal,
    }
  })
}

const chartConfig = {
  clients: {
    label: 'Clients convertis',
    color: 'var(--chart-1)',
  },
  prospects: {
    label: 'Prospects',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

export interface PerformanceProspectsClientsChartProps {
  prospects: ProspectRecord[]
  transactions: TransactionRecord[]
}

export function PerformanceProspectsClientsChart({
  prospects,
  transactions,
}: PerformanceProspectsClientsChartProps) {
  const years = React.useMemo(
    () => collectYears(prospects, transactions),
    [prospects, transactions],
  )

  const defaultYear = String(new Date().getFullYear())
  const [year, setYear] = React.useState(defaultYear)

  React.useEffect(() => {
    if (years.includes(Number(year))) return
    const fallback = years[0] ?? Number(defaultYear)
    setYear(String(fallback))
  }, [years, year, defaultYear])

  const yearNum = Number(year)
  const chartData = React.useMemo(
    () => buildChartRows(prospects, transactions, yearNum),
    [prospects, transactions, yearNum],
  )

  const yearSelect = (
    <Select value={year} onValueChange={setYear}>
      <SelectTrigger size="sm" className="w-full max-w-48 min-w-[7.5rem]">
        <SelectValue placeholder="Année" />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectGroup>
          <SelectLabel>Année</SelectLabel>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )

  const hasData = prospects.length > 0 || transactions.length > 0

  return (
    <>
      <DashboardSectionHeader
        title="Prospects et conversions mensuelles"
        description="Volume de prospects soumis et de clients convertis, mois par mois, pour l'année choisie."
        actions={hasData ? yearSelect : undefined}
      />

      {!hasData ? (
        <div className="flex aspect-[21/9] max-h-[280px] w-full items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/10">
          <p className="text-sm text-muted-foreground">Aucune donnée de performance pour le moment.</p>
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="aspect-[21/9] w-full max-h-[280px]">
          <BarChart accessibilityLayer data={chartData} margin={{ left: 4, right: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="clients"
              stackId="a"
              fill="var(--color-clients)"
              radius={[0, 0, 4, 4]}
            />
            <Bar
              dataKey="prospects"
              stackId="a"
              fill="var(--color-prospects)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      )}
    </>
  )
}

export function PerformanceProspectsClientsChartSkeleton() {
  return (
    <>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 space-y-1.5">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-72 max-w-[92%]" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="flex aspect-[21/9] max-h-[280px] w-full items-end gap-2 rounded-lg bg-muted/10 p-3">
        {Array.from({ length: 12 }).map((_, index) => (
          <Skeleton
            key={index}
            className="flex-1 rounded-sm"
            style={{ height: `${38 + ((index * 11) % 42)}%` }}
          />
        ))}
      </div>
    </>
  )
}
