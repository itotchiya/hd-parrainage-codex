import type { ComponentType } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type {
  DashboardMetricBadge,
  DashboardMetricBadgeTone,
  DashboardMetricTrendDirection,
} from '@/types/dashboard'

export type KpiTone = 'primary' | 'success' | 'warning' | 'info'

interface KpiCardProps {
  title: string
  value: string
  description: string
  badge: DashboardMetricBadge
  icon: ComponentType<{ size?: number; className?: string }>
  tone: KpiTone
}

const toneIconColors: Record<KpiTone, string> = {
  primary: '#000080',
  success: '#008000',
  warning: '#808000',
  info: '#008080',
}

const badgeBgColors: Record<DashboardMetricBadgeTone, { bg: string; color: string }> = {
  success: { bg: '#008000', color: '#FFFFFF' },
  danger: { bg: '#800000', color: '#FFFFFF' },
  neutral: { bg: '#808080', color: '#FFFFFF' },
  primary: { bg: '#000080', color: '#FFFFFF' },
  warning: { bg: '#808000', color: '#FFFFFF' },
  info: { bg: '#008080', color: '#FFFFFF' },
}

const trendIcons: Record<DashboardMetricTrendDirection, ComponentType<{ size?: number }>> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  neutral: Minus,
}

export function KpiCard({
  title,
  value,
  description,
  badge,
  icon: Icon,
  tone,
}: KpiCardProps) {
  const iconColor = toneIconColors[tone]
  const TrendIcon = badge.icon ? trendIcons[badge.icon] : null
  const badgeText = badge.helper_text ? `${badge.label} ${badge.helper_text}` : badge.label
  const badgeStyle = badgeBgColors[badge.tone]

  return (
    <div
      style={{
        background: '#D4D0C8',
        border: '2px solid',
        borderColor: '#FFFFFF #808080 #808080 #FFFFFF',
        fontFamily: 'Tahoma, "MS Sans Serif", sans-serif',
        fontSize: '11px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Group box title bar */}
      <div
        style={{
          background: 'linear-gradient(to right, #000080, #1084D0)',
          color: '#FFFFFF',
          padding: '2px 6px',
          fontSize: '11px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <Icon size={12} />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {title}
        </span>
      </div>

      {/* Content area - sunken inset */}
      <div
        style={{
          margin: '6px',
          background: '#FFFFFF',
          border: '2px solid',
          borderColor: '#808080 #FFFFFF #FFFFFF #808080',
          padding: '6px 8px',
          flex: 1,
        }}
      >
        {/* Big number */}
        <div
          style={{
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#000000',
            lineHeight: '1.2',
            letterSpacing: '-0.5px',
            marginBottom: '4px',
          }}
        >
          {value}
        </div>

        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            background: badgeStyle.bg,
            color: badgeStyle.color,
            padding: '1px 5px',
            fontSize: '10px',
            fontWeight: 'bold',
            marginBottom: '4px',
          }}
        >
          {TrendIcon && <TrendIcon size={10} />}
          {badgeText}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: '10px',
            color: '#444444',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {description}
        </div>
      </div>
    </div>
  )
}
