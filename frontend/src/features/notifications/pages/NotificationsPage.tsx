import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../../lib/api'
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../api'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'

function formatDate(value: string | null) {
  if (!value) {
    return 'Unread'
  }

  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
      unread: records.filter((item) => !item.read_at),
      read: records.filter((item) => item.read_at),
    }),
    [records],
  )

  if (listQuery.isPending) {
    return <article className="app-panel text-sm text-muted-foreground">Loading notifications...</article>
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
        right={
          <PageHeaderToolbar>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={markAllMutation.isPending || unreadCount === 0}
              onClick={() => markAllMutation.mutate()}
            >
              Mark all read
            </Button>
          </PageHeaderToolbar>
        }
      />
      <p className="app-copy text-muted-foreground">
        Active follow-up items and audit signals from the backend.
      </p>

      <div className="app-grid-tight sm:grid-cols-3">
        <MetricCard label="Total" value={records.length.toString()} />
        <MetricCard label="Unread" value={unreadCount.toString()} />
        <MetricCard label="Read" value={grouped.read.length.toString()} />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Unread</h2>
          <span className="text-xs text-muted-foreground">{grouped.unread.length} items</span>
        </div>
        {grouped.unread.length === 0 ? (
          <EmptyState message="No unread notifications." />
        ) : (
          grouped.unread.map((item) => (
            <NotificationCard
              key={item.id}
              id={item.id}
              title={item.title}
              message={item.message}
              type={item.notification_type}
              readAt={item.read_at}
              busy={markOneMutation.isPending}
              onMarkRead={() => markOneMutation.mutate(item.id)}
            />
          ))
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Archive</h2>
          <span className="text-xs text-muted-foreground">{grouped.read.length} items</span>
        </div>
        {grouped.read.length === 0 ? (
          <EmptyState message="No read notifications yet." />
        ) : (
          grouped.read.map((item) => (
            <NotificationCard
              key={item.id}
              id={item.id}
              title={item.title}
              message={item.message}
              type={item.notification_type}
              readAt={item.read_at}
              busy={false}
            />
          ))
        )}
      </section>
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-muted/15 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </article>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <article className="rounded-lg border border-dashed border-border bg-muted/15 px-5 py-6 text-sm text-muted-foreground">
      {message}
    </article>
  )
}

function NotificationCard({
  title,
  message,
  type,
  readAt,
  busy,
  onMarkRead,
}: {
  id: string
  title: string
  message: string
  type: string
  readAt: string | null
  busy: boolean
  onMarkRead?: () => void
}) {
  const unread = !readAt

  return (
    <article className="rounded-lg border border-border bg-card app-card-padding">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {type}
            </span>
            <span
              className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                unread
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                  : 'border-border bg-muted/30 text-muted-foreground'
              }`}
            >
              {unread ? 'Unread' : 'Read'}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{message}</p>
        </div>

        <div className="flex min-w-[180px] flex-col items-start gap-3 lg:items-end">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{formatDate(readAt)}</p>
          {unread && onMarkRead ? (
            <Button type="button" size="sm" disabled={busy} onClick={onMarkRead}>
              Mark read
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
