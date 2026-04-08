import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApiError } from '@/lib/api'
import type { ExchangePackRecord } from '@/types/programs'
import {
  createExchangePack,
  deleteExchangePack,
  fetchExchangePacks,
  updateExchangePackStatus,
  updateExchangePack,
} from '../../programs/api'
import { ExchangePackCard, ExchangePackCardSkeleton } from '../components/ExchangePackCard'
import {
  ExchangePackDeleteDialog,
  ExchangePackFormDialog,
} from '../components/ExchangePackDialogs'

type ExchangePackStatusFilter = 'active' | 'inactive' | 'all'
type ExchangePackSortOption =
  | 'updated-desc'
  | 'updated-asc'
  | 'name-asc'
  | 'name-desc'
  | 'items-desc'
  | 'programs-desc'

function exchangePackListQueryKey(status: ExchangePackStatusFilter, sort: ExchangePackSortOption) {
  return ['exchange-packs', 'list', status, sort]
}

export function ExchangePacksPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingPack, setEditingPack] = useState<ExchangePackRecord | null>(null)
  const [deletingPack, setDeletingPack] = useState<ExchangePackRecord | null>(null)
  const rawStatus = searchParams.get('status')
  const rawSort = searchParams.get('sort')
  const statusFilter: ExchangePackStatusFilter =
    rawStatus === 'inactive' || rawStatus === 'all' ? rawStatus : 'active'
  const sortOption: ExchangePackSortOption =
    rawSort === 'updated-asc' ||
    rawSort === 'name-asc' ||
    rawSort === 'name-desc' ||
    rawSort === 'items-desc' ||
    rawSort === 'programs-desc'
      ? rawSort
      : 'updated-desc'

  const query = useQuery({
    queryKey: exchangePackListQueryKey(statusFilter, sortOption),
    queryFn: () => fetchExchangePacks({ status: statusFilter, sort: sortOption }),
  })

  const createMutation = useMutation({
    mutationFn: createExchangePack,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['exchange-packs', 'list'] })
      setFormOpen(false)
      navigate(`/exchange-packs/${result.data.id}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ packId, payload }: { packId: string; payload: { name: string; description: string | null } }) =>
      updateExchangePack(packId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['exchange-packs', 'list'] })
      setEditingPack(null)
      setFormOpen(false)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ packId, status }: { packId: string; status: 'active' | 'inactive' }) =>
      updateExchangePackStatus(packId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['exchange-packs', 'list'] })
      await queryClient.invalidateQueries({ queryKey: ['exchange-packs', 'detail'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteExchangePack,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['exchange-packs', 'list'] })
      setDeletingPack(null)
    },
  })

  const packs = query.data?.data ?? []
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return packs

    return packs.filter((pack) => {
      if (pack.name.toLowerCase().includes(q)) return true
      if ((pack.description ?? '').toLowerCase().includes(q)) return true
      return pack.items.some((item) => item.title.toLowerCase().includes(q))
    })
  }, [packs, search])

  if (query.isPending) {
    return (
      <section className="app-section">
        <PageHeader
          title="Exchange packs"
          right={
            <PageHeaderToolbar>
              <div className="h-8 w-full rounded-md bg-muted sm:w-[320px]" />
              <div className="h-8 w-full rounded-md bg-muted sm:w-[150px]" />
              <div className="h-8 w-full rounded-md bg-muted sm:w-[180px]" />
              <div className="h-8 w-full rounded-md bg-muted sm:w-[112px]" />
            </PageHeaderToolbar>
          }
        />
        <div className="grid gap-3 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <ExchangePackCardSkeleton key={index} />
          ))}
        </div>
      </section>
    )
  }

  if (query.isError) {
    return (
      <article className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
        {(query.error as ApiError).message}
      </article>
    )
  }

  const mutationError =
    (createMutation.error as ApiError | null)
    ?? (updateMutation.error as ApiError | null)
    ?? null

  return (
    <section className="app-section">
      <PageHeader
        title="Exchange packs"
        right={
          <PageHeaderToolbar>
            <Field className="w-full sm:min-w-[240px] sm:max-w-[420px] sm:flex-1">
              <FieldLabel htmlFor="exchange-packs-search" className="sr-only">
                Rechercher un pack
              </FieldLabel>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="exchange-packs-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un pack ou un cadeau..."
                  className="pl-9"
                />
              </div>
            </Field>
            <Select
              value={statusFilter}
              onValueChange={(nextValue: ExchangePackStatusFilter) => {
                const nextParams = new URLSearchParams(searchParams)
                if (nextValue === 'active') {
                  nextParams.delete('status')
                } else {
                  nextParams.set('status', nextValue)
                }
                setSearchParams(nextParams)
              }}
            >
              <SelectTrigger size="sm" className="w-full cursor-pointer sm:w-auto sm:min-w-[108px] sm:shrink-0">
                <SelectValue placeholder="Actifs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="inactive">Désactivés</SelectItem>
                <SelectItem value="all">Tous</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sortOption}
              onValueChange={(nextValue: ExchangePackSortOption) => {
                const nextParams = new URLSearchParams(searchParams)
                if (nextValue === 'updated-desc') {
                  nextParams.delete('sort')
                } else {
                  nextParams.set('sort', nextValue)
                }
                setSearchParams(nextParams)
              }}
            >
              <SelectTrigger size="sm" className="w-full cursor-pointer sm:w-auto sm:min-w-[104px] sm:shrink-0">
                <SelectValue placeholder="Récents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated-desc">Récents</SelectItem>
                <SelectItem value="updated-asc">Anciens</SelectItem>
                <SelectItem value="name-asc">Nom A-Z</SelectItem>
                <SelectItem value="name-desc">Nom Z-A</SelectItem>
                <SelectItem value="items-desc">Cadeaux</SelectItem>
                <SelectItem value="programs-desc">Usage</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              className="cursor-pointer"
              onClick={() => {
                setEditingPack(null)
                setFormOpen(true)
              }}
            >
              <Plus className="size-4" />
              Créer un pack
            </Button>
          </PageHeaderToolbar>
        }
      />

      {filtered.length === 0 ? (
        <article className="rounded-lg border border-dashed border-border bg-muted/15 px-5 py-8 text-sm text-muted-foreground">
          Aucun pack ne correspond à la recherche actuelle.
        </article>
      ) : (
        <div className="grid gap-3 xl:grid-cols-3">
          {filtered.map((pack) => (
            <ExchangePackCard
              key={pack.id}
              pack={pack}
              onEdit={(nextPack) => {
                setEditingPack(nextPack)
                setFormOpen(true)
              }}
              onToggleStatus={(nextPack, nextStatus) => {
                void statusMutation.mutateAsync({ packId: nextPack.id, status: nextStatus })
              }}
              isUpdatingStatus={statusMutation.isPending && statusMutation.variables?.packId === pack.id}
              onDelete={setDeletingPack}
            />
          ))}
        </div>
      )}

      <ExchangePackFormDialog
        open={formOpen}
        pack={editingPack}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        error={mutationError}
        onClose={() => {
          setFormOpen(false)
          setEditingPack(null)
          createMutation.reset()
          updateMutation.reset()
        }}
        onSubmit={async (payload) => {
          if (editingPack) {
            await updateMutation.mutateAsync({ packId: editingPack.id, payload })
            return
          }
          await createMutation.mutateAsync(payload)
        }}
      />

      <ExchangePackDeleteDialog
        open={deletingPack !== null}
        pack={deletingPack}
        isSubmitting={deleteMutation.isPending}
        error={(deleteMutation.error as ApiError | null) ?? null}
        onClose={() => {
          setDeletingPack(null)
          deleteMutation.reset()
        }}
        onConfirm={async () => {
          if (!deletingPack) return
          await deleteMutation.mutateAsync(deletingPack.id)
        }}
      />
    </section>
  )
}
