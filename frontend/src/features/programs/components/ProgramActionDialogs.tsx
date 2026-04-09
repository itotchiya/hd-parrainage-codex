import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  Gift,
  HandCoins,
  InfoIcon,
} from 'lucide-react'

import { ApiError } from '../../../lib/api'
import type { AgentRecord } from '../../../types/agents'
import type { AssignedAgent, ExchangePackRecord, ProgramRecord } from '../../../types/programs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AgentAvatarFallback, Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IconTile } from '@/components/ui/icon-tile'
import { Input } from '@/components/ui/input'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type ProgramLifecycleAction =
  | 'activate'
  | 'pause'
  | 'reactivate'
  | 'suspend'
  | 'lift_suspension'
  | 'archive'
  | 'delete'

function formatAgentAddedAt(agent: AgentRecord) {
  const raw = agent.activated_at ?? agent.invited_at ?? agent.created_at
  if (!raw) return 'Date inconnue'
  return new Date(raw).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function agentInitials(agent: AgentRecord): string {
  const n = agent.display_name?.trim()
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase()
    }
    return n.slice(0, 2).toUpperCase()
  }
  return (agent.email ?? '?').slice(0, 2).toUpperCase()
}

function rewardItemsLabel(count: number) {
  return `${count} cadeau${count === 1 ? '' : 'x'}`
}

function activeRewardItemCount(pack: ExchangePackRecord | null | undefined) {
  if (!pack) return 0
  return pack.active_items_count ?? pack.items.filter((item) => item.status === 'active').length
}

function isRewardPackAssignable(pack: ExchangePackRecord | null | undefined) {
  return activeRewardItemCount(pack) > 0
}

function firstAssignablePackId(packs: ExchangePackRecord[]) {
  return packs.find(isRewardPackAssignable)?.id ?? ''
}

const EMPTY_REWARD_PACK_MESSAGE =
  "Ce pack ne contient aucun cadeau actif. Ajoutez au moins un cadeau avant de l'utiliser dans un programme."

export function ProgramCashRulesDialog({
  open,
  program,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean
  program: ProgramRecord | null
  isSubmitting: boolean
  error: ApiError | null
  onClose: () => void
  onSubmit: (pointsPerEuro: number | null) => Promise<void>
}) {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (!open) return
    setValue(program?.points_per_euro?.toString() ?? '')
  }, [open, program])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier la conversion cash</DialogTitle>
          <DialogDescription>
            Mettez à jour uniquement la règle cash de ce programme.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-3">
            <IconTile icon={HandCoins} size="sm" className="bg-emerald-500 text-white" />
            <div>
              <p className="app-eyebrow text-emerald-800 dark:text-emerald-300">Cash</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Définissez combien de points valent 1 €.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="program-cash-points">
              Points pour 1 €
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="program-cash-points"
                type="number"
                min="1"
                max="9999999"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Exemple : 100"
              />
              <Badge variant="outline" className="h-8 shrink-0 px-3">
                pts = 1 €
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Configuration actuelle :{' '}
              <strong className="text-foreground">
                {program?.points_per_euro ? `${program.points_per_euro.toLocaleString('fr-FR')} pts = 1 €` : 'non configurée'}
              </strong>
            </p>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Annuler
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={isSubmitting || !value.trim()}
            onClick={() => void onSubmit(value.trim() ? Number(value) : null)}
          >
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer le cash'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ProgramRewardPackDialog({
  open,
  program,
  packs,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean
  program: ProgramRecord | null
  packs: ExchangePackRecord[]
  isSubmitting: boolean
  error: ApiError | null
  onClose: () => void
  onSubmit: (exchangePackId: string) => Promise<void>
}) {
  const [selectedPackId, setSelectedPackId] = useState('')
  const selectedPack = useMemo(
    () => packs.find((pack) => pack.id === selectedPackId) ?? null,
    [packs, selectedPackId],
  )

  useEffect(() => {
    if (!open) return
    setSelectedPackId(program?.exchange_pack?.id ?? firstAssignablePackId(packs))
  }, [open, packs, program])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-h-[88vh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gérer le pack rewards</DialogTitle>
          <DialogDescription>
            Mettez à jour uniquement le pack rewards lié à ce programme.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-3">
            <IconTile icon={Gift} size="sm" className="bg-amber-500 text-white" />
            <div className="min-w-0">
              <p className="app-eyebrow text-amber-900 dark:text-amber-300">Pack récompenses</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Choisissez le catalogue que les agents peuvent utiliser avec leurs points.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-foreground" htmlFor="program-reward-pack">
              Pack actif
            </label>
            <Select value={selectedPackId} onValueChange={setSelectedPackId}>
              <SelectTrigger id="program-reward-pack" className="mt-2">
                <SelectValue placeholder="Sélectionner un pack rewards" />
              </SelectTrigger>
              <SelectContent>
                {packs.map((pack) => (
                  <SelectItem key={pack.id} value={pack.id} disabled={!isRewardPackAssignable(pack)}>
                    {isRewardPackAssignable(pack) ? pack.name : `${pack.name} (aucun cadeau actif)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 max-h-[38vh] overflow-y-auto rounded-md bg-background p-3 text-sm">
            {selectedPack ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate font-medium text-foreground">{selectedPack.name}</span>
                  <Badge variant="outline" size="xs" className="shrink-0">
                    {rewardItemsLabel(activeRewardItemCount(selectedPack))}
                  </Badge>
                </div>

                {isRewardPackAssignable(selectedPack) ? (
                  <div className="space-y-2">
                    {selectedPack.items.filter((item) => item.status === 'active').map((item, index) => (
                      <Item key={item.id} variant="outline" size="sm" className="bg-card/70">
                        <ItemMedia>
                          <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                            {index + 1}
                          </div>
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>{item.title}</ItemTitle>
                          <ItemDescription>
                            <strong>{item.points_cost.toLocaleString('fr-FR')} pts</strong>
                          </ItemDescription>
                        </ItemContent>
                      </Item>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                    {EMPTY_REWARD_PACK_MESSAGE}
                  </p>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">Aucun pack rewards sélectionné.</span>
            )}
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Annuler
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={isSubmitting || !selectedPackId || !isRewardPackAssignable(selectedPack)}
            onClick={() => void onSubmit(selectedPackId)}
          >
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer le pack'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ProgramAssignmentDialog({
  open,
  program,
  agents,
  assignments,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean
  program: ProgramRecord | null
  agents: AgentRecord[]
  assignments: AssignedAgent[]
  isSubmitting: boolean
  error: ApiError | null
  onClose: () => void
  onSubmit: (agentIds: string[]) => Promise<void>
}) {
  const assignmentAgentIds = useMemo(
    () => assignments.map((assignment) => assignment.agent?.id).filter((value): value is string => Boolean(value)),
    [assignments],
  )
  const lockedAssignedAgentIds = useMemo(
    () => new Set(
      assignments
        .filter((assignment) => assignment.has_prospects_in_program)
        .map((assignment) => assignment.agent?.id)
        .filter((value): value is string => Boolean(value)),
    ),
    [assignments],
  )
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [hasEdited, setHasEdited] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelectedAgentIds(assignmentAgentIds)
    setHasEdited(false)
  }, [assignmentAgentIds, open])

  const effectiveSelectedAgentIds = hasEdited ? selectedAgentIds : assignmentAgentIds

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-h-[88vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Assigner des agents{program ? ` à ${program.name}` : ''}
          </DialogTitle>
          <DialogDescription>
            Sélectionnez les agents du business à rattacher à ce programme.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[56vh] space-y-2 overflow-y-auto pr-1">
          <TooltipProvider>
            {agents.length ? agents.map((agent) => {
              const isAssigned = effectiveSelectedAgentIds.includes(agent.id)
              const isLockedAssigned = isAssigned && lockedAssignedAgentIds.has(agent.id)
              const toggleAssignment = () => {
                if (isLockedAssigned) return
                setHasEdited(true)
                setSelectedAgentIds((current) => {
                  const base = hasEdited ? current : assignmentAgentIds
                  if (base.includes(agent.id)) {
                    return base.filter((id) => id !== agent.id)
                  }
                  return [...base, agent.id]
                })
              }
              const checkbox = (
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={isAssigned}
                  disabled={isLockedAssigned}
                  onChange={(event) => {
                    const checked = event.target.checked
                    if (isLockedAssigned) return
                    setHasEdited(true)
                    setSelectedAgentIds((current) => {
                      const base = hasEdited ? current : assignmentAgentIds
                      if (checked) {
                        if (base.includes(agent.id)) return base
                        return [...base, agent.id]
                      }
                      return base.filter((id) => id !== agent.id)
                    })
                  }}
                />
              )

              return (
                <button
                  key={agent.id}
                  type="button"
                  className="block w-full text-left"
                  onClick={toggleAssignment}
                  disabled={isLockedAssigned}
                >
                  <Item variant="outline" className={isLockedAssigned ? 'opacity-85' : undefined}>
                    <ItemMedia>
                      <Avatar className="size-10">
                        <AgentAvatarFallback seed={agent.id}>{agentInitials(agent)}</AgentAvatarFallback>
                      </Avatar>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{agent.display_name ?? agent.email ?? 'Agent'}</ItemTitle>
                      <ItemDescription>
                        {agent.email ?? 'Email indisponible'} · Ajouté le {formatAgentAddedAt(agent)}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      {isLockedAssigned ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="inline-flex cursor-not-allowed opacity-70"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {checkbox}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Cet agent a déjà ajouté des prospects dans ce programme et ne peut pas être retiré.</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span onClick={(event) => event.stopPropagation()}>{checkbox}</span>
                      )}
                    </ItemActions>
                  </Item>
                </button>
              )
            }) : (
              <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                Aucun agent disponible pour ce business.
              </p>
            )}
          </TooltipProvider>
        </div>

        {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Annuler
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={isSubmitting || !program}
            onClick={() => void onSubmit(effectiveSelectedAgentIds)}
          >
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer les assignations'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const lifecycleCopy: Record<ProgramLifecycleAction, {
  title: string
  description: string
  alertTitle: string
  alertDescription: string
  confirmLabel: string
  destructive?: boolean
}> = {
  activate: {
    title: 'Activer ce programme ?',
    description: 'Le programme passera en production pour les agents assignés.',
    alertTitle: 'Notification des agents',
    alertDescription: 'Tous les agents assignés recevront un email ou une notification pour les informer que le programme est actif.',
    confirmLabel: 'Confirmer l’activation',
  },
  pause: {
    title: 'Mettre ce programme en pause ?',
    description: 'La pause bloque temporairement la prospection sur ce programme.',
    alertTitle: 'Prospection bloquée',
    alertDescription: 'Les agents ne pourront plus ajouter de nouveaux prospects tant que le programme reste en pause.',
    confirmLabel: 'Confirmer la pause',
  },
  reactivate: {
    title: 'Réactiver ce programme ?',
    description: 'Le programme redeviendra disponible pour les agents.',
    alertTitle: 'Notification de reprise',
    alertDescription: 'Tous les agents assignés recevront une notification indiquant que le programme est de nouveau actif.',
    confirmLabel: 'Confirmer la réactivation',
  },
  suspend: {
    title: 'Suspendre ce programme ?',
    description: 'La suspension lance un arrêt contrôlé du programme.',
    alertTitle: 'Fenêtre de 30 jours',
    alertDescription: 'Les agents doivent extraire leurs points avant la fin des 30 jours. Passé ce délai, les points restants liés au programme peuvent être perdus et les agents seront prévenus par email.',
    confirmLabel: 'Confirmer la suspension',
    destructive: true,
  },
  lift_suspension: {
    title: 'Lever la suspension ?',
    description: 'Le programme quittera le mode suspension.',
    alertTitle: 'Agents informés',
    alertDescription: 'Tous les agents assignés recevront un email ou une notification indiquant que la suspension est levée.',
    confirmLabel: 'Lever la suspension',
  },
  archive: {
    title: 'Archiver ce programme ?',
    description: 'L’archivage retire le programme des opérations courantes.',
    alertTitle: 'Action irréversible',
    alertDescription: 'Après archivage, le programme ne pourra plus être réactivé ni réutilisé. Traitez cette action comme une suppression opérationnelle.',
    confirmLabel: 'Confirmer l’archivage',
    destructive: true,
  },
  delete: {
    title: 'Supprimer définitivement ce programme ?',
    description: 'Cette action est irréversible. Pour confirmer, saisissez exactement le nom complet du programme.',
    alertTitle: 'Suppression définitive',
    alertDescription: 'Le programme sera supprimé définitivement. Cette action ne peut pas être annulée.',
    confirmLabel: 'Supprimer définitivement',
    destructive: true,
  },
}

export function ProgramLifecycleConfirmDialog({
  action,
  isSubmitting,
  onClose,
  onConfirm,
}: {
  action: { type: ProgramLifecycleAction; program: ProgramRecord } | null
  isSubmitting: boolean
  onClose: () => void
  onConfirm: (action: ProgramLifecycleAction, program: ProgramRecord) => Promise<void>
}) {
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const copy = action ? lifecycleCopy[action.type] : lifecycleCopy.pause

  useEffect(() => {
    if (!action) setDeleteConfirmName('')
  }, [action])

  return (
    <Dialog open={Boolean(action)} onOpenChange={(isOpen) => { if (!isOpen && !isSubmitting) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <Alert
          variant={copy.destructive ? 'destructive' : 'default'}
          className={cn(
            !copy.destructive && action?.type === 'activate'
              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300'
              : undefined,
            !copy.destructive && action?.type !== 'activate'
              ? 'border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-300'
              : undefined,
          )}
        >
          {copy.destructive ? <AlertTriangleIcon /> : action?.type === 'activate' ? <CheckCircle2Icon /> : <InfoIcon />}
          <AlertTitle>{copy.alertTitle}</AlertTitle>
          <AlertDescription>{copy.alertDescription}</AlertDescription>
        </Alert>

        {action?.type === 'delete' ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Nom attendu : <strong>{action.program.name}</strong>
            </p>
            <Input
              value={deleteConfirmName}
              onChange={(event) => setDeleteConfirmName(event.target.value)}
              placeholder="Saisissez le nom complet du programme"
            />
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Annuler
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={copy.destructive ? 'destructive' : 'default'}
            disabled={
              isSubmitting ||
              !action ||
              (action.type === 'delete' && deleteConfirmName.trim() !== action.program.name)
            }
            onClick={() => {
              if (!action) return
              void onConfirm(action.type, action.program)
            }}
          >
            {isSubmitting ? 'Traitement...' : copy.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
