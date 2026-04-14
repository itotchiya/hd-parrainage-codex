// ---------------------------------------------------------------------------
// IACRM API – Type definitions for the external CRM simulation
// ---------------------------------------------------------------------------

/** Persisted IACRM connection configuration (localStorage) */
export interface IacrmApiConfig {
  base_url: string
  api_key: string
  auto_sync_enabled: boolean
  last_tested_at: string | null
  connection_status: 'untested' | 'connected' | 'failed'
}

// ---- Businesses -----------------------------------------------------------

export interface IacrmBusiness {
  iacrm_id: string
  legal_name: string
  display_name: string
  industry: string | null
  country_code: string
  status: string
  created_at: string
}

// ---- Services / Catalogue -------------------------------------------------

export interface IacrmService {
  iacrm_id: string
  name: string
  description: string | null
  category: string
  unit_price: number
  currency: string
  is_active: boolean
}

// ---- Clients --------------------------------------------------------------

export interface IacrmClient {
  iacrm_id: string
  company_name: string
  contact_name: string
  contact_email: string | null
  contact_phone: string | null
  status: string
  since: string
}

// ---- Pipeline / Prospection -----------------------------------------------

export type IacrmPipelineStage =
  | 'suspect'
  | 'prospect_froid'
  | 'prospect_tiede'
  | 'prospect_chaud'
  | 'converted'
  | 'lost'

export interface IacrmPipelineProspect {
  iacrm_id: string
  contact_name: string
  company_name: string | null
  stage: IacrmPipelineStage
  progression_status: string | null
  assigned_agent: string | null
  created_at: string
  updated_at: string
}

export interface IacrmPipelineStageSummary {
  stage: IacrmPipelineStage
  label: string
  count: number
}

export interface IacrmProspectHistoryEntry {
  from_stage: IacrmPipelineStage | null
  to_stage: IacrmPipelineStage
  changed_at: string
  changed_by: string | null
  reason: string | null
}

// ---- Facturation / Invoicing ----------------------------------------------

export type IacrmInvoiceStatus = 'pending' | 'paid' | 'unpaid' | 'overdue' | 'cancelled'

export interface IacrmInvoiceLineItem {
  service_id: string
  service_name: string
  quantity: number
  unit_price: number
  total: number
}

export interface IacrmInvoice {
  iacrm_id: string
  invoice_reference: string
  client_id: string
  client_name: string | null
  amount: number
  currency: string
  status: IacrmInvoiceStatus
  issued_at: string
  due_at: string
  paid_at: string | null
  line_items?: IacrmInvoiceLineItem[]
}

export interface IacrmInvoiceSummary {
  total_count: number
  total_amount: number
  paid_count: number
  paid_amount: number
  overdue_count: number
  overdue_amount: number
}

// ---- Platform (superadmin) — cross-business IACRM overview ---------------

export interface IacrmPlatformBusiness {
  iacrm_id: string
  legal_name: string
  display_name: string
  industry: string | null
  country_code: string
  status: string
  services_count: number
  clients_count: number
  pipeline_count: number
  created_at: string
}

// ---- Response envelopes ---------------------------------------------------

export interface IacrmListEnvelope<T> {
  data: T[]
  meta?: { total: number }
}

export interface IacrmDetailEnvelope<T> {
  data: T
}

// ---- IACRM operations log -------------------------------------------------

export interface IacrmRequestLogEntry {
  id: string
  business_id: string | null
  initiated_by_user_id: string | null
  sync_job_id: string | null
  actor_type: 'server' | 'webapp'
  source: string
  direction: 'pull' | 'push' | 'test'
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  endpoint: string
  status: 'success' | 'failed'
  status_code: number | null
  duration_ms: number | null
  error_message: string | null
  request_payload: Record<string, unknown> | unknown[]
  response_payload: Record<string, unknown> | unknown[]
  meta: Record<string, unknown>
  requested_at: string | null
  created_at: string | null
  updated_at: string | null
  initiated_by_user?: {
    id: string | null
    display_name: string | null
    email: string | null
  } | null
  business?: {
    id: string
    slug: string
    display_name: string
    status: string
  } | null
}
