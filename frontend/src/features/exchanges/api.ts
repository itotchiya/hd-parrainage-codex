import { apiRequest } from '../../lib/api'
import type { ExchangeRequestEnvelope, ExchangeRequestsEnvelope } from '../../types/exchanges'

interface CreateRewardExchangeRequestPayload {
  program_id: string
  exchange_pack_item_id: string
  notes?: string
}

interface CreateCashExchangeRequestPayload {
  program_id: string
  points_amount: number
  notes?: string
}

export async function fetchExchangeRequests() {
  return apiRequest<ExchangeRequestsEnvelope>('/v1/exchange-requests')
}

export async function fetchExchangeRequest(exchangeRequestId: string) {
  return apiRequest<ExchangeRequestEnvelope>(`/v1/exchange-requests/${exchangeRequestId}`)
}

export async function createRewardExchangeRequest(payload: CreateRewardExchangeRequestPayload) {
  return apiRequest<ExchangeRequestEnvelope>('/v1/exchange-requests/reward', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function createCashExchangeRequest(payload: CreateCashExchangeRequestPayload) {
  return apiRequest<ExchangeRequestEnvelope>('/v1/exchange-requests/cash', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function approveExchangeRequest(exchangeRequestId: string) {
  return apiRequest<ExchangeRequestEnvelope>(`/v1/exchange-requests/${exchangeRequestId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
}

export async function markExchangeRequestProcessing(exchangeRequestId: string) {
  return apiRequest<ExchangeRequestEnvelope>(`/v1/exchange-requests/${exchangeRequestId}/processing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
}

export async function completeExchangeRequest(exchangeRequestId: string) {
  return apiRequest<ExchangeRequestEnvelope>(`/v1/exchange-requests/${exchangeRequestId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
}

export async function rejectExchangeRequest(exchangeRequestId: string) {
  return apiRequest<ExchangeRequestEnvelope>(`/v1/exchange-requests/${exchangeRequestId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
}

export async function cancelExchangeRequest(exchangeRequestId: string) {
  return apiRequest<ExchangeRequestEnvelope>(`/v1/exchange-requests/${exchangeRequestId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
}
