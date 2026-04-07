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

const statusPresentation: Record<IacrmInvoiceStatus, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'border-amber-300 bg-amber-500/10 text-amber-800' },
  paid: { label: 'Payee', className: 'border-green-400 bg-green-500/15 text-green-800' },
  unpaid: { label: 'Impayee', className: 'border-red-300 bg-red-500/10 text-red-800' },
  overdue: { label: 'En retard', className: 'border-red-400 bg-red-500/15 text-red-900' },
  cancelled: { label: 'Annulee', className: 'border-border bg-muted/40 text-muted-foreground' },
}

function formatEur(amount: number) {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

export function IacrmInvoicesPanel() {
  const summaryQuery = useIacrmInvoiceSummary()
  const invoicesQuery = useIacrmInvoices()

  const summary = summaryQuery.data?.data
  const invoices = invoicesQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      {/* KPI summary */}
      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Total invoiced
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {summary ? formatEur(summary.total_amount) : '-'}
          </p>
          <p className="text-xs text-muted-foreground">
            {summary?.total_count ?? 0} invoice{(summary?.total_count ?? 0) !== 1 ? 's' : ''}
          </p>
        </article>

        <article className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700">Paid</p>
          <p className="mt-2 text-lg font-semibold text-emerald-900">
            {summary ? formatEur(summary.paid_amount) : '-'}
          </p>
          <p className="text-xs text-emerald-700">
            {summary?.paid_count ?? 0} invoice{(summary?.paid_count ?? 0) !== 1 ? 's' : ''}
          </p>
        </article>

        <article className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-red-700">Overdue</p>
          <p className="mt-2 text-lg font-semibold text-red-900">
            {summary ? formatEur(summary.overdue_amount) : '-'}
          </p>
          <p className="text-xs text-red-700">
            {summary?.overdue_count ?? 0} invoice{(summary?.overdue_count ?? 0) !== 1 ? 's' : ''}
          </p>
        </article>
      </div>

      {/* Invoice table */}
      <article className="rounded-lg border border-border bg-card app-card-padding">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Invoices
        </p>
        <h2 className="app-section-title mt-2">
          {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} in IACRM
        </h2>

        {invoicesQuery.isPending ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading invoices...</p>
        ) : invoicesQuery.isError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load invoices from IACRM.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const presentation =
                    statusPresentation[invoice.status] ?? statusPresentation.pending
                  return (
                    <TableRow key={invoice.iacrm_id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {invoice.invoice_reference}
                      </TableCell>
                      <TableCell>{invoice.client_name ?? invoice.client_id}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatEur(invoice.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={presentation.className}>
                          {presentation.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invoice.issued_at}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invoice.due_at}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invoice.paid_at ?? '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-sm text-muted-foreground py-8"
                    >
                      No invoices found in IACRM.
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
