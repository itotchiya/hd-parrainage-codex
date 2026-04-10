import { useState } from 'react'
import { Building2, Loader2, UserPlus2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ApiError } from '../../../lib/api'
import { useIacrmPlatformBusinesses } from '../../iacrm/hooks'
import { getIacrmConfig } from '../../iacrm/api'
import { IacrmConfigGate } from '@/components/app/IacrmConfigGate'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
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

type InviteMode = 'existing' | 'new'

interface InviteBusinessDialogProps {
  open: boolean
  isPending: boolean
  error: ApiError | null
  /** IDs of IACRM businesses already on the platform */
  existingIacrmIds: Set<string>
  onClose: () => void
  onSubmit: (payload: {
    iacrm_business_id: string
    business_name: string
    owner_email: string
    owner_name: string
    notes?: string
  }) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InviteBusinessDialog({
  open,
  isPending,
  error,
  existingIacrmIds,
  onClose,
  onSubmit,
}: InviteBusinessDialogProps) {
  const [step, setStep] = useState<'select' | 'form'>('select')
  const [mode, setMode] = useState<InviteMode | null>(null)
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [notes, setNotes] = useState('')

  const iacrmConfigured = !!getIacrmConfig()?.base_url
  const platformQuery = useIacrmPlatformBusinesses()
  const iacrmBusinesses = (platformQuery.data?.data ?? []).filter(
    (b) => !existingIacrmIds.has(b.iacrm_id),
  )

  function reset() {
    setStep('select')
    setMode(null)
    setSelectedBusinessId('')
    setBusinessName('')
    setOwnerName('')
    setOwnerEmail('')
    setNotes('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleContinue() {
    if (!mode) return
    if (mode === 'new') {
      setBusinessName('')
      setOwnerName('')
      setOwnerEmail('')
    }
    setStep('form')
  }

  function handleBusinessSelect(businessId: string) {
    setSelectedBusinessId(businessId)
    const business = iacrmBusinesses.find((b) => b.iacrm_id === businessId)
    if (business) {
      setBusinessName(business.display_name)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      iacrm_business_id: mode === 'existing' ? selectedBusinessId : '',
      business_name: businessName.trim(),
      owner_email: ownerEmail.trim(),
      owner_name: ownerName.trim(),
      notes: notes.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Inviter un business</DialogTitle>
          <DialogDescription>
            Choisissez comment inviter un nouveau business sur la plateforme.
            Une invitation email sera envoyée au propriétaire.
          </DialogDescription>
        </DialogHeader>

        {!iacrmConfigured ? (
          <IacrmConfigGate action="inviter un business" onClose={handleClose} />
        ) : step === 'select' ? (
          <>
            <div className="grid grid-cols-2 gap-3 py-1">
              {/* Existing IACRM business */}
              <Card
                role="button"
                tabIndex={0}
                aria-pressed={mode === 'existing'}
                onClick={() => setMode('existing')}
                onKeyDown={(e) => e.key === 'Enter' && setMode('existing')}
                className={cn(
                  'cursor-pointer border-2 transition-colors select-none',
                  mode === 'existing'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="size-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground leading-snug">
                      Business IACRM existant
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Inviter un business déjà présent dans votre CRM synchronisé.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* New business */}
              <Card
                role="button"
                tabIndex={0}
                aria-pressed={mode === 'new'}
                onClick={() => setMode('new')}
                onKeyDown={(e) => e.key === 'Enter' && setMode('new')}
                className={cn(
                  'cursor-pointer border-2 transition-colors select-none',
                  mode === 'new'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <UserPlus2 className="size-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground leading-snug">
                      Nouveau business
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Inviter un business qui n'est pas encore dans votre base CRM.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                Annuler
              </Button>
              <Button type="button" size="sm" disabled={!mode} onClick={handleContinue}>
                Continuer
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-1">
              {/* IACRM business picker */}
              {mode === 'existing' ? (
                <Field>
                  <FieldLabel>Business IACRM</FieldLabel>
                  {platformQuery.isPending ? (
                    <p className="text-sm text-muted-foreground">Chargement des businesses...</p>
                  ) : iacrmBusinesses.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                      Aucun business disponible dans IACRM, ou tous ont déjà été invités.
                    </p>
                  ) : (
                    <Select
                      value={selectedBusinessId}
                      onValueChange={handleBusinessSelect}
                      required
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="— Sélectionner un business IACRM —" />
                      </SelectTrigger>
                      <SelectContent>
                        {iacrmBusinesses.map((business) => (
                          <SelectItem key={business.iacrm_id} value={business.iacrm_id}>
                            {business.display_name}
                            {business.industry ? ` · ${business.industry}` : ''}
                            {' '}({business.clients_count} clients)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </Field>
              ) : (
                <Field>
                  <FieldLabel htmlFor="invite-business-name">Nom du business</FieldLabel>
                  <Input
                    id="invite-business-name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Nom commercial du business"
                    required
                  />
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="invite-owner-name">Nom du propriétaire</FieldLabel>
                <Input
                  id="invite-owner-name"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Prénom Nom"
                  autoComplete="name"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="invite-owner-email">Email d'invitation</FieldLabel>
                <Input
                  id="invite-owner-email"
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="proprietaire@business.com"
                  autoComplete="email"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Un lien d'activation sera envoyé à cette adresse via Resend.
                </p>
              </Field>

              <Field>
                <FieldLabel htmlFor="invite-notes">Note interne (optionnel)</FieldLabel>
                <Input
                  id="invite-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contexte ou remarque interne"
                />
              </Field>

              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error.message}
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep('select')}
                disabled={isPending}
              >
                Retour
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  "Envoyer l'invitation"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
