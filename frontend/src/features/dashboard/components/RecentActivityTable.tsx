import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { DashboardSectionHeader } from './DashboardSectionHeader'
import { formatDashboardDateFr } from '../utils/semanticBadges'
import type { TransactionRecord } from '@/types/transactions'

interface RecentActivityTableProps {
  transactions: TransactionRecord[]
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  validated: { bg: '#008000', color: '#FFFFFF' },
  paid: { bg: '#008000', color: '#FFFFFF' },
  pending: { bg: '#808000', color: '#FFFFFF' },
  rejected: { bg: '#800000', color: '#FFFFFF' },
  cancelled: { bg: '#808080', color: '#FFFFFF' },
}

const thStyle: React.CSSProperties = {
  padding: '3px 6px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 'bold',
  background: '#D4D0C8',
  borderBottom: '2px solid #808080',
  color: '#000000',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '2px 6px',
  fontSize: '11px',
  color: '#000000',
  borderBottom: '1px solid #D4D0C8',
  verticalAlign: 'middle',
}

export function RecentActivityTable({ transactions }: RecentActivityTableProps) {
  const headerActions = (
    <Link
      to="/transactions"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: '1px 6px',
        background: '#D4D0C8',
        border: '2px solid',
        borderColor: '#FFFFFF #808080 #808080 #FFFFFF',
        fontSize: '11px',
        color: '#000000',
        textDecoration: 'none',
        fontFamily: 'Tahoma, sans-serif',
      }}
    >
      Voir tout
      <ArrowRight size={11} />
    </Link>
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
      <DashboardSectionHeader title="Activité récente" actions={headerActions} />

      <div style={{ padding: '6px' }}>
        {transactions.length === 0 ? (
          <div
            style={{
              background: '#FFFFFF',
              border: '2px solid',
              borderColor: '#808080 #FFFFFF #FFFFFF #808080',
              padding: '16px',
              textAlign: 'center',
              color: '#808080',
              fontSize: '11px',
            }}
          >
            Aucune transaction récente.
          </div>
        ) : (
          <div
            style={{
              border: '2px solid',
              borderColor: '#808080 #FFFFFF #FFFFFF #808080',
              background: '#FFFFFF',
              overflow: 'auto',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Référence</th>
                  <th style={thStyle}>Transaction</th>
                  <th style={thStyle}>Affilié</th>
                  <th style={thStyle}>Statut</th>
                  <th style={thStyle}>Date</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => {
                  const label = t.prospect_name ?? t.product_name ?? '—'
                  const when = t.occurred_at ?? t.created_at
                  const statusStyle = STATUS_COLORS[t.status] ?? { bg: '#808080', color: '#FFFFFF' }
                  return (
                    <tr
                      key={t.id}
                      style={{ background: i % 2 === 0 ? '#FFFFFF' : '#F0F0F0' }}
                    >
                      <td style={{ ...tdStyle, fontFamily: 'Courier New, monospace', fontSize: '10px', color: '#444444', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.transaction_reference}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>
                          {label}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: '#444444', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.agent_name ?? '—'}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            padding: '1px 5px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                          }}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: '#444444', whiteSpace: 'nowrap' }}>
                        {formatDashboardDateFr(when)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: '#000080' }}>
                        {t.points_awarded !== null ? (
                          <>+{t.points_awarded.toLocaleString('fr-FR')}</>
                        ) : (
                          <span style={{ color: '#808080' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
