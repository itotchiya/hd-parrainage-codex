import { useEffect, useState } from 'react'
import { AlertCircleIcon, Trash2 } from 'lucide-react'

import { ApiError } from '../../../lib/api'
import type { ProspectRecord } from '../../../types/prospects'
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

interface DeleteProspectDialogProps {
  open: boolean
  prospect: ProspectRecord | null
  isSubmitting: boolean
  error: ApiError | null
  onClose: () => void
  onSubmit: (reason: string) => Promise<void>
}

export function DeleteProspectDialog({
  open,
  prospect,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: DeleteProspectDialogProps) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) return
    setReason('')
  }, [open, prospect])

  return (
    <Dialog open={open && prospect !== null} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <Trash2 className="size-5" aria-hidden />
            </div>
            <div>
              <DialogTitle>Retirer ce prospect du pipeline actif</DialogTitle>
              <DialogDescription>
                Le dossier reste dans l’historique supprimé pour audit, mais il disparaît du pipeline actif.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {prospect ? (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-semibold text-foreground">{prospect.contact_name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {prospect.program_name ?? 'Programme'} · {prospect.business_name ?? 'Business'}
            </p>
          </div>
        ) : null}

        <form
          id="delete-prospect-form"
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            await onSubmit(reason)
          }}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="delete-prospect-reason">
              Raison de suppression
            </label>
            <Textarea
              id="delete-prospect-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Mauvais contact, doublon, ou autre correction."
              required
              className="min-h-28"
            />
            {error?.errors?.reason?.[0] ? (
              <p className="text-sm text-destructive">{error.errors.reason[0]}</p>
            ) : null}
          </div>

          {error && !error.errors ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Suppression impossible</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : null}
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Annuler
            </Button>
          </DialogClose>
          <Button type="submit" form="delete-prospect-form" variant="destructive" disabled={isSubmitting}>
            {isSubmitting ? 'Suppression...' : 'Supprimer le prospect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
