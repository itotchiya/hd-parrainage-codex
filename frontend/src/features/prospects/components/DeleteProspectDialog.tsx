import { useEffect, useState } from 'react'
import { ApiError } from '../../../lib/api'
import type { ProspectRecord } from '../../../types/prospects'

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
    document.documentElement.classList.add('scroll-locked')
    setReason('')
    return () => {
      document.documentElement.classList.remove('scroll-locked')
    }
  }, [open, prospect])

  if (!open || prospect === null) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-border bg-card p-7 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
          Prospect correction
        </p>
        <h2 className="app-dialog-title mt-3">Remove this prospect from the active funnel.</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          The record remains in deleted history for auditability, but it disappears from the active pipeline.
        </p>

        <div className="mt-6 rounded-[1.4rem] border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold text-foreground">{prospect.contact_name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {prospect.program_name ?? 'Program'} · {prospect.business_name ?? 'Business'}
          </p>
        </div>

        <form
          className="mt-6 space-y-5"
          onSubmit={async (event) => {
            event.preventDefault()
            await onSubmit(reason)
          }}
        >
          <label className="space-y-2">
            <span className="text-sm font-semibold text-foreground">Deletion reason</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-28 w-full rounded-[1.4rem] border border-input bg-background px-4 py-3 text-sm leading-7 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="Wrong contact, duplicate submission, or another correction reason."
              required
            />
            {error?.errors?.reason?.[0] ? (
              <p className="text-sm text-red-600">{error.errors.reason[0]}</p>
            ) : null}
          </label>

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
              {isSubmitting ? 'Removing...' : 'Soft delete prospect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
