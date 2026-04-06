export type ProgramCommissionType = 'per-transaction' | 'revenue-tier'
export type ProgramExchangeMode = 'cash' | 'reward' | 'both'
export type ProgramStatus = 'draft' | 'active' | 'paused' | 'suspended' | 'archived'

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
  has_prospects_in_program?: boolean
  can_unassign?: boolean
  agent: {
    id: string
    user_id: string
    agent_code: string | null
    status: string
    display_name: string | null
    email: string | null
    avatar_url?: string | null
  } | null
}

export interface ProgramActions {
  can_create: boolean
  can_update: boolean
  can_edit_general?: boolean
  can_edit_cash?: boolean
  can_edit_rewards?: boolean
  can_activate?: boolean
  can_pause: boolean
  can_reactivate?: boolean
  /** Resume from suspended (wind-down) — same API as reactivate. */
  can_lift_suspension?: boolean
  can_suspend?: boolean
  can_archive?: boolean
  /** Soft-delete allowed (archived, or no active assignments and no prospects). */
  can_soft_delete?: boolean
  /** @deprecated use can_soft_delete */
  can_delete_from_archive?: boolean
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
  suspended_at?: string | null
  suspension_deadline_at?: string | null
  suspension_days_left?: number | null
  /** Server snapshot; UI uses suspension_deadline_at for live countdown. */
  seconds_until_suspension_deadline?: number | null
  has_open_prospects?: boolean
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
