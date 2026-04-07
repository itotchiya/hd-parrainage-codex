import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, RefreshCw, Trash2, WifiOff, Zap } from 'lucide-react'
import { getIacrmConfig, saveIacrmConfig } from '../api'
import { useTestIacrmConnection } from '../hooks'
import {
  clearIacrmActivityLog,
  getIacrmActivityLog,
  IACRM_LOG_EVENT,
  type IacrmActivityEntry,
} from '../activityLog'
import type { IacrmApiConfig } from '../../../types/iacrm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function ConnectionStatusBadge({ status }: { status: IacrmApiConfig['connection_status'] }) {
  if (status === 'connected')
    return (
      <Badge variant="outline" className="border-green-400 bg-green-500/10 text-green-800 gap-1">
        <CheckCircle2 className="size-3" /> Connecté
      </Badge>
    )
  if (status === 'failed')
    return (
      <Badge variant="outline" className="border-red-300 bg-red-500/10 text-red-800 gap-1">
        <WifiOff className="size-3" /> Echec
      </Badge>
    )
  return (
    <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground gap-1">
      <Clock className="size-3" /> Non testé
    </Badge>
  )
}

function methodBadge(method: string) {
  const map: Record<string, string> = {
    GET: 'border-blue-300 bg-blue-500/10 text-blue-800',
    POST: 'border-green-400 bg-green-500/10 text-green-800',
    PATCH: 'border-amber-300 bg-amber-500/10 text-amber-800',
    DELETE: 'border-red-300 bg-red-500/10 text-red-800',
  }
  return map[method] ?? 'border-border bg-muted/40 text-muted-foreground'
}

function typeBadge(type: IacrmActivityEntry['type']) {
  const map: Record<IacrmActivityEntry['type'], string> = {
    pull: 'border-blue-300 bg-blue-500/10 text-blue-800',
    push: 'border-emerald-300 bg-emerald-500/10 text-emerald-700',
    test: 'border-amber-300 bg-amber-500/10 text-amber-700',
    error: 'border-red-300 bg-red-500/10 text-red-800',
  }
  return map[type]
}

function formatTs(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IacrmSettingsTab() {
  const existingConfig = getIacrmConfig()

  const [baseUrl, setBaseUrl] = useState(existingConfig?.base_url ?? '')
  const [apiKey, setApiKey] = useState(existingConfig?.api_key ?? '')
  const [autoSync, setAutoSync] = useState(existingConfig?.auto_sync_enabled ?? false)
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  const [log, setLog] = useState<IacrmActivityEntry[]>(() => getIacrmActivityLog())

  useEffect(() => {
    const handler = () => setLog(getIacrmActivityLog())
    window.addEventListener(IACRM_LOG_EVENT, handler)
    return () => window.removeEventListener(IACRM_LOG_EVENT, handler)
  }, [])

  const config = getIacrmConfig()
  const connectionStatus = config?.connection_status ?? 'untested'
  const lastTested = config?.last_tested_at
    ? formatTs(config.last_tested_at)
    : 'Jamais'

  const testMutation = useTestIacrmConnection()

  function handleSave() {
    const next: IacrmApiConfig = {
      base_url: baseUrl.trim(),
      api_key: apiKey.trim(),
      auto_sync_enabled: autoSync,
      last_tested_at: config?.last_tested_at ?? null,
      connection_status: config?.connection_status ?? 'untested',
    }
    saveIacrmConfig(next)
    setFeedback({ ok: true, message: 'Configuration sauvegardée.' })
  }

  async function handleTest() {
    setFeedback(null)
    const next: IacrmApiConfig = {
      base_url: baseUrl.trim(),
      api_key: apiKey.trim(),
      auto_sync_enabled: autoSync,
      last_tested_at: config?.last_tested_at ?? null,
      connection_status: config?.connection_status ?? 'untested',
    }
    saveIacrmConfig(next)
    const result = await testMutation.mutateAsync()
    setFeedback(result)
  }

  return (
    <div className="space-y-6">
      {/* ── Config + Status ─────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        {/* Config form */}
        <Card>
          <CardContent className="space-y-5 p-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Connexion IACRM
              </p>
              <h2 className="app-section-title mt-1">Configuration de l'API externe</h2>
            </div>

            <div className="space-y-3">
              <Field>
                <FieldLabel htmlFor="iacrm-base-url">URL de base de l'API</FieldLabel>
                <Input
                  id="iacrm-base-url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://0bf6bfea-....mock.pstmn.io"
                />
                <p className="text-xs text-muted-foreground">
                  URL du serveur mock Postman ou de l'API IACRM en production.
                </p>
              </Field>

              <Field>
                <FieldLabel htmlFor="iacrm-api-key">Clé API</FieldLabel>
                <Input
                  id="iacrm-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="iacrm-mock-key-dev-2026"
                />
                <p className="text-xs text-muted-foreground">
                  Transmise via l'en-tête <code className="font-mono text-foreground">X-IACRM-API-Key</code> sur chaque requête.
                </p>
              </Field>

              <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">Synchronisation automatique</p>
                    <p className="text-xs text-muted-foreground">
                      Envoie automatiquement les nouveaux prospects vers IACRM à leur création.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={handleSave} disabled={!baseUrl.trim()}>
                Sauvegarder
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleTest}
                disabled={testMutation.isPending || !baseUrl.trim()}
              >
                <RefreshCw className={`mr-1.5 size-3.5 ${testMutation.isPending ? 'animate-spin' : ''}`} />
                {testMutation.isPending ? 'Test en cours...' : 'Tester la connexion'}
              </Button>
            </div>

            {feedback ? (
              <p
                className={`rounded-lg border px-4 py-3 text-sm ${
                  feedback.ok
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {feedback.message}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* Status panel */}
        <Card className="bg-foreground text-background">
          <CardContent className="space-y-4 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-background/60">
              Statut de l'intégration
            </p>

            <div className="space-y-3">
              {[
                { label: 'Statut connexion', value: <ConnectionStatusBadge status={connectionStatus} /> },
                { label: 'Dernier test', value: <span className="text-sm font-semibold text-background">{lastTested}</span> },
                { label: 'Auto-sync', value: <span className="text-sm font-semibold text-background">{autoSync ? 'Activé' : 'Désactivé'}</span> },
                { label: 'Clé API', value: <span className="text-sm font-mono text-background/80">{apiKey ? `${apiKey.slice(0, 8)}••••` : '—'}</span> },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-background/15 bg-background/10 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-background/60">{label}</p>
                  <div className="mt-1.5">{value}</div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-background/15 bg-background/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-background/60">Mock server</p>
              <p className="mt-1.5 break-all font-mono text-[11px] text-background/70">
                https://0bf6bfea-8d59-45b6-9872-1df0366d1b95.mock.pstmn.io
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Activity Log ──────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Journal d'activité
              </p>
              <h2 className="app-section-title mt-1">
                {log.length} événement{log.length !== 1 ? 's' : ''} enregistré{log.length !== 1 ? 's' : ''}
              </h2>
            </div>
            {log.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  clearIacrmActivityLog()
                  setLog([])
                }}
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Vider le journal
              </Button>
            ) : null}
          </div>

          {log.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-border bg-muted/10 py-10 text-center">
              <Zap className="mx-auto size-8 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                Aucune activité enregistrée. Les appels API IACRM apparaîtront ici en temps réel.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="pb-2 pr-4">Horodatage</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Méthode</th>
                    <th className="pb-2 pr-4">Endpoint</th>
                    <th className="pb-2 pr-4">Statut</th>
                    <th className="pb-2 text-right">Durée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {log.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/20">
                      <td className="py-2 pr-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {formatTs(entry.timestamp)}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className={`text-[10px] capitalize ${typeBadge(entry.type)}`}>
                          {entry.type}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className={`font-mono text-[10px] ${methodBadge(entry.method)}`}>
                          {entry.method}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-foreground">
                        {entry.endpoint}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge
                          variant="outline"
                          className={
                            entry.status === 'success'
                              ? 'border-green-400 bg-green-500/10 text-green-800 text-[10px]'
                              : 'border-red-300 bg-red-500/10 text-red-800 text-[10px]'
                          }
                        >
                          {entry.status === 'success' ? `${entry.status_code ?? 200}` : `Echec${entry.status_code ? ` ${entry.status_code}` : ''}`}
                        </Badge>
                      </td>
                      <td className="py-2 text-right font-mono text-xs text-muted-foreground">
                        {entry.duration_ms != null ? `${entry.duration_ms}ms` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
