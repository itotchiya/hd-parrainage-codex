import * as React from 'react'
import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
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

const PIE_COLORS = ['#1084D0', '#808080']

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
    { name: 'Points disponibles', value: available },
    { name: 'Points utilises', value: used },
  ]
}

export interface PointsBalancePieChartProps {
  ledgerEntries: PointsLedgerRecord[]
}

const selectStyle: React.CSSProperties = {
  height: '18px',
  padding: '0 2px',
  fontSize: '11px',
  background: '#FFFFFF',
  border: '2px solid',
  borderColor: '#808080 #FFFFFF #FFFFFF #808080',
  color: '#000000',
  cursor: 'pointer',
  fontFamily: 'Tahoma, sans-serif',
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
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
      <select value={month} onChange={(e) => setMonth(e.target.value)} style={selectStyle}>
        {MONTH_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <select value={year} onChange={(e) => setYear(e.target.value)} style={selectStyle}>
        {years.map((value) => (
          <option key={value} value={String(value)}>{value}</option>
        ))}
      </select>
    </div>
  )

  return (
    <div
      style={{
        border: '2px solid',
        borderColor: '#FFFFFF #808080 #808080 #FFFFFF',
        background: '#D4D0C8',
        fontFamily: 'Tahoma, sans-serif',
        fontSize: '11px',
        height: '100%',
      }}
    >
      <DashboardSectionHeader
        title="Repartition des points"
        description="Points disponibles vs points utilises."
        actions={actions}
      />
      <div style={{ padding: '6px', background: '#D4D0C8' }}>
        {totalPoints === 0 ? (
          <div
            style={{
              minHeight: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#FFFFFF',
              border: '2px solid',
              borderColor: '#808080 #FFFFFF #FFFFFF #808080',
              color: '#808080',
              fontSize: '11px',
            }}
          >
            Aucune activite points pour cette periode.
          </div>
        ) : (
          <div
            style={{
              background: '#FFFFFF',
              border: '2px solid',
              borderColor: '#808080 #FFFFFF #FFFFFF #808080',
              padding: '8px',
            }}
          >
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  strokeWidth={1}
                  stroke="#D4D0C8"
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
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
                  formatter={(value) => [`${Number(value).toLocaleString('en-GB')} pts`]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '10px', fontFamily: 'Tahoma' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
