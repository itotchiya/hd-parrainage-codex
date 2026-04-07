import type { IacrmPipelineProspect, IacrmPipelineStage } from '../../types/iacrm'

const STORE_KEY = 'iacrm_prospect_store'
export const IACRM_STORE_EVENT = 'iacrm-store-updated'

function emit() {
  window.dispatchEvent(new CustomEvent(IACRM_STORE_EVENT))
}

export function getLocalIacrmProspects(): IacrmPipelineProspect[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? (JSON.parse(raw) as IacrmPipelineProspect[]) : []
  } catch {
    return []
  }
}

export function addLocalIacrmProspect(prospect: IacrmPipelineProspect): void {
  const current = getLocalIacrmProspects()
  current.unshift(prospect)
  localStorage.setItem(STORE_KEY, JSON.stringify(current))
  emit()
}

/**
 * Promotes a mock (remote) prospect into the local store then sets the new stage.
 * If the prospect is already local (same iacrm_id), just updates its stage.
 */
export function promoteAndSetStage(
  prospect: IacrmPipelineProspect,
  stage: IacrmPipelineStage,
): void {
  const current = getLocalIacrmProspects()
  const idx = current.findIndex((p) => p.iacrm_id === prospect.iacrm_id)
  if (idx !== -1) {
    current[idx] = { ...current[idx], stage, updated_at: new Date().toISOString() }
  } else {
    current.unshift({ ...prospect, stage, updated_at: new Date().toISOString() })
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(current))
  emit()
}

export function clearLocalIacrmProspects(): void {
  localStorage.removeItem(STORE_KEY)
  emit()
}
