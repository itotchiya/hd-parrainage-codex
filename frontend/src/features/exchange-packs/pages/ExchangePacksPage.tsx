import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Gift, Package, Search } from 'lucide-react'
import { ApiError } from '../../../lib/api'
import { fetchExchangePacks } from '../../programs/api'
import { KpiCard, kpiSnapshotBadge } from '../../dashboard/components/KpiCard'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { ExchangePackRecord } from '../../../types/programs'

function formatDate(value: string | null) {
  if (!value) {
    return 'Not available'
  }

  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ExchangePacksPage() {
  const [search, setSearch] = useState('')

  const query = useQuery({
    queryKey: ['exchange-packs', 'list'],
    queryFn: fetchExchangePacks,
  })

  const packs = query.data?.data ?? []
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) {
      return packs
    }

    return packs.filter((pack) => {
      if (pack.name.toLowerCase().includes(q)) {
        return true
      }

      if ((pack.description ?? '').toLowerCase().includes(q)) {
        return true
      }

      return pack.items.some((item) => item.title.toLowerCase().includes(q))
    })
  }, [packs, search])

  const totalItems = packs.reduce((sum, pack) => sum + pack.items.length, 0)

  if (query.isPending) {
    return (
      <article className="app-panel text-sm text-muted-foreground">Loading exchange packs...</article>
    )
  }

  if (query.isError) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(query.error as ApiError).message}
      </article>
    )
  }

  return (
    <section className="app-section">
      <PageHeader
        title="Exchange packs"
        right={
          <PageHeaderToolbar>
            <Field className="w-full sm:min-w-[200px] sm:max-w-[360px] sm:flex-1">
              <FieldLabel htmlFor="exchange-packs-search" className="sr-only">
                Search exchange packs
              </FieldLabel>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="exchange-packs-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search packs or reward items..."
                  className="pl-9"
                />
              </div>
            </Field>
          </PageHeaderToolbar>
        }
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <KpiCard
          title="Packs"
          value={packs.length.toString()}
          description="Active reward packs"
          badge={kpiSnapshotBadge('Catalog')}
          icon={Gift}
          tone="primary"
        />
        <KpiCard
          title="Items"
          value={totalItems.toString()}
          description="Reward line items across packs"
          badge={kpiSnapshotBadge('Rewards')}
          icon={Package}
          tone="success"
        />
      </div>

      {filtered.length === 0 ? (
        <article className="rounded-lg border border-dashed border-border bg-muted/15 px-5 py-6 text-sm text-muted-foreground">
          No exchange packs match the current filter.
        </article>
      ) : (
        <div className="app-section">
          {filtered.map((pack) => (
            <PackCard key={pack.id} pack={pack} />
          ))}
        </div>
      )}
    </section>
  )
}

function PackCard({ pack }: { pack: ExchangePackRecord }) {
  return (
    <article className="rounded-lg border border-border bg-card app-card-padding">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Active pack
            </span>
            <span className="rounded-md border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {pack.items.length} items
            </span>
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{pack.name}</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {pack.description ?? 'No description provided.'}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/15 px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">
          Updated {formatDate(pack.updated_at)}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {pack.items.map((item) => (
          <article key={item.id} className="rounded-lg border border-border bg-muted/15 p-4">
            <p className="app-eyebrow">{item.item_type}</p>
            <h3 className="mt-2 text-base font-semibold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.description ?? 'No reward description.'}
            </p>
            <p className="mt-3 text-sm font-semibold text-foreground">
              {item.points_cost.toLocaleString('en-GB')} pts
            </p>
          </article>
        ))}
      </div>
    </article>
  )
}
