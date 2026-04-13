import { useTranslation } from 'react-i18next'
import { useIacrmInvoices, useIacrmInvoiceSummary } from '../hooks'
import type { IacrmInvoiceStatus } from '../../../types/iacrm'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatAppCurrency } from '@/lib/locale'

const statusClass: Record<IacrmInvoiceStatus, string> = {
  pending: 'border-amber-300 bg-amber-500/10 text-amber-800',
  paid: 'border-green-400 bg-green-500/15 text-green-800',
  unpaid: 'border-red-300 bg-red-500/10 text-red-800',
  overdue: 'border-red-400 bg-red-500/15 text-red-900',
  cancelled: 'border-border bg-muted/40 text-muted-foreground',
}

export function IacrmInvoicesPanel() {
  const { t } = useTranslation()
  const summaryQuery = useIacrmInvoiceSummary()
  const invoicesQuery = useIacrmInvoices()

  const summary = summaryQuery.data?.data
  const invoices = invoicesQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {t('iacrm.panels.invoices.summary.totalInvoiced')}
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {summary ? formatAppCurrency(summary.total_amount, 'EUR') : '—'}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('iacrm.panels.invoices.summary.invoiceCount', { count: summary?.total_count ?? 0 })}
          </p>
        </article>

        <article className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700">{t('iacrm.panels.invoices.summary.paid')}</p>
          <p className="mt-2 text-lg font-semibold text-emerald-900">
            {summary ? formatAppCurrency(summary.paid_amount, 'EUR') : '—'}
          </p>
          <p className="text-xs text-emerald-700">
            {t('iacrm.panels.invoices.summary.invoiceCount', { count: summary?.paid_count ?? 0 })}
          </p>
        </article>

        <article className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-red-700">{t('iacrm.panels.invoices.summary.overdue')}</p>
          <p className="mt-2 text-lg font-semibold text-red-900">
            {summary ? formatAppCurrency(summary.overdue_amount, 'EUR') : '—'}
          </p>
          <p className="text-xs text-red-700">
            {t('iacrm.panels.invoices.summary.invoiceCount', { count: summary?.overdue_count ?? 0 })}
          </p>
        </article>
      </div>

      <article className="rounded-lg border border-border bg-card app-card-padding">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {t('iacrm.panels.invoices.eyebrow')}
        </p>
        <h2 className="app-section-title mt-2">
          {t('iacrm.panels.invoices.title', { count: invoices.length })}
        </h2>

        {invoicesQuery.isPending ? (
          <p className="mt-4 text-sm text-muted-foreground">{t('iacrm.panels.invoices.loading')}</p>
        ) : invoicesQuery.isError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {t('iacrm.panels.invoices.error')}
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('iacrm.panels.invoices.columns.reference')}</TableHead>
                  <TableHead>{t('iacrm.panels.invoices.columns.client')}</TableHead>
                  <TableHead className="text-right">{t('iacrm.panels.invoices.columns.amount')}</TableHead>
                  <TableHead>{t('iacrm.panels.invoices.columns.status')}</TableHead>
                  <TableHead>{t('iacrm.panels.invoices.columns.issued')}</TableHead>
                  <TableHead>{t('iacrm.panels.invoices.columns.due')}</TableHead>
                  <TableHead>{t('iacrm.panels.invoices.columns.paid')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.iacrm_id}>
                    <TableCell className="font-mono text-sm font-medium">{invoice.invoice_reference}</TableCell>
                    <TableCell>{invoice.client_name ?? invoice.client_id}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatAppCurrency(invoice.amount, 'EUR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusClass[invoice.status] ?? statusClass.pending}>
                        {t(`iacrm.panels.invoices.status.${invoice.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{invoice.issued_at}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{invoice.due_at}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{invoice.paid_at ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      {t('iacrm.panels.invoices.empty')}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        )}
      </article>
    </div>
  )
}
