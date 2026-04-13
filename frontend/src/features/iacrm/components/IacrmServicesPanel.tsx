import { useTranslation } from 'react-i18next'
import { useIacrmServices } from '../hooks'
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

export function IacrmServicesPanel() {
  const { t } = useTranslation()
  const { data, isPending, isError } = useIacrmServices()

  if (isPending) {
    return <p className="text-sm text-muted-foreground">{t('iacrm.panels.services.loading')}</p>
  }

  if (isError) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {t('iacrm.panels.services.error')}
      </p>
    )
  }

  const services = data?.data ?? []

  return (
    <article className="rounded-lg border border-border bg-card app-card-padding">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {t('iacrm.panels.services.eyebrow')}
      </p>
      <h2 className="app-section-title mt-2">
        {t('iacrm.panels.services.title', { count: services.length })}
      </h2>

      <div className="mt-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('iacrm.panels.services.columns.name')}</TableHead>
              <TableHead>{t('iacrm.panels.services.columns.category')}</TableHead>
              <TableHead className="text-right">{t('iacrm.panels.services.columns.unitPrice')}</TableHead>
              <TableHead>{t('iacrm.panels.services.columns.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.iacrm_id}>
                <TableCell>
                  <p className="font-medium">{service.name}</p>
                  {service.description ? (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {service.description}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{service.category}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatAppCurrency(service.unit_price, service.currency)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      service.is_active
                        ? 'border-emerald-300 bg-emerald-500/10 text-emerald-800'
                        : 'border-border bg-muted/40 text-muted-foreground'
                    }
                  >
                    {service.is_active ? t('common.active') : t('common.inactive')}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  {t('iacrm.panels.services.empty')}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </article>
  )
}
