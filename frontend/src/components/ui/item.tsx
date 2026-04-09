import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const itemVariants = cva('flex items-center gap-3 rounded-lg', {
  variants: {
    variant: {
      default: 'bg-transparent',
      muted: 'bg-muted/20',
      outline: 'border border-border bg-background',
    },
    size: {
      default: 'p-3',
      sm: 'px-3 py-2',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})

function Item({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'div'> &
  VariantProps<typeof itemVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'div'
  return <Comp data-slot="item" className={cn(itemVariants({ variant, size }), className)} {...props} />
}

const itemMediaVariants = cva('flex shrink-0 items-center justify-center', {
  variants: {
    variant: {
      default: '',
      icon: 'size-10 rounded-xl border border-border/70 bg-background text-muted-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

function ItemMedia({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> &
  VariantProps<typeof itemMediaVariants>) {
  return (
    <div
      data-slot="item-media"
      className={cn(itemMediaVariants({ variant }), className)}
      {...props}
    />
  )
}

function ItemContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="item-content" className={cn('min-w-0 flex-1', className)} {...props} />
}

function ItemTitle({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="item-title" className={cn('truncate text-sm font-medium text-foreground', className)} {...props} />
}

function ItemDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="item-description" className={cn('mt-0.5 text-xs text-muted-foreground', className)} {...props} />
}

function ItemActions({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="item-actions" className={cn('flex shrink-0 items-center gap-2', className)} {...props} />
}

export { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle }
