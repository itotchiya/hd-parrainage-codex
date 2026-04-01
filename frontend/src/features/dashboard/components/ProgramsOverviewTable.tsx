import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { DashboardSectionHeader } from './DashboardSectionHeader'
import type { ProgramRecord } from '@/types/programs'

function commissionLabel(type: ProgramRecord['commission_type']) {
  return type === 'per-transaction' ? 'Par transaction' : 'Par tranche de CA'
}

function exchangeModeLabel(mode: ProgramRecord['exchange_mode']) {
  if (mode === 'cash') return 'Espèces'
  if (mode === 'reward') return 'Récompenses'
  return 'Espèces + récompenses'
}

const STATUS_LABEL_FR: Record<ProgramRecord['status'], string> = {
  active: 'Actif',
  paused: 'En pause',
  draft: 'Brouillon',
  archived: 'Archivé',
}

const STATUS_COLORS: Record<ProgramRecord['status'], { bg: string; color: string }> = {
  active: { bg: '#008000', color: '#FFFFFF' },
  paused: { bg: '#808000', color: '#FFFFFF' },
  draft: { bg: '#808080', color: '#FFFFFF' },
  archived: { bg: '#404040', color: '#FFFFFF' },
}

interface ProgramsOverviewTableProps {
  programs: ProgramRecord[]
  defaultBusinessName?: string
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

export function ProgramsOverviewTable({ programs, defaultBusinessName }: ProgramsOverviewTableProps) {
  const headerActions = (
    <Link
      to="/programs"
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
      <DashboardSectionHeader title="Programmes" actions={headerActions} />

      <div style={{ padding: '6px' }}>
        {programs.length === 0 ? (
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
            Aucun programme pour ce compte.
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
                  <th style={thStyle}>Programme</th>
                  <th style={{ ...thStyle, display: 'none' }} className="md:table-cell">Entreprise</th>
                  <th style={thStyle}>Statut</th>
                  <th style={{ ...thStyle }}>Rémunération</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Affiliés</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p, i) => {
                  const business = p.business_name ?? defaultBusinessName ?? '—'
                  const statusColor = STATUS_COLORS[p.status]
                  return (
                    <tr
                      key={p.id}
                      style={{ background: i % 2 === 0 ? '#FFFFFF' : '#F0F0F0' }}
                    >
                      <td style={tdStyle}>
                        <Link
                          to={`/programs/${p.id}`}
                          style={{ color: '#000080', textDecoration: 'underline', fontSize: '11px' }}
                        >
                          {p.name}
                        </Link>
                        <div style={{ fontSize: '10px', color: '#808080', fontFamily: 'Courier New, monospace' }}>
                          {p.slug}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: '#444444', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {business}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            background: statusColor.bg,
                            color: statusColor.color,
                            padding: '1px 5px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                          }}
                        >
                          {STATUS_LABEL_FR[p.status]}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: '#444444' }}>
                        {commissionLabel(p.commission_type)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>
                        {typeof p.assigned_agents_count === 'number'
                          ? p.assigned_agents_count.toLocaleString('fr-FR')
                          : '—'}
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
