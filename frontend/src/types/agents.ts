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
  email: string | null
  user_status: string | null
  created_at: string | null
  updated_at: string | null
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
