import { apiRequest } from '../../lib/api'
import type { SettingsEnvelope } from '../../types/settings'
import type { SyncOverviewEnvelope } from '../../types/sync'

export async function fetchSettings() {
  return apiRequest<SettingsEnvelope>('/v1/settings')
}

export async function updateOwnSettings(payload: {
  display_name: string
  email: string
  phone_number?: string | null
  avatar_url?: string | null
}) {
  return apiRequest<SettingsEnvelope>('/v1/settings/own', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function uploadOwnAvatar(file: File) {
  const body = new FormData()
  body.append('avatar', file)

  return apiRequest<SettingsEnvelope>('/v1/settings/own/avatar', {
    method: 'POST',
    body,
  })
}

export async function requestOwnEmailChange(payload: { email: string }) {
  return apiRequest<SettingsEnvelope>('/v1/settings/own/email/request-change', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function resendOwnEmailVerification() {
  return apiRequest<{ data: { message: string } }>('/v1/settings/own/email/resend-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
}

export async function verifyOwnEmailCode(payload: { code: string }) {
  return apiRequest<SettingsEnvelope>('/v1/settings/own/email/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function updateOwnPassword(payload: {
  current_password: string
  password: string
  password_confirmation: string
}) {
  return apiRequest<{ data: { message: string } }>('/v1/settings/own/password', {
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
