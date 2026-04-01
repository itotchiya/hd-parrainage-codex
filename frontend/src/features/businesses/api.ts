import { apiRequest } from '../../lib/api'
import type { BusinessEnvelope, BusinessListEnvelope } from '../../types/businesses'

export async function fetchBusinesses() {
  return apiRequest<BusinessListEnvelope>('/v1/businesses')
}

export async function fetchBusiness(businessId: string) {
  return apiRequest<BusinessEnvelope>(`/v1/businesses/${businessId}`)
}

export async function approveBusiness(businessId: string) {
  return apiRequest<BusinessEnvelope>(`/v1/businesses/${businessId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
}

export async function rejectBusiness(businessId: string) {
  return apiRequest<BusinessEnvelope>(`/v1/businesses/${businessId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
}
