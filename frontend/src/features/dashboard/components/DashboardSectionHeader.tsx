import type { ReactNode } from 'react'

interface DashboardSectionHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function DashboardSectionHeader({
  title,
  description,
  actions,
}: DashboardSectionHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(to right, #000080, #1084D0)',
        color: '#FFFFFF',
        padding: '3px 6px',
        marginBottom: '6px',
        userSelect: 'none',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h2
          style={{
            margin: 0,
            fontSize: '11px',
            fontWeight: 'bold',
            color: '#FFFFFF',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </h2>
        {description ? (
          <p
            style={{
              margin: 0,
              fontSize: '10px',
              color: 'rgba(255,255,255,0.8)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {actions}
        </div>
      ) : null}
    </div>
  )
}
