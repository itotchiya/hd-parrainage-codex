export type ExchangeRequestType = 'reward' | 'cash'

export type ExchangeRequestStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'completed'
  | 'cancelled'

export interface ExchangeRequestRecord {
  id: string
  business_id: string
  business_name: string | null
  program_id: string | null
  program_name: string | null
  program_slug: string | null
  agent_id: string
  agent_name: string | null
  requested_by_user_id: string
  requested_by_name: string | null
  approved_by_user_id: string | null
  approved_by_name: string | null
  exchange_pack_item_id: string | null
  exchange_pack_item_title: string | null
  exchange_pack_item_points_cost: number | null
  request_type: ExchangeRequestType
  status: ExchangeRequestStatus
  points_amount: number
  cash_amount: number | null
  currency_code: string
  requested_reward_title: string | null
  notes: string | null
  requested_at: string | null
  approved_at: string | null
  processed_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  rejected_at: string | null
  created_at: string | null
  updated_at: string | null
  program_exchange_pack: {
    id: string
    name: string
    items: Array<{
      id: string
      title: string
      description: string | null
      item_type: string
      points_cost: number
      display_order: number
    }>
  } | null
  ledger_entries: Array<{
    id: string
    entry_type: string
    entry_status: string
    points_delta: number
    source: string
    description: string | null
    effective_at: string | null
    created_at: string | null
    exchange_request_id: string | null
    exchange_request_status: ExchangeRequestStatus | null
    exchange_request_type: ExchangeRequestType | null
  }>
}

export interface ExchangeRequestsEnvelope {
  data: ExchangeRequestRecord[]
}

export interface ExchangeRequestEnvelope {
  data: ExchangeRequestRecord
}
