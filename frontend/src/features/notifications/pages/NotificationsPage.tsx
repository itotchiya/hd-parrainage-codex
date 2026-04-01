import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../../lib/api'
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../api'

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
    return (
      <article className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading notifications...
      </article>
    )
  }

  if (listQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(listQuery.error as ApiError).message}
      </article>
    )
  }

  return (
    <section className="space-y-5">
      <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Notifications
            </p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Inbox
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Only active follow-up items and audit signals stay visible here.
              </p>
            </div>
          </div>

          <div className="grid min-w-[260px] gap-3 sm:grid-cols-3 xl:w-[360px] xl:grid-cols-1">
            <MetricCard label="Total" value={records.length.toString()} />
            <MetricCard label="Unread" value={unreadCount.toString()} />
            <button
              type="button"
              disabled={markAllMutation.isPending || unreadCount === 0}
              onClick={() => markAllMutation.mutate()}
              className="flex items-center justify-center rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark all read
            </button>
          </div>
        </div>
      </article>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Unread
          </h2>
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

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Archive
          </h2>
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
    <article className="rounded-lg border border-border bg-muted/30 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </article>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <article className="rounded-xl border border-dashed border-border bg-card px-5 py-6 text-sm text-muted-foreground">
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
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {type}
            </span>
            <span
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                unread ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground'
              }`}
            >
              {unread ? 'Unread' : 'Read'}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{message}</p>
        </div>

        <div className="flex min-w-[180px] flex-col items-start gap-3 lg:items-end">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {formatDate(readAt)}
          </p>
          {unread && onMarkRead ? (
            <button
              type="button"
              disabled={busy}
              onClick={onMarkRead}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark read
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
