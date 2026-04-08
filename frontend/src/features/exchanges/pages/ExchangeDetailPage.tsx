import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BadgeCheck,
  Banknote,
  CircleDashed,
  Coins,
  Gift,
  WalletCards,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import {
  DetailEmptyState,
  DetailMetaGrid,
  DetailMetaItem,
  DetailSectionCard,
} from '@/components/app/DetailPageKit'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { KpiCard, kpiSnapshotBadge } from '@/features/dashboard/components/KpiCard'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

import { useAuthSession } from '../../auth/session'
import {
  approveExchangeRequest,
  cancelExchangeRequest,
  completeExchangeRequest,
  fetchExchangeRequest,
  markExchangeRequestProcessing,
  rejectExchangeRequest,
} from '../api'
import type { ExchangeRequestStatus } from '../../../types/exchanges'

const statusPresentation: Record<
  ExchangeRequestStatus,
  { label: string; className: string }
> = {
  requested: {
    label: 'Demandée',
    className:
      'border-transparent bg-blue-500/15 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300',
  },
  approved: {
    label: 'Approuvée',
    className:
      'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
  },
  rejected: {
    label: 'Refusée',
    className:
      'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
  },
  processing: {
    label: 'Traitement',
    className:
      'border-transparent bg-indigo-500/15 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-300',
  },
  completed: {
    label: 'Terminée',
    className:
      'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  cancelled: {
    label: 'Annulée',
    className: 'border-transparent bg-muted text-muted-foreground',
  },
}

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

function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function ExchangeDetailPage() {
  const { exchangeRequestId } = useParams<{ exchangeRequestId: string }>()
  const queryClient = useQueryClient()
  const { user, hasPermission } = useAuthSession()
  const canApprove = hasPermission('exchange-request.approve')
  const canReject = hasPermission('exchange-request.reject')

  const exchangeQuery = useQuery({
    queryKey: ['exchange-requests', 'detail', exchangeRequestId],
    queryFn: async () => fetchExchangeRequest(exchangeRequestId ?? ''),
    enabled: Boolean(exchangeRequestId),
  })

  const invalidateExchangeState = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['exchange-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['points', 'summary'] }),
      queryClient.invalidateQueries({ queryKey: ['points', 'by-program'] }),
      queryClient.invalidateQueries({ queryKey: ['points', 'ledger'] }),
    ])
  }

  const approveMutation = useMutation({
    mutationFn: async () => approveExchangeRequest(exchangeRequestId ?? ''),
    onSuccess: invalidateExchangeState,
  })

  const rejectMutation = useMutation({
    mutationFn: async () => rejectExchangeRequest(exchangeRequestId ?? ''),
    onSuccess: invalidateExchangeState,
  })

  const processingMutation = useMutation({
    mutationFn: async () => markExchangeRequestProcessing(exchangeRequestId ?? ''),
    onSuccess: invalidateExchangeState,
  })

  const completeMutation = useMutation({
    mutationFn: async () => completeExchangeRequest(exchangeRequestId ?? ''),
    onSuccess: invalidateExchangeState,
  })

  const cancelMutation = useMutation({
    mutationFn: async () => cancelExchangeRequest(exchangeRequestId ?? ''),
    onSuccess: invalidateExchangeState,
  })

  if (!exchangeRequestId) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Identifiant de demande manquant.
      </article>
    )
  }

  if (exchangeQuery.isPending) {
    return (
      <article className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Chargement du payout...
      </article>
    )
  }

  if (exchangeQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(exchangeQuery.error as ApiError).message}
      </article>
    )
  }

  const exchange = exchangeQuery.data.data
  const status = statusPresentation[exchange.status]
  const isRequester = user?.id === exchange.requested_by_user_id
  const canCancel = isRequester && ['requested', 'approved', 'processing'].includes(exchange.status)
  const hasPendingMutation =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    processingMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending

  return (
    <section className="app-section">
      <PageHeader
        title={
          exchange.request_type === 'reward'
            ? exchange.requested_reward_title ??
              exchange.exchange_pack_item_title ??
              'Demande de récompense'
            : 'Demande de cash'
        }
        titleAddon={
          <>
            <Badge className={status.className}>{status.label}</Badge>
            <Badge variant="secondary">
              {exchange.request_type === 'reward' ? 'Récompense' : 'Cash'}
            </Badge>
          </>
        }
        right={
          <PageHeaderToolbar>
            {exchange.status === 'requested' && canApprove ? (
              <ActionButton
                label="Approuver"
                busy={hasPendingMutation}
                onClick={() => approveMutation.mutate()}
                primary
              />
            ) : null}
            {exchange.status === 'requested' && canReject ? (
              <ActionButton
                label="Refuser"
                busy={hasPendingMutation}
                onClick={() => rejectMutation.mutate()}
              />
            ) : null}
            {exchange.status === 'approved' && canApprove ? (
              <ActionButton
                label="En traitement"
                busy={hasPendingMutation}
                onClick={() => processingMutation.mutate()}
              />
            ) : null}
            {['approved', 'processing'].includes(exchange.status) && canApprove ? (
              <ActionButton
                label="Terminer"
                busy={hasPendingMutation}
                onClick={() => completeMutation.mutate()}
                primary
              />
            ) : null}
            {canCancel ? (
              <ActionButton
                label="Annuler"
                busy={hasPendingMutation}
                onClick={() => cancelMutation.mutate()}
              />
            ) : null}
            <Button asChild variant="outline">
              <Link to="/payouts">Retour</Link>
            </Button>
          </PageHeaderToolbar>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Points demandés"
          value={`${exchange.points_amount.toLocaleString('fr-FR')} pts`}
          description="Montant débité du solde affilié"
          badge={kpiSnapshotBadge(exchange.agent_name ?? 'Sans affilié')}
          icon={Coins}
          tone="warning"
        />
        <KpiCard
          title="Valeur cash"
          value={
            exchange.cash_amount === null
              ? 'N/A'
              : formatCurrency(exchange.cash_amount, exchange.currency_code)
          }
          description="Seulement pour les demandes cash"
          badge={kpiSnapshotBadge(exchange.program_name ?? 'Sans programme')}
          icon={Banknote}
          tone="success"
        />
        <KpiCard
          title="Demandée le"
          value={formatDate(exchange.requested_at)}
          description="Date de création de la demande"
          badge={kpiSnapshotBadge(exchange.requested_by_name ?? 'Utilisateur')}
          icon={CircleDashed}
          tone="info"
        />
        <KpiCard
          title="Pack lié"
          value={exchange.program_exchange_pack?.name ?? 'Aucun pack'}
          description="Catalogue utilisé par le programme"
          badge={kpiSnapshotBadge(`${exchange.ledger_entries.length} écritures`)}
          icon={WalletCards}
          tone="primary"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <DetailSectionCard
          title="Vue d’ensemble"
          description="Informations métier et responsables de validation."
        >
          <DetailMetaGrid className="xl:grid-cols-3">
            <DetailMetaItem label="Affilié" value={exchange.agent_name ?? 'Aucun affilié'} />
            <DetailMetaItem label="Programme" value={exchange.program_name ?? 'Aucun programme'} />
            <DetailMetaItem label="Business" value={exchange.business_name ?? 'Plateforme'} />
            <DetailMetaItem label="Demandée par" value={exchange.requested_by_name ?? 'Utilisateur inconnu'} />
            <DetailMetaItem label="Décideur" value={exchange.approved_by_name ?? 'En attente'} />
            <DetailMetaItem
              label="Récompense"
              value={exchange.exchange_pack_item_title ?? exchange.requested_reward_title ?? 'Non applicable'}
            />
            <DetailMetaItem label="Demandée le" value={formatDate(exchange.requested_at, true)} />
            <DetailMetaItem label="Approuvée le" value={formatDate(exchange.approved_at, true)} />
            <DetailMetaItem label="Terminée le" value={formatDate(exchange.completed_at, true)} />
          </DetailMetaGrid>

          {exchange.notes ? (
            <div className="mt-4 rounded-lg border border-border bg-muted/25 px-4 py-4 text-sm leading-6 text-muted-foreground">
              {exchange.notes}
            </div>
          ) : null}
        </DetailSectionCard>

        <DetailSectionCard
          title="Pack du programme"
          description="Récompenses visibles pour cette demande."
          right={
            <span className="text-xs text-muted-foreground">
              {exchange.ledger_entries.length} écritures
            </span>
          }
        >
          {exchange.program_exchange_pack ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/25 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-amber-500/15 p-2 text-amber-700 dark:text-amber-300">
                    <Gift className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {exchange.program_exchange_pack.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {exchange.program_exchange_pack.items.length} cadeaux disponibles
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {exchange.program_exchange_pack.items.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-lg border border-border bg-muted/20 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-sm font-semibold text-muted-foreground">
                        {item.points_cost.toLocaleString('fr-FR')} pts
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <DetailEmptyState message="Aucun pack actif n’est rattaché à ce programme. Le mode cash peut toutefois rester utilisable." />
          )}
        </DetailSectionCard>
      </div>

      <DetailSectionCard
        title="Journal comptable"
        description="Historique complet des écritures générées par cette demande."
        right={<span className="text-xs text-muted-foreground">{exchange.ledger_entries.length} entrées</span>}
      >
        <div className="space-y-3">
          {exchange.ledger_entries.length === 0 ? (
            <DetailEmptyState message="Aucune écriture n’a encore été enregistrée pour ce payout." />
          ) : (
            exchange.ledger_entries.map((entry) => (
              <article key={entry.id} className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {entry.entry_type} / {entry.entry_status}
                      </p>
                      <Badge variant="secondary">{entry.source}</Badge>
                    </div>
                    {entry.description ? (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.description}</p>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(entry.effective_at ?? entry.created_at, true)}
                  </p>
                </div>
                <DetailMetaGrid className="mt-4">
                  <DetailMetaItem
                    label="Delta points"
                    value={`${entry.points_delta.toLocaleString('fr-FR')} pts`}
                  />
                  <DetailMetaItem
                    label="État de la demande"
                    value={entry.exchange_request_status ?? 'Indisponible'}
                  />
                </DetailMetaGrid>
              </article>
            ))
          )}
        </div>
      </DetailSectionCard>
    </section>
  )
}

function ActionButton({
  label,
  busy,
  onClick,
  primary = false,
}: {
  label: string
  busy: boolean
  onClick: () => void
  primary?: boolean
}) {
  return (
    <Button
      type="button"
      disabled={busy}
      onClick={onClick}
      variant={primary ? 'default' : 'outline'}
      className={cn(primary ? '' : 'bg-transparent')}
    >
      {primary ? <BadgeCheck className="mr-2 h-4 w-4" /> : null}
      {label}
    </Button>
  )
}
