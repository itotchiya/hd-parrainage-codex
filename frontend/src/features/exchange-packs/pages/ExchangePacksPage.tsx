import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import { fetchExchangePacks } from '../../programs/api'
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
  const { user } = useAuthSession()
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
      <article className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading exchange packs...
      </article>
    )
  }

  if (query.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(query.error as ApiError).message}
      </article>
    )
  }

  return (
    <section className="space-y-5">
      <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Exchange packs
            </p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Reward catalog
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Active packs only. Descriptions stay short and the item grid carries the detail.
              </p>
            </div>
          </div>

          <div className="grid min-w-[280px] gap-3 sm:grid-cols-3 xl:w-[420px]">
            <MetricCard label="Business" value={user?.primary_business?.display_name ?? 'Global'} />
            <MetricCard label="Packs" value={packs.length.toString()} />
            <MetricCard label="Items" value={totalItems.toString()} />
          </div>
        </div>
      </article>

      <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
          placeholder="Search packs or reward items"
        />
      </article>

      {filtered.length === 0 ? (
        <article className="rounded-xl border border-dashed border-border bg-card px-5 py-6 text-sm text-muted-foreground">
          No exchange packs match the current filter.
        </article>
      ) : (
        <div className="space-y-4">
          {filtered.map((pack) => (
            <PackCard key={pack.id} pack={pack} />
          ))}
        </div>
      )}
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-muted/30 px-4 py-3">
      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 truncate text-lg font-semibold text-foreground">{value}</p>
    </article>
  )
}

function PackCard({ pack }: { pack: ExchangePackRecord }) {
  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Active pack
            </span>
            <span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {pack.items.length} items
            </span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{pack.name}</h2>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {pack.description ?? 'No description provided.'}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Updated {formatDate(pack.updated_at)}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {pack.items.map((item) => (
          <article key={item.id} className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {item.item_type}
            </p>
            <h3 className="mt-2 text-base font-semibold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
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
