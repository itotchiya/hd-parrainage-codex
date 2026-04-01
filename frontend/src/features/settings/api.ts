import { apiRequest } from '../../lib/api'
import type { SettingsEnvelope } from '../../types/settings'
import type { SyncOverviewEnvelope } from '../../types/sync'

export async function fetchSettings() {
  return apiRequest<SettingsEnvelope>('/v1/settings')
}

export async function updateOwnSettings(payload: {
  display_name: string
  avatar_url?: string | null
}) {
  return apiRequest<SettingsEnvelope>('/v1/settings/own', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function updateBusinessSettings(payload: {
  display_name: string
  contact_email?: string | null
  contact_phone?: string | null
  website_url?: string | null
  timezone?: string | null
}) {
  return apiRequest<SettingsEnvelope>('/v1/settings/business', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function fetchSyncOverview() {
  return apiRequest<SyncOverviewEnvelope>('/v1/sync/overview')
}
