import React from 'react'

import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  right?: React.ReactNode
  className?: string
}

export function PageHeader({ title, right, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 pb-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3',
        className,
      )}
    >
      <div className="min-w-0 shrink-0">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
      </div>
      {right ? <div className="w-full min-w-0 sm:w-auto sm:flex-1">{right}</div> : null}
    </div>
  )
}

interface PageHeaderToolbarProps {
  children: React.ReactNode
  className?: string
}

export function PageHeaderToolbar({ children, className }: PageHeaderToolbarProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end',
        // Unify control sizing (Input, SelectTrigger, Button) across pages.
        '[&_[data-slot=input]]:h-8 [&_[data-slot=select-trigger]]:h-8 [&_[data-slot=button]]:h-8',
        className,
      )}
    >
      {children}
    </div>
  )
}

