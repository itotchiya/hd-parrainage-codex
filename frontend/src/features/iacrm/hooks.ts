import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  fetchIacrmClients,
  fetchIacrmInvoices,
  fetchIacrmInvoiceSummary,
  fetchIacrmPipelineProspects,
  fetchIacrmPipelineStages,
  fetchIacrmRequestLogs,
  type IacrmRequestLogFilters,
  fetchIacrmPlatformBusinessClients,
  fetchIacrmPlatformBusinessPipelineProspects,
  fetchIacrmPlatformBusinessPipelineStages,
  fetchIacrmPlatformBusinesses,
  fetchIacrmPlatformBusinessServices,
  fetchIacrmServices,
  getIacrmConfig,
  hasIacrmConfig,
  saveIacrmConfig,
  testIacrmConnection,
} from './api'
import type {
  IacrmApiConfig,
  IacrmPipelineStage,
  IacrmPipelineStageSummary,
} from '../../types/iacrm'
import { IACRM_STORE_EVENT, getLocalIacrmProspects } from './prospectStore'

function isConfigured() {
  return hasIacrmConfig()
}

// ---------------------------------------------------------------------------
// Local store subscriber — re-renders when the prospect store changes
// ---------------------------------------------------------------------------

function useLocalIacrmProspects() {
  const [localProspects, setLocalProspects] = useState(() => getLocalIacrmProspects())
  useEffect(() => {
    const handler = () => setLocalProspects(getLocalIacrmProspects())
    window.addEventListener(IACRM_STORE_EVENT, handler)
    return () => window.removeEventListener(IACRM_STORE_EVENT, handler)
  }, [])
  return localProspects
}

// ---------------------------------------------------------------------------
// Connection test mutation
// ---------------------------------------------------------------------------

export function useTestIacrmConnection() {
  return useMutation({
    mutationFn: async () => {
      const result = await testIacrmConnection()
      const config = getIacrmConfig()
      if (config) {
        saveIacrmConfig({
          ...config,
          connection_status: result.ok ? 'connected' : 'failed',
          last_tested_at: new Date().toISOString(),
        } satisfies IacrmApiConfig)
      }
      return result
    },
  })
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export function useIacrmServices() {
  return useQuery({
    queryKey: ['iacrm', 'services'],
    queryFn: fetchIacrmServices,
    enabled: isConfigured(),
  })
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export function useIacrmClients() {
  return useQuery({
    queryKey: ['iacrm', 'clients'],
    queryFn: fetchIacrmClients,
    enabled: isConfigured(),
  })
}

// ---------------------------------------------------------------------------
// Pipeline — raw mock hooks
// ---------------------------------------------------------------------------

export function useIacrmPipeline(stage?: string) {
  return useQuery({
    queryKey: ['iacrm', 'pipeline', 'prospects', stage],
    queryFn: () => fetchIacrmPipelineProspects(stage),
    enabled: isConfigured(),
  })
}

export function useIacrmPipelineStages() {
  return useQuery({
    queryKey: ['iacrm', 'pipeline', 'stages'],
    queryFn: fetchIacrmPipelineStages,
    enabled: isConfigured(),
  })
}

// ---------------------------------------------------------------------------
// Pipeline — merged hooks (mock + local store)
// ---------------------------------------------------------------------------

/**
 * Returns mock prospects merged with locally stored (app-created) ones.
 * Local entries take priority over mock entries with the same iacrm_id.
 */
export function useIacrmPipelineMerged(stage?: string) {
  const mockQuery = useIacrmPipeline()
  const localProspects = useLocalIacrmProspects()

  const merged = useMemo(() => {
    const mockProspects = mockQuery.data?.data ?? []
    const localIds = new Set(localProspects.map((p) => p.iacrm_id))
    // Remove mock entries overridden by local (promoted or app-created)
    const mockFiltered = mockProspects.filter((p) => !localIds.has(p.iacrm_id))
    const all = [...localProspects, ...mockFiltered]
    return stage ? all.filter((p) => p.stage === stage) : all
  }, [mockQuery.data, localProspects, stage])

  return {
    ...mockQuery,
    data: { data: merged },
  }
}

/**
 * Returns pipeline stage counts with local prospect counts added on top
 * of the mock server's baseline counts.
 */
export function useIacrmStagesMerged() {
  const mockQuery = useIacrmPipelineStages()
  const localProspects = useLocalIacrmProspects()

  const merged = useMemo(() => {
    const mockStages = mockQuery.data?.data ?? []
    const localCounts: Partial<Record<IacrmPipelineStage, number>> = {}
    for (const p of localProspects) {
      localCounts[p.stage] = (localCounts[p.stage] ?? 0) + 1
    }
    return mockStages.map((s) => ({
      ...s,
      count: s.count + (localCounts[s.stage] ?? 0),
    })) as IacrmPipelineStageSummary[]
  }, [mockQuery.data, localProspects])

  return {
    ...mockQuery,
    data: mockQuery.data ? { data: merged } : undefined,
  }
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export function useIacrmInvoices(status?: string) {
  return useQuery({
    queryKey: ['iacrm', 'invoices', status],
    queryFn: () => fetchIacrmInvoices(status),
    enabled: isConfigured(),
  })
}

export function useIacrmInvoiceSummary() {
  return useQuery({
    queryKey: ['iacrm', 'invoices', 'summary'],
    queryFn: fetchIacrmInvoiceSummary,
    enabled: isConfigured(),
  })
}

// ---------------------------------------------------------------------------
// Operations logs
// ---------------------------------------------------------------------------

export function useIacrmRequestLogs(filters: IacrmRequestLogFilters) {
  return useQuery({
    queryKey: ['iacrm', 'request-logs', filters],
    queryFn: () => fetchIacrmRequestLogs(filters),
    enabled: isConfigured(),
    refetchInterval: 15000,
  })
}

// ---------------------------------------------------------------------------
// Platform (superadmin) — cross-business IACRM overview
// ---------------------------------------------------------------------------

export function useIacrmPlatformBusinesses() {
  return useQuery({
    queryKey: ['iacrm', 'platform', 'businesses'],
    queryFn: fetchIacrmPlatformBusinesses,
    enabled: isConfigured(),
  })
}

export function useIacrmPlatformBusinessServices(businessId: string | null) {
  return useQuery({
    queryKey: ['iacrm', 'platform', 'businesses', businessId, 'services'],
    queryFn: () => fetchIacrmPlatformBusinessServices(businessId!),
    enabled: isConfigured() && !!businessId,
  })
}

export function useIacrmPlatformBusinessClients(businessId: string | null) {
  return useQuery({
    queryKey: ['iacrm', 'platform', 'businesses', businessId, 'clients'],
    queryFn: () => fetchIacrmPlatformBusinessClients(businessId!),
    enabled: isConfigured() && !!businessId,
  })
}

export function useIacrmPlatformBusinessPipeline(businessId: string | null, stage?: string) {
  return useQuery({
    queryKey: ['iacrm', 'platform', 'businesses', businessId, 'pipeline', stage],
    queryFn: () => fetchIacrmPlatformBusinessPipelineProspects(businessId!, stage),
    enabled: isConfigured() && !!businessId,
  })
}

export function useIacrmPlatformBusinessPipelineStages(businessId: string | null) {
  return useQuery({
    queryKey: ['iacrm', 'platform', 'businesses', businessId, 'pipeline', 'stages'],
    queryFn: () => fetchIacrmPlatformBusinessPipelineStages(businessId!),
    enabled: isConfigured() && !!businessId,
  })
}
