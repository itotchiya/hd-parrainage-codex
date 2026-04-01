import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface DashboardSectionHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function DashboardSectionHeader({
  title,
  description,
  actions,
  className,
}: DashboardSectionHeaderProps) {
  return (
    <div className={cn('mb-3 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0 space-y-0.5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="inline-flex shrink-0 items-center gap-1">{actions}</div> : null}
    </div>
  )
}
