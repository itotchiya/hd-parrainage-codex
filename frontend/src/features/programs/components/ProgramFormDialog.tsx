import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '../../../lib/api'
import type {
  ExchangePackRecord,
  ProgramMutationPayload,
  ProgramRecord,
} from '../../../types/programs'

interface ProgramFormDialogProps {
  open: boolean
  title: string
  submitLabel: string
  packs: ExchangePackRecord[]
  initialProgram?: ProgramRecord | null
  isSubmitting: boolean
  error: ApiError | null
  onClose: () => void
  onSubmit: (payload: ProgramMutationPayload) => Promise<void>
}

type FormState = {
  name: string
  description: string
  commission_type: ProgramMutationPayload['commission_type']
  exchange_mode: ProgramMutationPayload['exchange_mode']
  points_per_transaction: string
  points_per_euro: string
  exchange_pack_id: string
  eligibility_criteria: string
  status: ProgramMutationPayload['status']
}

type ClientValidationErrors = Partial<
  Record<
    | 'points_per_transaction'
    | 'points_per_euro'
    | 'exchange_pack_id'
    | 'status',
    string
  >
>

function buildFormState(
  packs: ExchangePackRecord[],
  initialProgram?: ProgramRecord | null,
): FormState {
  return {
    name: initialProgram?.name ?? '',
    description: initialProgram?.description ?? '',
    commission_type: initialProgram?.commission_type ?? 'per-transaction',
    exchange_mode: initialProgram?.exchange_mode ?? 'both',
    points_per_transaction: initialProgram?.points_per_transaction?.toString() ?? '',
    points_per_euro: initialProgram?.points_per_euro?.toString() ?? '',
    exchange_pack_id: initialProgram?.exchange_pack?.id ?? packs[0]?.id ?? '',
    eligibility_criteria: initialProgram?.eligibility_criteria ?? '',
    status: initialProgram?.status ?? 'active',
  }
}

function fieldError(error: ApiError | null, field: string) {
  return error?.errors?.[field]?.[0] ?? null
}

export function ProgramFormDialog({
  open,
  title,
  submitLabel,
  packs,
  initialProgram,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: ProgramFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => buildFormState(packs, initialProgram))
  const [clientErrors, setClientErrors] = useState<ClientValidationErrors>({})

  function patchForm(next: Partial<FormState>) {
    setForm((current) => ({ ...current, ...next }))
  }

  function clearClientError(field: keyof ClientValidationErrors) {
    setClientErrors((current) => {
      if (!current[field]) {
        return current
      }

      const nextErrors = { ...current }
      delete nextErrors[field]
      return nextErrors
    })
  }

  useEffect(() => {
    if (!open) {
      return
    }

    setForm(buildFormState(packs, initialProgram))
    setClientErrors({})
  }, [initialProgram, open, packs])

  const selectedPack = useMemo(
    () => packs.find((pack) => pack.id === form.exchange_pack_id) ?? null,
    [form.exchange_pack_id, packs],
  )

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-border bg-card p-7 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
              Program configuration
            </p>
            <h2 className="app-dialog-title mt-3">{title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              Configure the earning rule, exchange mode, and reward pack attached to this business program.
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

            const nextErrors: ClientValidationErrors = {}

            if (
              form.commission_type === 'per-transaction' &&
              form.points_per_transaction.trim().length === 0
            ) {
              nextErrors.points_per_transaction =
                'Points per transaction is required for per-transaction programs.'
            }

            if (
              ['cash', 'both'].includes(form.exchange_mode) &&
              form.points_per_euro.trim().length === 0
            ) {
              nextErrors.points_per_euro =
                'Points per euro is required when cash exchange is enabled.'
            }

            if (
              ['reward', 'both'].includes(form.exchange_mode) &&
              form.exchange_pack_id.trim().length === 0
            ) {
              nextErrors.exchange_pack_id =
                'An exchange pack is required when reward exchange is enabled.'
            }

            if (Object.keys(nextErrors).length > 0) {
              setClientErrors(nextErrors)
              return
            }

            setClientErrors({})

            await onSubmit({
              name: form.name.trim(),
              description: form.description.trim(),
              commission_type: form.commission_type,
              exchange_mode: form.exchange_mode,
              points_per_transaction:
                form.points_per_transaction.trim().length > 0
                  ? Number(form.points_per_transaction)
                  : null,
              points_per_euro:
                form.points_per_euro.trim().length > 0 ? Number(form.points_per_euro) : null,
              exchange_pack_id:
                form.exchange_mode === 'reward' || form.exchange_mode === 'both'
                  ? form.exchange_pack_id || null
                  : null,
              eligibility_criteria: form.eligibility_criteria.trim(),
              status: form.status,
            })
          }}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Program name</span>
              <input
                value={form.name}
                onChange={(event) => patchForm({ name: event.target.value })}
                className="w-full rounded-[1.2rem] border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                placeholder="Creation de Sites Vitrines"
                required
              />
              {fieldError(error, 'name') ? (
                <p className="text-sm text-red-600">{fieldError(error, 'name')}</p>
              ) : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Program status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  {
                    clearClientError('status')
                    patchForm({
                      status: event.target.value as ProgramMutationPayload['status'],
                    })
                  }
                }
                className="w-full rounded-[1.2rem] border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
              {clientErrors.status ?? fieldError(error, 'status') ? (
                <p className="text-sm text-red-600">
                  {clientErrors.status ?? fieldError(error, 'status')}
                </p>
              ) : null}
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-foreground">Description</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                patchForm({ description: event.target.value })
              }
              className="min-h-28 w-full rounded-[1.4rem] border border-input bg-background px-4 py-3 text-sm leading-7 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="Describe the commercial offer and the kind of business this program targets."
              required
            />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Commission type</span>
              <select
                value={form.commission_type}
                onChange={(event) =>
                  {
                    const nextCommissionType =
                      event.target.value as ProgramMutationPayload['commission_type']

                    clearClientError('points_per_transaction')
                    clearClientError('status')
                    patchForm({
                      commission_type: nextCommissionType,
                    })
                  }
                }
                className="w-full rounded-[1.2rem] border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                <option value="per-transaction">Per transaction</option>
                <option value="revenue-tier">Revenue tier</option>
              </select>
              {fieldError(error, 'commission_type') ? (
                <p className="text-sm text-red-600">{fieldError(error, 'commission_type')}</p>
              ) : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Exchange mode</span>
              <select
                value={form.exchange_mode}
                onChange={(event) =>
                  {
                    const nextExchangeMode =
                      event.target.value as ProgramMutationPayload['exchange_mode']

                    clearClientError('points_per_euro')
                    clearClientError('exchange_pack_id')
                    patchForm({
                      exchange_mode: nextExchangeMode,
                      exchange_pack_id:
                        nextExchangeMode === 'cash'
                          ? ''
                          : form.exchange_pack_id || packs[0]?.id || '',
                    })
                  }
                }
                className="w-full rounded-[1.2rem] border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                <option value="both">Rewards + cash</option>
                <option value="reward">Rewards only</option>
                <option value="cash">Cash only</option>
              </select>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Points per transaction</span>
              <input
                type="number"
                min="1"
                value={form.points_per_transaction}
                onChange={(event) =>
                  {
                    clearClientError('points_per_transaction')
                    patchForm({
                      points_per_transaction: event.target.value,
                    })
                  }
                }
                className="w-full rounded-[1.2rem] border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                placeholder="1000"
                required={form.commission_type === 'per-transaction'}
              />
              {clientErrors.points_per_transaction ?? fieldError(error, 'points_per_transaction') ? (
                <p className="text-sm text-red-600">
                  {clientErrors.points_per_transaction ??
                    fieldError(error, 'points_per_transaction')}
                </p>
              ) : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Points per euro</span>
              <input
                type="number"
                min="1"
                value={form.points_per_euro}
                onChange={(event) =>
                  {
                    clearClientError('points_per_euro')
                    patchForm({
                      points_per_euro: event.target.value,
                    })
                  }
                }
                className="w-full rounded-[1.2rem] border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                placeholder="100"
                required={['cash', 'both'].includes(form.exchange_mode)}
              />
              {clientErrors.points_per_euro ?? fieldError(error, 'points_per_euro') ? (
                <p className="text-sm text-red-600">
                  {clientErrors.points_per_euro ?? fieldError(error, 'points_per_euro')}
                </p>
              ) : null}
            </label>
          </div>

          {(form.exchange_mode === 'reward' || form.exchange_mode === 'both') && (
            <label className="space-y-2">
              <span className="text-sm font-semibold text-foreground">Exchange pack</span>
              <select
                value={form.exchange_pack_id}
                onChange={(event) =>
                  {
                    clearClientError('exchange_pack_id')
                    patchForm({ exchange_pack_id: event.target.value })
                  }
                }
                className="w-full rounded-[1.2rem] border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                required={['reward', 'both'].includes(form.exchange_mode)}
              >
                {packs.map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.name}
                  </option>
                ))}
              </select>
              {clientErrors.exchange_pack_id ?? fieldError(error, 'exchange_pack_id') ? (
                <p className="text-sm text-red-600">
                  {clientErrors.exchange_pack_id ?? fieldError(error, 'exchange_pack_id')}
                </p>
              ) : null}
            </label>
          )}

          <label className="space-y-2">
            <span className="text-sm font-semibold text-foreground">Eligibility criteria</span>
            <textarea
              value={form.eligibility_criteria}
              onChange={(event) =>
                patchForm({
                  eligibility_criteria: event.target.value,
                })
              }
              className="min-h-24 w-full rounded-[1.4rem] border border-input bg-background px-4 py-3 text-sm leading-7 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="Who is qualified to participate or submit prospects under this program?"
              required
            />
            {fieldError(error, 'eligibility_criteria') ? (
              <p className="text-sm text-red-600">{fieldError(error, 'eligibility_criteria')}</p>
            ) : null}
          </label>

          <article className="rounded-[1.6rem] border border-dashed border-border bg-muted/30 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Exchange preview
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.2rem] border border-border bg-card px-4 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Cash conversion</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">
                  {form.points_per_euro.trim().length > 0
                    ? `${form.points_per_euro} pts = 1 EUR`
                    : 'Not configured'}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-border bg-card px-4 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Reward pack</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">
                  {selectedPack?.name ?? 'No pack selected'}
                </p>
              </div>
            </div>
            {selectedPack ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedPack.items.map((item) => (
                  <span
                    key={item.id}
                    className="rounded-full border border-border bg-card px-3 py-2 text-sm text-foreground"
                  >
                    {item.title} · {item.points_cost} pts
                  </span>
                ))}
              </div>
            ) : null}
          </article>

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
              {isSubmitting ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
