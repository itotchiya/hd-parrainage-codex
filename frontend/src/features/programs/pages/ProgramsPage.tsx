import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Plus } from 'lucide-react'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import {
  activateProgram,
  archiveProgram,
  createProgram,
  deleteProgramFromArchive,
  fetchExchangePacks,
  fetchProgramAssignments,
  fetchPrograms,
  pauseProgram,
  reactivateProgram,
  suspendProgram,
  syncProgramAssignments,
  updateProgram,
} from '../api'
import { fetchAgents } from '../../agents/api'
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
  AssignedAgent,
  ProgramMutationPayload,
  ProgramRecord,
  ProgramStatus,
} from '../../../types/programs'
import type { AgentRecord } from '../../../types/agents'

const programQueryKey = ['programs', 'list']
const exchangePackQueryKey = ['exchange-packs', 'list']

export function ProgramsPage() {
  const queryClient = useQueryClient()
  const { hasPermission } = useAuthSession()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ProgramStatus>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<ProgramRecord | null>(null)
  const [assignDialogProgram, setAssignDialogProgram] = useState<ProgramRecord | null>(null)
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])

  const programsQuery = useQuery({
    queryKey: programQueryKey,
    queryFn: fetchPrograms,
  })

  const packsQuery = useQuery({
    queryKey: exchangePackQueryKey,
    queryFn: fetchExchangePacks,
    enabled: hasPermission('exchange-pack.view'),
  })

  const agentsQuery = useQuery({
    queryKey: ['agents', 'list'],
    queryFn: fetchAgents,
    enabled: hasPermission('agent.view'),
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

  const activateMutation = useMutation({
    mutationFn: activateProgram,
    onSuccess: async () => {
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

  const suspendMutation = useMutation({
    mutationFn: suspendProgram,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: programQueryKey })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: archiveProgram,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: programQueryKey })
    },
  })

  const deleteArchivedMutation = useMutation({
    mutationFn: deleteProgramFromArchive,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: programQueryKey })
    },
  })

  const assignmentQuery = useQuery({
    queryKey: ['programs', 'assignments', assignDialogProgram?.id],
    queryFn: async () => {
      if (!assignDialogProgram) {
        return { data: [] as AssignedAgent[] }
      }
      return fetchProgramAssignments(assignDialogProgram.id)
    },
    enabled: Boolean(assignDialogProgram?.id),
  })

  const syncAssignmentsMutation = useMutation({
    mutationFn: ({ programId, agentIds }: { programId: string; agentIds: string[] }) =>
      syncProgramAssignments(programId, agentIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: programQueryKey })
      if (assignDialogProgram?.id) {
        await queryClient.invalidateQueries({
          queryKey: ['programs', 'assignments', assignDialogProgram.id],
        })
      }
      setAssignDialogProgram(null)
      setSelectedAgentIds([])
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
                <SelectItem value="suspended">Suspended</SelectItem>
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
        <div className="app-grid md:grid-cols-2 xl:grid-cols-3">
          {filteredPrograms.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              togglePending={
                pauseMutation.isPending || reactivateMutation.isPending || suspendMutation.isPending
              }
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
              onLiftSuspension={(next) => reactivateMutation.mutate(next.id)}
              onActivateDraft={(next) => activateMutation.mutate(next.id)}
              onSuspend={(next) => suspendMutation.mutate(next.id)}
              onArchive={(next) => archiveMutation.mutate(next.id)}
              onDeleteArchived={(next) => {
                const confirmed = window.confirm(
                  `Soft-delete "${next.name}"? Allowed when the program is archived, or when it has no assigned agents and no prospects.`,
                )
                if (!confirmed) {
                  return
                }
                deleteArchivedMutation.mutate(next.id)
              }}
              onAssignAgents={(next) => {
                setAssignDialogProgram(next)
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

      {assignDialogProgram ? (
        <section className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 py-8 backdrop-blur-sm">
          <article className="w-full max-w-2xl rounded-lg border border-border bg-card app-card-padding">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="app-dialog-title">Assign agents to {assignDialogProgram.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Select active agents to attach to this program.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAssignDialogProgram(null)
                  setSelectedAgentIds([])
                }}
              >
                Close
              </Button>
            </div>

            <div className="mt-5 space-y-2">
              {(agentsQuery.data?.data ?? []).map((agent: AgentRecord) => {
                const assignmentAgentIds = (assignmentQuery.data?.data ?? [])
                  .map((assignment) => assignment.agent?.id)
                  .filter((value): value is string => Boolean(value))
                const isChecked =
                  selectedAgentIds.includes(agent.id) ||
                  (selectedAgentIds.length === 0 && assignmentAgentIds.includes(agent.id))

                return (
                  <label
                    key={agent.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span>
                      {agent.display_name ?? agent.email ?? 'Agent'}{' '}
                      <span className="text-muted-foreground">({agent.status})</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(event) => {
                        setSelectedAgentIds((current) => {
                          const base =
                            current.length > 0
                              ? current
                              : assignmentAgentIds
                          if (event.target.checked) {
                            if (base.includes(agent.id)) {
                              return base
                            }
                            return [...base, agent.id]
                          }
                          return base.filter((id) => id !== agent.id)
                        })
                      }}
                    />
                  </label>
                )
              })}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAssignDialogProgram(null)
                  setSelectedAgentIds([])
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={syncAssignmentsMutation.isPending}
                onClick={() => {
                  const assignmentAgentIds = (assignmentQuery.data?.data ?? [])
                    .map((assignment) => assignment.agent?.id)
                    .filter((value): value is string => Boolean(value))
                  const nextAgentIds =
                    selectedAgentIds.length > 0 ? selectedAgentIds : assignmentAgentIds
                  syncAssignmentsMutation.mutate({
                    programId: assignDialogProgram.id,
                    agentIds: nextAgentIds,
                  })
                }}
              >
                {syncAssignmentsMutation.isPending ? 'Saving...' : 'Save assignments'}
              </Button>
            </div>
          </article>
        </section>
      ) : null}
    </section>
  )
}
