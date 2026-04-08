import { useEffect, useMemo, useState } from 'react'
import { Briefcase, Check, Gift, HandCoins, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ApiError } from '../../../lib/api'
import type {
  ExchangePackRecord,
  ProgramMutationPayload,
  ProgramRecord,
} from '../../../types/programs'
import { useIacrmServices } from '../../iacrm/hooks'
import { getIacrmConfig } from '../../iacrm/api'
import { IacrmConfigGate } from '@/components/app/IacrmConfigGate'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Field, FieldLabel } from '@/components/ui/field'
import { IconTile } from '@/components/ui/icon-tile'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  status: NonNullable<ProgramMutationPayload['status']>
}

type StepErrors = Partial<Record<keyof FormState, string>>

// ---------------------------------------------------------------------------
// Exchange mode config (matches ProgramCard exactly)
// ---------------------------------------------------------------------------

const EXCHANGE_MODES = [
  {
    value: 'both' as const,
    label: 'Récompenses + Cash',
    sublabel: 'Les deux options disponibles',
    icon: Briefcase,
    tileClass: 'bg-blue-500 text-white',
    sectionBg: 'bg-blue-500/8 border-blue-200',
    accentText: 'text-blue-800',
    accentBadge: 'border-blue-500/25 bg-blue-500/10 text-blue-800',
  },
  {
    value: 'reward' as const,
    label: 'Récompenses',
    sublabel: 'Pack cadeaux uniquement',
    icon: Gift,
    tileClass: 'bg-amber-500 text-white',
    sectionBg: 'bg-amber-500/8 border-amber-200',
    accentText: 'text-amber-800',
    accentBadge: 'border-amber-500/25 bg-amber-500/10 text-amber-900',
  },
  {
    value: 'cash' as const,
    label: 'Cash uniquement',
    sublabel: 'Virement ou coupon',
    icon: HandCoins,
    tileClass: 'bg-emerald-500 text-white',
    sectionBg: 'bg-emerald-500/8 border-emerald-200',
    accentText: 'text-emerald-800',
    accentBadge: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-800',
  },
]

function getExchangeMode(value: FormState['exchange_mode']) {
  return EXCHANGE_MODES.find((m) => m.value === value) ?? EXCHANGE_MODES[0]!
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildFormState(packs: ExchangePackRecord[], initial?: ProgramRecord | null): FormState {
  return {
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    commission_type: initial?.commission_type ?? 'per-transaction',
    exchange_mode: initial?.exchange_mode ?? 'both',
    points_per_transaction: initial?.points_per_transaction?.toString() ?? '',
    points_per_euro: initial?.points_per_euro?.toString() ?? '',
    exchange_pack_id: initial?.exchange_pack?.id ?? firstAssignablePackId(packs),
    eligibility_criteria: initial?.eligibility_criteria ?? '',
    status: initial?.status ?? 'active',
  }
}

function fieldApiError(error: ApiError | null, field: string) {
  return error?.errors?.[field]?.[0] ?? null
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    active: 'Actif',
    draft: 'Brouillon',
    paused: 'En pause',
    suspended: 'Suspendu',
    archived: 'Archivé',
  }
  return map[status] ?? status
}

function statusBadgeClass(status: string) {
  if (status === 'active') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-800'
  if (status === 'draft') return 'border-border bg-muted/40 text-muted-foreground'
  if (status === 'paused') return 'border-amber-500/25 bg-amber-500/10 text-amber-800'
  return 'border-border bg-muted/40 text-muted-foreground'
}

function normalizeIacrmText(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
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

// Textarea styled to match Input
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50',
        className,
      )}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS = [
  { num: 1, label: 'Informations' },
  { num: 2, label: 'Commission' },
  { num: 3, label: 'Aperçu' },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((step, idx) => (
        <div key={step.num} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                'flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                current > step.num
                  ? 'bg-primary text-primary-foreground'
                  : current === step.num
                    ? 'border-2 border-primary bg-primary/10 text-primary'
                    : 'border-2 border-border bg-background text-muted-foreground',
              )}
            >
              {current > step.num ? <Check className="size-3.5" /> : step.num}
            </div>
            <span
              className={cn(
                'text-[10px] font-medium whitespace-nowrap',
                current >= step.num ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 ? (
            <div
              className={cn(
                'mx-2 mb-5 h-px w-12 transition-colors',
                current > step.num ? 'bg-primary' : 'bg-border',
              )}
            />
          ) : null}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

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
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(() => buildFormState(packs, initialProgram))
  const [stepErrors, setStepErrors] = useState<StepErrors>({})
  const [selectedServiceId, setSelectedServiceId] = useState('')

  const iacrmConfigured = !!getIacrmConfig()?.base_url
  const iacrmServicesQuery = useIacrmServices()
  const activeIacrmServices = useMemo(
    () => (iacrmServicesQuery.data?.data ?? []).filter((s) => s.is_active),
    [iacrmServicesQuery.data],
  )
  const showServicePicker = iacrmConfigured && activeIacrmServices.length > 0

  function patchForm(next: Partial<FormState>) {
    setForm((f) => ({ ...f, ...next }))
  }

  function clearError(field: keyof FormState) {
    setStepErrors((e) => {
      if (!e[field]) return e
      const next = { ...e }
      delete next[field]
      return next
    })
  }

  useEffect(() => {
    if (!open) return
    setStep(1)
    setForm(buildFormState(packs, initialProgram))
    setStepErrors({})
    setSelectedServiceId('')
  }, [open, packs, initialProgram])

  useEffect(() => {
    if (!open || selectedServiceId || !initialProgram || !activeIacrmServices.length) return

    const programName = normalizeIacrmText(initialProgram.name)
    const programDescription = normalizeIacrmText(initialProgram.description)
    const matchedService = activeIacrmServices.find((service) => {
      const serviceName = normalizeIacrmText(service.name)
      const serviceDescription = normalizeIacrmText(service.description)

      return (
        serviceName === programName &&
        (!programDescription || !serviceDescription || serviceDescription === programDescription)
      )
    })

    if (matchedService) {
      setSelectedServiceId(matchedService.iacrm_id)
    }
  }, [activeIacrmServices, initialProgram, open, selectedServiceId])

  const selectedPack = useMemo(
    () => packs.find((p) => p.id === form.exchange_pack_id) ?? null,
    [form.exchange_pack_id, packs],
  )

  const activeExchangeMode = getExchangeMode(form.exchange_mode)
  const hasCash = form.exchange_mode === 'cash' || form.exchange_mode === 'both'
  const hasReward = form.exchange_mode === 'reward' || form.exchange_mode === 'both'

  // ── Step validation ────────────────────────────────────────────────────────

  function validateStep1(): StepErrors {
    const errs: StepErrors = {}
    if (!form.name.trim()) errs.name = 'Le nom est requis.'
    if (!form.description.trim()) errs.description = 'La description est requise.'
    if (!form.eligibility_criteria.trim()) errs.eligibility_criteria = "Les critères d'éligibilité sont requis."
    return errs
  }

  function validateStep2(): StepErrors {
    const errs: StepErrors = {}
    if (form.commission_type === 'per-transaction' && !form.points_per_transaction.trim()) {
      errs.points_per_transaction = 'Requis pour le type "par transaction".'
    }
    if (hasCash && !form.points_per_euro.trim()) {
      errs.points_per_euro = "Requis quand l'échange cash est activé."
    }
    if (hasReward && !form.exchange_pack_id) {
      errs.exchange_pack_id = 'Un pack récompenses est requis.'
    }
    if (hasReward && form.exchange_pack_id && !isRewardPackAssignable(selectedPack)) {
      errs.exchange_pack_id = EMPTY_REWARD_PACK_MESSAGE
    }
    return errs
  }

  function handleNext() {
    if (step === 1) {
      const errs = validateStep1()
      if (Object.keys(errs).length > 0) { setStepErrors(errs); return }
    }
    if (step === 2) {
      const errs = validateStep2()
      if (Object.keys(errs).length > 0) { setStepErrors(errs); return }
    }
    setStepErrors({})
    setStep((s) => s + 1)
  }

  async function handleSubmit() {
    await onSubmit({
      name: form.name.trim(),
      description: form.description.trim(),
      commission_type: form.commission_type,
      exchange_mode: form.exchange_mode,
      points_per_transaction: form.points_per_transaction.trim()
        ? Number(form.points_per_transaction)
        : null,
      points_per_euro: form.points_per_euro.trim() ? Number(form.points_per_euro) : null,
      exchange_pack_id: hasReward ? form.exchange_pack_id || null : null,
      eligibility_criteria: form.eligibility_criteria.trim(),
      status: form.status,
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto" showCloseButton>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Définissez le nom, le statut et la description de votre programme.'
              : step === 2
                ? "Configurez le type de commission, les points et le mode d'échange."
                : 'Vérifiez les informations avant de créer le programme.'}
          </DialogDescription>
        </DialogHeader>

        {/* ── IACRM gate ────────────────────────────────────────────── */}
        {!iacrmConfigured ? (
          <IacrmConfigGate action="créer un programme" onClose={onClose} />
        ) : (
        <>

        <StepIndicator current={step} />

        {/* ── Step 1 — Infos de base ─────────────────────────────────── */}
        {step === 1 ? (
          <div className="space-y-4">
            {showServicePicker ? (
              <div className="rounded-lg border border-amber-200 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-3.5 text-amber-600" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                    Pré-remplir depuis IACRM
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sélectionnez un service pour pré-remplir le nom et la description.
                </p>
                <div className="mt-3">
                  <Select
                    value={selectedServiceId}
                    onValueChange={(id) => {
                      setSelectedServiceId(id)
                      const svc = activeIacrmServices.find((s) => s.iacrm_id === id)
                      if (svc) {
                        patchForm({ name: svc.name, description: svc.description ?? '' })
                        clearError('name')
                        clearError('description')
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="— Choisir un service IACRM —" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeIacrmServices.map((svc) => (
                        <SelectItem key={svc.iacrm_id} value={svc.iacrm_id}>
                          {svc.name}
                          {svc.unit_price
                            ? ` · ${svc.unit_price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`
                            : ''}
                          {svc.category ? ` · ${svc.category}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="prog-name">Nom du programme</FieldLabel>
                <Input
                  id="prog-name"
                  value={form.name}
                  onChange={(e) => { patchForm({ name: e.target.value }); clearError('name') }}
                  placeholder="Création de Sites Vitrines"
                  required
                />
                {(stepErrors.name ?? fieldApiError(error, 'name')) ? (
                  <p className="text-xs text-destructive">{stepErrors.name ?? fieldApiError(error, 'name')}</p>
                ) : null}
              </Field>

              <Field>
                <FieldLabel htmlFor="prog-status">Statut initial</FieldLabel>
                <Select
                  value={form.status}
                  onValueChange={(v) => patchForm({ status: v as FormState['status'] })}
                >
                  <SelectTrigger id="prog-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="paused">En pause</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="prog-desc">Description</FieldLabel>
              <Textarea
                id="prog-desc"
                value={form.description}
                onChange={(e) => { patchForm({ description: e.target.value }); clearError('description') }}
                placeholder="Décrivez l'offre commerciale et les entreprises cibles de ce programme."
                rows={3}
              />
              {(stepErrors.description ?? fieldApiError(error, 'description')) ? (
                <p className="text-xs text-destructive">{stepErrors.description ?? fieldApiError(error, 'description')}</p>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="prog-eligibility">Critères d'éligibilité</FieldLabel>
              <Textarea
                id="prog-eligibility"
                value={form.eligibility_criteria}
                onChange={(e) => { patchForm({ eligibility_criteria: e.target.value }); clearError('eligibility_criteria') }}
                placeholder="Qui peut soumettre des prospects dans ce programme ?"
                rows={2}
              />
              {(stepErrors.eligibility_criteria ?? fieldApiError(error, 'eligibility_criteria')) ? (
                <p className="text-xs text-destructive">{stepErrors.eligibility_criteria ?? fieldApiError(error, 'eligibility_criteria')}</p>
              ) : null}
            </Field>
          </div>
        ) : null}

        {/* ── Step 2 — Commission & Récompenses ─────────────────────── */}
        {step === 2 ? (
          <div className="space-y-5">
            {/* Commission type + Points per transaction */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="prog-commission-type">Type de commission</FieldLabel>
                <Select
                  value={form.commission_type}
                  onValueChange={(v) => {
                    patchForm({ commission_type: v as FormState['commission_type'] })
                    clearError('commission_type')
                    clearError('points_per_transaction')
                  }}
                >
                  <SelectTrigger id="prog-commission-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per-transaction">Par transaction</SelectItem>
                    <SelectItem value="revenue-tier">Paliers CA</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="prog-points-per-tx">Points par transaction</FieldLabel>
                <Input
                  id="prog-points-per-tx"
                  type="number"
                  min="1"
                  value={form.points_per_transaction}
                  onChange={(e) => { patchForm({ points_per_transaction: e.target.value }); clearError('points_per_transaction') }}
                  placeholder="1000"
                  disabled={form.commission_type !== 'per-transaction'}
                />
                {(stepErrors.points_per_transaction ?? fieldApiError(error, 'points_per_transaction')) ? (
                  <p className="text-xs text-destructive">
                    {stepErrors.points_per_transaction ?? fieldApiError(error, 'points_per_transaction')}
                  </p>
                ) : form.commission_type !== 'per-transaction' ? (
                  <p className="text-xs text-muted-foreground">Non applicable pour les paliers CA.</p>
                ) : null}
              </Field>
            </div>

            {/* Exchange mode selector */}
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                Mode d'échange des points
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {EXCHANGE_MODES.map((mode) => {
                  const isActive = form.exchange_mode === mode.value
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => {
                        patchForm({
                          exchange_mode: mode.value,
                          exchange_pack_id:
                            mode.value === 'cash' ? '' : form.exchange_pack_id || firstAssignablePackId(packs),
                        })
                        clearError('exchange_mode')
                        clearError('points_per_euro')
                        clearError('exchange_pack_id')
                      }}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border-2 px-3 py-3 text-left transition-colors',
                        isActive
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background hover:border-primary/40',
                      )}
                    >
                      <IconTile icon={mode.icon} className={mode.tileClass} size="sm" />
                      <div className="min-w-0">
                        <p className={cn('text-xs font-semibold truncate', isActive ? 'text-foreground' : 'text-foreground/80')}>
                          {mode.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-4 mt-0.5">
                          {mode.sublabel}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Cash input — shown for 'cash' and 'both' */}
            {hasCash ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <IconTile icon={HandCoins} className="bg-emerald-500 text-white" size="sm" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                    Taux de conversion Cash
                  </p>
                </div>
                <Field>
                  <FieldLabel htmlFor="prog-points-per-eur">Points par €</FieldLabel>
                  <Input
                    id="prog-points-per-eur"
                    type="number"
                    min="1"
                    value={form.points_per_euro}
                    onChange={(e) => { patchForm({ points_per_euro: e.target.value }); clearError('points_per_euro') }}
                    placeholder="100"
                  />
                  {(stepErrors.points_per_euro ?? fieldApiError(error, 'points_per_euro')) ? (
                    <p className="text-xs text-destructive">
                      {stepErrors.points_per_euro ?? fieldApiError(error, 'points_per_euro')}
                    </p>
                  ) : form.points_per_euro ? (
                    <p className="text-xs text-emerald-700">
                      Taux : {form.points_per_euro} pts = 1 €
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Taux de conversion : —</p>
                  )}
                </Field>
              </div>
            ) : null}

            {/* Rewards pack — shown for 'reward' and 'both' */}
            {hasReward ? (
              <div className="rounded-lg border border-amber-200 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <IconTile icon={Gift} className="bg-amber-500 text-white" size="sm" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
                    Pack Récompenses
                  </p>
                </div>
                <Field>
                  <FieldLabel htmlFor="prog-pack">Pack récompenses</FieldLabel>
                  <Select
                    value={form.exchange_pack_id}
                    onValueChange={(v) => { patchForm({ exchange_pack_id: v }); clearError('exchange_pack_id') }}
                  >
                    <SelectTrigger id="prog-pack" className="w-full">
                      <SelectValue placeholder="— Sélectionner un pack —" />
                    </SelectTrigger>
                    <SelectContent>
                      {packs.map((pack) => (
                        <SelectItem key={pack.id} value={pack.id} disabled={!isRewardPackAssignable(pack)}>
                          {isRewardPackAssignable(pack) ? pack.name : `${pack.name} (aucun cadeau actif)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(stepErrors.exchange_pack_id ?? fieldApiError(error, 'exchange_pack_id')) ? (
                    <p className="text-xs text-destructive">
                      {stepErrors.exchange_pack_id ?? fieldApiError(error, 'exchange_pack_id')}
                    </p>
                  ) : null}
                </Field>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Step 3 — Aperçu ───────────────────────────────────────── */}
        {step === 3 ? (
          <div className="space-y-4">
            {/* Program identity header */}
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <IconTile
                    icon={activeExchangeMode.icon}
                    className={activeExchangeMode.tileClass}
                    size="md"
                  />
                  <div>
                    <p className="font-semibold text-foreground text-base leading-tight">{form.name || '—'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {form.commission_type === 'per-transaction' ? 'Par transaction' : 'Paliers CA'}
                      {form.points_per_transaction ? ` · ${Number(form.points_per_transaction).toLocaleString()} pts` : ''}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={statusBadgeClass(form.status)}>
                  {statusLabel(form.status)}
                </Badge>
              </div>
              {form.description ? (
                <p className="mt-3 text-sm leading-6 text-muted-foreground line-clamp-2 border-t border-border pt-3">
                  {form.description}
                </p>
              ) : null}
            </div>

            {/* Cash section */}
            {hasCash ? (
              <div className={cn('rounded-lg border p-4', 'bg-emerald-500/5 border-emerald-200')}>
                <div className="flex items-center gap-2 mb-3">
                  <IconTile icon={HandCoins} className="bg-emerald-500 text-white" size="sm" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                    Échange Cash
                  </p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {form.points_per_euro
                    ? <>{form.points_per_euro} <span className="text-sm font-normal text-muted-foreground">pts = 1 €</span></>
                    : <span className="text-sm font-normal text-muted-foreground">Non configuré</span>
                  }
                </p>
              </div>
            ) : null}

            {/* Rewards section */}
            {hasReward ? (
              <div className={cn('rounded-lg border p-4', 'bg-amber-500/5 border-amber-200')}>
                <div className="flex items-center gap-2 mb-3">
                  <IconTile icon={Gift} className="bg-amber-500 text-white" size="sm" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
                    Échange Récompenses
                  </p>
                </div>
                {selectedPack ? (
                  <>
                    <p className="text-sm font-semibold text-foreground">{selectedPack.name}</p>
                    {isRewardPackAssignable(selectedPack) ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedPack.items.filter((item) => item.status === 'active').map((item) => (
                          <span
                            key={item.id}
                            className="rounded-full border border-amber-200 bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-900"
                          >
                            {item.title} · {item.points_cost} pts
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 rounded-lg border border-amber-200 bg-amber-500/10 p-3 text-xs text-amber-900">
                        {EMPTY_REWARD_PACK_MESSAGE}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun pack sélectionné</p>
                )}
              </div>
            ) : null}

            {/* Eligibility */}
            {form.eligibility_criteria ? (
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                  Critères d'éligibilité
                </p>
                <p className="text-sm leading-6 text-foreground">{form.eligibility_criteria}</p>
              </div>
            ) : null}

            {/* API error */}
            {error && !error.errors ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error.message}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Footer navigation ─────────────────────────────────────── */}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (step === 1) onClose()
              else setStep((s) => s - 1)
            }}
            disabled={isSubmitting}
          >
            {step === 1 ? 'Annuler' : 'Retour'}
          </Button>

          {step < 3 ? (
            <Button type="button" size="sm" onClick={handleNext}>
              Continuer
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement...' : submitLabel}
            </Button>
          )}
        </DialogFooter>

        </> /* end iacrmConfigured */
        )}
      </DialogContent>
    </Dialog>
  )
}
