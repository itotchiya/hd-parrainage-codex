import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  BadgeCheck,
  Cable,
  Copy,
  Eye,
  EyeOff,
  FlaskConical,
  KeyRound,
  Link2,
  RefreshCcw,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { clearIacrmConfig, getIacrmConfig, saveIacrmConfig } from '../../iacrm/api'
import { useTestIacrmConnection } from '../../iacrm/hooks'
import type { IacrmApiConfig } from '../../../types/iacrm'

type ApiTone = 'neutral' | 'active' | 'success' | 'warning' | 'danger'

function apiToneBadgeClass(tone: ApiTone) {
  switch (tone) {
    case 'active':
      return 'border-transparent bg-sky-500/15 text-sky-900 dark:bg-sky-500/20 dark:text-sky-300'
    case 'success':
      return 'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
    case 'warning':
      return 'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
    case 'danger':
      return 'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
    default:
      return 'border-transparent bg-muted text-muted-foreground'
  }
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="h-6 w-1 rounded-full bg-foreground/85" />
      <h3 className="text-[1.05rem] font-semibold tracking-tight text-foreground">{title}</h3>
    </div>
  )
}

function SnapshotMetric({
  icon,
  label,
  value,
  hint,
  badge,
}: {
  icon: ReactNode
  label: string
  value: string
  hint?: string
  badge?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <span className="text-muted-foreground">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-base font-medium text-foreground">{value}</p>
        {badge}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
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
  const [showApiKey, setShowApiKey] = useState(false)

  const testMutation = useTestIacrmConnection()

  const connectionStatus = existingConfig?.connection_status ?? 'untested'
  const lastTested = existingConfig?.last_tested_at
    ? new Date(existingConfig.last_tested_at).toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Jamais'

  const failedJobsCount = Number.parseInt(failedJobsValue, 10) || 0
  const statusLabel =
    connectionStatus === 'connected'
      ? 'Connecte'
      : connectionStatus === 'failed'
        ? 'Echec'
        : 'Non teste'

  const connectionTone: ApiTone =
    connectionStatus === 'connected'
      ? 'success'
      : connectionStatus === 'failed'
        ? 'danger'
        : 'warning'

  const autoSyncTone: ApiTone = autoSync ? 'success' : 'neutral'
  const pressureTone: ApiTone = failedJobsCount > 0 ? 'warning' : 'success'
  const existingBaseUrl = existingConfig?.base_url ?? 'http://localhost:5555'
  const existingApiKey = existingConfig?.api_key ?? ''
  const existingAutoSync = existingConfig?.auto_sync_enabled ?? false
  const hasConfigChanges =
    baseUrl.trim() !== existingBaseUrl ||
    apiKey.trim() !== existingApiKey ||
    autoSync !== existingAutoSync
  const saveDisabledReason =
    baseUrl.trim().length === 0
      ? 'Ajoute d’abord une URL CRM valide.'
      : !hasConfigChanges
        ? existingApiKey
          ? 'La clé actuelle est déjà enregistrée. Change la clé ou ajoute une nouvelle valeur pour enregistrer.'
          : 'Aucun changement à enregistrer.'
        : null

  function currentConfig(): IacrmApiConfig {
    return {
      base_url: baseUrl.trim(),
      api_key: apiKey.trim(),
      auto_sync_enabled: autoSync,
      last_tested_at: existingConfig?.last_tested_at ?? null,
      connection_status: existingConfig?.connection_status ?? 'untested',
    }
  }

  function handleSave() {
    saveIacrmConfig(currentConfig())
    toast.success('Configuration CRM enregistrée.', { id: 'settings-api-toast' })
  }

  async function handleTest() {
    saveIacrmConfig(currentConfig())
    const result = await testMutation.mutateAsync()
    if (result.ok) {
      toast.success('Connexion CRM validée.', { id: 'settings-api-toast' })
      return
    }
    toast.error(`Échec de connexion : ${result.message}`, { id: 'settings-api-toast' })
  }

  function handleClearKey() {
    setApiKey('')
    saveIacrmConfig({
      ...currentConfig(),
      api_key: '',
    })
    toast.warning('Clé API supprimée.', { id: 'settings-api-toast' })
  }

  function handleResetConfig() {
    clearIacrmConfig()
    setBaseUrl('http://localhost:5555')
    setApiKey('')
    setAutoSync(false)
    setShowApiKey(false)
    toast.warning('Configuration CRM locale réinitialisée.', { id: 'settings-api-toast' })
  }

  async function handleCopyBaseUrl() {
    if (!baseUrl.trim()) return
    try {
      await navigator.clipboard.writeText(baseUrl.trim())
      toast.info('URL CRM copiée.', { id: 'settings-api-toast' })
    } catch {
      toast.error('Impossible de copier l’URL.', { id: 'settings-api-toast' })
    }
  }

  return (
    <Card className="overflow-hidden rounded-xl border-border/70 bg-card">
      <CardContent className="space-y-6 p-6">
        <SectionHeader title="Integration control · CRM" />

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="iacrm-base-url">
            IACRM base URL
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="iacrm-base-url"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="https://iacrm-api-simulator-production.up.railway.app/"
                className="pl-9"
              />
            </div>
            <Button type="button" variant="outline" size="icon" onClick={handleCopyBaseUrl} aria-label="Copier l URL">
              <Copy className="size-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Mock server / endpoint production quand il sera pret.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="iacrm-api-key">
            API key
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="iacrm-api-key"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="••••••••••••••••"
                className="pl-9"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setShowApiKey((current) => !current)}
            >
              {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              <span className="hidden sm:inline">{showApiKey ? 'Masquer' : 'Show'}</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
          <div className="flex items-center gap-3">
            <RefreshCw className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Enable auto-sync</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoSync}
            onClick={() => setAutoSync((current) => !current)}
            className={cn(
              'relative inline-flex h-7 w-12 items-center rounded-full border transition-colors',
              autoSync ? 'border-primary bg-primary' : 'border-border bg-muted',
            )}
          >
            <span
              className={cn(
                'inline-block size-5 rounded-full bg-background shadow-sm transition-transform',
                autoSync ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" className="gap-2" disabled={Boolean(saveDisabledReason)} onClick={handleSave}>
            <BadgeCheck className="size-4" />
            Save config
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={testMutation.isPending || baseUrl.trim().length === 0}
            onClick={handleTest}
          >
            <FlaskConical className="size-4" />
            {testMutation.isPending ? 'Testing...' : 'Test connection'}
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={handleClearKey} disabled={apiKey.length === 0}>
            <Trash2 className="size-4" />
            Clear key
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={handleResetConfig}>
            <RefreshCcw className="size-4" />
            Reset local
          </Button>
        </div>

        {saveDisabledReason ? <p className="text-sm text-muted-foreground">{saveDisabledReason}</p> : null}

        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SnapshotMetric
              icon={<Cable className="size-3.5" />}
              label="Connection"
              value={statusLabel}
              hint="manual test badge"
              badge={
                <Badge variant="outline" size="sm" className={cn('rounded-full', apiToneBadgeClass(connectionTone))}>
                  {statusLabel}
                </Badge>
              }
            />
            <SnapshotMetric
              icon={<BadgeCheck className="size-3.5" />}
              label="Last tested"
              value={lastTested}
            />
            <SnapshotMetric
              icon={<RefreshCw className="size-3.5" />}
              label="Sync mode"
              value={autoSync ? 'Auto-sync enabled' : 'Manual mode'}
              badge={
                <Badge variant="outline" size="sm" className={cn('rounded-full', apiToneBadgeClass(autoSyncTone))}>
                  {autoSync ? 'Actif' : 'Inactif'}
                </Badge>
              }
            />
            <SnapshotMetric
              icon={<RefreshCcw className="size-3.5" />}
              label="Backend pressure"
              value={failedJobsCount > 0 ? `${failedJobsCount} active issues` : 'No active issue'}
              hint={syncAlertsValue}
              badge={
                <Badge variant="outline" size="sm" className={cn('rounded-full', apiToneBadgeClass(pressureTone))}>
                  {failedJobsCount > 0 ? 'Attention' : 'Stable'}
                </Badge>
              }
            />
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
