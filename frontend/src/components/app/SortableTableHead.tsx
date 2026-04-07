import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { ReactNode } from 'react'

import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type SortDirection = 'asc' | 'desc'

interface SortableTableHeadProps<TSortKey extends string> {
  sortKey: TSortKey
  activeKey: TSortKey | null
  direction: SortDirection
  onSort: (key: TSortKey) => void
  children: ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}

export function SortableTableHead<TSortKey extends string>({
  sortKey,
  activeKey,
  direction,
  onSort,
  children,
  className,
  align = 'left',
}: SortableTableHeadProps<TSortKey>) {
  const isActive = activeKey === sortKey
  const Icon = isActive ? (direction === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown

  return (
    <TableHead className={className}>
      <button
        type="button"
        className={cn(
          'inline-flex w-full items-center gap-1.5 rounded-sm text-left text-inherit outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          align === 'right' && 'justify-end text-right',
          align === 'center' && 'justify-center text-center',
        )}
        onClick={() => onSort(sortKey)}
      >
        <span>{children}</span>
        <Icon className={cn('size-3.5 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
      </button>
    </TableHead>
  )
}
