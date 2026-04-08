import { useEffect, useState } from 'react'
import { AlertTriangleIcon, Gift, PackagePlus, Trash2 } from 'lucide-react'

import type { ApiError } from '@/lib/api'
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
import { Field, FieldLabel } from '@/components/ui/field'
import { IconTile } from '@/components/ui/icon-tile'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { ExchangePackItem, ExchangePackRecord } from '@/types/programs'

export function ExchangePackFormDialog({
  open,
  pack,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean
  pack: ExchangePackRecord | null
  isSubmitting: boolean
  error: ApiError | null
  onClose: () => void
  onSubmit: (payload: { name: string; description: string | null }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!open) return
    setName(pack?.name ?? '')
    setDescription(pack?.description ?? '')
  }, [open, pack])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{pack ? 'Modifier le pack' : 'Créer un pack'}</DialogTitle>
          <DialogDescription>
            Configurez le nom et la description du catalogue de cadeaux.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              <IconTile icon={PackagePlus} className="bg-primary text-primary-foreground" size="sm" />
              <div>
                <p className="app-eyebrow text-primary">Pack rewards</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vous pourrez ajouter les cadeaux après la création du pack.
                </p>
              </div>
            </div>
          </div>

          <Field>
            <FieldLabel htmlFor="exchange-pack-name">Nom du pack</FieldLabel>
            <Input
              id="exchange-pack-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Exemple : Starter"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="exchange-pack-description">Description</FieldLabel>
            <Textarea
              id="exchange-pack-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Décrivez quand utiliser ce pack et les avantages qu’il contient."
              rows={3}
            />
          </Field>

          {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting} className="cursor-pointer">
              Annuler
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={isSubmitting || !name.trim()}
            className="cursor-pointer"
            onClick={() => void onSubmit({
              name: name.trim(),
              description: description.trim() || null,
            })}
          >
            {isSubmitting ? 'Enregistrement...' : pack ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ExchangePackItemDialog({
  open,
  item,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean
  item: ExchangePackItem | null
  isSubmitting: boolean
  error: ApiError | null
  onClose: () => void
  onSubmit: (payload: { title: string; points_cost: number }) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [pointsCost, setPointsCost] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(item?.title ?? '')
    setPointsCost(item?.points_cost?.toString() ?? '')
  }, [open, item])

  const numericPoints = Number(pointsCost)
  const canSubmit = title.trim().length > 0 && Number.isFinite(numericPoints) && numericPoints > 0

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? 'Modifier le cadeau' : 'Ajouter un cadeau'}</DialogTitle>
          <DialogDescription>
            Chaque cadeau définit un avantage et son coût en points.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-center gap-3">
              <IconTile icon={Gift} className="bg-amber-500 text-white" size="sm" />
              <div>
                <p className="app-eyebrow text-amber-900 dark:text-amber-300">Cadeau rewards</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ce cadeau sera visible dans les programmes qui utilisent ce pack.
                </p>
              </div>
            </div>
          </div>

          <Field>
            <FieldLabel htmlFor="exchange-pack-item-title">Nom du cadeau</FieldLabel>
            <Input
              id="exchange-pack-item-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Exemple : Audit SEO express"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="exchange-pack-item-points">Coût en points</FieldLabel>
            <Input
              id="exchange-pack-item-points"
              type="number"
              min="1"
              value={pointsCost}
              onChange={(event) => setPointsCost(event.target.value)}
              placeholder="Exemple : 500"
            />
          </Field>

          {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting} className="cursor-pointer">
              Annuler
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={isSubmitting || !canSubmit}
            className="cursor-pointer"
            onClick={() => void onSubmit({
              title: title.trim(),
              points_cost: numericPoints,
            })}
          >
            {isSubmitting ? 'Enregistrement...' : item ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ExchangePackDeleteDialog({
  open,
  pack,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean
  pack: ExchangePackRecord | null
  isSubmitting: boolean
  error: ApiError | null
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const linkedProgramsCount = pack?.linked_programs_count ?? 0
  const isBlocked = linkedProgramsCount > 0

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Supprimer le pack</DialogTitle>
          <DialogDescription>
            {pack ? `Pack sélectionné : ${pack.name}` : 'Confirmez la suppression du pack.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isBlocked ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
              <AlertTriangleIcon />
              <AlertTitle>Pack utilisé par des programmes</AlertTitle>
              <AlertDescription>
                Ce pack est lié à {linkedProgramsCount} programme{linkedProgramsCount === 1 ? '' : 's'}.
                Retirez-le des programmes avant de le supprimer.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <Trash2 />
              <AlertTitle>Action irréversible</AlertTitle>
              <AlertDescription>
                Le pack et ses cadeaux seront supprimés de la configuration active.
              </AlertDescription>
            </Alert>
          )}

          {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting} className="cursor-pointer">
              Fermer
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={isSubmitting || isBlocked}
            className="cursor-pointer"
            onClick={() => void onConfirm()}
          >
            {isSubmitting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ExchangePackItemDeleteDialog({
  open,
  pack,
  item,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean
  pack: ExchangePackRecord | null
  item: ExchangePackItem | null
  isSubmitting: boolean
  error: ApiError | null
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const linkedProgramsCount = pack?.linked_programs_count ?? 0

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Supprimer le cadeau</DialogTitle>
          <DialogDescription>
            {item ? `Cadeau sélectionné : ${item.title}` : 'Confirmez la suppression du cadeau.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {linkedProgramsCount > 0 ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
              <AlertTriangleIcon />
              <AlertTitle>Les agents seront notifiés</AlertTitle>
              <AlertDescription>
                Ce pack est utilisé par {linkedProgramsCount} programme{linkedProgramsCount === 1 ? '' : 's'}.
                Les agents assignés recevront une notification après la suppression.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <Trash2 />
              <AlertTitle>Supprimer ce cadeau</AlertTitle>
              <AlertDescription>
                Le cadeau ne sera plus disponible dans ce pack.
              </AlertDescription>
            </Alert>
          )}

          {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting} className="cursor-pointer">
              Annuler
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={isSubmitting}
            className="cursor-pointer"
            onClick={() => void onConfirm()}
          >
            {isSubmitting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
