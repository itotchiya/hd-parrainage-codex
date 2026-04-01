import type { ComponentType } from 'react'

import { cn } from '@/lib/utils'

interface IconTileProps {
  icon: ComponentType<{ className?: string }>
  className?: string
}

export function IconTile({ icon: Icon, className }: IconTileProps) {
  return (
    <span
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]',
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  )
}
