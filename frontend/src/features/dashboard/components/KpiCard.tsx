import type { ComponentType } from 'react'
import { ArrowDownRight, ArrowUpRight, CircleHelp, Minus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { IconTile } from '@/components/ui/icon-tile'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type {
  DashboardMetricBadge,
  DashboardMetricBadgeTone,
  DashboardMetricTrendDirection,
} from '@/types/dashboard'

/** Neutral badge chip for feature pages (no trend arrow). */
export function kpiSnapshotBadge(label: string): DashboardMetricBadge {
  return { tone: 'neutral', label, icon: null }
}

export type KpiTone = 'primary' | 'success' | 'warning' | 'info' | 'danger'

interface KpiCardProps {
  title: string
  value: string
  description: string
  badge: DashboardMetricBadge
  icon: ComponentType<{ className?: string }>
  tone: KpiTone
  help?: string
}

const toneStyles: Record<
  KpiTone,
  {
    icon: string
    badge: string
  }
> = {
  primary: {
    icon: 'bg-blue-50 text-blue-700 dark:bg-blue-500/12 dark:text-blue-300',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-500/12 dark:text-blue-300',
  },
  success: {
    icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300',
  },
  warning: {
    icon: 'bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-300',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-300',
  },
  info: {
    icon: 'bg-sky-50 text-sky-700 dark:bg-sky-500/12 dark:text-sky-300',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-500/12 dark:text-sky-300',
  },
  danger: {
    icon: 'bg-rose-50 text-rose-700 dark:bg-rose-500/12 dark:text-rose-300',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-500/12 dark:text-rose-300',
  },
}

const badgeStyles: Record<DashboardMetricBadgeTone, string> = {
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300',
  danger: 'bg-rose-50 text-rose-700 dark:bg-rose-500/12 dark:text-rose-300',
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-blue-50 text-blue-700 dark:bg-blue-500/12 dark:text-blue-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-300',
  info: 'bg-sky-50 text-sky-700 dark:bg-sky-500/12 dark:text-sky-300',
}

const trendIcons: Record<DashboardMetricTrendDirection, ComponentType<{ className?: string }>> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  neutral: Minus,
}

export function KpiCard({
  title,
  value,
  description,
  badge,
  icon,
  tone,
  help,
}: KpiCardProps) {
  const styles = toneStyles[tone]
  const TrendIcon = badge.icon ? trendIcons[badge.icon] : null
  const badgeText = badge.helper_text ? `${badge.label} ${badge.helper_text}` : badge.label

  return (
    <Card className="flex flex-col gap-3 rounded-lg border-0 bg-card shadow-none app-card-padding">
      <div className="flex min-w-0 items-center gap-2.5">
        <IconTile icon={icon} className={styles.icon} />
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <p className="min-w-0 truncate text-sm font-medium text-foreground">{title}</p>
          {help ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={`Explain ${title}`}
                  >
                    <CircleHelp className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-pretty">
                  {help}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      </div>

      <p className="text-[1.75rem] font-semibold leading-none tracking-[-0.04em] text-foreground md:text-[2rem]">
        {value}
      </p>

      <Badge
        variant="secondary"
        className={cn('w-fit self-start border-0', badgeStyles[badge.tone])}
      >
        {TrendIcon ? <TrendIcon className="mr-1 h-3.5 w-3.5" /> : null}
        {badgeText}
      </Badge>

      <p className="truncate text-xs text-muted-foreground">{description}</p>
    </Card>
  )
}

export function KpiCardSkeleton() {
  return (
    <Card className="flex flex-col gap-3 rounded-lg border-0 bg-card shadow-none app-card-padding">
      <div className="flex min-w-0 items-center gap-2.5">
        <Skeleton className="size-8 shrink-0 rounded-md" />
        <Skeleton className="h-4 w-40 max-w-[75%]" />
      </div>

      <Skeleton className="h-8 w-24" />

      <Skeleton className="h-5 w-32 rounded-full" />

      <Skeleton className="h-3.5 w-44 max-w-[85%]" />
    </Card>
  )
}
