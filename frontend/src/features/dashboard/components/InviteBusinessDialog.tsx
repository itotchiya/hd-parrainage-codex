import { useState } from 'react'
import { Building2, Loader2 } from 'lucide-react'
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
      iacrm_business_id: selectedBusinessId,
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
            Sélectionnez un business depuis votre CRM IACRM pour l'inviter sur la plateforme.
            Une invitation email sera envoyée au propriétaire.
          </DialogDescription>
        </DialogHeader>

        {!iacrmConfigured ? (
          <IacrmConfigGate action="inviter un business" onClose={handleClose} />
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-1">
              {/* IACRM business picker */}
              <Field>
                <FieldLabel>Business IACRM</FieldLabel>
                {platformQuery.isPending ? (
                  <p className="text-sm text-muted-foreground">Chargement des businesses...</p>
                ) : iacrmBusinesses.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
                    <Building2 className="mx-auto size-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Aucun business disponible dans IACRM, ou tous ont déjà été invités.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ajoutez d'abord le business dans IACRM pour pouvoir l'inviter.
                    </p>
                  </div>
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

              <Field>
                <FieldLabel htmlFor="invite-business-name">Nom du business</FieldLabel>
                <Input
                  id="invite-business-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Nom commercial du business"
                  required
                  readOnly
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  Le nom est automatiquement renseigné depuis IACRM.
                </p>
              </Field>

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
                onClick={handleClose}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                size="sm" 
                disabled={isPending || !selectedBusinessId || iacrmBusinesses.length === 0}
              >
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
