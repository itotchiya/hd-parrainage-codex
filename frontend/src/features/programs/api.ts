import { apiRequest } from '../../lib/api'
import type {
  ExchangePackListEnvelope,
  ProgramDetailEnvelope,
  ProgramListEnvelope,
  ProgramMutationPayload,
} from '../../types/programs'

export async function fetchPrograms() {
  return apiRequest<ProgramListEnvelope>('/v1/programs')
}

export async function fetchProgram(programId: string) {
  return apiRequest<ProgramDetailEnvelope>(`/v1/programs/${programId}`)
}

export async function fetchExchangePacks() {
  return apiRequest<ExchangePackListEnvelope>('/v1/exchange-packs')
}

export async function createProgram(payload: ProgramMutationPayload) {
  return apiRequest<ProgramDetailEnvelope>('/v1/programs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function updateProgram(programId: string, payload: ProgramMutationPayload) {
  return apiRequest<ProgramDetailEnvelope>(`/v1/programs/${programId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function pauseProgram(programId: string) {
  return apiRequest<ProgramDetailEnvelope>(`/v1/programs/${programId}/pause`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
}

export async function reactivateProgram(programId: string) {
  return apiRequest<ProgramDetailEnvelope>(`/v1/programs/${programId}/reactivate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
}
