import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getIacrmConfig } from '../api'
import { useAuthSession } from '../../auth/session'
import { IacrmServicesPanel } from '../components/IacrmServicesPanel'
import { IacrmClientsPanel } from '../components/IacrmClientsPanel'
import { IacrmPipelinePanel } from '../components/IacrmPipelinePanel'
import { IacrmInvoicesPanel } from '../components/IacrmInvoicesPanel'
import { IacrmDocsTab } from '../components/IacrmDocsTab'
import { PlatformIacrmPage } from '../components/PlatformIacrmPage'
import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'

type IacrmTabId = 'services' | 'clients' | 'pipeline' | 'invoices' | 'docs'
type SuperAdminTabId = 'businesses' | 'docs'

const superAdminTabs: Array<{ id: SuperAdminTabId; label: string }> = [
  { id: 'businesses', label: 'Businesses IACRM' },
  { id: 'docs', label: 'Documentation' },
]

const tabs: Array<{ id: IacrmTabId; label: string }> = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'clients', label: 'Clients' },
  { id: 'services', label: 'Services' },
  { id: 'invoices', label: 'Facturation' },
  { id: 'docs', label: 'Documentation' },
]

export function IacrmDashboardPage() {
  const { user } = useAuthSession()
  const navigate = useNavigate()
  const isSuperAdmin = user?.roles.some((role) => role.slug === 'super-admin') ?? false
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')

  const [activeTab, setActiveTab] = useState<IacrmTabId>(() =>
    requestedTab === 'clients' ||
    requestedTab === 'services' ||
    requestedTab === 'invoices' ||
    requestedTab === 'docs'
      ? requestedTab
      : 'pipeline',
  )

  const [superAdminTab, setSuperAdminTab] = useState<SuperAdminTabId>(() =>
    requestedTab === 'docs' ? requestedTab : 'businesses',
  )

  const config = getIacrmConfig()

  useEffect(() => {
    if (isSuperAdmin) {
      setSuperAdminTab(requestedTab === 'docs' ? requestedTab : 'businesses')
      return
    }

    setActiveTab(
      requestedTab === 'clients' ||
        requestedTab === 'services' ||
        requestedTab === 'invoices' ||
        requestedTab === 'docs'
        ? requestedTab
        : 'pipeline',
    )
  }, [isSuperAdmin, requestedTab])

  function updateRequestedTab(nextTab: string | null) {
    const nextParams = new URLSearchParams(searchParams)
    if (nextTab) {
      nextParams.set('tab', nextTab)
    } else {
      nextParams.delete('tab')
    }
    setSearchParams(nextParams, { replace: true })
  }

  if (isSuperAdmin) {
    const superAdminNeedsConfig = superAdminTab === 'businesses' && !config?.base_url

    return (
      <section className="app-section">
        <PageHeader title="IACRM - Vue plateforme" />

        <div className="flex flex-wrap gap-2">
          {superAdminTabs.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={tab.id === superAdminTab ? 'default' : 'outline'}
              onClick={() => {
                setSuperAdminTab(tab.id)
                updateRequestedTab(tab.id === 'businesses' ? null : tab.id)
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {superAdminNeedsConfig ? (
          <article className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              IACRM API non configurée.{` `}
              <button
                type="button"
                className="font-semibold text-foreground underline underline-offset-4"
                onClick={() => navigate('/settings?tab=api')}
              >
                Ouvrir IACRM API →
              </button>
            </p>
          </article>
        ) : null}

        {!superAdminNeedsConfig && superAdminTab === 'businesses' ? <PlatformIacrmPage /> : null}
        {superAdminTab === 'docs' ? <IacrmDocsTab /> : null}
      </section>
    )
  }

  const dataTabsNeedConfig: IacrmTabId[] = ['pipeline', 'clients', 'services', 'invoices']
  const needsConfig = dataTabsNeedConfig.includes(activeTab) && !config?.base_url

  return (
    <section className="app-section">
      <PageHeader title="IACRM" />

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={tab.id === activeTab ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab(tab.id)
              updateRequestedTab(tab.id === 'pipeline' ? null : tab.id)
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {needsConfig ? (
        <article className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            IACRM API non configurée.{` `}
            <button
              type="button"
              className="font-semibold text-foreground underline underline-offset-4"
              onClick={() => navigate('/settings?tab=api')}
            >
              Ouvrir IACRM API →
            </button>
          </p>
        </article>
      ) : null}

      {!needsConfig && activeTab === 'pipeline' ? <IacrmPipelinePanel /> : null}
      {!needsConfig && activeTab === 'clients' ? <IacrmClientsPanel /> : null}
      {!needsConfig && activeTab === 'services' ? <IacrmServicesPanel /> : null}
      {!needsConfig && activeTab === 'invoices' ? <IacrmInvoicesPanel /> : null}
      {activeTab === 'docs' ? <IacrmDocsTab /> : null}
    </section>
  )
}
