import { useState } from 'react'
import {
  Briefcase,
  Building2,
  ChevronRight,
  Users,
  UserCheck,
  TrendingUp,
  Globe,
  ArrowLeft,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useIacrmPlatformBusinesses,
  useIacrmPlatformBusinessServices,
  useIacrmPlatformBusinessClients,
  useIacrmPlatformBusinessPipeline,
  useIacrmPlatformBusinessPipelineStages,
} from '../hooks'
import type { IacrmPlatformBusiness } from '../../../types/iacrm'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function BusinessStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'border-emerald-400 bg-emerald-500/10 text-emerald-800',
    inactive: 'border-border bg-muted/40 text-muted-foreground',
    suspended: 'border-red-300 bg-red-500/10 text-red-800',
  }
  const labels: Record<string, string> = {
    active: 'Actif',
    inactive: 'Inactif',
    suspended: 'Suspendu',
  }
  return (
    <Badge
      variant="outline"
      className={styles[status] ?? 'border-border bg-muted/40 text-muted-foreground'}
    >
      {labels[status] ?? status}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Business drill-down tabs
// ---------------------------------------------------------------------------

type DrillTab = 'services' | 'clients' | 'pipeline'

function BusinessDrillDown({
  business,
  onBack,
}: {
  business: IacrmPlatformBusiness
  onBack: () => void
}) {
  const [tab, setTab] = useState<DrillTab>('services')

  const servicesQuery = useIacrmPlatformBusinessServices(business.iacrm_id)
  const clientsQuery = useIacrmPlatformBusinessClients(business.iacrm_id)
  const pipelineQuery = useIacrmPlatformBusinessPipeline(business.iacrm_id)
  const stagesQuery = useIacrmPlatformBusinessPipelineStages(business.iacrm_id)

  const services = servicesQuery.data?.data ?? []
  const clients = clientsQuery.data?.data ?? []
  const prospects = pipelineQuery.data?.data ?? []
  const stages = stagesQuery.data?.data ?? []

  const drillTabs: Array<{ id: DrillTab; label: string; count: number }> = [
    { id: 'services', label: 'Services', count: business.services_count },
    { id: 'clients', label: 'Clients', count: business.clients_count },
    { id: 'pipeline', label: 'Pipeline', count: business.pipeline_count },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="size-3.5" />
          Retour
        </Button>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{business.display_name}</span>
          {business.legal_name !== business.display_name ? (
            <span className="text-xs text-muted-foreground">({business.legal_name})</span>
          ) : null}
          <BusinessStatusBadge status={business.status} />
        </div>
        {business.industry ? (
          <Badge variant="outline" className="ml-auto shrink-0">
            {business.industry}
          </Badge>
        ) : null}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10">
                <Briefcase className="size-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Services</p>
                <p className="text-xl font-bold text-foreground">{business.services_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <UserCheck className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Clients</p>
                <p className="text-xl font-bold text-foreground">{business.clients_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10">
                <TrendingUp className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pipeline</p>
                <p className="text-xl font-bold text-foreground">{business.pipeline_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {drillTabs.map((t) => (
          <Button
            key={t.id}
            type="button"
            size="sm"
            variant={t.id === tab ? 'default' : 'outline'}
            onClick={() => setTab(t.id)}
            className="gap-1.5"
          >
            {t.label}
            <Badge
              variant="outline"
              className={
                t.id === tab
                  ? 'border-white/30 bg-white/20 text-white'
                  : 'border-border bg-muted/40 text-muted-foreground'
              }
            >
              {t.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Services tab */}
      {tab === 'services' ? (
        <Card>
          <CardContent className="p-0">
            {servicesQuery.isPending ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">Prix unitaire</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        Aucun service trouvé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    services.map((s) => (
                      <TableRow key={s.iacrm_id}>
                        <TableCell>
                          <p className="font-medium">{s.name}</p>
                          {s.description ? (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {s.description}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{s.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {s.unit_price.toLocaleString('fr-FR', {
                            style: 'currency',
                            currency: s.currency,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              s.is_active
                                ? 'border-emerald-300 bg-emerald-500/10 text-emerald-800'
                                : 'border-border bg-muted/40 text-muted-foreground'
                            }
                          >
                            {s.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Clients tab */}
      {tab === 'clients' ? (
        <Card>
          <CardContent className="p-0">
            {clientsQuery.isPending ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Société</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Client depuis</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        Aucun client trouvé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients.map((c) => (
                      <TableRow key={c.iacrm_id}>
                        <TableCell className="font-medium">{c.contact_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.company_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.contact_email ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(c.since)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              c.status === 'active'
                                ? 'border-emerald-300 bg-emerald-500/10 text-emerald-800'
                                : 'border-border bg-muted/40 text-muted-foreground'
                            }
                          >
                            {c.status === 'active' ? 'Actif' : c.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Pipeline tab */}
      {tab === 'pipeline' ? (
        <div className="space-y-3">
          {/* Stage summary cards */}
          {stagesQuery.data && stages.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {stages.map((s) => (
                <Card key={s.stage}>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold">{s.count}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          <Card>
            <CardContent className="p-0">
              {pipelineQuery.isPending ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Société</TableHead>
                      <TableHead>Étape</TableHead>
                      <TableHead>Agent assigné</TableHead>
                      <TableHead>Créé le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prospects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                          Aucun prospect dans le pipeline.
                        </TableCell>
                      </TableRow>
                    ) : (
                      prospects.map((p) => (
                        <TableRow key={p.iacrm_id}>
                          <TableCell className="font-medium">{p.contact_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {p.company_name ?? '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{p.stage}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {p.assigned_agent ?? '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(p.created_at)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function PlatformIacrmSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main platform IACRM page
// ---------------------------------------------------------------------------

export function PlatformIacrmPage() {
  const [selectedBusiness, setSelectedBusiness] = useState<IacrmPlatformBusiness | null>(null)
  const query = useIacrmPlatformBusinesses()
  const businesses = query.data?.data ?? []

  const summary = businesses.reduce(
    (acc, b) => {
      acc.total++
      acc.services += b.services_count
      acc.clients += b.clients_count
      acc.pipeline += b.pipeline_count
      return acc
    },
    { total: 0, services: 0, clients: 0, pipeline: 0 },
  )

  if (query.isPending) return <PlatformIacrmSkeleton />

  if (query.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Impossible de charger les businesses IACRM. Vérifiez la configuration API dans Paramètres.
      </div>
    )
  }

  if (selectedBusiness) {
    return (
      <BusinessDrillDown
        business={selectedBusiness}
        onBack={() => setSelectedBusiness(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Businesses</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10">
                <Briefcase className="size-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Services</p>
                <p className="text-2xl font-bold">{summary.services}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <Users className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Clients</p>
                <p className="text-2xl font-bold">{summary.clients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10">
                <TrendingUp className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pipeline</p>
                <p className="text-2xl font-bold">{summary.pipeline}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Businesses table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Vue globale
            </p>
            <p className="mt-0.5 text-base font-semibold text-foreground">
              {businesses.length} business{businesses.length !== 1 ? 'es' : ''} enregistré
              {businesses.length !== 1 ? 's' : ''} dans IACRM
            </p>
          </div>

          {businesses.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Globe className="size-9 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-foreground">Aucun business trouvé</p>
              <p className="mt-1 text-xs text-muted-foreground">
                L'API IACRM ne retourne aucun résultat pour /platform/businesses.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Secteur</TableHead>
                  <TableHead className="text-right">Services</TableHead>
                  <TableHead className="text-right">Clients</TableHead>
                  <TableHead className="text-right">Pipeline</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {businesses.map((b) => (
                  <TableRow
                    key={b.iacrm_id}
                    className="cursor-pointer"
                    onClick={() => setSelectedBusiness(b)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{b.display_name}</p>
                        <p className="text-xs text-muted-foreground">{b.legal_name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {b.industry ?? '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {b.services_count}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {b.clients_count}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {b.pipeline_count}
                    </TableCell>
                    <TableCell>
                      <BusinessStatusBadge status={b.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
