import { type ReactNode } from 'react'
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item'

interface SettingsPreviewItemProps {
  media: ReactNode
  title: string
  value: ReactNode
  description?: ReactNode
  badges?: ReactNode
  action?: ReactNode
  mediaVariant?: 'icon' | 'custom'
}

export function SettingsPreviewItem({
  media,
  title,
  value,
  description,
  badges,
  action,
  mediaVariant = 'icon',
}: SettingsPreviewItemProps) {
  return (
    <Item variant="outline" className="gap-4 rounded-xl bg-transparent px-4 py-4">
      <ItemMedia
        variant={mediaVariant === 'icon' ? 'icon' : undefined}
        className={mediaVariant === 'custom' ? 'relative' : undefined}
      >
        {media}
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="truncate-none text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </ItemTitle>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="min-w-0 text-[1.02rem] font-medium text-foreground">{value}</div>
          {badges}
        </div>
        {description ? <ItemDescription className="mt-1.5 text-sm">{description}</ItemDescription> : null}
      </ItemContent>
      {action ? <ItemActions>{action}</ItemActions> : null}
    </Item>
  )
}
