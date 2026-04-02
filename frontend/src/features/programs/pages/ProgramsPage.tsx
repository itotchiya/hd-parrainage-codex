import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Plus } from 'lucide-react'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import {
  createProgram,
  fetchExchangePacks,
  fetchPrograms,
  pauseProgram,
  reactivateProgram,
  updateProgram,
} from '../api'
import { ProgramFormDialog } from '../components/ProgramFormDialog'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { ProgramCard } from '../components/ProgramCard'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  ProgramMutationPayload,
  ProgramRecord,
  ProgramStatus,
} from '../../../types/programs'

const programQueryKey = ['programs', 'list']
const exchangePackQueryKey = ['exchange-packs', 'list']

export function ProgramsPage() {
  const queryClient = useQueryClient()
  const { hasPermission } = useAuthSession()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ProgramStatus>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<ProgramRecord | null>(null)

  const programsQuery = useQuery({
    queryKey: programQueryKey,
    queryFn: fetchPrograms,
  })

  const packsQuery = useQuery({
    queryKey: exchangePackQueryKey,
    queryFn: fetchExchangePacks,
    enabled: hasPermission('exchange-pack.view'),
  })

  const createMutation = useMutation({
    mutationFn: createProgram,
    onSuccess: async () => {
      setDialogOpen(false)
      setEditingProgram(null)
      await queryClient.invalidateQueries({ queryKey: programQueryKey })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      programId,
      payload,
    }: {
      programId: string
      payload: ProgramMutationPayload
    }) => updateProgram(programId, payload),
    onSuccess: async () => {
      setDialogOpen(false)
      setEditingProgram(null)
      await queryClient.invalidateQueries({ queryKey: programQueryKey })
    },
  })

  const pauseMutation = useMutation({
    mutationFn: pauseProgram,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: programQueryKey })
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: reactivateProgram,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: programQueryKey })
    },
  })

  const programs = programsQuery.data?.data ?? []
  const packs = packsQuery.data?.data ?? []
  const ownerCanCreate = hasPermission('program.create')
  const mutationError = (createMutation.error ?? updateMutation.error) as ApiError | null

  const filteredPrograms = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return programs.filter((program) => {
      const matchesStatus = statusFilter === 'all' || program.status === statusFilter
      const matchesSearch =
        normalizedSearch.length === 0 ||
        program.name.toLowerCase().includes(normalizedSearch) ||
        (program.business_name ?? '').toLowerCase().includes(normalizedSearch) ||
        (program.description ?? '').toLowerCase().includes(normalizedSearch)

      return matchesStatus && matchesSearch
    })
  }, [programs, search, statusFilter])

  if (programsQuery.isPending) {
    return (
      <article className="app-panel text-sm text-muted-foreground">
        Loading program catalog...
      </article>
    )
  }

  if (programsQuery.isError) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(programsQuery.error as ApiError).message}
      </article>
    )
  }

  return (
    <section className="app-section">
      <PageHeader
        title="Programs"
        right={
          <PageHeaderToolbar>
          <Field className="w-full md:w-auto">
            <FieldLabel htmlFor="programs-search" className="sr-only">
              Search programs
            </FieldLabel>
            <div className="relative max-w-full md:w-[360px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="programs-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un programme..."
                className="pl-9"
              />
            </div>
          </Field>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | ProgramStatus)}>
            <SelectTrigger size="sm" className="w-full max-w-48 md:w-48">
              <SelectValue placeholder="All states" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Status</SelectLabel>
                <SelectItem value="all">All states</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {ownerCanCreate ? (
            <Button
              type="button"
              size="default"
              onClick={() => {
                setEditingProgram(null)
                setDialogOpen(true)
              }}
              className="gap-2"
            >
              <Plus className="size-4" aria-hidden />
              Create program
            </Button>
          ) : null}
          </PageHeaderToolbar>
        }
      />

      {filteredPrograms.length === 0 ? (
        <article className="app-panel">
          <p className="app-eyebrow">Program inventory</p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">
            No programs match the current filter.
          </h2>
        </article>
      ) : (
        <div className="app-grid xl:grid-cols-2">
          {filteredPrograms.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              togglePending={pauseMutation.isPending || reactivateMutation.isPending}
              onEdit={(next) => {
                setEditingProgram(next)
                setDialogOpen(true)
              }}
              onTogglePause={(next) => {
                if (next.status === 'paused') {
                  reactivateMutation.mutate(next.id)
                  return
                }
                pauseMutation.mutate(next.id)
              }}
            />
          ))}
        </div>
      )}

      <ProgramFormDialog
        open={dialogOpen}
        title={editingProgram ? 'Update program' : 'Create program'}
        submitLabel={editingProgram ? 'Save changes' : 'Create program'}
        packs={packs}
        initialProgram={editingProgram}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        error={mutationError}
        onClose={() => {
          setDialogOpen(false)
          setEditingProgram(null)
          createMutation.reset()
          updateMutation.reset()
        }}
        onSubmit={async (payload) => {
          try {
            if (editingProgram) {
              await updateMutation.mutateAsync({
                programId: editingProgram.id,
                payload,
              })
              return
            }

            await createMutation.mutateAsync(payload)
          } catch {
            // Mutation state already exposes the API error for inline rendering.
          }
        }}
      />
    </section>
  )
}
