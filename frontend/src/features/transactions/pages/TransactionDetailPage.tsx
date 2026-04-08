import { useQuery } from '@tanstack/react-query'
import {
  Banknote,
  CalendarClock,
  CircleDollarSign,
  Link2,
  RefreshCcw,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import {
  DetailMetaGrid,
  DetailMetaItem,
  DetailSectionCard,
} from '@/components/app/DetailPageKit'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { KpiCard, kpiSnapshotBadge } from '@/features/dashboard/components/KpiCard'
import { transactionStatusBadgeClass } from '@/features/dashboard/utils/semanticBadges'
import { ApiError } from '@/lib/api'

import { fetchTransaction } from '../api'

const invoiceBadgeClass = {
  pending: 'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
  paid: 'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  unpaid: 'border-transparent bg-muted text-muted-foreground',
  overdue: 'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
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

function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function TransactionDetailPage() {
  const { transactionId } = useParams<{ transactionId: string }>()

  const transactionQuery = useQuery({
    queryKey: ['transactions', 'detail', transactionId],
    queryFn: async () => fetchTransaction(transactionId ?? ''),
    enabled: Boolean(transactionId),
  })

  if (!transactionId) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Identifiant de transaction manquant.
      </article>
    )
  }

  if (transactionQuery.isPending) {
    return (
      <article className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Chargement de la transaction...
      </article>
    )
  }

  if (transactionQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(transactionQuery.error as ApiError).message}
      </article>
    )
  }

  const transaction = transactionQuery.data.data
  const transactionStatusClass = transactionStatusBadgeClass(transaction.status)
  const invoiceClass = transaction.invoice_status
    ? invoiceBadgeClass[transaction.invoice_status]
    : 'border-transparent bg-muted text-muted-foreground'

  return (
    <section className="app-section">
      <PageHeader
        title={transaction.transaction_reference}
        titleAddon={
          <>
            <Badge className={transactionStatusClass}>{transaction.status}</Badge>
            {transaction.invoice_status ? (
              <Badge className={invoiceClass}>Facture {transaction.invoice_status}</Badge>
            ) : null}
          </>
        }
        right={
          <PageHeaderToolbar>
            {transaction.prospect ? (
              <Button asChild variant="outline">
                <Link to={`/prospects/${transaction.prospect.id}`}>Ouvrir le prospect</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link to="/transactions">Retour</Link>
            </Button>
          </PageHeaderToolbar>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Montant"
          value={formatCurrency(transaction.amount, transaction.currency_code)}
          description="Valeur commerciale reconnue"
          badge={kpiSnapshotBadge(transaction.product_name)}
          icon={Banknote}
          tone="success"
        />
        <KpiCard
          title="Points attribués"
          value={
            transaction.points_awarded === null
              ? 'En attente'
              : `${transaction.points_awarded.toLocaleString('fr-FR')} pts`
          }
          description="Crédit affilié généré"
          badge={kpiSnapshotBadge(transaction.program_name ?? 'Sans programme')}
          icon={CircleDollarSign}
          tone="primary"
        />
        <KpiCard
          title="Survenue"
          value={formatDate(transaction.occurred_at)}
          description="Date métier de la transaction"
          badge={kpiSnapshotBadge(transaction.agent_name ?? 'Sans agent')}
          icon={CalendarClock}
          tone="warning"
        />
        <KpiCard
          title="Dernière synchro"
          value={formatDate(transaction.last_synced_at)}
          description="Traçabilité IACRM"
          badge={kpiSnapshotBadge(transaction.iacrm_transaction_id ?? 'Aucune référence')}
          icon={RefreshCcw}
          tone="info"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <DetailSectionCard
          title="Vue d’ensemble"
          description="Références commerciales et dates de traitement."
        >
          <DetailMetaGrid className="xl:grid-cols-3">
            <DetailMetaItem label="Produit" value={transaction.product_name} />
            <DetailMetaItem
              label="Montant"
              value={formatCurrency(transaction.amount, transaction.currency_code)}
            />
            <DetailMetaItem
              label="Points"
              value={
                transaction.points_awarded === null
                  ? 'En attente'
                  : `${transaction.points_awarded.toLocaleString('fr-FR')} pts`
              }
            />
            <DetailMetaItem label="Programme" value={transaction.program_name ?? 'Aucun programme'} />
            <DetailMetaItem label="Affilié" value={transaction.agent_name ?? 'Aucun affilié'} />
            <DetailMetaItem label="Business" value={transaction.business_name ?? 'Plateforme'} />
            <DetailMetaItem label="Survenue" value={formatDate(transaction.occurred_at, true)} />
            <DetailMetaItem label="Validée" value={formatDate(transaction.validated_at, true)} />
            <DetailMetaItem label="Payée" value={formatDate(transaction.paid_at, true)} />
          </DetailMetaGrid>
        </DetailSectionCard>

        <DetailSectionCard
          title="Synchronisation et relation"
          description="Rattachement du prospect et références externes."
        >
          <DetailMetaGrid>
            <DetailMetaItem
              label="Référence IACRM"
              value={transaction.iacrm_transaction_id ?? 'Non disponible'}
            />
            <DetailMetaItem label="Dernière synchro" value={formatDate(transaction.last_synced_at, true)} />
            <DetailMetaItem label="Reconnaissance" value={formatDate(transaction.recognized_at, true)} />
            <DetailMetaItem label="Facture" value={transaction.invoice_status ?? 'Non renseignée'} />
          </DetailMetaGrid>

          <div className="mt-4 rounded-lg border border-border bg-muted/25 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Prospect lié
                </p>
                {transaction.prospect ? (
                  <>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {transaction.prospect.contact_name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {transaction.prospect.company_name ?? 'Sans société'} /{' '}
                      {transaction.prospect.pipeline_stage} / {transaction.prospect.conversion_status}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Cette transaction n’est reliée à aucun prospect local.
                  </p>
                )}
              </div>
              {transaction.prospect ? (
                <Button asChild variant="outline" size="sm">
                  <Link to={`/prospects/${transaction.prospect.id}`}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Ouvrir
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </DetailSectionCard>
      </div>
    </section>
  )
}
