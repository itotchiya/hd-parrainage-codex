export interface BusinessSummary {
  id: string
  slug: string
  display_name: string
  status: string
}

export interface BusinessAssignment {
  business_id: string
  assignment_type: string
  is_primary: boolean
  status: string
  business: BusinessSummary | null
}

export interface AgentProfile {
  id: string
  business_id: string
  agent_code: string
  status: string
}

export interface RoleAssignment {
  slug: string | null
  name: string | null
  scope_type: string
  business_id: string | null
  assigned_at: string | null
}

export interface AuthenticatedUser {
  id: string
  display_name: string
  avatar_url: string | null
  email: string
  status: string
  email_verified_at: string | null
  last_login_at: string | null
  last_activity_at: string | null
  current_business_id: string | null
  primary_business: BusinessSummary | null
  business_assignments: BusinessAssignment[]
  agent_profile: AgentProfile | null
  roles: RoleAssignment[]
  permissions: string[]
}

export interface AuthEnvelope {
  data: AuthenticatedUser
}

export interface LoginPayload {
  email: string
  password: string
  remember: boolean
}
