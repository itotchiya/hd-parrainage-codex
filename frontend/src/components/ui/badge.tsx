import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border font-semibold whitespace-nowrap transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border bg-background text-foreground',
        destructive: 'border-transparent bg-destructive/10 text-destructive',
      },
      size: {
        default: 'px-2.5 py-0.5 text-[11px]',
        sm: 'h-5 min-h-5 px-1.5 py-0 text-[10px] leading-none',
        /** Tighter pill for inline status next to titles (e.g. program state). */
        xs: 'h-4 min-h-4 px-1 py-0 text-[9px] leading-none',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : 'div'

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
