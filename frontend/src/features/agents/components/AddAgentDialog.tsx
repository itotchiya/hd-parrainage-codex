import { useState } from 'react'
import { Building2, UserPlus2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ApiError } from '../../../lib/api'
import { useIacrmClients } from '../../iacrm/hooks'
import { getIacrmConfig, hasIacrmConfig } from '../../iacrm/api'
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

type InviteMode = 'existing' | 'new'

interface AddAgentDialogProps {
  open: boolean
  isPending: boolean
  error: ApiError | null
  onClose: () => void
  onSubmit: (payload: { display_name: string; email: string; notes?: string }) => void
}

export function AddAgentDialog({
  open,
  isPending,
  error,
  onClose,
  onSubmit,
}: AddAgentDialogProps) {
  const [step, setStep] = useState<'select' | 'form'>('select')
  const [mode, setMode] = useState<InviteMode | null>(null)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')

  const iacrmConfigured = hasIacrmConfig(getIacrmConfig())
  const clientsQuery = useIacrmClients()
  const activeClients = (clientsQuery.data?.data ?? []).filter((c) => c.status === 'active')

  function reset() {
    setStep('select')
    setMode(null)
    setSelectedClientId('')
    setDisplayName('')
    setEmail('')
    setNotes('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleContinue() {
    if (!mode) return
    if (mode === 'new') {
      setDisplayName('')
      setEmail('')
    }
    setStep('form')
  }

  function handleClientSelect(clientId: string) {
    setSelectedClientId(clientId)
    const client = activeClients.find((c) => c.iacrm_id === clientId)
    if (client) {
      setDisplayName(client.contact_name)
      setEmail(client.contact_email ?? '')
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      display_name: displayName.trim(),
      email: email.trim(),
      notes: notes.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Ajouter un affilié</DialogTitle>
          <DialogDescription>
            Choisissez comment inviter un nouveau parrain dans la plateforme. Une invitation email
            sera ensuite envoyée.
          </DialogDescription>
        </DialogHeader>

        {!iacrmConfigured ? (
          <IacrmConfigGate action="ajouter un affilié" onClose={handleClose} />
        ) : step === 'select' ? (
          <>
            <div className="grid grid-cols-2 gap-3 py-1">
              {/* Existing IACRM client */}
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
                      Parmi les clients existants
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Convertir un contact déjà présent dans votre base synchronisée.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* New agent */}
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
                      Nouveau parrain
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Inviter un nouveau partenaire qui n'est pas encore dans votre base.
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
              {/* IACRM client picker */}
              {mode === 'existing' ? (
                <Field>
                  <FieldLabel>Client IACRM</FieldLabel>
                  {clientsQuery.isPending ? (
                    <p className="text-sm text-muted-foreground">Chargement des clients...</p>
                  ) : activeClients.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                      Aucun client actif trouvé dans IACRM.
                    </p>
                  ) : (
                    <Select
                      value={selectedClientId}
                      onValueChange={handleClientSelect}
                      required
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="— Sélectionner un client IACRM —" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeClients.map((client) => (
                          <SelectItem key={client.iacrm_id} value={client.iacrm_id}>
                            {client.contact_name}
                            {client.company_name ? ` · ${client.company_name}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </Field>
              ) : null}

              <Field>
                <FieldLabel htmlFor="invite-display-name">Nom affiché</FieldLabel>
                <Input
                  id="invite-display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Prénom Nom"
                  autoComplete="name"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="invite-email">Email d'invitation</FieldLabel>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@exemple.fr"
                  autoComplete="email"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Un lien d'activation sera envoyé à cette adresse.
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
                {isPending ? 'Envoi en cours...' : "Envoyer l'invitation"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
