import React, { type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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
  const normalizedActions = actions
    ? React.Children.map(actions, (child) => {
        if (!React.isValidElement(child)) return child
        if (child.type !== Button) return child

        const buttonChild = child as React.ReactElement<React.ComponentProps<typeof Button>>

        return React.cloneElement(buttonChild, {
          variant: 'outline',
          size: 'sm',
          className: cn('h-8 gap-1.5', buttonChild.props.className),
        })
      })
    : null

  return (
    <div className={cn('mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3', className)}>
      <div className="min-w-0 space-y-0.5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {normalizedActions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">{normalizedActions}</div>
      ) : null}
    </div>
  )
}
