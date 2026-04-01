import { apiRequest } from '../../lib/api'
import type {
  TransactionDetailEnvelope,
  TransactionListEnvelope,
  TransactionSummaryEnvelope,
} from '../../types/transactions'

export async function fetchTransactions() {
  return apiRequest<TransactionListEnvelope>('/v1/transactions')
}

export async function fetchTransactionSummary() {
  return apiRequest<TransactionSummaryEnvelope>('/v1/transactions/summary')
}

export async function fetchTransaction(transactionId: string) {
  return apiRequest<TransactionDetailEnvelope>(`/v1/transactions/${transactionId}`)
}
