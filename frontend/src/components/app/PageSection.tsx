import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface PageSectionProps {
  children: ReactNode
  className?: string
}

export function PageSection({ children, className }: PageSectionProps) {
  return <section className={cn('space-y-3', className)}>{children}</section>
}

