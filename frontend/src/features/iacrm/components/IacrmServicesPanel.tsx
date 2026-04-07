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

export function IacrmServicesPanel() {
  const { data, isPending, isError } = useIacrmServices()

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Loading IACRM services...</p>
  }

  if (isError) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load services from IACRM. Check your API configuration in Settings.
      </p>
    )
  }

  const services = data?.data ?? []

  return (
    <article className="rounded-lg border border-border bg-card app-card-padding">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Service catalogue
      </p>
      <h2 className="app-section-title mt-2">
        {services.length} service{services.length !== 1 ? 's' : ''} in IACRM
      </h2>

      <div className="mt-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.iacrm_id}>
                <TableCell>
                  <p className="font-medium">{service.name}</p>
                  {service.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {service.description}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{service.category}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {service.unit_price.toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: service.currency,
                  })}
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
                    {service.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                  No services found in IACRM.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </article>
  )
}
