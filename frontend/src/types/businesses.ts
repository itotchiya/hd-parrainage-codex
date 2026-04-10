export interface BusinessRecord {
  id: string
  slug: string
  legal_name: string
  display_name: string
  logo_url?: string | null
  industry: string | null
  website_url: string | null
  contact_email: string | null
  contact_phone: string | null
  country_code: string | null
  currency_code: string
  timezone: string
  status: 'pending' | 'approved' | 'rejected' | string
  iacrm_business_id?: string | null
  approved_at: string | null
  rejected_at: string | null
  suspended_at?: string | null
  archived_at?: string | null
  last_synced_at: string | null
  owner?: BusinessOwnerSummary | null
  program_count?: number
  agent_count?: number
  prospect_count?: number
  transaction_count?: number
  pending_exchange_request_count?: number
  created_at: string | null
  updated_at: string | null
}

export interface BusinessOwnerSummary {
  user_id: string
  display_name: string
  email: string
  status: string
}

export interface BusinessAssignmentUser {
  id: string
  display_name: string
  email: string
  status: string
  last_activity_at: string | null
}

export interface BusinessOwnerAssignment {
  assignment_id: string
  assignment_type: string
  status: string
  is_primary: boolean
  invited_at: string | null
  activated_at: string | null
  user: BusinessAssignmentUser | null
}

export interface BusinessProgramSummary {
  id: string
  slug: string
  name: string
  status: string
  commission_type: string
  exchange_mode: string
  points_per_transaction: number | null
  points_per_euro: number | null
  starts_at: string | null
  ends_at: string | null
}

export interface BusinessLifecycleActor {
  user_id: string
  display_name: string
  email: string
}

export interface BusinessDetailSummary {
  program_count: number
  active_program_count: number
  agent_count: number
  active_agent_count: number
  prospect_count: number
  transaction_count: number
  pending_exchange_request_count: number
}

export interface BusinessDetailRecord extends BusinessRecord {
  approved_by: BusinessLifecycleActor | null
  rejected_by: BusinessLifecycleActor | null
  owners: BusinessOwnerAssignment[]
  linked_programs: BusinessProgramSummary[]
  summary: BusinessDetailSummary
}

export interface BusinessListEnvelope {
  data: BusinessRecord[]
}

export interface BusinessEnvelope {
  data: BusinessDetailRecord
}

export interface BusinessInvitePayload {
  iacrm_business_id: string
  business_name: string
  owner_email: string
  owner_name: string
  notes?: string
}
