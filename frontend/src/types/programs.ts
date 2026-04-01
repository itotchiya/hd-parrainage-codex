export type ProgramCommissionType = 'per-transaction' | 'revenue-tier'
export type ProgramExchangeMode = 'cash' | 'reward' | 'both'
export type ProgramStatus = 'draft' | 'active' | 'paused' | 'archived'

export interface ExchangePackItem {
  id: string
  title: string
  description: string | null
  item_type: string
  points_cost: number
  display_order: number
}

export interface ExchangePackRecord {
  id: string
  business_id: string
  name: string
  description: string | null
  status: string
  updated_at: string | null
  items: ExchangePackItem[]
}

export interface AssignedAgent {
  assignment_id: string
  status: string
  assigned_at: string | null
  agent: {
    id: string
    user_id: string
    agent_code: string | null
    status: string
    display_name: string | null
    email: string | null
  } | null
}

export interface ProgramActions {
  can_create: boolean
  can_update: boolean
  can_pause: boolean
  can_assign_agent: boolean
}

export interface ProgramRecord {
  id: string
  business_id: string
  business_name: string | null
  slug: string
  name: string
  description: string | null
  commission_type: ProgramCommissionType
  exchange_mode: ProgramExchangeMode
  points_per_transaction: number | null
  points_per_euro: number | null
  eligibility_criteria: string | null
  status: ProgramStatus
  rule_version: number
  starts_at: string | null
  ends_at: string | null
  activated_at: string | null
  paused_at: string | null
  created_at: string | null
  updated_at: string | null
  exchange_pack: ExchangePackRecord | null
  assigned_agents_count?: number
  assigned_agents?: AssignedAgent[]
  actions: ProgramActions
}

export interface ProgramListEnvelope {
  data: ProgramRecord[]
}

export interface ProgramDetailEnvelope {
  data: ProgramRecord
}

export interface ExchangePackListEnvelope {
  data: ExchangePackRecord[]
}

export interface ProgramMutationPayload {
  name: string
  description: string
  commission_type: ProgramCommissionType
  exchange_mode: ProgramExchangeMode
  points_per_transaction: number | null
  points_per_euro: number | null
  exchange_pack_id: string | null
  eligibility_criteria: string
  status?: ProgramStatus
}
