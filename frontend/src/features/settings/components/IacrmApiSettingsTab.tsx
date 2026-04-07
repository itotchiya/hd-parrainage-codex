import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getIacrmConfig, saveIacrmConfig } from '../../iacrm/api'
import { useTestIacrmConnection } from '../../iacrm/hooks'
import type { IacrmApiConfig } from '../../../types/iacrm'

function SettingsMetric({
  label,
  value,
  tone = 'dark',
}: {
  label: string
  value: string
  tone?: 'default' | 'dark'
}) {
  return (
    <article
      className={
        tone === 'dark'
          ? 'rounded-lg border border-border/50 bg-background/10 px-4 py-3 text-background'
          : 'rounded-lg border border-border bg-muted/30 px-4 py-3'
      }
    >
      <p
        className={
          tone === 'dark'
            ? 'text-[11px] uppercase tracking-[0.18em] text-background/70'
            : 'text-[11px] uppercase tracking-[0.18em] text-muted-foreground'
        }
      >
        {label}
      </p>
      <p
        className={
          tone === 'dark'
            ? 'mt-2 text-base font-semibold text-background'
            : 'mt-2 text-base font-semibold text-foreground'
        }
      >
        {value}
      </p>
    </article>
  )
}

export function IacrmApiSettingsTab({
  syncAlertsValue,
  failedJobsValue,
}: {
  syncAlertsValue: string
  failedJobsValue: string
}) {
  const existingConfig = getIacrmConfig()

  const [baseUrl, setBaseUrl] = useState(existingConfig?.base_url ?? 'http://localhost:5555')
  const [apiKey, setApiKey] = useState(existingConfig?.api_key ?? '')
  const [autoSync, setAutoSync] = useState(existingConfig?.auto_sync_enabled ?? false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const connectionStatus = existingConfig?.connection_status ?? 'untested'
  const lastTested = existingConfig?.last_tested_at
    ? new Date(existingConfig.last_tested_at).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never'

  const testMutation = useTestIacrmConnection()

  function handleSave() {
    const config: IacrmApiConfig = {
      base_url: baseUrl.trim(),
      api_key: apiKey.trim(),
      auto_sync_enabled: autoSync,
      last_tested_at: existingConfig?.last_tested_at ?? null,
      connection_status: existingConfig?.connection_status ?? 'untested',
    }
    saveIacrmConfig(config)
    setFeedback('IACRM API configuration saved.')
  }

  async function handleTest() {
    setFeedback(null)
    // Save first so the test uses current values
    const config: IacrmApiConfig = {
      base_url: baseUrl.trim(),
      api_key: apiKey.trim(),
      auto_sync_enabled: autoSync,
      last_tested_at: existingConfig?.last_tested_at ?? null,
      connection_status: existingConfig?.connection_status ?? 'untested',
    }
    saveIacrmConfig(config)

    const result = await testMutation.mutateAsync()
    setFeedback(result.ok ? 'Connection successful.' : `Connection failed: ${result.message}`)
  }

  const statusLabel =
    connectionStatus === 'connected'
      ? 'Connected'
      : connectionStatus === 'failed'
        ? 'Failed'
        : 'Not tested'

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <article className="rounded-lg border border-border bg-card app-card-padding">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          IACRM API connection
        </p>
        <h2 className="app-section-title mt-2">
          Configure the external CRM integration endpoint
        </h2>

        <div className="mt-5 grid gap-3">
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
            <label
              className="text-xs uppercase tracking-[0.22em] text-muted-foreground"
              htmlFor="iacrm_base_url"
            >
              IACRM API Base URL
            </label>
            <Input
              id="iacrm_base_url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="mt-2"
              placeholder="http://localhost:5555"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              The base URL of the IACRM mock server or production API.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
            <label
              className="text-xs uppercase tracking-[0.22em] text-muted-foreground"
              htmlFor="iacrm_api_key"
            >
              API Key
            </label>
            <Input
              id="iacrm_api_key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-2"
              placeholder="iacrm-mock-key-dev-2026"
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-sm font-medium text-foreground">Enable auto-sync</span>
            </label>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Automatically sync prospect and transaction data with IACRM on creation.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={baseUrl.trim().length === 0}
          >
            Save configuration
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleTest}
            disabled={testMutation.isPending || baseUrl.trim().length === 0}
          >
            {testMutation.isPending ? 'Testing...' : 'Test connection'}
          </Button>
        </div>

        {feedback ? (
          <p className="mt-4 rounded-lg border border-border bg-card/90 px-4 py-3 text-sm text-foreground">
            {feedback}
          </p>
        ) : null}
      </article>

      <article className="rounded-lg border border-border bg-foreground p-6 text-background">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-background/70">
          IACRM integration status
        </p>
        <div className="mt-5 space-y-3">
          <SettingsMetric label="Connection status" value={statusLabel} tone="dark" />
          <SettingsMetric label="Last tested" value={lastTested} tone="dark" />
          <SettingsMetric label="Auto-sync" value={autoSync ? 'Enabled' : 'Disabled'} tone="dark" />
          <SettingsMetric label="Sync alerts" value={syncAlertsValue} tone="dark" />
          <SettingsMetric label="Failed jobs" value={failedJobsValue} tone="dark" />
        </div>
      </article>
    </div>
  )
}
