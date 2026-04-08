export type PointsLedgerEntryStatus =
  | 'pending'
  | 'available'
  | 'locked'
  | 'consumed'
  | 'reversed'

export type PointsLedgerEntryType =
  | 'accrual'
  | 'hold'
  | 'release'
  | 'spend'
  | 'refund'
  | 'adjustment'
  | 'reversal'

export interface PointsSummaryRecord {
  forecast_points: number
  projected_points?: number
  pending_points: number
  available_points: number
  locked_points: number
  consumed_points: number
  reversed_points: number
  open_prospect_count: number
  ledger_entry_count: number
  active_exchange_request_count: number
}

export interface PointsProgramBalanceRecord {
  program_id: string
  program_name: string | null
  program_slug: string | null
  exchange_mode: string | null
  exchange_pack_name: string | null
  exchange_pack_items: Array<{
    id: string
    title: string
    points_cost: number
    status: string
  }>
  forecast_points: number
  projected_points?: number
  pending_points: number
  available_points: number
  locked_points: number
  consumed_points: number
  reversed_points: number
  open_prospect_count: number
  ledger_entry_count: number
}

export interface PointsLedgerRecord {
  id: string
  business_id: string
  business_name: string | null
  program_id: string | null
  program_name: string | null
  program_slug: string | null
  agent_id: string
  agent_name: string | null
  prospect_id: string | null
  prospect_name: string | null
  transaction_id: string | null
  transaction_reference: string | null
  exchange_request_id: string | null
  exchange_request_type: 'reward' | 'cash' | null
  exchange_request_status:
    | 'requested'
    | 'approved'
    | 'rejected'
    | 'processing'
    | 'completed'
    | 'cancelled'
    | null
  entry_type: PointsLedgerEntryType
  entry_status: PointsLedgerEntryStatus
  points_delta: number
  source: string
  description: string | null
  effective_at: string | null
  created_at: string | null
}

export interface PointsSummaryEnvelope {
  data: PointsSummaryRecord
}

export interface PointsByProgramEnvelope {
  data: PointsProgramBalanceRecord[]
}

export interface PointsLedgerEnvelope {
  data: PointsLedgerRecord[]
}

export interface PointsQueryParams {
  search?: string
  entryStatus?: PointsLedgerEntryStatus | 'all'
  programId?: string
  agentId?: string
  dateFrom?: string
  dateTo?: string
}
