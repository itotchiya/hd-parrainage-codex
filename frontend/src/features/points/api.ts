import { apiRequest } from '../../lib/api'
import type {
  PointsByProgramEnvelope,
  PointsLedgerEnvelope,
  PointsSummaryEnvelope,
} from '../../types/points'

export async function fetchPointsSummary() {
  return apiRequest<PointsSummaryEnvelope>('/v1/points/summary')
}

export async function fetchPointsByProgram() {
  return apiRequest<PointsByProgramEnvelope>('/v1/points/by-program')
}

export async function fetchPointsLedger() {
  return apiRequest<PointsLedgerEnvelope>('/v1/points/ledger')
}
