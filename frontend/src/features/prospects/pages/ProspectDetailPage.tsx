import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, UserRound, Workflow } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { DetailEmptyState, DetailSectionCard } from '@/components/app/DetailPageKit'
import { EntityCardIdentity } from '@/components/app/EntityCardIdentity'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { SortableTableHead, type SortDirection } from '@/components/app/SortableTableHead'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAppBreadcrumbTrail } from '@/layouts/AppShell'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

import { fetchProspect, fetchProspectHistory } from '../api'

const stagePresentation = {
  suspect: {
    label: 'Suspect',
    className: 'border-transparent bg-muted text-muted-foreground',
  },
  prospect_froid: {
    label: 'Prospect froid',
    className:
      'border-transparent bg-blue-500/15 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
  },
  prospect_tiede: {
    label: 'Prospect tiède',
    className:
      'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
  },
  prospect_chaud: {
    label: 'Prospect chaud',
    className:
      'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
} as const

const submissionPresentation = {
  pending_sync: {
    label: 'En attente',
    className:
      'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
  },
  synced: {
    label: 'Synchronisé',
    className:
      'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  sync_failed: {
    label: 'Échec sync',
    className:
      'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
  },
  deleted: {
    label: 'Supprimé',
    className: 'border-transparent bg-muted text-muted-foreground',
  },
} as const

const conversionPresentation = {
  open: {
    label: 'Ouvert',
    className: 'border-transparent bg-muted text-muted-foreground',
  },
  converted: {
    label: 'Converti',
    className:
      'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  lost: {
    label: 'Perdu',
    className:
      'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
  },
  locked: {
    label: 'Verrouillé',
    className:
      'border-transparent bg-blue-500/15 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
  },
} as const

function formatDate(value: string | null, withTime = false) {
  if (!value) {
    return 'Indisponible'
  }

  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
        }
      : {}),
  })
}

function toTimestamp(value: string | null) {
  if (!value) return Number.NEGATIVE_INFINITY
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length > 1) {
    return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function ClickableMetaCard({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full cursor-pointer rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {children}
    </button>
  )
}

function CompactMetaItem({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2 transition-colors group-hover:border-solid group-hover:bg-muted/20 group-focus-visible:border-solid',
        className,
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs font-medium text-foreground">{value}</p>
    </div>
  )
}

function RelationRow({
  eyebrow,
  title,
  description,
  to,
  badge,
}: {
  eyebrow: string
  title: string
  description: string
  to?: string | null
  badge?: React.ReactNode
}) {
  const content = (
    <>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
        <p className="mt-1 truncate text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 truncate text-sm text-muted-foreground">{description}</p>
      </div>
      {badge ? <div className="shrink-0">{badge}</div> : null}
    </>
  )

  if (!to) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-background/40 px-4 py-3">
        {content}
      </div>
    )
  }

  return (
    <Link
      to={to}
      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-background/40 px-4 py-3 transition hover:border-border hover:bg-muted/20"
    >
      {content}
    </Link>
  )
}

function ProspectDetailSkeleton() {
  return (
    <section className="app-section">
      <div className="flex flex-col gap-2 pb-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-44 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="rounded-xl border-0 bg-card p-5">
          <div className="flex items-start gap-4">
            <Skeleton className="size-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-4 w-56 rounded-md" />
              <Skeleton className="h-4 w-36 rounded-md" />
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[74px] rounded-lg" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border-0 bg-card p-5">
          <Skeleton className="h-5 w-40 rounded-md" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-xl border-0 bg-card p-5">
            <Skeleton className="h-5 w-36 rounded-md" />
            <div className="mt-4 overflow-hidden rounded-lg bg-background/40">
              <div className="h-11 bg-muted/30" />
              {Array.from({ length: 4 }).map((__, rowIndex) => (
                <div key={rowIndex} className="h-12 border-t border-border/50 bg-card/70 first:border-t-0" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

type SyncSortKey = 'updatedAt'
type HistorySortKey = 'createdAt'

export function ProspectDetailPage() {
  const { prospectId, agentId: routeAgentId } = useParams<{
    prospectId: string
    agentId?: string
  }>()
  const [detailKey, setDetailKey] = useState<string | null>(null)
  const [syncSortKey, setSyncSortKey] = useState<SyncSortKey>('updatedAt')
  const [syncSortDirection, setSyncSortDirection] = useState<SortDirection>('desc')
  const [historySortKey, setHistorySortKey] = useState<HistorySortKey>('createdAt')
  const [historySortDirection, setHistorySortDirection] = useState<SortDirection>('desc')

  const prospectQuery = useQuery({
    queryKey: ['prospects', 'detail', prospectId],
    queryFn: async () => fetchProspect(prospectId ?? ''),
    enabled: Boolean(prospectId),
  })

  const historyQuery = useQuery({
    queryKey: ['prospects', 'detail', prospectId, 'history'],
    queryFn: async () => fetchProspectHistory(prospectId ?? ''),
    enabled: Boolean(prospectId),
  })

  const prospect = prospectQuery.data?.data ?? null
  const history = historyQuery.data?.data ?? []
  const resolvedAgentId = prospect?.agent_id ?? routeAgentId ?? null

  useAppBreadcrumbTrail(
    prospect
      ? [
          { label: 'Agents', to: '/agents' },
          ...(resolvedAgentId && prospect.agent_name
            ? [{ label: prospect.agent_name, to: `/agents/${resolvedAgentId}` }]
            : []),
          { label: prospect.contact_name },
        ]
      : null,
  )

  const stage = prospect ? stagePresentation[prospect.pipeline_stage] : null
  const submission = prospect ? submissionPresentation[prospect.submission_status] : null
  const conversion = prospect ? conversionPresentation[prospect.conversion_status] : null
  const backHref = resolvedAgentId ? `/agents/${resolvedAgentId}` : '/prospects'

  const detailItems = useMemo(
    () =>
      prospect
        ? [
            {
              key: 'email',
              label: 'Email',
              value: prospect.contact_email ?? 'Aucun email renseigné',
              description:
                'Adresse email de contact utilisée pour suivre ce prospect et pour les échanges commerciaux.',
            },
            {
              key: 'phone',
              label: 'Téléphone',
              value: prospect.contact_phone_raw ?? 'Aucun téléphone renseigné',
              description: "Numéro transmis par l'affilié pour recontacter ce prospect.",
            },
            {
              key: 'company',
              label: 'Société',
              value: prospect.company_name ?? 'Aucune société renseignée',
              description: "Nom de l'entreprise ou structure associée à ce prospect.",
            },
            {
              key: 'submitted',
              label: 'Soumis le',
              value: formatDate(prospect.submitted_at, true),
              description: 'Date et heure de création du prospect dans la plateforme.',
            },
            {
              key: 'first-sync',
              label: 'Première synchro',
              value: formatDate(prospect.first_synced_at, true),
              description: 'Premier passage réussi du prospect vers IACRM.',
            },
            {
              key: 'last-sync',
              label: 'Dernière synchro',
              value: formatDate(prospect.last_synced_at, true),
              description: 'Dernière tentative de synchronisation connue pour ce prospect.',
            },
            {
              key: 'iacrm-ref',
              label: 'Référence IACRM',
              value: prospect.iacrm_prospect_id ?? 'Aucune référence',
              description: 'Identifiant externe reçu de IACRM après création ou synchronisation.',
            },
            {
              key: 'source',
              label: 'Source',
              value: prospect.source,
              description: 'Origine déclarée du prospect au moment de sa création.',
            },
          ]
        : [],
    [prospect],
  )

  const activeDetailItem = detailItems.find((item) => item.key === detailKey) ?? null

  const syncRows = useMemo(
    () => [
      {
        key: 'submission',
        element: 'Soumission',
        value: submission?.label ?? 'Indisponible',
        status: submission ? <Badge className={submission.className}>{submission.label}</Badge> : null,
        updatedAtValue: prospect?.submitted_at ?? null,
        updatedAtLabel: formatDate(prospect?.submitted_at ?? null, true),
      },
      {
        key: 'iacrm-sync',
        element: 'Synchronisation IACRM',
        value: prospect?.iacrm_status_label ?? 'Aucun statut reçu',
        status: submission ? <Badge className={submission.className}>{submission.label}</Badge> : null,
        updatedAtValue: prospect?.last_synced_at ?? null,
        updatedAtLabel: formatDate(prospect?.last_synced_at ?? null, true),
      },
      {
        key: 'iacrm-reference',
        element: 'Référence IACRM',
        value: prospect?.iacrm_prospect_id ?? 'Non attribuée',
        status: (
          <Badge variant="secondary">{prospect?.iacrm_prospect_id ? 'Liée' : 'En attente'}</Badge>
        ),
        updatedAtValue: prospect?.last_synced_at ?? null,
        updatedAtLabel: formatDate(prospect?.last_synced_at ?? null, true),
      },
      {
        key: 'conversion',
        element: 'Conversion',
        value: conversion?.label ?? 'Indisponible',
        status: conversion ? <Badge className={conversion.className}>{conversion.label}</Badge> : null,
        updatedAtValue:
          prospect?.converted_at ??
          prospect?.lost_at ??
          prospect?.conversion_locked_at ??
          prospect?.pipeline_stage_changed_at ??
          null,
        updatedAtLabel: formatDate(
          prospect?.converted_at ??
            prospect?.lost_at ??
            prospect?.conversion_locked_at ??
            prospect?.pipeline_stage_changed_at ??
            null,
          true,
        ),
      },
      {
        key: 'lock',
        element: 'Verrouillage',
        value: prospect?.conversion_locked_at ? 'Prospect verrouillé' : 'Non verrouillé',
        status: (
          <Badge
            className={
              prospect?.conversion_locked_at
                ? conversionPresentation.locked.className
                : 'border-transparent bg-muted text-muted-foreground'
            }
          >
            {prospect?.conversion_locked_at ? 'Verrouillé' : 'Ouvert'}
          </Badge>
        ),
        updatedAtValue: prospect?.conversion_locked_at ?? null,
        updatedAtLabel: formatDate(prospect?.conversion_locked_at ?? null, true),
      },
      {
        key: 'deletion',
        element: 'Suppression',
        value: prospect?.deleted_at
          ? prospect.soft_delete_reason ?? 'Suppression enregistrée'
          : 'Prospect actif',
        status: (
          <Badge
            className={
              prospect?.deleted_at
                ? submissionPresentation.deleted.className
                : 'border-transparent bg-muted text-muted-foreground'
            }
          >
            {prospect?.deleted_at ? 'Supprimé' : 'Actif'}
          </Badge>
        ),
        updatedAtValue: prospect?.deleted_at ?? null,
        updatedAtLabel: formatDate(prospect?.deleted_at ?? null, true),
      },
    ],
    [conversion, prospect, submission],
  )

  const sortedSyncRows = useMemo(() => {
    const rows = [...syncRows]
    if (syncSortKey === 'updatedAt') {
      rows.sort((left, right) => {
        const delta = toTimestamp(left.updatedAtValue) - toTimestamp(right.updatedAtValue)
        return syncSortDirection === 'desc' ? -delta : delta
      })
    }
    return rows
  }, [syncRows, syncSortDirection, syncSortKey])

  const historyRows = useMemo(
    () =>
      history.map((event) => ({
        id: event.id,
        createdAtValue: event.created_at,
        createdAtLabel: formatDate(event.created_at, true),
        sourceSystem: event.source_system,
        progression: event.new_progression_status ?? 'Aucune progression',
        submissionStatus: event.new_submission_status ?? 'Aucune soumission',
        author: event.changed_by_user?.display_name ?? 'Système',
        detail: event.reason ?? 'Aucun commentaire fourni',
      })),
    [history],
  )

  const sortedHistoryRows = useMemo(() => {
    const rows = [...historyRows]
    if (historySortKey === 'createdAt') {
      rows.sort((left, right) => {
        const delta = toTimestamp(left.createdAtValue) - toTimestamp(right.createdAtValue)
        return historySortDirection === 'desc' ? -delta : delta
      })
    }
    return rows
  }, [historyRows, historySortDirection, historySortKey])

  if (!prospectId) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Identifiant de prospect manquant.
      </article>
    )
  }

  if (prospectQuery.isPending || historyQuery.isPending) {
    return <ProspectDetailSkeleton />
  }

  if (prospectQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(prospectQuery.error as ApiError).message}
      </article>
    )
  }

  if (historyQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(historyQuery.error as ApiError).message}
      </article>
    )
  }

  if (!prospect || !stage || !submission || !conversion) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Prospect introuvable.
      </article>
    )
  }

  return (
    <section className="app-section">
      <Dialog open={detailKey !== null} onOpenChange={(open) => !open && setDetailKey(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{activeDetailItem?.label ?? 'Détail'}</DialogTitle>
            <DialogDescription>
              {activeDetailItem?.description ?? 'Détail du prospect.'}
            </DialogDescription>
          </DialogHeader>
          {activeDetailItem ? (
            <CompactMetaItem
              label={activeDetailItem.label}
              value={activeDetailItem.value}
              className="border-border bg-background px-4 py-3"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <PageHeader
        beforeTitle={
          <Button asChild variant="ghost" size="icon" className="size-8 cursor-pointer rounded-lg">
            <Link to={backHref} aria-label="Retour">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
        title={prospect.contact_name}
        titleAddon={
          <>
            <Badge className={stage.className}>{stage.label}</Badge>
            <Badge className={submission.className}>{submission.label}</Badge>
            <Badge className={conversion.className}>{conversion.label}</Badge>
          </>
        }
        right={
          <PageHeaderToolbar>
            {resolvedAgentId ? (
              <Button asChild variant="outline" className="cursor-pointer">
                <Link to={`/agents/${resolvedAgentId}`}>
                  <UserRound className="mr-2 h-4 w-4" />
                  Voir l'affilié
                </Link>
              </Button>
            ) : null}
            {prospect.program_id ? (
              <Button asChild variant="outline" className="cursor-pointer">
                <Link to={`/programs/${prospect.program_id}`}>
                  <Workflow className="mr-2 h-4 w-4" />
                  Voir le programme
                </Link>
              </Button>
            ) : null}
          </PageHeaderToolbar>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <DetailSectionCard title="Profil prospect" className="h-full border-0">
          <div className="space-y-3">
            <EntityCardIdentity
              leading={
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-sm font-semibold text-primary">
                  {initials(prospect.contact_name)}
                </div>
              }
              title={prospect.contact_name}
              description={
                prospect.company_name ?? prospect.contact_email ?? 'Prospect sans société renseignée'
              }
              badge={<Badge variant="secondary">{prospect.source}</Badge>}
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {detailItems.map((item) => (
                <ClickableMetaCard key={item.key} onClick={() => setDetailKey(item.key)}>
                  <CompactMetaItem label={item.label} value={item.value} />
                </ClickableMetaCard>
              ))}
            </div>
          </div>
        </DetailSectionCard>

        <DetailSectionCard
          title="Contexte commercial"
          description="Programme, affilié référent et état opérationnel de ce prospect."
          className="h-full border-0"
        >
          <div className="space-y-3">
            <RelationRow
              eyebrow="Programme"
              title={prospect.program_name ?? 'Aucun programme lié'}
              description={
                prospect.program_status
                  ? `Programme ${prospect.program_status}`
                  : 'Aucun statut de programme disponible'
              }
              to={prospect.program_id ? `/programs/${prospect.program_id}` : null}
              badge={
                prospect.program_status ? (
                  <Badge
                    className={cn(
                      'capitalize',
                      prospect.program_status === 'active'
                        ? 'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                        : prospect.program_status === 'paused'
                          ? 'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
                          : 'border-transparent bg-muted text-muted-foreground',
                    )}
                  >
                    {prospect.program_status}
                  </Badge>
                ) : null
              }
            />

            <RelationRow
              eyebrow="Affilié"
              title={prospect.agent_name ?? 'Aucun affilié lié'}
              description={prospect.agent_email ?? 'Aucune adresse de contact'}
              to={resolvedAgentId ? `/agents/${resolvedAgentId}` : null}
              badge={<Badge variant="secondary">Affilié</Badge>}
            />

            <RelationRow
              eyebrow="Synchronisation"
              title={submission.label}
              description={
                prospect.iacrm_status_label
                  ? `Retour IACRM: ${prospect.iacrm_status_label}`
                  : 'Aucun retour IACRM disponible pour le moment'
              }
              badge={<Badge className={submission.className}>{submission.label}</Badge>}
            />

            {prospect.sync_error_message ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-300">
                <p className="font-medium">Dernière erreur de synchronisation</p>
                <p className="mt-1 text-sm/6">{prospect.sync_error_message}</p>
              </div>
            ) : null}

            {prospect.deleted_at ? (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-800 dark:text-rose-300">
                <p className="font-medium">Prospect supprimé</p>
                <p className="mt-1 text-sm/6">
                  Supprimé le {formatDate(prospect.deleted_at, true)}
                  {prospect.soft_delete_reason ? ` — ${prospect.soft_delete_reason}` : ''}
                </p>
              </div>
            ) : null}
          </div>
        </DetailSectionCard>
      </div>

      <div className="space-y-4">
        <DetailSectionCard
          title="Synchronisation"
          description="Trace métier, états de conversion et échanges avec IACRM."
          right={<Badge variant="secondary">{syncRows.length.toLocaleString('fr-FR')} repères</Badge>}
          className="border-0"
        >
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Élément</TableHead>
                  <TableHead>Valeur</TableHead>
                  <TableHead>Statut</TableHead>
                  <SortableTableHead
                    sortKey="updatedAt"
                    activeKey={syncSortKey}
                    direction={syncSortDirection}
                    onSort={() => {
                      setSyncSortKey('updatedAt')
                      setSyncSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'))
                    }}
                    className="text-right"
                    align="right"
                  >
                    Dernière mise à jour
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSyncRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium text-foreground">{row.element}</TableCell>
                    <TableCell className="max-w-[24rem] whitespace-normal text-muted-foreground">
                      {row.value}
                    </TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {row.updatedAtLabel}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DetailSectionCard>

        <DetailSectionCard
          id="prospect-history"
          title="Historique"
          description="Chaque changement de statut ou de progression enregistré pour ce prospect."
          right={<Badge variant="secondary">{history.length.toLocaleString('fr-FR')} événements</Badge>}
          className="border-0"
        >
          {sortedHistoryRows.length === 0 ? (
            <DetailEmptyState message="Aucun événement n'a encore été enregistré pour ce prospect." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      sortKey="createdAt"
                      activeKey={historySortKey}
                      direction={historySortDirection}
                      onSort={() => {
                        setHistorySortKey('createdAt')
                        setHistorySortDirection((current) => (current === 'desc' ? 'asc' : 'desc'))
                      }}
                    >
                      Date
                    </SortableTableHead>
                    <TableHead>Système</TableHead>
                    <TableHead>Progression</TableHead>
                    <TableHead>Soumission</TableHead>
                    <TableHead>Auteur</TableHead>
                    <TableHead className="min-w-[18rem]">Détail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHistoryRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-muted-foreground">{row.createdAtLabel}</TableCell>
                      <TableCell className="uppercase tracking-[0.12em] text-muted-foreground">
                        {row.sourceSystem}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.progression}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.submissionStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-foreground">{row.author}</TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">
                        {row.detail}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DetailSectionCard>
      </div>
    </section>
  )
}
