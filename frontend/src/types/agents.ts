import type { ProgramStatus } from './programs'

export interface AgentRecord {
  id: string
  business_id: string
  user_id: string
  agent_code: string | null
  status: string
  invited_by_user_id: string | null
  invited_at: string | null
  activated_at: string | null
  suspended_at: string | null
  last_activity_at: string | null
  notes: string | null
  display_name: string | null
  avatar_url?: string | null
  email: string | null
  user_status: string | null
  created_at: string | null
  updated_at: string | null
  active_pipeline_prospects_count?: number
  assigned_programs?: AgentAssignedProgramSummary[]
  prospects?: AgentProspectSummary[]
  actions?: AgentActions
}

export interface AgentAssignedProgramSummary {
  assignment_id: string
  status: string
  assigned_at: string | null
  program: {
    id: string
    name: string
    status: ProgramStatus
    exchange_mode: string
    assigned_agents_count: number | null
  }
}

export interface AgentProspectSummary {
  id: string
  contact_name: string
  company_name: string | null
  program_id: string
  program_name: string | null
  pipeline_stage: string
  submission_status: string
  conversion_status: string
  submitted_at: string | null
  last_synced_at: string | null
}

export interface AgentActions {
  can_suspend: boolean
  can_reactivate: boolean
  requires_suspend_timer?: boolean
}

export interface AgentListEnvelope {
  data: AgentRecord[]
}

export interface AgentEnvelope {
  data: AgentRecord
  meta?: {
    created_user?: boolean
    invitation_token?: string
    activation_url?: string
  }
}
