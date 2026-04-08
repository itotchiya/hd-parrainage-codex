import type { ReactNode } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface DetailSectionCardProps {
  title: ReactNode
  description?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  id?: string
}

export function DetailSectionCard({
  title,
  description,
  right,
  children,
  className,
  contentClassName,
  id,
}: DetailSectionCardProps) {
  return (
    <Card id={id} className={cn('border border-border bg-card shadow-none', className)}>
      <CardHeader className="gap-2 pb-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
            {description ? (
              <CardDescription className="mt-1 text-sm text-muted-foreground">
                {description}
              </CardDescription>
            ) : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </CardHeader>
      <CardContent className={cn('pt-4', contentClassName)}>{children}</CardContent>
    </Card>
  )
}

interface DetailMetaGridProps {
  children: ReactNode
  className?: string
}

export function DetailMetaGrid({ children, className }: DetailMetaGridProps) {
  return <div className={cn('grid gap-3 sm:grid-cols-2', className)}>{children}</div>
}

interface DetailMetaItemProps {
  label: ReactNode
  value: ReactNode
  className?: string
  valueClassName?: string
}

export function DetailMetaItem({
  label,
  value,
  className,
  valueClassName,
}: DetailMetaItemProps) {
  return (
    <article className={cn('rounded-lg border border-border bg-muted/25 px-4 py-3', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <div className={cn('mt-2 text-sm font-semibold text-foreground', valueClassName)}>{value}</div>
    </article>
  )
}

interface DetailEmptyStateProps {
  message: ReactNode
  className?: string
}

export function DetailEmptyState({ message, className }: DetailEmptyStateProps) {
  return (
    <article
      className={cn(
        'rounded-lg border border-dashed border-border bg-background/60 px-4 py-5 text-sm text-muted-foreground',
        className,
      )}
    >
      {message}
    </article>
  )
}
