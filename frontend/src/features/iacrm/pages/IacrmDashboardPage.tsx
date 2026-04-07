import { useState } from 'react'
import { getIacrmConfig } from '../api'
import { IacrmServicesPanel } from '../components/IacrmServicesPanel'
import { IacrmClientsPanel } from '../components/IacrmClientsPanel'
import { IacrmPipelinePanel } from '../components/IacrmPipelinePanel'
import { IacrmInvoicesPanel } from '../components/IacrmInvoicesPanel'
import { IacrmSettingsTab } from '../components/IacrmSettingsTab'
import { IacrmDocsTab } from '../components/IacrmDocsTab'
import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'

type IacrmTabId = 'services' | 'clients' | 'pipeline' | 'invoices' | 'settings' | 'docs'

const tabs: Array<{ id: IacrmTabId; label: string }> = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'clients', label: 'Clients' },
  { id: 'services', label: 'Services' },
  { id: 'invoices', label: 'Facturation' },
  { id: 'settings', label: 'Paramètres' },
  { id: 'docs', label: 'Documentation' },
]

export function IacrmDashboardPage() {
  const [activeTab, setActiveTab] = useState<IacrmTabId>('pipeline')
  const config = getIacrmConfig()

  // For settings and docs tabs, always show even without config
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
            onClick={() => setActiveTab(tab.id)}
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
              onClick={() => setActiveTab('settings')}
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
