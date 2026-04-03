import type { ComponentType } from 'react'

import { cn } from '@/lib/utils'

interface IconTileProps {
  icon: ComponentType<{ className?: string }>
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses: Record<NonNullable<IconTileProps['size']>, string> = {
  sm: 'h-8 w-8 rounded-[8px]',
  md: 'h-10 w-10 rounded-[10px]',
  lg: 'h-12 w-12 rounded-[12px]',
}

const iconSizeClasses: Record<NonNullable<IconTileProps['size']>, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-5 w-5',
}

export function IconTile({ icon: Icon, className, size = 'sm' }: IconTileProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        sizeClasses[size],
        className,
      )}
    >
      <Icon className={iconSizeClasses[size]} />
    </span>
  )
}
