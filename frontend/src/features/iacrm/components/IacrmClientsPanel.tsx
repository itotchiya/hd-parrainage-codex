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
  const { data, isPending, isError } = useIacrmClients()

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Loading IACRM clients...</p>
  }

  if (isError) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load clients from IACRM. Check your API configuration in Settings.
      </p>
    )
  }

  const clients = data?.data ?? []

  return (
    <article className="rounded-lg border border-border bg-card app-card-padding">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Client records
      </p>
      <h2 className="app-section-title mt-2">
        {clients.length} client{clients.length !== 1 ? 's' : ''} in IACRM
      </h2>

      <div className="mt-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Since</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.iacrm_id}>
                <TableCell className="font-medium">{client.company_name}</TableCell>
                <TableCell>{client.contact_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {client.contact_email ?? '-'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {client.contact_phone ?? '-'}
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
                    {client.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{client.since}</TableCell>
              </TableRow>
            ))}
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                  No clients found in IACRM.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </article>
  )
}
