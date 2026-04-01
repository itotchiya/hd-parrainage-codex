export type DashboardMetricKey =
  | 'prospects_synced'
  | 'clients_converted'
  | 'prospect_to_client_rate'
  | 'affiliates_contributors'
  | 'points_auto_awarded'

export type DashboardMetricTone = 'primary' | 'success' | 'warning' | 'info'

export type DashboardMetricTrendDirection = 'up' | 'down' | 'neutral'

export type DashboardMetricBadgeTone =
  | 'success'
  | 'danger'
  | 'neutral'
  | 'primary'
  | 'warning'
  | 'info'

export interface DashboardMetricBadge {
  tone: DashboardMetricBadgeTone
  label: string
  helper_text?: string | null
  icon?: DashboardMetricTrendDirection | null
}

export interface DashboardMetricCardRecord {
  key: DashboardMetricKey
  title: string
  value: string
  description: string
  tone: DashboardMetricTone
  badge: DashboardMetricBadge
}

export interface BusinessDashboardSummaryRecord {
  cards: DashboardMetricCardRecord[]
}

export interface BusinessDashboardSummaryEnvelope {
  data: BusinessDashboardSummaryRecord
}
