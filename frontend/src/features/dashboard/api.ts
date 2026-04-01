import { apiRequest } from '../../lib/api'
import type { BusinessDashboardSummaryEnvelope } from '../../types/dashboard'

export async function fetchBusinessDashboardSummary() {
  return apiRequest<BusinessDashboardSummaryEnvelope>('/v1/dashboard/business-summary')
}
