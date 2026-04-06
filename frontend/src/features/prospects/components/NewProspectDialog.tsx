import { useEffect, useState } from 'react'
import { ApiError } from '../../../lib/api'
import type { ProgramRecord } from '../../../types/programs'
import type { ProspectCreatePayload } from '../../../types/prospects'

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
    document.documentElement.classList.add('scroll-locked')
    setForm(buildInitialState(programs, defaultProgramId))
    setClientError(null)
    return () => {
      document.documentElement.classList.remove('scroll-locked')
    }
  }, [defaultProgramId, open, programs])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[2rem] border border-border bg-card p-7 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
              Prospect submission
            </p>
            <h2 className="app-dialog-title mt-3">Submit a new prospect into the live funnel.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              The prospect is stored locally first, then prepared for the future IACRM sync contract.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            Close
          </button>
        </div>

        <form
          className="mt-8 space-y-6"
          onSubmit={async (event) => {
            event.preventDefault()

            if (form.contact_email.trim().length === 0 && form.contact_phone_raw.trim().length === 0) {
              setClientError('At least one contact path is required: email or phone number.')
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
          <label className="space-y-2">
            <span className="text-sm font-semibold text-foreground">Assigned program</span>
            <select
              value={form.program_id}
              onChange={(event) => setForm((current) => ({ ...current, program_id: event.target.value }))}
              className="w-full rounded-[1.2rem] border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
              required
            >
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
            {fieldError(error, 'program_id') ? (
              <p className="text-sm text-red-600">{fieldError(error, 'program_id')}</p>
            ) : null}
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Contact name</span>
              <input
                value={form.contact_name}
                onChange={(event) => setForm((current) => ({ ...current, contact_name: event.target.value }))}
                className="w-full rounded-[1.2rem] border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                placeholder="Atelier Miro"
                required
              />
              {fieldError(error, 'contact_name') ? (
                <p className="text-sm text-red-600">{fieldError(error, 'contact_name')}</p>
              ) : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Company name</span>
              <input
                value={form.company_name}
                onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))}
                className="w-full rounded-[1.2rem] border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                placeholder="Atelier Miro"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Email</span>
              <input
                type="email"
                value={form.contact_email}
                onChange={(event) => setForm((current) => ({ ...current, contact_email: event.target.value }))}
                className="w-full rounded-[1.2rem] border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                placeholder="contact@atelier-miro.test"
              />
              {fieldError(error, 'contact_email') ? (
                <p className="text-sm text-red-600">{fieldError(error, 'contact_email')}</p>
              ) : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Phone number</span>
              <input
                value={form.contact_phone_raw}
                onChange={(event) => setForm((current) => ({ ...current, contact_phone_raw: event.target.value }))}
                className="w-full rounded-[1.2rem] border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                placeholder="06 12 34 56 78"
              />
              {fieldError(error, 'contact_phone_raw') ? (
                <p className="text-sm text-red-600">{fieldError(error, 'contact_phone_raw')}</p>
              ) : null}
            </label>
          </div>

          {clientError ? (
            <div className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {clientError}
            </div>
          ) : null}

          {error && !error.errors ? (
            <div className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error.message}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting...' : 'Submit prospect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
