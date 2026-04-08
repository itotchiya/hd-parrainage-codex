import { apiRequest } from '../../lib/api'
import type {
  TransactionDetailEnvelope,
  TransactionListEnvelope,
  TransactionQueryParams,
  TransactionSummaryEnvelope,
} from '../../types/transactions'

function buildTransactionQuery(params?: TransactionQueryParams) {
  const search = new URLSearchParams()

  if (params?.search?.trim()) {
    search.set('search', params.search.trim())
  }

  if (params?.status && params.status !== 'all') {
    search.set('status', params.status)
  }

  if (params?.programId && params.programId !== 'all') {
    search.set('program_id', params.programId)
  }

  if (params?.agentId && params.agentId !== 'all') {
    search.set('agent_id', params.agentId)
  }

  if (params?.dateFrom) {
    search.set('date_from', params.dateFrom)
  }

  if (params?.dateTo) {
    search.set('date_to', params.dateTo)
  }

  const query = search.toString()
  return query ? `?${query}` : ''
}

export async function fetchTransactions(params?: TransactionQueryParams) {
  return apiRequest<TransactionListEnvelope>(`/v1/transactions${buildTransactionQuery(params)}`)
}

export async function fetchTransactionSummary(params?: TransactionQueryParams) {
  return apiRequest<TransactionSummaryEnvelope>(`/v1/transactions/summary${buildTransactionQuery(params)}`)
}

export async function fetchTransaction(transactionId: string) {
  return apiRequest<TransactionDetailEnvelope>(`/v1/transactions/${transactionId}`)
}
