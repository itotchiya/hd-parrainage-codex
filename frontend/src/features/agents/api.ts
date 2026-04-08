import { apiRequest } from '../../lib/api'
import type { AgentEnvelope, AgentListEnvelope } from '../../types/agents'

export async function fetchAgents() {
  return apiRequest<AgentListEnvelope>('/v1/agents')
}

export async function fetchAgent(agentId: string) {
  return apiRequest<AgentEnvelope>(`/v1/agents/${agentId}`)
}

export async function inviteAgent(payload: { display_name: string; email: string; notes?: string }) {
  return apiRequest<AgentEnvelope>('/v1/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function suspendAgent(agentId: string, payload: { reason: string }) {
  return apiRequest<AgentEnvelope>(`/v1/agents/${agentId}/suspend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function reactivateAgent(agentId: string) {
  return apiRequest<AgentEnvelope>(`/v1/agents/${agentId}/reactivate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
}
