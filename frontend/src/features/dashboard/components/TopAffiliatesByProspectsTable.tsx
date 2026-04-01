import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { DashboardSectionHeader } from './DashboardSectionHeader'

export interface TopAffiliateTableRow {
  rank: number
  agentId: string
  displayName: string
  email: string | null
  status: string | null
  joinedAt: string | null
  prospectCount: number
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

function formatShortId(id: string) {
  if (id.length <= 12) return id
  return `${id.slice(0, 8)}…`
}

function formatJoined(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

interface TopAffiliatesByProspectsTableProps {
  rows: TopAffiliateTableRow[]
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active: { bg: '#008000', color: '#FFFFFF' },
  inactive: { bg: '#808080', color: '#FFFFFF' },
  pending: { bg: '#808000', color: '#FFFFFF' },
  suspended: { bg: '#800000', color: '#FFFFFF' },
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

export function TopAffiliatesByProspectsTable({ rows }: TopAffiliatesByProspectsTableProps) {
  const headerActions = (
    <Link
      to="/agents"
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
      <DashboardSectionHeader title="Top affiliés par prospects" actions={headerActions} />

      <div style={{ padding: '6px' }}>
        {rows.length === 0 ? (
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
            Aucune activité affilié pour le moment.
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
                  <th style={{ ...thStyle, width: '32px', textAlign: 'center' }}>#</th>
                  <th style={thStyle}>Affilié</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Statut</th>
                  <th style={thStyle}>Adhésion</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Prospects</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const statusStyle = STATUS_COLORS[row.status?.toLowerCase() ?? ''] ?? { bg: '#808080', color: '#FFFFFF' }
                  return (
                    <tr
                      key={row.agentId}
                      style={{ background: i % 2 === 0 ? '#FFFFFF' : '#F0F0F0' }}
                    >
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#808080', fontWeight: 'bold' }}>
                        {row.rank}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {/* Win2000-style avatar - colored square with initials */}
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              background: '#000080',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '9px',
                              fontWeight: 'bold',
                              flexShrink: 0,
                              border: '1px solid #808080',
                            }}
                          >
                            {initials(row.displayName)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <Link
                              to={`/agents/${row.agentId}`}
                              style={{ color: '#000080', textDecoration: 'underline', fontSize: '11px', fontWeight: 'bold', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}
                            >
                              {row.displayName}
                            </Link>
                            <div style={{ fontSize: '10px', color: '#808080', fontFamily: 'Courier New, monospace' }}>
                              {formatShortId(row.agentId)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: '#444444', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.email ?? '—'}
                      </td>
                      <td style={tdStyle}>
                        {row.status ? (
                          <span
                            style={{
                              background: statusStyle.bg,
                              color: statusStyle.color,
                              padding: '1px 5px',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              textTransform: 'capitalize',
                            }}
                          >
                            {row.status.replace(/_/g, ' ')}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ ...tdStyle, color: '#444444', whiteSpace: 'nowrap' }}>
                        {formatJoined(row.joinedAt)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: '#000080' }}>
                        {row.prospectCount.toLocaleString('fr-FR')}
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
