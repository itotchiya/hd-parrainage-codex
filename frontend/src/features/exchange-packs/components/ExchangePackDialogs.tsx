import { useEffect, useState } from 'react'
import { AlertTriangleIcon, Gift, PackagePlus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
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
          <DialogTitle>{pack ? t('exchangePacks.dialogs.form.editTitle') : t('exchangePacks.dialogs.form.createTitle')}</DialogTitle>
          <DialogDescription>
            {t('exchangePacks.dialogs.form.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              <IconTile icon={PackagePlus} className="bg-primary text-primary-foreground" size="sm" />
              <div>
                <p className="app-eyebrow text-primary">{t('exchangePacks.dialogs.form.infoTitle')}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pack
                    ? t('exchangePacks.dialogs.form.editInfo')
                    : t('exchangePacks.dialogs.form.createInfo')}
                </p>
              </div>
            </div>
          </div>

          <Field>
            <FieldLabel htmlFor="exchange-pack-name">{t('exchangePacks.dialogs.form.nameLabel')}</FieldLabel>
            <Input
              id="exchange-pack-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('exchangePacks.dialogs.form.namePlaceholder')}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="exchange-pack-description">{t('exchangePacks.dialogs.form.descriptionLabel')}</FieldLabel>
            <Textarea
              id="exchange-pack-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('exchangePacks.dialogs.form.descriptionPlaceholder')}
              rows={3}
            />
          </Field>

          {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting} className="cursor-pointer">
              {t('common.cancel')}
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
            {isSubmitting ? t('exchangePacks.dialogs.form.saving') : pack ? t('exchangePacks.dialogs.form.save') : t('exchangePacks.dialogs.form.create')}
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
  const { t } = useTranslation()
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
          <DialogTitle>{item ? t('exchangePacks.dialogs.item.editTitle') : t('exchangePacks.dialogs.item.createTitle')}</DialogTitle>
          <DialogDescription>
            {t('exchangePacks.dialogs.item.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-center gap-3">
              <IconTile icon={Gift} className="bg-amber-500 text-white" size="sm" />
              <div>
                <p className="app-eyebrow text-amber-900 dark:text-amber-300">{t('exchangePacks.dialogs.item.infoTitle')}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('exchangePacks.dialogs.item.infoDescription')}
                </p>
              </div>
            </div>
          </div>

          <Field>
            <FieldLabel htmlFor="exchange-pack-item-title">{t('exchangePacks.dialogs.item.nameLabel')}</FieldLabel>
            <Input
              id="exchange-pack-item-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('exchangePacks.dialogs.item.namePlaceholder')}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="exchange-pack-item-points">{t('exchangePacks.dialogs.item.pointsLabel')}</FieldLabel>
            <Input
              id="exchange-pack-item-points"
              type="number"
              min="1"
              max="9999999"
              value={pointsCost}
              onChange={(event) => setPointsCost(event.target.value)}
              placeholder={t('exchangePacks.dialogs.item.pointsPlaceholder')}
            />
          </Field>

          {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting} className="cursor-pointer">
              {t('common.cancel')}
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
            {isSubmitting ? t('exchangePacks.dialogs.item.saving') : item ? t('exchangePacks.dialogs.item.save') : t('exchangePacks.dialogs.item.add')}
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
  const { t } = useTranslation()
  const linkedProgramsCount = pack?.linked_programs_count ?? 0
  const isBlocked = linkedProgramsCount > 0

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('exchangePacks.dialogs.deletePack.title')}</DialogTitle>
          <DialogDescription>
            {pack ? t('exchangePacks.dialogs.deletePack.descriptionSelected', { name: pack.name }) : t('exchangePacks.dialogs.deletePack.descriptionConfirm')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isBlocked ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
              <AlertTriangleIcon />
              <AlertTitle>{t('exchangePacks.dialogs.deletePack.blockedTitle')}</AlertTitle>
              <AlertDescription>
                {t('exchangePacks.dialogs.deletePack.blockedDescription', { count: linkedProgramsCount })}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <Trash2 />
              <AlertTitle>{t('exchangePacks.dialogs.deletePack.irreversibleTitle')}</AlertTitle>
              <AlertDescription>
                {t('exchangePacks.dialogs.deletePack.irreversibleDescription')}
              </AlertDescription>
            </Alert>
          )}

          {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting} className="cursor-pointer">
              {t('exchangePacks.dialogs.deletePack.close')}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={isSubmitting || isBlocked}
            className="cursor-pointer"
            onClick={() => void onConfirm()}
          >
            {isSubmitting ? t('exchangePacks.dialogs.deletePack.deleting') : t('common.delete')}
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
  const { t } = useTranslation()
  const linkedProgramsCount = pack?.linked_programs_count ?? 0

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('exchangePacks.dialogs.deleteItem.title')}</DialogTitle>
          <DialogDescription>
            {item ? t('exchangePacks.dialogs.deleteItem.descriptionSelected', { name: item.title }) : t('exchangePacks.dialogs.deleteItem.descriptionConfirm')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {linkedProgramsCount > 0 ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
              <AlertTriangleIcon />
              <AlertTitle>{t('exchangePacks.dialogs.deleteItem.notifyTitle')}</AlertTitle>
              <AlertDescription>
                {t('exchangePacks.dialogs.deleteItem.notifyDescription', { count: linkedProgramsCount })}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <Trash2 />
              <AlertTitle>{t('exchangePacks.dialogs.deleteItem.removeTitle')}</AlertTitle>
              <AlertDescription>
                {t('exchangePacks.dialogs.deleteItem.removeDescription')}
              </AlertDescription>
            </Alert>
          )}

          {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting} className="cursor-pointer">
              {t('common.cancel')}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={isSubmitting}
            className="cursor-pointer"
            onClick={() => void onConfirm()}
          >
            {isSubmitting ? t('exchangePacks.dialogs.deleteItem.deleting') : t('common.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
