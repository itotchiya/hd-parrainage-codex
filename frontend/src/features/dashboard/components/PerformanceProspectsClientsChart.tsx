import * as React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DashboardSectionHeader } from './DashboardSectionHeader'
import type { ProspectRecord } from '@/types/prospects'
import type { TransactionRecord } from '@/types/transactions'

const MONTH_LABELS_FR = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc',
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
    return { month, monthIndex: index, prospects: prospectsOpen, clients, prospectsTotal }
  })
}

export interface PerformanceProspectsClientsChartProps {
  prospects: ProspectRecord[]
  transactions: TransactionRecord[]
}

export function PerformanceProspectsClientsChart({
  prospects,
  transactions,
}: PerformanceProspectsClientsChartProps) {
  const years = React.useMemo(() => collectYears(prospects, transactions), [prospects, transactions])
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
    <select
      value={year}
      onChange={(e) => setYear(e.target.value)}
      style={{
        height: '18px',
        padding: '0 2px',
        fontSize: '11px',
        background: '#FFFFFF',
        border: '2px solid',
        borderColor: '#808080 #FFFFFF #FFFFFF #808080',
        color: '#000000',
        cursor: 'pointer',
        fontFamily: 'Tahoma, sans-serif',
      }}
    >
      {years.map((y) => (
        <option key={y} value={String(y)}>{y}</option>
      ))}
    </select>
  )

  return (
    <div
      style={{
        border: '2px solid',
        borderColor: '#FFFFFF #808080 #808080 #FFFFFF',
        background: '#D4D0C8',
        fontFamily: 'Tahoma, sans-serif',
        fontSize: '11px',
      }}
    >
      <DashboardSectionHeader
        title="Prospects et conversions mensuelles"
        description="Volume de prospects soumis et de clients convertis, mois par mois."
        actions={yearSelect}
      />
      <div style={{ padding: '6px', background: '#D4D0C8' }}>
        {/* Legend */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '6px', fontSize: '10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '12px', height: '12px', background: '#000080', display: 'inline-block' }} />
            Clients convertis
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '12px', height: '12px', background: '#1084D0', display: 'inline-block' }} />
            Prospects
          </span>
        </div>
        {/* Chart area - sunken */}
        <div
          style={{
            background: '#FFFFFF',
            border: '2px solid',
            borderColor: '#808080 #FFFFFF #FFFFFF #808080',
            padding: '8px 4px 4px',
          }}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#D4D0C8" strokeDasharray="" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fontFamily: 'Tahoma', fill: '#000000' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fontFamily: 'Tahoma', fill: '#000000' }}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: '#FFFFE1',
                  border: '2px solid',
                  borderColor: '#808080 #FFFFFF #FFFFFF #808080',
                  fontSize: '11px',
                  fontFamily: 'Tahoma',
                  padding: '4px 8px',
                  boxShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                }}
                cursor={{ fill: 'rgba(0,0,128,0.08)' }}
              />
              <Bar dataKey="clients" stackId="a" fill="#000080" radius={0} />
              <Bar dataKey="prospects" stackId="a" fill="#1084D0" radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
