import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getIacrmConfig } from '../api'
import { useAuthSession } from '../../auth/session'
import { IacrmServicesPanel } from '../components/IacrmServicesPanel'
import { IacrmClientsPanel } from '../components/IacrmClientsPanel'
import { IacrmPipelinePanel } from '../components/IacrmPipelinePanel'
import { IacrmInvoicesPanel } from '../components/IacrmInvoicesPanel'
import { IacrmSettingsTab } from '../components/IacrmSettingsTab'
import { IacrmDocsTab } from '../components/IacrmDocsTab'
import { PlatformIacrmPage } from '../components/PlatformIacrmPage'
import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'

type IacrmTabId = 'services' | 'clients' | 'pipeline' | 'invoices' | 'settings' | 'docs'

type SuperAdminTabId = 'businesses' | 'settings' | 'docs'

const superAdminTabs: Array<{ id: SuperAdminTabId; label: string }> = [
  { id: 'businesses', label: 'Businesses IACRM' },
  { id: 'settings', label: 'Paramètres' },
  { id: 'docs', label: 'Documentation' },
]

const tabs: Array<{ id: IacrmTabId; label: string }> = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'clients', label: 'Clients' },
  { id: 'services', label: 'Services' },
  { id: 'invoices', label: 'Facturation' },
  { id: 'settings', label: 'Paramètres' },
  { id: 'docs', label: 'Documentation' },
]

export function IacrmDashboardPage() {
  const { user } = useAuthSession()
  const isSuperAdmin = user?.roles.some((r) => r.slug === 'super-admin') ?? false
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<IacrmTabId>(() =>
    requestedTab === 'clients' ||
    requestedTab === 'services' ||
    requestedTab === 'invoices' ||
    requestedTab === 'settings' ||
    requestedTab === 'docs'
      ? requestedTab
      : 'pipeline',
  )
  const [superAdminTab, setSuperAdminTab] = useState<SuperAdminTabId>(() =>
    requestedTab === 'settings' || requestedTab === 'docs' ? requestedTab : 'businesses',
  )
  const config = getIacrmConfig()

  useEffect(() => {
    if (isSuperAdmin) {
      setSuperAdminTab(requestedTab === 'settings' || requestedTab === 'docs' ? requestedTab : 'businesses')
      return
    }

    setActiveTab(
      requestedTab === 'clients' ||
        requestedTab === 'services' ||
        requestedTab === 'invoices' ||
        requestedTab === 'settings' ||
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

  // ---------------------------------------------------------------------------
  // Superadmin view — platform-wide IACRM overview
  // ---------------------------------------------------------------------------

  if (isSuperAdmin) {
    const superAdminDataTabsNeedConfig: SuperAdminTabId[] = ['businesses']
    const superAdminNeedsConfig =
      superAdminDataTabsNeedConfig.includes(superAdminTab) && !config?.base_url

    return (
      <section className="app-section">
        <PageHeader title="IACRM — Vue plateforme" />

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
              IACRM API non configuré.{' '}
              <button
                type="button"
                className="font-semibold text-foreground underline underline-offset-4"
                onClick={() => {
                  setSuperAdminTab('settings')
                  updateRequestedTab('settings')
                }}
              >
                Ouvrir les Paramètres →
              </button>
            </p>
          </article>
        ) : null}

        {!superAdminNeedsConfig && superAdminTab === 'businesses' ? <PlatformIacrmPage /> : null}
        {superAdminTab === 'settings' ? <IacrmSettingsTab /> : null}
        {superAdminTab === 'docs' ? <IacrmDocsTab /> : null}
      </section>
    )
  }

  // ---------------------------------------------------------------------------
  // Business-owner view — own IACRM data
  // ---------------------------------------------------------------------------

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
            IACRM API non configuré.{' '}
            <button
              type="button"
              className="font-semibold text-foreground underline underline-offset-4"
              onClick={() => {
                setActiveTab('settings')
                updateRequestedTab('settings')
              }}
            >
              Ouvrir les Paramètres →
            </button>
          </p>
        </article>
      ) : null}

      {!needsConfig && activeTab === 'pipeline' ? <IacrmPipelinePanel /> : null}
      {!needsConfig && activeTab === 'clients' ? <IacrmClientsPanel /> : null}
      {!needsConfig && activeTab === 'services' ? <IacrmServicesPanel /> : null}
      {!needsConfig && activeTab === 'invoices' ? <IacrmInvoicesPanel /> : null}
      {activeTab === 'settings' ? <IacrmSettingsTab /> : null}
      {activeTab === 'docs' ? <IacrmDocsTab /> : null}
    </section>
  )
}
