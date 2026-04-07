import { useEffect, useState } from 'react'

import { ApiError } from '../../../lib/api'
import type { ProgramRecord } from '../../../types/programs'
import type { ProspectCreatePayload } from '../../../types/prospects'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircleIcon, UserPlus } from 'lucide-react'

interface NewProspectDialogProps {
  open: boolean
  programs: ProgramRecord[]
  defaultProgramId?: string | null
  isSubmitting: boolean
  error: ApiError | null
  onClose: () => void
  onSubmit: (payload: ProspectCreatePayload) => Promise<void>
}

type FormState = {
  program_id: string
  contact_name: string
  contact_email: string
  contact_phone_raw: string
  company_name: string
}

function buildInitialState(programs: ProgramRecord[], defaultProgramId?: string | null): FormState {
  const preferredProgramId =
    defaultProgramId && programs.some((program) => program.id === defaultProgramId)
      ? defaultProgramId
      : programs[0]?.id ?? ''

  return {
    program_id: preferredProgramId,
    contact_name: '',
    contact_email: '',
    contact_phone_raw: '',
    company_name: '',
  }
}

function fieldError(error: ApiError | null, field: string) {
  return error?.errors?.[field]?.[0] ?? null
}

export function NewProspectDialog({
  open,
  programs,
  defaultProgramId,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: NewProspectDialogProps) {
  const [form, setForm] = useState<FormState>(() => buildInitialState(programs, defaultProgramId))
  const [clientError, setClientError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(buildInitialState(programs, defaultProgramId))
    setClientError(null)
  }, [defaultProgramId, open, programs])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserPlus className="size-5" aria-hidden />
            </div>
            <div>
              <DialogTitle>Ajouter un prospect</DialogTitle>
              <DialogDescription>
                Renseignez un prospect pour le programme sélectionné.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          id="new-prospect-form"
          className="max-h-[62vh] space-y-5 overflow-y-auto pr-1"
          onSubmit={async (event) => {
            event.preventDefault()

            if (form.contact_email.trim().length === 0 && form.contact_phone_raw.trim().length === 0) {
              setClientError('Ajoutez au moins un moyen de contact : email ou téléphone.')
              return
            }

            setClientError(null)

            await onSubmit({
              program_id: form.program_id,
              contact_name: form.contact_name.trim(),
              contact_email: form.contact_email.trim() || null,
              contact_phone_raw: form.contact_phone_raw.trim() || null,
              company_name: form.company_name.trim() || null,
            })
          }}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="prospect-program">
              Programme assigné
            </label>
            <Select
              value={form.program_id}
              onValueChange={(value) => setForm((current) => ({ ...current, program_id: value }))}
            >
              <SelectTrigger id="prospect-program">
                <SelectValue placeholder="Sélectionner un programme" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError(error, 'program_id') ? (
              <p className="text-sm text-destructive">{fieldError(error, 'program_id')}</p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="prospect-contact-name">
                Nom du contact
              </label>
              <Input
                id="prospect-contact-name"
                value={form.contact_name}
                onChange={(event) => setForm((current) => ({ ...current, contact_name: event.target.value }))}
                placeholder="Atelier Miro"
                required
              />
              {fieldError(error, 'contact_name') ? (
                <p className="text-sm text-destructive">{fieldError(error, 'contact_name')}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="prospect-company">
                Entreprise
              </label>
              <Input
                id="prospect-company"
                value={form.company_name}
                onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))}
                placeholder="Atelier Miro"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="prospect-email">
                Email
              </label>
              <Input
                id="prospect-email"
                type="email"
                value={form.contact_email}
                onChange={(event) => setForm((current) => ({ ...current, contact_email: event.target.value }))}
                placeholder="contact@atelier-miro.test"
              />
              {fieldError(error, 'contact_email') ? (
                <p className="text-sm text-destructive">{fieldError(error, 'contact_email')}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="prospect-phone">
                Téléphone
              </label>
              <Input
                id="prospect-phone"
                value={form.contact_phone_raw}
                onChange={(event) => setForm((current) => ({ ...current, contact_phone_raw: event.target.value }))}
                placeholder="06 12 34 56 78"
              />
              {fieldError(error, 'contact_phone_raw') ? (
                <p className="text-sm text-destructive">{fieldError(error, 'contact_phone_raw')}</p>
              ) : null}
            </div>
          </div>

          {clientError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Contact requis</AlertTitle>
              <AlertDescription>{clientError}</AlertDescription>
            </Alert>
          ) : null}

          {error && !error.errors ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Impossible de créer le prospect</AlertTitle>
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
          <Button type="submit" form="new-prospect-form" disabled={isSubmitting || !programs.length}>
            {isSubmitting ? 'Soumission...' : 'Soumettre le prospect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
