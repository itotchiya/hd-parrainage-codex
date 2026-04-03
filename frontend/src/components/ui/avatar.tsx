import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { getAvatarFallbackBackgroundStyle } from '@/lib/avatar-fallback'
import { cn } from '@/lib/utils'

/** Surface behind the stack: must match parent background so overlap rings blend (e.g. card footer → `card`). */
export type AvatarGroupSurface = 'card' | 'background' | 'muted'

const AvatarGroupContext = React.createContext<{ surface: AvatarGroupSurface }>({
  surface: 'card',
})

function useAvatarGroupSurface() {
  return React.useContext(AvatarGroupContext).surface
}

const surfaceRingClasses: Record<AvatarGroupSurface, string> = {
  card: '*:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-card',
  background: '*:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background',
  muted: '*:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-muted',
}

const surfaceCountClasses: Record<AvatarGroupSurface, string> = {
  card: 'ring-card border-card',
  background: 'ring-background border-background',
  muted: 'ring-muted border-muted',
}

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('aspect-square size-full', className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn('bg-muted flex size-full items-center justify-center rounded-full', className)}
      {...props}
    />
  )
}

/** Initials fallback with a deterministic background from `seed` (e.g. user id). White text for contrast. */
function AgentAvatarFallback({
  className,
  seed,
  style,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback> & { seed: string }) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full items-center justify-center rounded-full font-semibold text-white',
        className,
      )}
      style={{ ...getAvatarFallbackBackgroundStyle(seed), ...style }}
      {...props}
    />
  )
}

function AvatarGroup({
  className,
  surface = 'card',
  ...props
}: React.ComponentProps<'div'> & {
  surface?: AvatarGroupSurface
}) {
  return (
    <AvatarGroupContext.Provider value={{ surface }}>
      <div
        data-slot="avatar-group"
        className={cn(
          'flex items-center',
          surfaceRingClasses[surface],
          '-space-x-2',
          className,
        )}
        {...props}
      />
    </AvatarGroupContext.Provider>
  )
}

function AvatarGroupCount({ className, ...props }: React.ComponentProps<'div'>) {
  const surface = useAvatarGroupSurface()
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 bg-primary text-[10px] font-semibold tabular-nums text-primary-foreground ring-2',
        surfaceCountClasses[surface],
        className,
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback, AgentAvatarFallback, AvatarGroup, AvatarGroupCount }
