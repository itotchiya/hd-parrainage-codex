import { apiRequest } from '../../lib/api'
import type {
  AssignedAgent,
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

export async function activateProgram(programId: string) {
  return apiRequest<ProgramDetailEnvelope>(`/v1/programs/${programId}/activate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
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

export async function suspendProgram(programId: string) {
  return apiRequest<ProgramDetailEnvelope>(`/v1/programs/${programId}/suspend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
}

export async function archiveProgram(programId: string) {
  return apiRequest<ProgramDetailEnvelope>(`/v1/programs/${programId}/archive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
}

export async function deleteProgramFromArchive(programId: string) {
  return apiRequest<{ data: { id: string; deleted: boolean } }>(`/v1/programs/${programId}/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
}

export async function fetchProgramAssignments(programId: string) {
  return apiRequest<{ data: AssignedAgent[] }>(`/v1/programs/${programId}/agents`)
}

export async function syncProgramAssignments(programId: string, agentIds: string[]) {
  return apiRequest<{ data: AssignedAgent[] }>(`/v1/programs/${programId}/agents`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_ids: agentIds,
    }),
  })
}
