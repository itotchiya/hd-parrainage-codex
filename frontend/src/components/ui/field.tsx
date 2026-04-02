import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface FieldProps {
  children: ReactNode
  className?: string
}

export function Field({ children, className }: FieldProps) {
  return (
    <div data-slot="field" className={cn('grid gap-1.5', className)}>
      {children}
    </div>
  )
}

interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export function FieldLabel({ className, ...props }: FieldLabelProps) {
  return (
    <label
      data-slot="field-label"
      className={cn('text-xs font-medium text-muted-foreground', className)}
      {...props}
    />
  )
}

