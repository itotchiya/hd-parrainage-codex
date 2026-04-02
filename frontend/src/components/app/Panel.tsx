import { cn } from '@/lib/utils'

type PanelTone = 'default' | 'muted'

interface PanelProps {
  children: React.ReactNode
  className?: string
  tone?: PanelTone
  as?: 'article' | 'section' | 'div'
}

export function Panel({ children, className, tone = 'default', as = 'article' }: PanelProps) {
  const baseClass = tone === 'muted' ? 'app-panel-muted' : 'app-panel'
  const props = { className: cn(baseClass, className), children }

  if (as === 'section') return <section {...props} />
  if (as === 'div') return <div {...props} />
  return <article {...props} />
}

