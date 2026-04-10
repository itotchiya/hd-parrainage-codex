import type {
  IacrmApiConfig,
  IacrmListEnvelope,
  IacrmDetailEnvelope,
  IacrmService,
  IacrmClient,
  IacrmPipelineProspect,
  IacrmPipelineStage,
  IacrmPipelineStageSummary,
  IacrmInvoice,
  IacrmInvoiceSummary,
  IacrmPlatformBusiness,
} from '../../types/iacrm'
import { logIacrmActivity } from './activityLog'

// ---------------------------------------------------------------------------
// Config persistence (localStorage — scoped per business / platform)
// ---------------------------------------------------------------------------

const SCOPE_KEY = 'iacrm_scope'
export const IACRM_CONFIG_EVENT = 'iacrm-config-updated'

/** The hosted IACRM simulator — always used as the base URL. */
export const IACRM_DEFAULT_BASE_URL = 'https://iacrm-api-simulator-production.up.railway.app'

/**
 * Returns the active IACRM scope: a business UUID or 'platform' for superadmin.
 * Defaults to 'platform' if not set.
 */
function getActiveScope(): string {
  return localStorage.getItem(SCOPE_KEY) ?? 'platform'
}

/** Call this after a successful login with the user's primary business ID (or null for platform). */
export function setIacrmScope(businessId: string | null) {
  const scope = businessId ?? 'platform'
  localStorage.setItem(SCOPE_KEY, scope)
  window.dispatchEvent(new CustomEvent(IACRM_CONFIG_EVENT))
}

function getStorageKey(): string {
  return `iacrm_api_config_${getActiveScope()}`
}

export function getIacrmConfig(): IacrmApiConfig | null {
  try {
    const raw = localStorage.getItem(getStorageKey())
    if (!raw) return null
    const parsed = JSON.parse(raw) as IacrmApiConfig
    // Always ensure base_url points to the hosted simulator
    if (!parsed.base_url || !parsed.base_url.startsWith('https://')) {
      parsed.base_url = IACRM_DEFAULT_BASE_URL
    }
    return parsed
  } catch {
    return null
  }
}

export function saveIacrmConfig(config: IacrmApiConfig) {
  localStorage.setItem(getStorageKey(), JSON.stringify(config))
  window.dispatchEvent(new CustomEvent(IACRM_CONFIG_EVENT))
}

export function clearIacrmConfig() {
  localStorage.removeItem(getStorageKey())
  window.dispatchEvent(new CustomEvent(IACRM_CONFIG_EVENT))
}

// ---------------------------------------------------------------------------
// IACRM HTTP client (separate from the Laravel apiRequest)
// ---------------------------------------------------------------------------

class IacrmApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'IacrmApiError'
    this.status = status
  }
}

async function iacrmRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = getIacrmConfig()
  if (!config?.base_url) throw new IacrmApiError(0, 'IACRM API not configured')

  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (config.api_key) headers.set('X-IACRM-API-Key', config.api_key)

  const url = `${config.base_url.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`
  const method = (init.method ?? 'GET').toUpperCase() as 'GET' | 'POST' | 'PATCH' | 'DELETE'
  const type = path.includes('/auth/') ? 'test' : method === 'GET' ? 'pull' : 'push'
  const t0 = Date.now()

  try {
    const response = await fetch(url, { ...init, headers })
    const duration_ms = Date.now() - t0

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      logIacrmActivity({ type: 'error', method, endpoint: path, status: 'failed', status_code: response.status, duration_ms })
      throw new IacrmApiError(response.status, text)
    }

    logIacrmActivity({ type, method, endpoint: path, status: 'success', status_code: response.status, duration_ms })
    return (await response.json()) as T
  } catch (err) {
    if (err instanceof IacrmApiError) throw err
    logIacrmActivity({ type: 'error', method, endpoint: path, status: 'failed', duration_ms: Date.now() - t0 })
    throw err
  }
}

// ---------------------------------------------------------------------------
// Connection test
// ---------------------------------------------------------------------------

export async function testIacrmConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    await iacrmRequest<unknown>('/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: getIacrmConfig()?.api_key, grant_type: 'api_key' }),
    })
    return { ok: true, message: 'Connection successful' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection failed'
    return { ok: false, message: msg }
  }
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export async function fetchIacrmServices() {
  return iacrmRequest<IacrmListEnvelope<IacrmService>>('/services')
}

export async function fetchIacrmService(serviceId: string) {
  return iacrmRequest<IacrmDetailEnvelope<IacrmService>>(`/services/${serviceId}`)
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export async function fetchIacrmClients() {
  return iacrmRequest<IacrmListEnvelope<IacrmClient>>('/clients')
}

export async function fetchIacrmClient(clientId: string) {
  return iacrmRequest<IacrmDetailEnvelope<IacrmClient>>(`/clients/${clientId}`)
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export async function fetchIacrmPipelineProspects(stage?: string) {
  const query = stage ? `?stage=${encodeURIComponent(stage)}` : ''
  return iacrmRequest<IacrmListEnvelope<IacrmPipelineProspect>>(`/pipeline/prospects${query}`)
}

export async function fetchIacrmPipelineStages() {
  return iacrmRequest<{ data: IacrmPipelineStageSummary[] }>('/pipeline/stages')
}

// ---------------------------------------------------------------------------
// Facturation / Invoices
// ---------------------------------------------------------------------------

export async function fetchIacrmInvoices(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return iacrmRequest<IacrmListEnvelope<IacrmInvoice>>(`/invoices${query}`)
}

export async function fetchIacrmInvoiceSummary() {
  return iacrmRequest<IacrmDetailEnvelope<IacrmInvoiceSummary>>('/invoices/summary')
}

// ---------------------------------------------------------------------------
// Pipeline — write operations
// ---------------------------------------------------------------------------

export interface IacrmCreateProspectPayload {
  contact_name: string
  company_name?: string | null
  stage?: IacrmPipelineStage
  assigned_agent?: string | null
}

export async function createIacrmProspect(payload: IacrmCreateProspectPayload) {
  return iacrmRequest<IacrmDetailEnvelope<IacrmPipelineProspect>>('/pipeline/prospects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, stage: payload.stage ?? 'suspect' }),
  })
}

export async function moveIacrmProspectStage(
  iacrm_id: string,
  stage: IacrmPipelineStage,
  reason?: string,
) {
  return iacrmRequest<IacrmDetailEnvelope<IacrmPipelineProspect>>(
    `/pipeline/prospects/${encodeURIComponent(iacrm_id)}/stage`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, reason: reason ?? null }),
    },
  )
}

// ---------------------------------------------------------------------------
// Platform (superadmin) — cross-business IACRM overview
// ---------------------------------------------------------------------------

export async function fetchIacrmPlatformBusinesses() {
  return iacrmRequest<IacrmListEnvelope<IacrmPlatformBusiness>>('/platform/businesses')
}

export async function fetchIacrmPlatformBusiness(businessId: string) {
  return iacrmRequest<{ data: IacrmPlatformBusiness }>(`/platform/businesses/${encodeURIComponent(businessId)}`)
}

export async function fetchIacrmPlatformBusinessServices(businessId: string) {
  return iacrmRequest<IacrmListEnvelope<IacrmService>>(`/platform/businesses/${encodeURIComponent(businessId)}/services`)
}

export async function fetchIacrmPlatformBusinessClients(businessId: string) {
  return iacrmRequest<IacrmListEnvelope<IacrmClient>>(`/platform/businesses/${encodeURIComponent(businessId)}/clients`)
}

export async function fetchIacrmPlatformBusinessPipelineProspects(businessId: string, stage?: string) {
  const query = stage ? `?stage=${encodeURIComponent(stage)}` : ''
  return iacrmRequest<IacrmListEnvelope<IacrmPipelineProspect>>(
    `/platform/businesses/${encodeURIComponent(businessId)}/pipeline/prospects${query}`,
  )
}

export async function fetchIacrmPlatformBusinessPipelineStages(businessId: string) {
  return iacrmRequest<{ data: IacrmPipelineStageSummary[] }>(
    `/platform/businesses/${encodeURIComponent(businessId)}/pipeline/stages`,
  )
}
