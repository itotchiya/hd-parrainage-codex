export type ProspectSubmissionStatus =
  | 'pending_sync'
  | 'synced'
  | 'sync_failed'
  | 'deleted'

export type ProspectPipelineStage =
  | 'suspect'
  | 'prospect_froid'
  | 'prospect_tiede'
  | 'prospect_chaud'

export type ProspectConversionStatus = 'open' | 'converted' | 'lost' | 'locked'

export interface ProspectActions {
  can_delete: boolean
  can_retry_sync: boolean
  can_view_history: boolean
}

export interface ProspectRecord {
  id: string
  business_id: string
  business_name: string | null
  program_id: string
  program_name: string | null
  program_status: string | null
  agent_id: string
  agent_name: string | null
  agent_email: string | null
  contact_name: string
  contact_email: string | null
  contact_phone_raw: string | null
  contact_phone_e164: string | null
  company_name: string | null
  submission_status: ProspectSubmissionStatus
  pipeline_stage: ProspectPipelineStage
  progression_status: string | null
  conversion_status: ProspectConversionStatus
  iacrm_prospect_id: string | null
  iacrm_status_code: string | null
  iacrm_status_label: string | null
  sync_error_message: string | null
  source: string
  submitted_at: string | null
  first_synced_at: string | null
  last_synced_at: string | null
  pipeline_stage_changed_at: string | null
  conversion_locked_at: string | null
  converted_at: string | null
  lost_at: string | null
  deleted_at: string | null
  soft_delete_reason: string | null
  deleted_by_user: {
    id: string
    display_name: string
    email: string
  } | null
  history_count?: number
  actions: ProspectActions
}

export interface ProspectHistoryRecord {
  id: string
  source_system: string
  old_submission_status: string | null
  new_submission_status: string | null
  old_progression_status: string | null
  new_progression_status: string | null
  reason: string | null
  payload_snapshot: Record<string, unknown>
  changed_by_user: {
    id: string
    display_name: string
    email: string
  } | null
  created_at: string | null
  updated_at: string | null
}

export interface ProspectListEnvelope {
  data: ProspectRecord[]
}

export interface ProspectDetailEnvelope {
  data: ProspectRecord
}

export interface ProspectHistoryEnvelope {
  data: ProspectHistoryRecord[]
}

export interface ProspectCreatePayload {
  program_id: string
  contact_name: string
  contact_email: string | null
  contact_phone_raw: string | null
  company_name: string | null
}

export interface ProspectDeletePayload {
  reason: string
}
