import type { ReactNode } from 'react'

import { CardDescription, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function EntityCardIdentity({
  leading,
  title,
  description,
  badge,
  className,
  titleClassName,
  descriptionClassName,
}: {
  leading?: ReactNode
  title: ReactNode
  description?: ReactNode
  badge?: ReactNode
  className?: string
  titleClassName?: string
  descriptionClassName?: string
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      {leading ? <div className="shrink-0">{leading}</div> : null}

      <div className="min-w-0 flex-1 self-center">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <CardTitle className={cn('truncate text-base leading-tight', titleClassName)}>
            {title}
          </CardTitle>
          {badge ? <div className="flex shrink-0 items-center self-center">{badge}</div> : null}
        </div>

        {description ? (
          <CardDescription
            className={cn(
              'mt-0.5 line-clamp-1 text-sm leading-relaxed',
              descriptionClassName,
            )}
          >
            {description}
          </CardDescription>
        ) : null}
      </div>
    </div>
  )
}
