import { apiRequest } from '../../lib/api'
import type {
  PointsByProgramEnvelope,
  PointsLedgerEnvelope,
  PointsQueryParams,
  PointsSummaryEnvelope,
} from '../../types/points'

function buildPointsQuery(params?: PointsQueryParams) {
  const search = new URLSearchParams()

  if (params?.search?.trim()) {
    search.set('search', params.search.trim())
  }

  if (params?.entryStatus && params.entryStatus !== 'all') {
    search.set('entry_status', params.entryStatus)
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

export async function fetchPointsSummary(params?: PointsQueryParams) {
  return apiRequest<PointsSummaryEnvelope>(`/v1/points/summary${buildPointsQuery(params)}`)
}

export async function fetchPointsByProgram(params?: PointsQueryParams) {
  return apiRequest<PointsByProgramEnvelope>(`/v1/points/by-program${buildPointsQuery(params)}`)
}

export async function fetchPointsLedger(params?: PointsQueryParams) {
  return apiRequest<PointsLedgerEnvelope>(`/v1/points/ledger${buildPointsQuery(params)}`)
}
