export interface SyncJobSummary {
  id: string
  business_id: string | null
  initiated_by_user_id: string | null
  job_type: string
  entity_type: string
  entity_id: string | null
  queue_name: string
  status: string
  attempt_count: number
  max_attempts: number
  idempotency_key: string
  failure_code: string | null
  failure_message: string | null
  queued_at: string | null
  started_at: string | null
  finished_at: string | null
  failed_at: string | null
  dead_lettered_at: string | null
  next_retry_at: string | null
}

export interface SyncOverviewPayload {
  jobs_total: number
  status_counts: Record<string, number>
  failed_jobs_total: number
  queue_names: string[]
  oldest_queued_at: string | null
  latest_failure: SyncJobSummary | null
}

export interface SyncOverviewEnvelope {
  data: SyncOverviewPayload
}
