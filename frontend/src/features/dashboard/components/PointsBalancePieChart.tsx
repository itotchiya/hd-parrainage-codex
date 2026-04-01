import * as React from 'react'
import { Pie, PieChart } from 'recharts'

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
import { DashboardSectionHeader } from './DashboardSectionHeader'
import type { PointsLedgerRecord } from '@/types/points'

const MONTH_OPTIONS = [
  { value: 'all', label: "Toute l'année" },
  { value: '0', label: 'Janvier' },
  { value: '1', label: 'Fevrier' },
  { value: '2', label: 'Mars' },
  { value: '3', label: 'Avril' },
  { value: '4', label: 'Mai' },
  { value: '5', label: 'Juin' },
  { value: '6', label: 'Juillet' },
  { value: '7', label: 'Aout' },
  { value: '8', label: 'Septembre' },
  { value: '9', label: 'Octobre' },
  { value: '10', label: 'Novembre' },
  { value: '11', label: 'Decembre' },
] as const

const chartConfig = {
  available: {
    label: 'Points disponibles',
    color: 'var(--chart-1)',
  },
  used: {
    label: 'Points utilises',
    color: 'var(--chart-4)',
  },
} satisfies ChartConfig

function getLedgerDate(entry: PointsLedgerRecord) {
  const raw = entry.effective_at ?? entry.created_at
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function collectYears(entries: PointsLedgerRecord[]) {
  const years = new Set<number>()
  const currentYear = new Date().getFullYear()

  for (const entry of entries) {
    const date = getLedgerDate(entry)
    if (date) years.add(date.getFullYear())
  }

  years.add(currentYear)
  return Array.from(years).sort((a, b) => b - a)
}

function buildPointsBreakdown(entries: PointsLedgerRecord[], year: number, month: string) {
  const filtered = entries.filter((entry) => {
    const date = getLedgerDate(entry)
    if (!date || date.getFullYear() !== year) return false
    if (month === 'all') return true
    return date.getMonth() === Number(month)
  })

  const available = filtered.reduce((sum, entry) => {
    if (entry.entry_status !== 'available' || entry.points_delta <= 0) return sum
    return sum + entry.points_delta
  }, 0)

  const used = filtered.reduce((sum, entry) => {
    const isConsumed = entry.entry_type === 'spend' || entry.entry_status === 'consumed'
    if (!isConsumed || entry.points_delta >= 0) return sum
    return sum + Math.abs(entry.points_delta)
  }, 0)

  return [
    {
      segment: 'available',
      label: chartConfig.available.label,
      value: available,
      fill: 'var(--color-available)',
    },
    {
      segment: 'used',
      label: chartConfig.used.label,
      value: used,
      fill: 'var(--color-used)',
    },
  ]
}

export interface PointsBalancePieChartProps {
  ledgerEntries: PointsLedgerRecord[]
}

export function PointsBalancePieChart({ ledgerEntries }: PointsBalancePieChartProps) {
  const years = React.useMemo(() => collectYears(ledgerEntries), [ledgerEntries])

  const defaultYear = String(new Date().getFullYear())
  const [year, setYear] = React.useState(defaultYear)
  const [month, setMonth] = React.useState<string>('all')

  React.useEffect(() => {
    if (years.includes(Number(year))) return
    setYear(String(years[0] ?? Number(defaultYear)))
  }, [years, year, defaultYear])

  const yearNumber = Number(year)
  const chartData = React.useMemo(
    () => buildPointsBreakdown(ledgerEntries, yearNumber, month),
    [ledgerEntries, yearNumber, month],
  )

  const totalPoints = chartData.reduce((sum, item) => sum + item.value, 0)

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={month} onValueChange={setMonth}>
        <SelectTrigger size="sm" className="w-[9.5rem]">
          <SelectValue placeholder="Mois" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            <SelectLabel>Mois</SelectLabel>
            {MONTH_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select value={year} onValueChange={setYear}>
        <SelectTrigger size="sm" className="w-[7.5rem]">
          <SelectValue placeholder="Annee" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            <SelectLabel>Annee</SelectLabel>
            {years.map((value) => (
              <SelectItem key={value} value={String(value)}>
                {value}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <>
      <DashboardSectionHeader
        title="Repartition des points"
        description="Points encore disponibles vs points deja utilises par les affilies sur la periode choisie."
        actions={actions}
      />

      {totalPoints === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/10 text-sm text-muted-foreground">
          Aucune activite points pour cette periode.
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[280px]">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  nameKey="segment"
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="text-muted-foreground">
                        {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                      </span>
                      <span className="font-medium text-foreground">
                        {Number(value).toLocaleString('en-GB')} pts
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent nameKey="segment" />} />
            <Pie data={chartData} dataKey="value" nameKey="segment" strokeWidth={0} />
          </PieChart>
        </ChartContainer>
      )}
    </>
  )
}
