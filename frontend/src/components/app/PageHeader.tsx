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
        'flex flex-col gap-2 pb-1.5 md:flex-row md:items-center md:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-foreground md:text-lg">{title}</h2>
      </div>
      {right ? <div className="w-full md:w-auto">{right}</div> : null}
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
        'flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:justify-end',
        // Unify control sizing (Input, SelectTrigger, Button) across pages.
        '[&_[data-slot=input]]:h-8 [&_[data-slot=select-trigger]]:h-8 [&_[data-slot=button]]:h-8',
        className,
      )}
    >
      {children}
    </div>
  )
}

