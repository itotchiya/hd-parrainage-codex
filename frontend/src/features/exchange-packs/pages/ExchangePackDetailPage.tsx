import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ExternalLink, Gift, GripVertical, Loader2, MoreVertical, Pencil, Plus, Power, RotateCcw, Send, Trash2 } from 'lucide-react'

import { EntityCardIdentity } from '@/components/app/EntityCardIdentity'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { useAppBreadcrumbDetailTitle } from '@/layouts/AppShell'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IconTile } from '@/components/ui/icon-tile'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ApiError } from '@/lib/api'
import { exchangePackStatusBadgeClass, programStatusBadgeClass } from '@/features/dashboard/utils/semanticBadges'
import { cn } from '@/lib/utils'
import type { ExchangePackItem, ExchangePackRecord } from '@/types/programs'
import {
  deleteExchangePack,
  fetchExchangePack,
  reorderExchangePackItems,
  saveExchangePackAndNotifyAgents,
  updateExchangePackStatus,
} from '../../programs/api'
import {
  ExchangePackDeleteDialog,
  ExchangePackFormDialog,
  ExchangePackItemDeleteDialog,
  ExchangePackItemDialog,
} from '../components/ExchangePackDialogs'

function formatDate(value: string | null | undefined) {
  if (!value) return 'Date inconnue'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function detailQueryKey(packId: string | undefined) {
  return ['exchange-packs', 'detail', packId]
}

function listQueryKey() {
  return ['exchange-packs', 'list']
}

function moveItemId(itemIds: string[], draggedId: string, targetId: string) {
  const fromIndex = itemIds.indexOf(draggedId)
  const toIndex = itemIds.indexOf(targetId)

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return itemIds
  }

  const nextIds = [...itemIds]
  const [movedId] = nextIds.splice(fromIndex, 1)
  nextIds.splice(toIndex, 0, movedId)

  return nextIds
}

function makeTempItemId() {
  return `temp-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`
}

export function ExchangePackDetailPage() {
  const { packId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [packDialogOpen, setPackDialogOpen] = useState(false)
  const [deletingPack, setDeletingPack] = useState<ExchangePackRecord | null>(null)
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ExchangePackItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<ExchangePackItem | null>(null)
  const [usedProgramsDialogOpen, setUsedProgramsDialogOpen] = useState(false)
  const [itemSort, setItemSort] = useState<'manual' | 'points-asc' | 'points-desc'>('manual')
  const [isReorderMode, setIsReorderMode] = useState(false)
  const [draftPack, setDraftPack] = useState<ExchangePackRecord | null>(null)
  const [orderedItemIds, setOrderedItemIds] = useState<string[]>([])
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [hasOrderChanges, setHasOrderChanges] = useState(false)
  const [hasUnnotifiedChanges, setHasUnnotifiedChanges] = useState(false)
  const [leaveWarningOpen, setLeaveWarningOpen] = useState(false)
  const dirtyOrderRef = useRef(false)
  const orderedItemIdsRef = useRef<string[]>([])
  const reorderBaseItemIdsRef = useRef<string[]>([])
  const packIdRef = useRef<string | null>(null)
  const lastDragOverItemIdRef = useRef<string | null>(null)
  const itemCardRefs = useRef(new Map<string, HTMLDivElement>())
  const previousItemRectsRef = useRef(new Map<string, DOMRect>())
  const hasDraftChangesRef = useRef(false)

  const query = useQuery({
    queryKey: detailQueryKey(packId),
    queryFn: () => fetchExchangePack(packId!),
    enabled: Boolean(packId),
  })

  const savedPack = query.data?.data ?? null
  const pack = draftPack ?? savedPack

  useAppBreadcrumbDetailTitle(pack?.name ?? null)

  const invalidatePack = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: detailQueryKey(packId) }),
      queryClient.invalidateQueries({ queryKey: listQueryKey() }),
      queryClient.invalidateQueries({ queryKey: ['exchange-packs'] }),
      queryClient.invalidateQueries({ queryKey: ['programs'] }),
    ])
  }

  const saveDraftAndNotifyMutation = useMutation({
    mutationFn: (nextPack: ExchangePackRecord) =>
      saveExchangePackAndNotifyAgents(nextPack.id, {
        name: nextPack.name,
        description: nextPack.description,
        items: [...nextPack.items]
          .sort((a, b) => a.display_order - b.display_order)
          .map((item) => ({
            id: item.id.startsWith('temp-') ? null : item.id,
            title: item.title,
            points_cost: item.points_cost,
          })),
      }),
    onSuccess: async (response) => {
      setHasUnnotifiedChanges(false)
      setHasOrderChanges(false)
      setIsReorderMode(false)
      setDraftPack(response.data)
      queryClient.setQueryData(detailQueryKey(packId), response)
      await invalidatePack()
    },
  })

  const deletePackMutation = useMutation({
    mutationFn: deleteExchangePack,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: listQueryKey() })
      navigate('/exchange-packs')
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ nextStatus, nextPackId }: { nextStatus: 'active' | 'inactive'; nextPackId: string }) =>
      updateExchangePackStatus(nextPackId, nextStatus),
    onSuccess: async (response) => {
      setDraftPack(response.data)
      queryClient.setQueryData(detailQueryKey(packId), response)
      await invalidatePack()
    },
  })

  const reorderItemsMutation = useMutation({
    mutationFn: ({ nextPack, itemIds }: { nextPack: ExchangePackRecord; itemIds: string[] }) =>
      reorderExchangePackItems(nextPack.id, itemIds),
    onSuccess: async () => {
      dirtyOrderRef.current = false
      setHasOrderChanges(false)
      setIsReorderMode(false)
      setDraftPack(null)
      await invalidatePack()
    },
  })

  useEffect(() => {
    if (!savedPack || hasUnnotifiedChanges || hasOrderChanges) return

    setDraftPack(savedPack)

    const itemIdsByOrder = [...savedPack.items]
      .sort((a, b) => a.display_order - b.display_order)
      .map((item) => item.id)

    setOrderedItemIds(itemIdsByOrder)
    orderedItemIdsRef.current = itemIdsByOrder
    packIdRef.current = savedPack.id
    dirtyOrderRef.current = false
    setHasOrderChanges(false)
  }, [hasOrderChanges, hasUnnotifiedChanges, savedPack])

  useEffect(() => {
    orderedItemIdsRef.current = orderedItemIds
  }, [orderedItemIds])

  useEffect(() => {
    dirtyOrderRef.current = hasOrderChanges
  }, [hasOrderChanges])

  useEffect(() => {
    hasDraftChangesRef.current = hasUnnotifiedChanges || hasOrderChanges
  }, [hasOrderChanges, hasUnnotifiedChanges])

  const sortedItems = useMemo(
    () => {
      const items = pack?.items ?? []

      if (itemSort === 'manual') {
        const itemById = new Map(items.map((item) => [item.id, item]))
        const orderedItems = orderedItemIds
          .map((itemId) => itemById.get(itemId))
          .filter((item): item is ExchangePackItem => Boolean(item))
        const missingItems = items
          .filter((item) => !orderedItemIds.includes(item.id))
          .sort((a, b) => a.display_order - b.display_order)

        return [...orderedItems, ...missingItems]
      }

      return [...items].sort((a, b) => {
      const costDelta = itemSort === 'points-asc'
        ? a.points_cost - b.points_cost
        : b.points_cost - a.points_cost
      return costDelta || a.display_order - b.display_order
      })
    },
    [itemSort, orderedItemIds, pack?.items],
  )

  const hasDraftChanges = hasUnnotifiedChanges || hasOrderChanges
  const shouldWarnBeforeLeaving = hasDraftChanges
  const navigationBlocker = useBlocker(shouldWarnBeforeLeaving)

  useEffect(() => {
    if (navigationBlocker.state === 'blocked') {
      setLeaveWarningOpen(true)
    }
  }, [navigationBlocker.state])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasDraftChangesRef.current) return

      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  useLayoutEffect(() => {
    if (previousItemRectsRef.current.size === 0) return

    itemCardRefs.current.forEach((node, itemId) => {
      const previousRect = previousItemRectsRef.current.get(itemId)
      if (!previousRect) return

      const nextRect = node.getBoundingClientRect()
      const deltaX = previousRect.left - nextRect.left
      const deltaY = previousRect.top - nextRect.top

      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return

      node.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: 'translate(0, 0)' },
        ],
        {
          duration: 180,
          easing: 'cubic-bezier(0.2, 0, 0, 1)',
        },
      )
    })

    previousItemRectsRef.current.clear()
  }, [sortedItems])

  if (query.isPending) {
    return <ExchangePackDetailSkeleton />
  }

  if (query.isError) {
    return (
      <article className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
        {(query.error as ApiError).message}
      </article>
    )
  }

  if (!pack) {
    return null
  }

  const activeItemsCount = pack.active_items_count ?? pack.items.length
  const linkedProgramsCount = pack.linked_programs_count ?? 0
  const linkedPrograms = pack.linked_programs ?? []
  const visibleLinkedPrograms = linkedPrograms.slice(0, 2)
  const hiddenLinkedProgramsCount = Math.max(0, linkedPrograms.length - visibleLinkedPrograms.length)
  const canUpdate = pack.actions?.can_update ?? true
  const canDelete = pack.actions?.can_delete ?? linkedProgramsCount === 0
  const canDisable = pack.actions?.can_disable ?? (pack.status === 'active' && linkedProgramsCount === 0)
  const canActivate = pack.actions?.can_activate ?? pack.status === 'inactive'
  const shouldShowSaveAction = hasDraftChanges && canUpdate
  const saveActionLabel = hasUnnotifiedChanges && linkedProgramsCount > 0
    ? 'Sauvegarder et notifier'
    : 'Sauvegarder'
  const savingDraft = saveDraftAndNotifyMutation.isPending || reorderItemsMutation.isPending
  const disableBlockedReason =
    !canDisable && linkedProgramsCount > 0
      ? "Impossible de désactiver ce pack tant qu'il est utilisé par un programme."
      : !canDisable
        ? "Vous n'avez pas la permission de désactiver ce pack."
        : null
  const deleteBlockedReason = canDelete
    ? null
    : linkedProgramsCount > 0
      ? "Impossible de supprimer ce pack tant qu'il est utilisé par un programme."
      : "Vous n'avez pas la permission de supprimer ce pack."

  const orderedPackItemIds = [...pack.items]
    .sort((a, b) => a.display_order - b.display_order)
    .map((item) => item.id)
  const canReorderItems = canUpdate && pack.items.length > 1
  const applyDraftItemOrder = (itemIds: string[]) => {
    setDraftPack((currentPack) => {
      const editablePack = currentPack ?? pack

      const itemById = new Map(editablePack.items.map((item) => [item.id, item]))
      const orderedItems = itemIds
        .map((itemId, index) => {
          const item = itemById.get(itemId)
          return item ? { ...item, display_order: index + 1 } : null
        })
        .filter((item): item is ExchangePackItem => Boolean(item))
      const missingItems = editablePack.items
        .filter((item) => !itemIds.includes(item.id))
        .map((item, index) => ({ ...item, display_order: orderedItems.length + index + 1 }))

      return {
        ...editablePack,
        items: [...orderedItems, ...missingItems],
      }
    })
  }
  const saveDraftChanges = async () => {
    if (!hasDraftChanges) return

    if (hasUnnotifiedChanges) {
      await saveDraftAndNotifyMutation.mutateAsync(pack)
      return
    }

    await reorderItemsMutation.mutateAsync({
      nextPack: pack,
      itemIds: orderedItemIds,
    })
  }
  const finishReorderMode = () => {
    setIsReorderMode(false)
  }
  const startReorderMode = () => {
    setItemSort('manual')
    setOrderedItemIds(orderedPackItemIds)
    reorderBaseItemIdsRef.current = orderedPackItemIds
    setIsReorderMode(true)
    setHasOrderChanges(false)
  }
  const cancelReorderMode = () => {
    const baseItemIds = reorderBaseItemIdsRef.current.length ? reorderBaseItemIdsRef.current : orderedPackItemIds
    setOrderedItemIds(baseItemIds)
    applyDraftItemOrder(baseItemIds)
    setIsReorderMode(false)
    setDraggedItemId(null)
    lastDragOverItemIdRef.current = null
    setHasOrderChanges(false)
  }
  const moveDraggedItem = (targetItemId: string) => {
    if (!draggedItemId || draggedItemId === targetItemId) return
    if (lastDragOverItemIdRef.current === targetItemId) return

    lastDragOverItemIdRef.current = targetItemId
    previousItemRectsRef.current = new Map(
      Array.from(itemCardRefs.current.entries()).map(([itemId, node]) => [
        itemId,
        node.getBoundingClientRect(),
      ]),
    )

    setOrderedItemIds((currentItemIds) => {
      const nextItemIds = moveItemId(currentItemIds, draggedItemId, targetItemId)

      if (nextItemIds !== currentItemIds) {
        applyDraftItemOrder(nextItemIds)
        setHasOrderChanges(true)
      }

      return nextItemIds
    })
  }
  const discardDraftChanges = () => {
    if (savedPack) {
      const savedItemIds = [...savedPack.items]
        .sort((a, b) => a.display_order - b.display_order)
        .map((item) => item.id)

      setDraftPack(savedPack)
      setOrderedItemIds(savedItemIds)
      orderedItemIdsRef.current = savedItemIds
      reorderBaseItemIdsRef.current = []
    }

    setHasUnnotifiedChanges(false)
    setHasOrderChanges(false)
    setIsReorderMode(false)
    setDraggedItemId(null)
    lastDragOverItemIdRef.current = null
  }

  return (
    <section className="app-section">
      <PageHeader
        title={pack.name}
        beforeTitle={
            <Button type="button" variant="ghost" size="icon" className="cursor-pointer" onClick={() => navigate('/exchange-packs')} aria-label="Retour">
            <ArrowLeft className="size-4" />
          </Button>
        }
        titleAddon={
          <Badge variant="secondary" className={cn('border-0 px-2.5 py-1 text-xs', exchangePackStatusBadgeClass(pack.status))}>
            {pack.status === 'inactive' ? 'Désactivé' : 'Actif'}
          </Badge>
        }
        right={
          <PageHeaderToolbar>
            {shouldShowSaveAction ? (
              <Button
                type="button"
                onClick={() => void saveDraftChanges()}
                disabled={savingDraft}
                className="cursor-pointer"
              >
                {savingDraft ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {savingDraft ? 'Sauvegarde...' : saveActionLabel}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={!canUpdate}
              className="cursor-pointer"
              onClick={() => setPackDialogOpen(true)}
            >
              <Pencil className="size-4" />
              Modifier
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="icon" className="cursor-pointer" aria-label="Plus d'actions">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {pack.status === 'inactive' ? (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    disabled={!canActivate || updateStatusMutation.isPending}
                    onSelect={() => void updateStatusMutation.mutateAsync({ nextStatus: 'active', nextPackId: pack.id })}
                  >
                    {updateStatusMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                    Réactiver
                  </DropdownMenuItem>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            disabled={!canDisable || updateStatusMutation.isPending}
                            onSelect={() => void updateStatusMutation.mutateAsync({ nextStatus: 'inactive', nextPackId: pack.id })}
                          >
                            {updateStatusMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Power className="size-4" />}
                            Désactiver
                          </DropdownMenuItem>
                        </div>
                      </TooltipTrigger>
                      {disableBlockedReason ? (
                        <TooltipContent side="left">{disableBlockedReason}</TooltipContent>
                      ) : null}
                    </Tooltip>
                  </TooltipProvider>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={!canDelete}
                          className="cursor-pointer"
                          onSelect={() => setDeletingPack(pack)}
                        >
                          <Trash2 className="size-4" />
                          Supprimer le pack
                        </DropdownMenuItem>
                      </div>
                    </TooltipTrigger>
                    {deleteBlockedReason ? (
                      <TooltipContent side="left">{deleteBlockedReason}</TooltipContent>
                    ) : null}
                  </Tooltip>
                </TooltipProvider>
              </DropdownMenuContent>
            </DropdownMenu>
          </PageHeaderToolbar>
        }
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.55fr)]">
        <Card className="rounded-lg border-0 bg-card shadow-none">
          <CardContent className="flex h-full flex-col gap-3 p-5">
            <div className="max-w-3xl">
              <div className="flex min-w-0 items-center gap-2.5">
                <IconTile icon={Gift} className="bg-amber-500 text-white" />
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">Pack rewards</p>
              </div>
              <div className="mt-3">
                <EntityCardIdentity
                  title={pack.name}
                  description={pack.description ?? 'Aucune description pour ce pack.'}
                  className="gap-0"
                  titleClassName="text-[1.75rem] leading-none tracking-[-0.04em] md:text-[2rem]"
                  descriptionClassName="mt-1.5 max-w-3xl text-sm leading-6"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="border-0 bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-300">
                {activeItemsCount} cadeau{activeItemsCount === 1 ? '' : 'x'}
              </Badge>
              <Badge variant="secondary" className="border-0 bg-muted text-muted-foreground">
                {linkedProgramsCount} programme{linkedProgramsCount === 1 ? '' : 's"}
              </Badge>
              <Badge variant="secondary" className="border-0 bg-muted text-muted-foreground">
                Mis à jour {formatDate(pack.updated_at)}
              </Badge>
            </div>

            {activeItemsCount === 0 ? (
              <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
                <Gift />
                <AlertTitle>Pack non assignable</AlertTitle>
                <AlertDescription>
                  Ajoutez au moins un cadeau actif avant d'utiliser ce pack dans un programme rewards.
                </AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-0 bg-card shadow-none">
          <CardContent className="space-y-3 p-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Utilisé dans</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Programmes qui utilisent actuellement ce pack.
              </p>
            </div>

            {visibleLinkedPrograms.length ? (
              <div className="space-y-2">
                {visibleLinkedPrograms.map((program) => (
                  <Link
                    key={program.id}
                    to={`/programs/${program.id}`}
                    className="group block cursor-pointer rounded-lg border border-dashed border-border bg-muted/10 px-3 py-2.5 transition-colors hover:border-solid hover:bg-muted/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{program.name}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline" className="border-border bg-muted/30 text-muted-foreground">
                          {program.assigned_agents_count ?? 0} agent{program.assigned_agents_count === 1 ? "' : 's'}
                        </Badge>
                        <Badge variant="outline" className={programStatusBadgeClass(program.status)}>
                          {program.status}
                        </Badge>
                        <ExternalLink className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
                {hiddenLinkedProgramsCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setUsedProgramsDialogOpen(true)}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/10 p-3 text-left text-sm transition-colors hover:border-solid hover:bg-muted/30"
                  >
                    <span className="font-medium text-foreground">Voir tous les programmes</span>
                    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      +{hiddenLinkedProgramsCount} autre{hiddenLinkedProgramsCount === 1 ? '' : 's"}
                      <ExternalLink className="size-3.5" />
                    </span>
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
                Aucun programme n'utilise encore ce pack.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-foreground">Cadeaux du pack</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={itemSort}
              disabled={isReorderMode}
              onValueChange={(value) => setItemSort(value as typeof itemSort)}
            >
              <SelectTrigger className="w-full cursor-pointer sm:w-[190px]" aria-label="Trier les cadeaux">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Ordre du pack</SelectItem>
                <SelectItem value="points-asc">Moins chers</SelectItem>
                <SelectItem value="points-desc">Plus chers</SelectItem>
              </SelectContent>
            </Select>
            {isReorderMode ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelReorderMode}
                  disabled={reorderItemsMutation.isPending}
                  className="cursor-pointer"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={finishReorderMode}
                  disabled={!hasOrderChanges}
                  className="cursor-pointer"
                >
                  Terminer
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={!canReorderItems}
                className="cursor-pointer"
                onClick={startReorderMode}
              >
                <GripVertical className="size-4" />
                Organiser
              </Button>
            )}
            <Button
              type="button"
              disabled={!canUpdate || isReorderMode}
              className="cursor-pointer"
              onClick={() => {
                setEditingItem(null)
                setItemDialogOpen(true)
              }}
            >
              <Plus className="size-4" />
              Ajouter un cadeau
            </Button>
          </div>
        </div>

        {sortedItems.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sortedItems.map((item, index) => (
              <Card
                key={item.id}
                ref={(node) => {
                  if (node) {
                    itemCardRefs.current.set(item.id, node)
                  } else {
                    itemCardRefs.current.delete(item.id)
                  }
                }}
                draggable={isReorderMode}
                onDragStart={(event) => {
                  if (!isReorderMode) return

                  setDraggedItemId(item.id)
                  lastDragOverItemIdRef.current = null
                  event.dataTransfer.effectAllowed = "move'
                  event.dataTransfer.setData('text/plain', item.id)
                }}
                onDragOver={(event) => {
                  if (!isReorderMode || draggedItemId === item.id) return

                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                  moveDraggedItem(item.id)
                }}
                onDrop={(event) => {
                  if (!isReorderMode) return

                  event.preventDefault()
                  lastDragOverItemIdRef.current = null
                  setDraggedItemId(null)
                }}
                onDragEnd={() => {
                  lastDragOverItemIdRef.current = null
                  setDraggedItemId(null)
                }}
                className={`rounded-lg border-0 bg-card shadow-none transition-[opacity,transform,box-shadow] duration-150 ${
                  isReorderMode ? 'cursor-grab outline outline-1 outline-amber-500/20 active:cursor-grabbing' : ''
                } ${draggedItemId === item.id ? 'scale-[0.98] opacity-60 shadow-lg' : ''}`}
              >
                <CardContent className="relative p-5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-3 top-3 cursor-pointer"
                        disabled={isReorderMode}
                        aria-label={`Actions pour ${item.title}`}
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={!canUpdate}
                        className="cursor-pointer"
                        onSelect={() => {
                          setEditingItem(item)
                          setItemDialogOpen(true)
                        }}
                      >
                        <Pencil className="size-4" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={!canUpdate}
                        className="cursor-pointer"
                        onSelect={() => setDeletingItem(item)}
                      >
                        <Trash2 className="size-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="space-y-4 pr-8">
                    <div className="flex min-w-0 items-center gap-3">
                      <IconTile
                        size="sm"
                        className="bg-amber-500/10 text-amber-800 dark:text-amber-300"
                        icon={({ className }) => (
                          <span className={`${className} flex items-center justify-center text-sm font-semibold tabular-nums`}>
                            {index + 1}
                          </span>
                        )}
                      />
                      <h3 className="truncate text-base font-semibold leading-tight text-foreground">{item.title}</h3>
                    </div>
                    <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                      {item.points_cost.toLocaleString('fr-FR')}
                      <span className="ml-1 text-sm font-medium text-muted-foreground">pts</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/10 px-5 py-10 text-center">
            <p className="text-sm font-medium text-foreground">Aucun cadeau configuré</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ce pack peut exister vide, mais il ne pourra pas être assigné à un programme rewards.
            </p>
            <Button
              type="button"
              disabled={!canUpdate}
              className="mt-4 cursor-pointer"
              onClick={() => {
                setEditingItem(null)
                setItemDialogOpen(true)
              }}
            >
              <Plus className="size-4" />
              Ajouter le premier cadeau
            </Button>
          </div>
        )}
      </div>

      <Dialog open={usedProgramsDialogOpen} onOpenChange={setUsedProgramsDialogOpen}>
        <DialogContent className="max-h-[88vh] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Programmes utilisant ce pack</DialogTitle>
            <DialogDescription>
              Liste complète des programmes liés à {pack.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[56vh] space-y-2 overflow-y-auto pr-1">
            {linkedPrograms.map((program) => (
              <Link
                key={program.id}
                to={`/programs/${program.id}`}
                onClick={() => setUsedProgramsDialogOpen(false)}
                className="group block cursor-pointer rounded-lg border border-dashed border-border bg-muted/10 px-3 py-2.5 transition-colors hover:border-solid hover:bg-muted/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{program.name}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className="border-border bg-muted/30 text-muted-foreground">
                      {program.assigned_agents_count ?? 0} agent{program.assigned_agents_count === 1 ? '' : 's'}
                    </Badge>
                    <Badge variant="outline" className={programStatusBadgeClass(program.status)}>
                      {program.status}
                    </Badge>
                    <ExternalLink className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={leaveWarningOpen}
        onOpenChange={(isOpen) => {
          setLeaveWarningOpen(isOpen)
          if (!isOpen && navigationBlocker.state === 'blocked') {
            navigationBlocker.reset()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quitter sans sauvegarder ?</DialogTitle>
            <DialogDescription>
              Les changements non sauvegardés seront supprimés si vous quittez.
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
            <AlertTriangle />
            <AlertTitle>Brouillon en cours</AlertTitle>
            <AlertDescription>
              Sauvegardez pour conserver vos changements. L'ordre seul ne notifie pas les agents.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={savingDraft}
              className="cursor-pointer"
              onClick={() => {
                discardDraftChanges()
                setLeaveWarningOpen(false)
                navigationBlocker.proceed?.()
              }}
            >
              Ignorer
            </Button>
            <Button
              type="button"
              disabled={savingDraft}
              className="cursor-pointer"
              onClick={async () => {
                await saveDraftChanges()
                setLeaveWarningOpen(false)
                navigationBlocker.proceed?.()
              }}
            >
              {savingDraft ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {hasUnnotifiedChanges && linkedProgramsCount > 0 ? 'Sauver et notifier' : 'Sauvegarder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExchangePackFormDialog
        open={packDialogOpen}
        pack={pack}
        isSubmitting={false}
        error={null}
        onClose={() => {
          setPackDialogOpen(false)
        }}
        onSubmit={async (payload) => {
          setDraftPack((currentPack) => ({
            ...(currentPack ?? pack),
            name: payload.name,
            description: payload.description,
          }))
          setHasUnnotifiedChanges(true)
          setPackDialogOpen(false)
        }}
      />

      <ExchangePackDeleteDialog
        open={deletingPack !== null}
        pack={deletingPack}
        isSubmitting={deletePackMutation.isPending}
        error={(deletePackMutation.error as ApiError | null) ?? null}
        onClose={() => {
          setDeletingPack(null)
          deletePackMutation.reset()
        }}
        onConfirm={async () => {
          if (!deletingPack) return
          await deletePackMutation.mutateAsync(deletingPack.id)
        }}
      />

      <ExchangePackItemDialog
        open={itemDialogOpen}
        item={editingItem}
        isSubmitting={false}
        error={null}
        onClose={() => {
          setItemDialogOpen(false)
          setEditingItem(null)
        }}
        onSubmit={async (payload) => {
          setDraftPack((currentPack) => {
            const editablePack = currentPack ?? pack

            if (editingItem) {
              return {
                ...editablePack,
                items: editablePack.items.map((item) => item.id === editingItem.id
                  ? { ...item, title: payload.title, points_cost: payload.points_cost }
                  : item),
              }
            }

            const nextItem: ExchangePackItem = {
              id: makeTempItemId(),
              title: payload.title,
              description: null,
              item_type: 'gift',
              points_cost: payload.points_cost,
              display_order: editablePack.items.length + 1,
              status: 'active',
            }

            const nextItems = [...editablePack.items, nextItem]
            setOrderedItemIds(nextItems.map((item) => item.id))
            return {
              ...editablePack,
              items: nextItems,
              active_items_count: nextItems.length,
            }
          })
          setHasUnnotifiedChanges(true)
          setItemDialogOpen(false)
          setEditingItem(null)
        }}
      />

      <ExchangePackItemDeleteDialog
        open={deletingItem !== null}
        pack={pack}
        item={deletingItem}
        isSubmitting={false}
        error={null}
        onClose={() => {
          setDeletingItem(null)
        }}
        onConfirm={async () => {
          if (!deletingItem) return
          setDraftPack((currentPack) => {
            const editablePack = currentPack ?? pack

            const nextItems = editablePack.items
              .filter((item) => item.id !== deletingItem.id)
              .map((item, index) => ({ ...item, display_order: index + 1 }))
            setOrderedItemIds(nextItems.map((item) => item.id))
            return {
              ...editablePack,
              items: nextItems,
              active_items_count: nextItems.length,
            }
          })
          setHasUnnotifiedChanges(true)
          setDeletingItem(null)
        }}
      />
    </section>
  )
}

function ExchangePackDetailSkeleton() {
  return (
    <section className="app-section">
      <PageHeader
        title={<Skeleton className="h-5 w-56" />}
        beforeTitle={<Skeleton className="size-8 rounded-md" />}
        titleAddon={<Skeleton className="h-5 w-14 rounded-full" />}
        right={
          <PageHeaderToolbar>
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-36 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </PageHeaderToolbar>
        }
      />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.55fr)]">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-lg" />
        ))}
      </div>
    </section>
  )
}
