import { apiRequest } from '../../lib/api'
import type {
  ProspectCreatePayload,
  ProspectDeletePayload,
  ProspectDetailEnvelope,
  ProspectHistoryEnvelope,
  ProspectListEnvelope,
} from '../../types/prospects'

export async function fetchProspects() {
  return apiRequest<ProspectListEnvelope>('/v1/prospects')
}

export async function fetchDeletedProspects() {
  return apiRequest<ProspectListEnvelope>('/v1/prospects/deleted')
}

export async function fetchProspect(prospectId: string) {
  return apiRequest<ProspectDetailEnvelope>(`/v1/prospects/${prospectId}`)
}

export async function fetchProspectHistory(prospectId: string) {
  return apiRequest<ProspectHistoryEnvelope>(`/v1/prospects/${prospectId}/history`)
}

export async function createProspect(payload: ProspectCreatePayload) {
  return apiRequest<ProspectDetailEnvelope>('/v1/prospects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function deleteProspect(prospectId: string, payload: ProspectDeletePayload) {
  return apiRequest<ProspectDetailEnvelope>(`/v1/prospects/${prospectId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}
