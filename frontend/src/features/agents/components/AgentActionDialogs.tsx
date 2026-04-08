import { useEffect, useMemo, useState } from 'react'
import { AlertTriangleIcon, InfoIcon, UserCheck, UserX } from 'lucide-react'

import type { ApiError } from '@/lib/api'
import type { AgentRecord } from '@/types/agents'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { Textarea } from '@/components/ui/textarea'

export type AgentLifecycleAction = 'suspend' | 'reactivate'

const COUNTDOWN_SECONDS = 10

const lifecycleCopy: Record<
  AgentLifecycleAction,
  {
    title: string
    description: string
    alertTitle: string
    alertDescription: string
    confirmLabel: string
    destructive?: boolean
  }
> = {
  suspend: {
    title: 'Suspendre cet affilié ?',
    description: 'La suspension coupe immédiatement l’accès de l’affilié à la plateforme.',
    alertTitle: 'Accès interrompu',
    alertDescription:
      'L’affilié sera notifié de sa suspension dans la plateforme. Le motif saisi sera visible dans sa notification.',
    confirmLabel: 'Confirmer la suspension',
    destructive: true,
  },
  reactivate: {
    title: 'Réactiver cet affilié ?',
    description: 'L’affilié retrouvera immédiatement l’accès à la plateforme.',
    alertTitle: 'Affilié informé',
    alertDescription:
      'L’affilié recevra une notification indiquant que son accès a été réactivé.',
    confirmLabel: 'Confirmer la réactivation',
  },
}

export function AgentLifecycleConfirmDialog({
  action,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: {
  action: { type: AgentLifecycleAction; agent: AgentRecord } | null
  isSubmitting: boolean
  error: ApiError | null
  onClose: () => void
  onConfirm: (
    action: AgentLifecycleAction,
    agent: AgentRecord,
    payload: { reason?: string },
  ) => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)

  const copy = action ? lifecycleCopy[action.type] : lifecycleCopy.suspend
  const activePipelineProspects = action?.agent.active_pipeline_prospects_count ?? 0
  const requiresCountdown = action?.type === 'suspend' && activePipelineProspects > 0

  useEffect(() => {
    if (!action) {
      setReason('')
      setCountdown(COUNTDOWN_SECONDS)
      return
    }

    setReason('')
    setCountdown(COUNTDOWN_SECONDS)
  }, [action])

  useEffect(() => {
    if (!action || !requiresCountdown || isSubmitting) {
      return
    }

    if (countdown <= 0) {
      return
    }

    const timer = window.setTimeout(() => {
      setCountdown((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [action, countdown, isSubmitting, requiresCountdown])

  const suspendWarningDescription = useMemo(() => {
    if (!requiresCountdown) {
      return 'Vous pouvez suspendre cet affilié immédiatement. Aucun prospect actif n’est encore en cours de traitement.'
    }

    return `Cet affilié a encore ${activePipelineProspects.toLocaleString('fr-FR')} prospect${
      activePipelineProspects > 1 ? 's' : ''
    } en cours dans le pipeline. Attendez ${countdown}s avant de confirmer afin d’éviter une interruption brutale.`
  }, [activePipelineProspects, countdown, requiresCountdown])

  return (
    <Dialog open={Boolean(action)} onOpenChange={(isOpen) => { if (!isOpen && !isSubmitting) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <Alert
          variant={copy.destructive ? 'destructive' : 'default'}
          className={!copy.destructive ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300' : undefined}
        >
          {copy.destructive ? <AlertTriangleIcon /> : <InfoIcon />}
          <AlertTitle>{copy.alertTitle}</AlertTitle>
          <AlertDescription>{copy.alertDescription}</AlertDescription>
        </Alert>

        {action?.type === 'suspend' ? (
          <div className="space-y-4">
            <Alert className="border-amber-500/25 bg-amber-500/10 text-amber-950 dark:text-amber-200">
              <UserX />
              <AlertTitle>Prospects en cours</AlertTitle>
              <AlertDescription>{suspendWarningDescription}</AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="agent-suspend-reason">
                Motif de suspension
              </label>
              <Textarea
                id="agent-suspend-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                placeholder="Expliquez brièvement pourquoi cet affilié est suspendu."
              />
              <p className="text-xs text-muted-foreground">
                Ce motif sera envoyé à l’affilié dans la notification de suspension.
              </p>
            </div>
          </div>
        ) : (
          <Alert className="border-emerald-500/25 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300">
            <UserCheck />
            <AlertTitle>Reprise immédiate</AlertTitle>
            <AlertDescription>
              Une notification sera envoyée à l’affilié pour confirmer que son accès est de nouveau actif.
            </AlertDescription>
          </Alert>
        )}

        {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

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
              (action.type === 'suspend' && (!reason.trim() || countdown > 0))
            }
            onClick={() => {
              if (!action) return
              void onConfirm(action.type, action.agent, {
                reason: action.type === 'suspend' ? reason.trim() : undefined,
              })
            }}
          >
            {isSubmitting
              ? 'Traitement...'
              : action?.type === 'suspend' && countdown > 0
                ? `Attendre ${countdown}s`
                : copy.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
