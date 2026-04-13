import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Loader2, MoreVertical, Pencil, Power, RotateCcw, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EntityCardIdentity } from '@/components/app/EntityCardIdentity'
import { exchangePackStatusBadgeClass, programStatusBadgeClass } from '@/features/dashboard/utils/semanticBadges'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { ExchangePackRecord } from '@/types/programs'

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return null
  return new Date(value).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function ClickableInfoCard({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full cursor-pointer rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {children}
    </button>
  )
}

function CompactMetaItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  const hasPointsText = /pts|points/i.test(value)

  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2 transition-colors group-hover:border-solid group-focus-visible:border-solid">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-xs text-foreground', hasPointsText ? 'font-semibold' : 'font-medium')}>
        {value}
      </p>
    </div>
  )
}

export function ExchangePackCard({
  pack,
  onEdit,
  onToggleStatus,
  isUpdatingStatus = false,
  onDelete,
}: {
  pack: ExchangePackRecord
  onEdit: (pack: ExchangePackRecord) => void
  onToggleStatus: (pack: ExchangePackRecord, status: 'active' | 'inactive') => void
  isUpdatingStatus?: boolean
  onDelete: (pack: ExchangePackRecord) => void
}) {
  const { t, i18n } = useTranslation()
  const [detailDialog, setDetailDialog] = useState<'rewards' | 'programs' | 'updated' | null>(null)
  const activeItemsCount = pack.active_items_count ?? pack.items.length
  const linkedPrograms = pack.linked_programs ?? []
  const linkedProgramsCount = pack.linked_programs_count ?? linkedPrograms.length
  const canUpdate = pack.actions?.can_update ?? true
  const canDelete = pack.actions?.can_delete ?? linkedProgramsCount === 0
  const canDisable = pack.actions?.can_disable ?? (pack.status === 'active' && linkedProgramsCount === 0)
  const canActivate = pack.actions?.can_activate ?? pack.status === 'inactive'
  const disableBlockedReason =
    !canDisable && linkedProgramsCount > 0
      ? t('exchangePacks.card.tooltip.disableBlockedByPrograms')
      : !canDisable
        ? t('exchangePacks.card.tooltip.disableBlockedPermission')
        : null
  const deleteBlockedReason = canDelete
    ? null
    : linkedProgramsCount > 0
      ? t('exchangePacks.card.tooltip.deleteBlockedByPrograms')
      : t('exchangePacks.card.tooltip.deleteBlockedPermission')

  const dateText = formatDate(pack.updated_at, i18n.language) ?? t('exchangePacks.detail.unknownDate')

  return (
    <Card className="rounded-lg border-0 shadow-none">
      <div className="flex flex-col gap-1.5 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <Link to={`/exchange-packs/${pack.id}`} className="group flex min-w-0 flex-1 cursor-pointer items-start">
            <EntityCardIdentity
              title={pack.name}
              description={pack.description ?? t('exchangePacks.card.noDescription')}
              badge={
                <Badge
                  variant="secondary"
                  className={cn('border-0', exchangePackStatusBadgeClass(pack.status))}
                >
                  {pack.status === 'inactive' ? t('exchangePacks.status.inactive') : t('exchangePacks.status.active')}
                </Badge>
              }
              className="flex-1"
              titleClassName="group-hover:underline !text-sm text-foreground"
              descriptionClassName="text-xs leading-[1.15rem]"
            />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="cursor-pointer" aria-label={`${t('common.actions')} ${pack.name}`}>
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/exchange-packs/${pack.id}`} className="cursor-pointer">
                  <ExternalLink className="size-4" />
                  {t('exchangePacks.card.open')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canUpdate} className="cursor-pointer" onSelect={() => onEdit(pack)}>
                <Pencil className="size-4" />
                {t('exchangePacks.card.edit')}
              </DropdownMenuItem>
              {pack.status === 'inactive' ? (
                <DropdownMenuItem
                  disabled={!canActivate || isUpdatingStatus}
                  className="cursor-pointer"
                  onSelect={() => onToggleStatus(pack, 'active')}
                >
                  {isUpdatingStatus ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                  {t('exchangePacks.card.reactivate')}
                </DropdownMenuItem>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <DropdownMenuItem
                          disabled={!canDisable || isUpdatingStatus}
                          className="cursor-pointer"
                          onSelect={() => onToggleStatus(pack, 'inactive')}
                        >
                          {isUpdatingStatus ? <Loader2 className="size-4 animate-spin" /> : <Power className="size-4" />}
                          {t('exchangePacks.card.deactivate')}
                        </DropdownMenuItem>
                      </div>
                    </TooltipTrigger>
                    {disableBlockedReason ? (
                      <TooltipContent side="left">{disableBlockedReason}</TooltipContent>
                    ) : null}
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={!canDelete}
                        className="cursor-pointer"
                        onSelect={() => onDelete(pack)}
                      >
                        <Trash2 className="size-4" />
                        {t('exchangePacks.card.delete')}
                      </DropdownMenuItem>
                    </div>
                  </TooltipTrigger>
                  {deleteBlockedReason ? (
                    <TooltipContent side="left">{deleteBlockedReason}</TooltipContent>
                  ) : null}
                </Tooltip>
              </TooltipProvider>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CardContent className="space-y-2 px-3 pb-3 pt-0 sm:px-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <ClickableInfoCard onClick={() => setDetailDialog('rewards')}>
            <CompactMetaItem label={t('exchangePacks.card.gifts')} value={t('exchangePacks.card.giftCount', { count: activeItemsCount })} />
          </ClickableInfoCard>
          <ClickableInfoCard onClick={() => setDetailDialog('programs')}>
            <CompactMetaItem label={t('exchangePacks.card.programs')} value={t('exchangePacks.card.programCount', { count: linkedProgramsCount })} />
          </ClickableInfoCard>
          <ClickableInfoCard onClick={() => setDetailDialog('updated')}>
            <CompactMetaItem label={t('exchangePacks.card.updated')} value={dateText} />
          </ClickableInfoCard>
        </div>

        <ClickableInfoCard onClick={() => setDetailDialog('rewards')}>
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="app-eyebrow text-amber-900 dark:text-amber-300">{t('exchangePacks.card.giftPreview')}</p>
              {activeItemsCount === 0 ? (
                <Badge variant="outline" size="xs" className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300">
                  {t('exchangePacks.card.notAssignable')}
                </Badge>
              ) : null}
            </div>
            {pack.items.length ? (
              <div className="mt-2 space-y-1 text-xs font-medium text-foreground">
                {pack.items.slice(0, 4).map((item) => (
                  <p key={item.id}>
                    {item.title} - {item.points_cost.toLocaleString(i18n.language)} {t('common.pts')}
                  </p>
                ))}
                {pack.items.length > 4 ? (
                  <p className="pt-1 text-xs text-muted-foreground">
                    {t('exchangePacks.card.additionalGifts', { count: pack.items.length - 4 })}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {t('exchangePacks.card.noActiveGifts')}
              </p>
            )}
          </div>
        </ClickableInfoCard>

        <Dialog open={detailDialog === 'rewards'} onOpenChange={(open) => !open && setDetailDialog(null)}>
          <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('exchangePacks.card.dialog.rewardsTitle')}</DialogTitle>
              <DialogDescription>
                {t('exchangePacks.card.dialog.rewardsDescription', { name: pack.name })}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              <Badge variant="outline" className="font-medium border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-300">
                {pack.name}
              </Badge>
              {pack.items.length ? (
                <div className="space-y-2">
                  {pack.items.map((item, index) => (
                    <Item key={item.id} variant="outline" size="sm">
                      <ItemMedia>
                        <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                          {index + 1}
                        </div>
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>{item.title}</ItemTitle>
                        <ItemDescription>
                          <strong>{item.points_cost.toLocaleString(i18n.language)} {t('common.pts')}</strong>
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                  {t('exchangePacks.card.dialog.noGiftsConfigured')}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDetailDialog(null)}>
                {t('exchangePacks.card.dialog.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={detailDialog === 'programs'} onOpenChange={(open) => !open && setDetailDialog(null)}>
          <DialogContent className="max-h-[88vh] overflow-hidden sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('exchangePacks.card.dialog.programsTitle')}</DialogTitle>
              <DialogDescription>
                {t('exchangePacks.card.dialog.programsDescription', { name: pack.name })}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[56vh] space-y-2 overflow-y-auto pr-1">
              {linkedPrograms.length ? (
                linkedPrograms.map((program) => (
                  <Link
                    key={program.id}
                    to={`/programs/${program.id}`}
                    onClick={() => setDetailDialog(null)}
                    className="group block cursor-pointer rounded-lg border border-dashed border-border bg-muted/10 px-3 py-2.5 transition-colors hover:border-solid hover:bg-muted/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{program.name}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline" className="border-border bg-muted/30 text-muted-foreground">
                          {t('exchangePacks.detail.agentCount', { count: program.assigned_agents_count ?? 0 })}
                        </Badge>
                        <Badge variant="outline" className={programStatusBadgeClass(program.status)}>
                          {t(`programs.status.${program.status}`)}
                        </Badge>
                        <ExternalLink className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                  {t('exchangePacks.card.dialog.noProgramsUsingPack')}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDetailDialog(null)}>
                {t('exchangePacks.card.dialog.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={detailDialog === 'updated'} onOpenChange={(open) => !open && setDetailDialog(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('exchangePacks.card.dialog.updatedTitle')}</DialogTitle>
              <DialogDescription>
                {t('exchangePacks.card.dialog.updatedDescription')}
              </DialogDescription>
            </DialogHeader>

            <CompactMetaItem label={t('exchangePacks.card.updated')} value={dateText} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDetailDialog(null)}>
                {t('exchangePacks.card.dialog.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export function ExchangePackCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('rounded-lg border-0 shadow-none', className)}>
      <div className="flex flex-col gap-1.5 p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full max-w-xs" />
          </div>
          <Skeleton className="size-8 rounded-md" />
        </div>
      </div>
      <CardContent className="space-y-2 px-3 pb-3 pt-0 sm:px-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
        <Skeleton className="h-28 rounded-lg" />
      </CardContent>
    </Card>
  )
}
