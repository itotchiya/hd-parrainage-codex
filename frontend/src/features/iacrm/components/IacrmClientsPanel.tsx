import { useTranslation } from 'react-i18next'
import { useIacrmClients } from '../hooks'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function IacrmClientsPanel() {
  const { t } = useTranslation()
  const { data, isPending, isError } = useIacrmClients()

  if (isPending) {
    return <p className="text-sm text-muted-foreground">{t('iacrm.panels.clients.loading')}</p>
  }

  if (isError) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {t('iacrm.panels.clients.error')}
      </p>
    )
  }

  const clients = data?.data ?? []

  return (
    <article className="rounded-lg border border-border bg-card app-card-padding">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {t('iacrm.panels.clients.eyebrow')}
      </p>
      <h2 className="app-section-title mt-2">
        {t('iacrm.panels.clients.title', { count: clients.length })}
      </h2>

      <div className="mt-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('iacrm.panels.clients.columns.company')}</TableHead>
              <TableHead>{t('iacrm.panels.clients.columns.contact')}</TableHead>
              <TableHead>{t('iacrm.panels.clients.columns.email')}</TableHead>
              <TableHead>{t('iacrm.panels.clients.columns.phone')}</TableHead>
              <TableHead>{t('iacrm.panels.clients.columns.status')}</TableHead>
              <TableHead>{t('iacrm.panels.clients.columns.since')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.iacrm_id}>
                <TableCell className="font-medium">{client.company_name}</TableCell>
                <TableCell>{client.contact_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {client.contact_email ?? '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {client.contact_phone ?? '—'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      client.status === 'active'
                        ? 'border-emerald-300 bg-emerald-500/10 text-emerald-800'
                        : 'border-border bg-muted/40 text-muted-foreground'
                    }
                  >
                    {client.status === 'active' ? t('common.active') : t('common.inactive')}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{client.since}</TableCell>
              </TableRow>
            ))}
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  {t('iacrm.panels.clients.empty')}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </article>
  )
}
