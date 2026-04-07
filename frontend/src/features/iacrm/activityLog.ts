// ---------------------------------------------------------------------------
// IACRM Activity Log — lightweight localStorage event store
// ---------------------------------------------------------------------------

export interface IacrmActivityEntry {
  id: string
  timestamp: string
  /** pull = GET from IACRM · push = POST/PATCH to IACRM · test = auth test */
  type: 'pull' | 'push' | 'test' | 'error'
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  endpoint: string
  status: 'success' | 'failed'
  status_code?: number
  duration_ms?: number
}

const LOG_KEY = 'iacrm_activity_log'
const MAX_ENTRIES = 100
export const IACRM_LOG_EVENT = 'iacrm-log-updated'

function emit() {
  window.dispatchEvent(new CustomEvent(IACRM_LOG_EVENT))
}

export function getIacrmActivityLog(): IacrmActivityEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY)
    return raw ? (JSON.parse(raw) as IacrmActivityEntry[]) : []
  } catch {
    return []
  }
}

export function logIacrmActivity(
  entry: Omit<IacrmActivityEntry, 'id' | 'timestamp'>,
): void {
  try {
    const log = getIacrmActivityLog()
    log.unshift({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...entry })
    if (log.length > MAX_ENTRIES) log.splice(MAX_ENTRIES)
    localStorage.setItem(LOG_KEY, JSON.stringify(log))
    emit()
  } catch {
    // never crash the app for logging
  }
}

export function clearIacrmActivityLog(): void {
  localStorage.removeItem(LOG_KEY)
  emit()
}
