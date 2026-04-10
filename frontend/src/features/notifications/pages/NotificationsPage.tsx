import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Check, Info, Mail, AlertTriangle, XCircle, CheckCircle, Clock, ExternalLink, ArrowRight, ArrowDownRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../api'
import { KpiCard, kpiSnapshotBadge } from '../../dashboard/components/KpiCard'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item'
import { Badge } from '@/components/ui/badge'
import type { AppNotificationRecord } from '../../../types/notifications'

function formatNotificationDate(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Map severity/type to colors/icons based on role analysis
function getNotificationSemanticInfo(severity: string, notificationType: string) {
  const isDanger = severity === 'danger' || severity === 'error' || notificationType.includes('error') || notificationType.includes('disputed') || notificationType === 'agent_banned'
  const isWarning = severity === 'warning' || notificationType.includes('warning') || notificationType === 'business_verification' || notificationType === 'conversion_flagged'
  const isSuccess = severity === 'success' || notificationType.includes('success') || notificationType === 'points_earned' || notificationType === 'exchange_approved'
  
  if (isDanger) {
    return {
      icon: <XCircle className="size-5 text-rose-600" />,
      itemMediaClass: "bg-rose-50 border-rose-200 text-rose-600",
      badgeClass: "bg-rose-100 text-rose-700 hover:bg-rose-100/80 border-rose-200",
    }
  }
  if (isWarning) {
    return {
      icon: <AlertTriangle className="size-5 text-amber-600" />,
      itemMediaClass: "bg-amber-50 border-amber-200 text-amber-600",
      badgeClass: "bg-amber-100 text-amber-700 hover:bg-amber-100/80 border-amber-200",
    }
  }
  if (isSuccess) {
    return {
      icon: <CheckCircle className="size-5 text-emerald-600" />,
      itemMediaClass: "bg-emerald-50 border-emerald-200 text-emerald-600",
      badgeClass: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 border-emerald-200",
    }
  }
  
  // Default to Info (Primary)
  return {
    icon: <Info className="size-5 text-sky-600 dark:text-sky-400" />,
    itemMediaClass: "bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20 text-sky-600 dark:text-sky-400",
    badgeClass: "bg-muted text-muted-foreground hover:bg-muted/80",
  }
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[250px] flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <Mail className="size-7 text-muted-foreground/60" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">Tout est a jour</h3>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const listQuery = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: fetchNotifications,
  })

  const markOneMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const records = listQuery.data?.data ?? []
  const unreadCount = listQuery.data?.meta.unread_count ?? 0
  const grouped = useMemo(
    () => ({
      unread: records.filter((item) => !item.read_at).sort((a,b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()),
      read: records.filter((item) => item.read_at).sort((a,b) => new Date(b.read_at || 0).getTime() - new Date(a.read_at || 0).getTime()),
    }),
    [records],
  )

  if (listQuery.isPending) {
    return <article className="app-panel text-sm text-muted-foreground">Chargement des notifications...</article>
  }

  if (listQuery.isError) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(listQuery.error as ApiError).message}
      </article>
    )
  }

  return (
    <section className="app-section">
      <PageHeader
        title="Notifications"
        beforeTitle={
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Mail className="size-5" />
          </div>
        }
        right={
          <PageHeaderToolbar>
            <Button
              type="button"
              variant="outline"
              disabled={markAllMutation.isPending || unreadCount === 0}
              onClick={() => markAllMutation.mutate()}
              className="gap-2"
            >
              <Check className="size-4" />
              Tout marquer comme lu
            </Button>
          </PageHeaderToolbar>
        }
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4 mb-2">
        <KpiCard
          title="Boite de reception"
          value={unreadCount.toString()}
          description="Notifications en attente"
          badge={kpiSnapshotBadge('Inbox')}
          icon={Mail}
          tone="info"
        />
        <KpiCard
          title="Archives"
          value={grouped.read.length.toString()}
          description="Conservees pour l'historique"
          badge={kpiSnapshotBadge('Stockees')}
          icon={Archive}
          tone="success"
        />
      </div>

      <Tabs defaultValue="inbox" className="mt-8 space-y-6">
        <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start h-auto p-0 gap-6">
          <TabsTrigger 
            value="inbox" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-1 py-3 font-semibold text-muted-foreground data-[state=active]:text-foreground"
          >
            A traiter
            {grouped.unread.length > 0 && (
              <span className="ml-2 text-xs font-normal opacity-60">({grouped.unread.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="archive"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-1 py-3 font-semibold text-muted-foreground data-[state=active]:text-foreground"
          >
            Archive
            <span className="ml-2 text-xs font-normal opacity-60">({grouped.read.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="m-0 focus-visible:outline-none">
          <div className="flex flex-col gap-3">
            {grouped.unread.length === 0 ? (
              <EmptyState message="Vous n'avez aucune nouvelle notification." />
            ) : (
              grouped.unread.map((item) => (
                <NotificationItem 
                  key={item.id} 
                  item={item} 
                  onMarkRead={() => markOneMutation.mutate(item.id)}
                  isBusy={markOneMutation.isPending} 
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="archive" className="m-0 focus-visible:outline-none">
          <div className="flex flex-col gap-3">
            {grouped.read.length === 0 ? (
              <EmptyState message="Votre historique de notifications est vide." />
            ) : (
              grouped.read.map((item) => (
                <NotificationItem 
                  key={item.id} 
                  item={item} 
                  isArchive 
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}

function RoleSpecificDetails({ metadata, type }: { metadata: Record<string, unknown> | null, type: string }) {
  if (!metadata || Object.keys(metadata).length === 0) return null;

  // Specific Layouts based on type
  if (type === 'exchange_requested' && metadata.exchange_id) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-foreground/80 bg-muted/30 p-2.5 rounded-lg border w-fit">
        <ArrowDownRight className="size-4 text-muted-foreground" />
        Transaction <span className="font-mono text-xs">{String(metadata.exchange_id).slice(0, 8)}...</span>
        {metadata.amount && <span>pour <strong>{String(metadata.amount)} pts</strong></span>}
      </div>
    );
  }

  if (type === 'points_earned' && metadata.amount) {
    return (
      <div className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
        <ArrowRight className="size-4" />
        <span className="font-semibold">+{String(metadata.amount)} pts obtenus</span>
      </div>
    );
  }

  // Fallback for generic metadata
  return (
    <div className="mt-3 text-xs text-muted-foreground bg-muted p-2.5 rounded-lg border inline-block w-fit max-w-full truncate overflow-hidden">
      <span className="font-semibold text-foreground">Details:</span> {JSON.stringify(metadata)}
    </div>
  );
}

function RoleSpecificActions({ 
  item, 
  onMarkRead, 
  isBusy,
  isArchive 
}: { 
  item: AppNotificationRecord, 
  onMarkRead?: () => void, 
  isBusy?: boolean,
  isArchive?: boolean
}) {
  const isExchangeAction = item.notification_type === 'exchange_requested' && item.metadata?.exchange_id;

  return (
    <ItemActions className="mt-4 w-full flex flex-row items-center justify-between sm:w-auto sm:mt-0 sm:flex-col sm:items-end gap-3 self-end sm:self-stretch">
      <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md mb-auto">
        <Clock className="size-3" />
        {formatNotificationDate(item.created_at)}
      </span>
      
      <div className="flex items-center gap-2">
        {isExchangeAction && (
          <Button 
            variant="default" 
            size="sm" 
            asChild
            className="h-8 gap-1.5"
          >
            <Link to={`/exchanges/${item.metadata?.exchange_id}`}>
              Visualiser
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        )}

        {!isArchive && onMarkRead && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onMarkRead} 
            disabled={isBusy}
            className="h-8 gap-2 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
          >
            <Check className="size-4" />
            Lu
          </Button>
        )}
      </div>
    </ItemActions>
  );
}

function NotificationItem({ 
  item, 
  onMarkRead, 
  isBusy,
  isArchive = false 
}: { 
  item: AppNotificationRecord
  onMarkRead?: () => void
  isBusy?: boolean
  isArchive?: boolean
}) {
  const semantic = getNotificationSemanticInfo(item.severity, item.notification_type)

  return (
    <Item className={`relative flex-col sm:flex-row items-start sm:items-center p-4 transition-colors hover:bg-muted/40 rounded-xl border bg-card ${isArchive ? 'opacity-70' : ''}`}>
      {!isArchive && (
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-primary rounded-l-xl" />
      )}
      
      <ItemMedia variant="icon" className={`size-10 sm:size-12 rounded-xl flex shrink-0 items-center justify-center border ${semantic.itemMediaClass}`}>
        {semantic.icon}
      </ItemMedia>

      <ItemContent className="flex-1 space-y-1 w-full mt-2 sm:mt-0 px-1 sm:px-2">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <ItemTitle className="text-base font-semibold text-foreground tracking-tight line-clamp-1">{item.title}</ItemTitle>
          <Badge variant="outline" className={`shrink-0 text-[10px] uppercase font-semibold tracking-wider rounded-md py-0 h-5 ${semantic.badgeClass}`}>
            {item.notification_type.replace(/_/g, ' ')}
          </Badge>
        </div>
        <ItemDescription className="text-sm text-muted-foreground leading-relaxed md:pr-10">
          {item.message}
        </ItemDescription>
        
        <RoleSpecificDetails metadata={item.metadata} type={item.notification_type} />
      </ItemContent>
      
      <RoleSpecificActions 
        item={item} 
        onMarkRead={onMarkRead} 
        isBusy={isBusy} 
        isArchive={isArchive} 
      />
    </Item>
  )
}
