import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, RefreshCcw } from 'lucide-react'
import { useIacrmRequestLogs } from '../hooks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatAppDateTime } from '@/lib/locale'

const statusOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'success', label: 'Succès' },
  { value: 'failed', label: 'Échec' },
]

const actorOptions = [
  { value: 'all', label: 'Tous les acteurs' },
  { value: 'server', label: 'Backend' },
  { value: 'webapp', label: 'Webapp' },
]

const directionOptions = [
  { value: 'all', label: 'Toutes les directions' },
  { value: 'pull', label: 'Pull' },
  { value: 'push', label: 'Push' },
  { value: 'test', label: 'Test' },
]

const methodOptions = [
  { value: 'all', label: 'Toutes les méthodes' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
]

function toFilterValue(value: string) {
  return value === 'all' ? undefined : value
}

function statusBadgeClass(status: string) {
  return status === 'success'
    ? 'border-emerald-300 bg-emerald-500/10 text-emerald-700'
    : 'border-red-300 bg-red-500/10 text-red-700'
}

function actorBadgeClass(actorType: string) {
  return actorType === 'server'
    ? 'border-sky-300 bg-sky-500/10 text-sky-700'
    : 'border-violet-300 bg-violet-500/10 text-violet-700'
}

function formatJson(value: Record<string, unknown> | unknown[]) {
  return JSON.stringify(value, null, 2)
}

export function IacrmOperationsPanel() {
  const [status, setStatus] = useState('all')
  const [actorType, setActorType] = useState('all')
  const [direction, setDirection] = useState('all')
  const [method, setMethod] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  const filters = useMemo(
    () => ({
      limit: 120,
      status: toFilterValue(status),
      actor_type: toFilterValue(actorType),
      direction: toFilterValue(direction),
      method: toFilterValue(method),
      search: search.trim() || undefined,
    }),
    [status, actorType, direction, method, search],
  )

  const logsQuery = useIacrmRequestLogs(filters)
  const logs = logsQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      <Card className="rounded-lg border border-border">
        <CardHeader className="border-b border-border/60">
          <CardTitle>Journal des échanges IACRM</CardTitle>
          <CardDescription>
            Toutes les requêtes directes du webapp et tous les appels backend vers IACRM au même endroit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Chercher un endpoint, une source ou une erreur"
              className="min-w-[260px] max-w-[360px]"
            />

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger size="sm" className="min-w-[170px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={actorType} onValueChange={setActorType}>
              <SelectTrigger size="sm" className="min-w-[170px]">
                <SelectValue placeholder="Acteur" />
              </SelectTrigger>
              <SelectContent>
                {actorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger size="sm" className="min-w-[170px]">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                {directionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger size="sm" className="min-w-[150px]">
                <SelectValue placeholder="Méthode" />
              </SelectTrigger>
              <SelectContent>
                {methodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => logsQuery.refetch()}
              disabled={logsQuery.isFetching}
            >
              <RefreshCcw className={cn('mr-2 size-4', logsQuery.isFetching && 'animate-spin')} />
              Rafraîchir
            </Button>
          </div>

          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">Détail</TableHead>
                  <TableHead>Quand</TableHead>
                  <TableHead>Acteur</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Méthode</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Utilisateur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsQuery.isPending ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                      Chargement du journal IACRM...
                    </TableCell>
                  </TableRow>
                ) : null}

                {logsQuery.isError ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-sm text-red-700">
                      Impossible de charger le journal IACRM.
                    </TableCell>
                  </TableRow>
                ) : null}

                {!logsQuery.isPending && !logsQuery.isError && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                      Aucun échange IACRM trouvé pour ce filtre.
                    </TableCell>
                  </TableRow>
                ) : null}

                {logs.map((log) => {
                  const expanded = expandedLogId === log.id
                  return (
                    <Fragment key={log.id}>
                      <TableRow key={log.id}>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedLogId(expanded ? null : log.id)}
                          >
                            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatAppDateTime(log.requested_at ?? log.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={actorBadgeClass(log.actor_type)}>
                            {log.actor_type === 'server' ? 'Backend' : 'Webapp'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.source}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.direction}</TableCell>
                        <TableCell className="font-medium">{log.method}</TableCell>
                        <TableCell className="max-w-[320px] truncate font-mono text-xs">
                          {log.endpoint}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={statusBadgeClass(log.status)}>
                              {log.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {log.status_code ?? '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.duration_ms ? `${log.duration_ms} ms` : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.initiated_by_user?.display_name ?? 'Système'}
                        </TableCell>
                      </TableRow>
                      {expanded ? (
                        <TableRow>
                          <TableCell colSpan={10} className="bg-muted/20">
                            <div className="grid gap-4 p-2 lg:grid-cols-2">
                              <PayloadCard
                                title="Request payload"
                                payload={log.request_payload}
                                emptyText="Aucune donnée envoyée."
                              />
                              <PayloadCard
                                title="Response payload"
                                payload={log.response_payload}
                                emptyText={log.error_message ?? 'Aucune réponse enregistrée.'}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PayloadCard({
  title,
  payload,
  emptyText,
}: {
  title: string
  payload: Record<string, unknown> | unknown[]
  emptyText: string
}) {
  const hasContent = Array.isArray(payload) ? payload.length > 0 : Object.keys(payload).length > 0

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="border-b border-border/60 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      </div>
      <div className="max-h-[360px] overflow-auto px-4 py-3">
        {hasContent ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-xs text-foreground">
            {formatJson(payload)}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        )}
      </div>
    </div>
  )
}
