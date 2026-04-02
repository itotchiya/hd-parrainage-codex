import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface ButtonGroupProps {
  children: ReactNode
  className?: string
}

export function ButtonGroup({ children, className }: ButtonGroupProps) {
  return (
    <div
      data-slot="button-group"
      className={cn(
        'inline-flex w-full items-stretch overflow-hidden rounded-lg border border-input bg-background shadow-xs dark:bg-input/30',
        '[&_[data-slot=button]]:rounded-none [&_[data-slot=button]]:border-l [&_[data-slot=button]]:border-border',
        '[&_[data-slot=input]]:border-0 [&_[data-slot=input]]:shadow-none [&_[data-slot=input]]:rounded-none',
        className,
      )}
    >
      {children}
    </div>
  )
}

