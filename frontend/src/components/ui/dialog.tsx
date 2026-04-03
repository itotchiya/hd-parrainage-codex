import * as React from 'react'
import { createPortal } from 'react-dom'
import { XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type DialogContextValue = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext() {
  const ctx = React.useContext(DialogContext)
  if (!ctx) {
    throw new Error('Dialog components must be used within <Dialog>')
  }
  return ctx
}

function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  const value = React.useMemo(() => ({ open, onOpenChange }), [open, onOpenChange])
  return (
    <DialogContext.Provider value={value}>
      <div data-slot="dialog">{children}</div>
    </DialogContext.Provider>
  )
}

function DialogTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<'button'>) {
  const { onOpenChange } = useDialogContext()
  return (
    <button
      type="button"
      data-slot="dialog-trigger"
      className={className}
      onClick={() => onOpenChange(true)}
      {...props}
    >
      {children}
    </button>
  )
}

function DialogPortal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body)
}

function DialogOverlay({
  className,
  onClick,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-overlay"
      role="presentation"
      className={cn('absolute inset-0 bg-black/50', className)}
      onClick={onClick}
      {...props}
    />
  )
}

function DialogClose({
  className,
  children,
  ...props
}: React.ComponentProps<'button'>) {
  const { onOpenChange } = useDialogContext()
  return (
    <button
      type="button"
      data-slot="dialog-close"
      className={className}
      onClick={() => onOpenChange(false)}
      {...props}
    >
      {children}
    </button>
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean
}) {
  const { open, onOpenChange } = useDialogContext()

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <DialogPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
        role="presentation"
      >
        <DialogOverlay onClick={() => onOpenChange(false)} />
        <div
          data-slot="dialog-content"
          role="dialog"
          aria-modal="true"
          className={cn(
            'bg-background relative z-10 grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-lg border border-border p-6 shadow-lg duration-200 sm:max-w-lg',
            className,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
          {showCloseButton ? (
            <button
              type="button"
              className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
              onClick={() => onOpenChange(false)}
            >
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          ) : null}
        </div>
      </div>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1.5 text-center sm:text-left', className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <h2
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-semibold tracking-tight', className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
