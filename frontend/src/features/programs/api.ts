import { apiRequest } from '../../lib/api'
import type {
  AssignedAgent,
  ExchangePackDetailEnvelope,
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

export async function fetchExchangePacks(params?: {
  status?: 'all' | 'active' | 'inactive'
  sort?: 'updated-desc' | 'updated-asc' | 'name-asc' | 'name-desc' | 'items-desc' | 'programs-desc'
}) {
  const search = new URLSearchParams()

  if (params?.status && params.status !== 'all') {
    search.set('status', params.status)
  }

  if (params?.sort && params.sort !== 'updated-desc') {
    search.set('sort', params.sort)
  }

  const query = search.toString()

  return apiRequest<ExchangePackListEnvelope>(`/v1/exchange-packs${query ? `?${query}` : ''}`)
}

export async function fetchExchangePack(exchangePackId: string) {
  return apiRequest<ExchangePackDetailEnvelope>(`/v1/exchange-packs/${exchangePackId}`)
}

export async function createExchangePack(payload: { name: string; description: string | null }) {
  return apiRequest<ExchangePackDetailEnvelope>('/v1/exchange-packs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function updateExchangePack(
  exchangePackId: string,
  payload: { name: string; description: string | null },
) {
  return apiRequest<ExchangePackDetailEnvelope>(`/v1/exchange-packs/${exchangePackId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function updateExchangePackStatus(
  exchangePackId: string,
  status: 'active' | 'inactive',
) {
  return apiRequest<ExchangePackDetailEnvelope>(`/v1/exchange-packs/${exchangePackId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  })
}

export async function deleteExchangePack(exchangePackId: string) {
  return apiRequest<{ data: { id: string; deleted: boolean } }>(`/v1/exchange-packs/${exchangePackId}`, {
    method: 'DELETE',
  })
}

export async function createExchangePackItem(
  exchangePackId: string,
  payload: { title: string; points_cost: number },
) {
  return apiRequest<ExchangePackDetailEnvelope>(`/v1/exchange-packs/${exchangePackId}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function updateExchangePackItem(
  exchangePackId: string,
  itemId: string,
  payload: { title: string; points_cost: number },
) {
  return apiRequest<ExchangePackDetailEnvelope>(`/v1/exchange-packs/${exchangePackId}/items/${itemId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function deleteExchangePackItem(exchangePackId: string, itemId: string) {
  return apiRequest<ExchangePackDetailEnvelope>(`/v1/exchange-packs/${exchangePackId}/items/${itemId}`, {
    method: 'DELETE',
  })
}

export async function reorderExchangePackItems(exchangePackId: string, itemIds: string[]) {
  return apiRequest<ExchangePackDetailEnvelope>(`/v1/exchange-packs/${exchangePackId}/items/order`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      item_ids: itemIds,
    }),
  })
}

export async function notifyExchangePackAgents(exchangePackId: string) {
  return apiRequest<ExchangePackDetailEnvelope & { meta?: { notified_programs_count: number } }>(
    `/v1/exchange-packs/${exchangePackId}/notify-agents`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    },
  )
}

export async function saveExchangePackAndNotifyAgents(
  exchangePackId: string,
  payload: {
    name: string
    description: string | null
    items: Array<{ id: string | null; title: string; points_cost: number }>
  },
) {
  return apiRequest<ExchangePackDetailEnvelope & { meta?: { notified_programs_count: number } }>(
    `/v1/exchange-packs/${exchangePackId}/notify-agents`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pack: payload,
      }),
    },
  )
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
