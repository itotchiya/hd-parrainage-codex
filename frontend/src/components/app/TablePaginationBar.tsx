import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function visiblePages(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const delta = 1
  const range: number[] = []
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
      range.push(i)
    }
  }
  const withEllipsis: (number | 'ellipsis')[] = []
  let prev: number | undefined
  for (const p of range) {
    if (prev !== undefined && p - prev > 1) {
      withEllipsis.push('ellipsis')
    }
    withEllipsis.push(p)
    prev = p
  }
  return withEllipsis
}

export type TablePaginationBarProps = {
  page: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageSizeOptions?: number[]
  className?: string
}

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100]

export function TablePaginationBar({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  className,
}: TablePaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(totalItems, safePage * pageSize)

  const pages = useMemo(() => visiblePages(safePage, totalPages), [safePage, totalPages])

  const canPrev = safePage > 1
  const canNext = safePage < totalPages

  if (totalItems === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-border px-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="whitespace-nowrap">Lignes par page</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => {
            const next = Number(v)
            onPageSizeChange(next)
            onPageChange(1)
          }}
        >
          <SelectTrigger size="sm" className="w-[4.5rem]" aria-label="Nombre de lignes par page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs sm:text-sm">
          {start}–{end} sur {totalItems.toLocaleString('fr-FR')}
        </span>
      </div>

      <Pagination className="mx-0 w-full sm:w-auto sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 ps-2"
              disabled={!canPrev}
              aria-label="Page précédente"
              onClick={() => onPageChange(safePage - 1)}
            >
              <ChevronLeft className="size-4" aria-hidden />
              <span className="hidden sm:inline">Précédent</span>
            </Button>
          </PaginationItem>

          {pages.map((item, idx) =>
            item === 'ellipsis' ? (
              <PaginationItem key={`e-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <Button
                  type="button"
                  variant={item === safePage ? 'outline' : 'ghost'}
                  size="icon-sm"
                  aria-label={`Page ${item}`}
                  aria-current={item === safePage ? 'page' : undefined}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </Button>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 pe-2"
              disabled={!canNext}
              aria-label="Page suivante"
              onClick={() => onPageChange(safePage + 1)}
            >
              <span className="hidden sm:inline">Suivant</span>
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
