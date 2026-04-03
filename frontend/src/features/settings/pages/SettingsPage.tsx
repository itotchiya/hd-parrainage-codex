import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import { fetchSettings, fetchSyncOverview, updateBusinessSettings, updateOwnSettings } from '../api'
import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type SettingsTabId = 'profile' | 'notifications' | 'security' | 'payment'

const settingsTabs: Array<{
  id: SettingsTabId
  label: string
  eyebrow: string
  description: string
}> = [
  {
    id: 'profile',
    label: 'Profile',
    eyebrow: 'Identity and business scope',
    description: 'Live profile and business records that already save through the backend contract.',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    eyebrow: 'Delivery posture',
    description: 'Operational preferences are staged here until persistence lands behind this screen.',
  },
  {
    id: 'security',
    label: 'Security',
    eyebrow: 'Account safety',
    description: 'Password recovery and session posture are live, while deeper account controls remain gated for later.',
  },
  {
    id: 'payment',
    label: 'Payment',
    eyebrow: 'Payout readiness',
    description: 'Exchange and cash-out readiness is visible here before bank-data persistence is introduced.',
  },
]

function SettingsMetric({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'dark'
}) {
  return (
    <article
      className={
        tone === 'dark'
          ? 'rounded-lg border border-border/50 bg-background/10 px-4 py-3 text-background'
          : 'rounded-lg border border-border bg-muted/30 px-4 py-3'
      }
    >
      <p className={tone === 'dark' ? 'text-[11px] uppercase tracking-[0.18em] text-background/70' : 'text-[11px] uppercase tracking-[0.18em] text-muted-foreground'}>
        {label}
      </p>
      <p className={tone === 'dark' ? 'mt-2 text-base font-semibold text-background' : 'mt-2 text-base font-semibold text-foreground'}>
        {value}
      </p>
    </article>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not available'
  }

  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SettingsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthSession()
  const [activeTab, setActiveTab] = useState<SettingsTabId>('profile')
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessWebsite, setBusinessWebsite] = useState('')
  const [businessTimezone, setBusinessTimezone] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['settings', 'profile'],
    queryFn: fetchSettings,
  })
  const canViewSync = user?.permissions.includes('iacrm.sync-view') ?? false
  const syncOverviewQuery = useQuery({
    queryKey: ['sync', 'overview'],
    queryFn: fetchSyncOverview,
    enabled: canViewSync,
  })

  useEffect(() => {
    if (!query.data) return

    setDisplayName(query.data.data.user.display_name)
    setAvatarUrl(query.data.data.user.avatar_url ?? '')
    setBusinessName(query.data.data.business?.display_name ?? '')
    setBusinessEmail(query.data.data.business?.contact_email ?? '')
    setBusinessPhone(query.data.data.business?.contact_phone ?? '')
    setBusinessWebsite(query.data.data.business?.website_url ?? '')
    setBusinessTimezone(query.data.data.business?.timezone ?? '')
  }, [query.data])

  const ownMutation = useMutation({
    mutationFn: updateOwnSettings,
    onSuccess: async () => {
      setFeedback('Profile settings updated.')
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
    },
    onError: (error) => setFeedback((error as ApiError).message),
  })

  const businessMutation = useMutation({
    mutationFn: updateBusinessSettings,
    onSuccess: async () => {
      setFeedback('Business settings updated.')
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
    },
    onError: (error) => setFeedback((error as ApiError).message),
  })

  const roleSummary = useMemo(() => {
    if (!user) {
      return []
    }

    return user.roles.map((role) => {
      const scope = role.scope_type === 'business' ? role.business_id ?? 'business' : 'platform'
      return `${role.name ?? role.slug ?? 'Role'} / ${scope}`
    })
  }, [user])

  if (query.isPending) {
    return (
      <article className="app-panel text-sm text-muted-foreground">
        Loading settings, profile state, and business context from the live backend...
      </article>
    )
  }

  if (query.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(query.error as ApiError).message}
      </article>
    )
  }

  const payload = query.data.data
  const activeTabMeta = settingsTabs.find((tab) => tab.id === activeTab) ?? settingsTabs[0]
  const notificationReadiness = payload.permissions.can_update_own ? 'Awaiting preference persistence' : 'Read-only user scope'
  const securityReadiness = user?.email_verified_at ? 'Identity already verified' : 'Verification pending'
  const payoutReadiness = payload.business ? `${payload.business.currency_code} / ${payload.business.timezone}` : 'Global scope user'
  const syncOverview = syncOverviewQuery.data?.data
  const syncAlertsValue = !canViewSync
    ? 'No sync visibility in this role'
    : syncOverviewQuery.isPending
      ? 'Loading live sync overview...'
      : syncOverviewQuery.isError
        ? 'Live sync overview unavailable'
        : `${syncOverview?.failed_jobs_total ?? 0} active issue(s)`
  const latestFailureValue = syncOverview?.latest_failure?.failure_message ?? 'No current sync failure recorded'
  const oldestQueuedValue = syncOverview?.oldest_queued_at ? formatDateTime(syncOverview.oldest_queued_at) : 'No queued sync job'

  return (
    <section className="app-section">
      <PageHeader title="Settings" />
      <p className="app-copy text-muted-foreground">{activeTabMeta.description}</p>

      <div className="grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
        <article className="rounded-lg border border-border bg-card app-card-padding">
          <p className="app-eyebrow">{activeTabMeta.eyebrow}</p>
          <p className="mt-2 text-sm font-medium text-foreground">{activeTabMeta.label} tab</p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <SettingsMetric label="Current scope" value={payload.business?.display_name ?? 'Global platform'} />
            <SettingsMetric label="Resolved roles" value={roleSummary.length.toString()} />
            <SettingsMetric label="Permission count" value={user?.permissions.length.toString() ?? '0'} />
          </div>
        </article>

        <article className="rounded-lg border border-border bg-foreground p-6 text-background">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-background/70">
            Runtime readiness
          </p>
          <div className="mt-5 grid gap-4">
            <SettingsMetric label="Notifications" value={notificationReadiness} tone="dark" />
            <SettingsMetric label="Security" value={securityReadiness} tone="dark" />
            <SettingsMetric label="Payment" value={payoutReadiness} tone="dark" />
          </div>
        </article>
      </div>

      <div className="flex flex-wrap gap-2">
        {settingsTabs.map((tab) => {
          const isActive = tab.id === activeTab

          return (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={isActive ? 'default' : 'outline'}
              onClick={() => {
                setActiveTab(tab.id)
                setFeedback(null)
              }}
            >
              {tab.label}
            </Button>
          )
        })}
      </div>

      {activeTab === 'profile' ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-lg border border-border bg-card app-card-padding">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Personal profile
                </p>
                <h2 className="app-section-title mt-2">Identity that already persists through the API</h2>
              </div>
              <span className="rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {payload.user.status}
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <InfoRow label="Email" value={payload.user.email} />
              <InfoRow label="Current business" value={payload.business?.display_name ?? 'Global platform'} />
              <div className="md:col-span-2 rounded-lg border border-border bg-muted/30 px-4 py-3">
                <label className="text-xs uppercase tracking-[0.22em] text-muted-foreground" htmlFor="display_name">
                  Display name
                </label>
                <Input
                  id="display_name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="mt-2"
                  placeholder="Display name"
                />
              </div>
              <div className="md:col-span-2 rounded-lg border border-border bg-muted/30 px-4 py-3">
                <label className="text-xs uppercase tracking-[0.22em] text-muted-foreground" htmlFor="avatar_url">
                  Avatar image URL
                </label>
                <Input
                  id="avatar_url"
                  value={avatarUrl}
                  onChange={(event) => setAvatarUrl(event.target.value)}
                  className="mt-2"
                  placeholder="https://example.com/avatar.jpg"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Use a public image URL. Leave empty to fallback to initials.
                </p>
              </div>
            </div>

            {payload.permissions.can_update_own ? (
              <Button
                type="button"
                size="sm"
                className="mt-5"
                disabled={ownMutation.isPending || displayName.trim().length === 0}
                onClick={() =>
                  ownMutation.mutate({
                    display_name: displayName.trim(),
                    avatar_url: avatarUrl.trim() || null,
                  })
                }
              >
                {ownMutation.isPending ? 'Saving profile...' : 'Save profile'}
              </Button>
            ) : null}
          </article>

          <article className="rounded-lg border border-border bg-card app-card-padding">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Business configuration
            </p>
            <h2 className="app-section-title mt-2">Tenant-facing contact and identity surface</h2>

            {payload.business ? (
              <>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                    <label className="text-xs uppercase tracking-[0.22em] text-muted-foreground" htmlFor="business_name">
                      Display name
                    </label>
                    <Input
                      id="business_name"
                      value={businessName}
                      onChange={(event) => setBusinessName(event.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                    <label className="text-xs uppercase tracking-[0.22em] text-muted-foreground" htmlFor="business_email">
                      Contact email
                    </label>
                    <Input
                      id="business_email"
                      value={businessEmail}
                      onChange={(event) => setBusinessEmail(event.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                    <label className="text-xs uppercase tracking-[0.22em] text-muted-foreground" htmlFor="business_phone">
                      Contact phone
                    </label>
                    <Input
                      id="business_phone"
                      value={businessPhone}
                      onChange={(event) => setBusinessPhone(event.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                    <label className="text-xs uppercase tracking-[0.22em] text-muted-foreground" htmlFor="business_website">
                      Website
                    </label>
                    <Input
                      id="business_website"
                      value={businessWebsite}
                      onChange={(event) => setBusinessWebsite(event.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div className="md:col-span-2 rounded-lg border border-border bg-muted/30 px-4 py-3">
                    <label className="text-xs uppercase tracking-[0.22em] text-muted-foreground" htmlFor="business_timezone">
                      Timezone
                    </label>
                    <Input
                      id="business_timezone"
                      value={businessTimezone}
                      onChange={(event) => setBusinessTimezone(event.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <InfoRow label="Legal name" value={payload.business.legal_name} />
                  <InfoRow label="Slug" value={payload.business.slug} />
                  <InfoRow label="Currency" value={payload.business.currency_code} />
                </div>

                {payload.permissions.can_update_business ? (
                  <Button
                    type="button"
                    size="sm"
                    className="mt-5"
                    disabled={businessMutation.isPending || businessName.trim().length === 0}
                    onClick={() =>
                      businessMutation.mutate({
                        display_name: businessName.trim(),
                        contact_email: businessEmail.trim() || null,
                        contact_phone: businessPhone.trim() || null,
                        website_url: businessWebsite.trim() || null,
                        timezone: businessTimezone.trim() || null,
                      })
                    }
                  >
                    {businessMutation.isPending ? 'Saving business...' : 'Save business settings'}
                  </Button>
                ) : null}
              </>
            ) : (
              <p className="mt-5 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm leading-7 text-muted-foreground">
                This account currently operates without a tenant-scoped business profile.
              </p>
            )}
          </article>
        </div>
      ) : null}

      {activeTab === 'notifications' ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <article className="rounded-lg border border-border bg-card app-card-padding">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Delivery channels
            </p>
            <h2 className="app-section-title mt-2">Notification preferences are staged, not persisted yet.</h2>
            <div className="mt-5 space-y-3">
              <InfoRow label="Inbox notifications" value="Live through the Notifications module" />
              <InfoRow label="Email delivery" value="Waiting for production mail configuration" />
              <InfoRow label="SMS / urgent delivery" value="Not modeled yet in the backend contract" />
              <InfoRow label="Sync escalation" value={syncAlertsValue} />
            </div>
            <p className="mt-5 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm leading-7 text-muted-foreground">
              This tab is intentionally read-only until preference persistence and provider delivery settings are introduced. The operational inbox at{' '}
              <Link to="/notifications" className="font-semibold text-foreground underline underline-offset-4">
                /notifications
              </Link>{' '}
              is already live.
            </p>
          </article>

          <article className="rounded-lg border border-border bg-foreground p-6 text-background">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-background/70">
              Integration posture
            </p>
            <div className="mt-5 space-y-3">
              <SettingsMetric label="Mail" value="Placeholder until operator secrets land" tone="dark" />
              <SettingsMetric label="Analytics" value="Deferred pending real GA values" tone="dark" />
              <SettingsMetric label="IACRM sync alerts" value={syncAlertsValue} tone="dark" />
              <SettingsMetric label="Oldest queued sync" value={oldestQueuedValue} tone="dark" />
              <SettingsMetric label="Latest failure" value={latestFailureValue} tone="dark" />
            </div>
          </article>
        </div>
      ) : null}

      {activeTab === 'security' ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <article className="rounded-lg border border-border bg-card app-card-padding">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Account safety
            </p>
            <h2 className="app-section-title mt-2">Password recovery is live. Direct password replacement is not.</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <InfoRow label="Email verification" value={user?.email_verified_at ? formatDateTime(user.email_verified_at) : 'Pending'} />
              <InfoRow label="Last login" value={formatDateTime(user?.last_login_at ?? null)} />
              <InfoRow label="Last activity" value={formatDateTime(user?.last_activity_at ?? null)} />
              <InfoRow label="Current status" value={payload.user.status} />
            </div>
            <p className="mt-5 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm leading-7 text-muted-foreground">
              Reset-token issuance and password replacement already run through the public auth routes. This settings tab does not invent an in-session password-change endpoint that the backend does not expose yet.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button size="sm" asChild>
                <Link to="/password/forgot">Open password recovery</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/notifications">Review security notifications</Link>
              </Button>
            </div>
          </article>

          <article className="rounded-lg border border-border bg-foreground p-6 text-background">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-background/70">
              Security roadmap
            </p>
            <div className="mt-5 space-y-3">
              <SettingsMetric label="In-session password change" value="Not implemented yet" tone="dark" />
              <SettingsMetric label="MFA / device trust" value="Not implemented yet" tone="dark" />
              <SettingsMetric label="Session inventory" value="Not implemented yet" tone="dark" />
            </div>
          </article>
        </div>
      ) : null}

      {activeTab === 'payment' ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <article className="rounded-lg border border-border bg-card app-card-padding">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Exchange and payout readiness
            </p>
            <h2 className="app-section-title mt-2">Operational payout data is visible before bank settings persist here.</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <InfoRow label="Exchange workflow" value="Live through the Exchanges module" />
              <InfoRow label="Cash conversion" value="Driven by program and points rules" />
              <InfoRow label="Business currency" value={payload.business?.currency_code ?? 'Not available'} />
              <InfoRow label="Tenant timezone" value={payload.business?.timezone ?? 'Not available'} />
            </div>
            <p className="mt-5 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm leading-7 text-muted-foreground">
              Bank-account persistence and payout provider setup are intentionally deferred until the operator-owned payment path is finalized. This page keeps that boundary visible instead of pretending the platform can save settlement details already.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button size="sm" asChild>
                <Link to="/payouts">Open exchanges</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/commissions">Review points ledger</Link>
              </Button>
            </div>
          </article>

          <article className="rounded-lg border border-border bg-foreground p-6 text-background">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-background/70">
              What still needs operator setup
            </p>
            <div className="mt-5 space-y-3">
              <SettingsMetric label="Payout provider" value="Not selected / not configured" tone="dark" />
              <SettingsMetric label="Settlement banking data" value="Not persisted in product yet" tone="dark" />
              <SettingsMetric label="Finance audit trail" value="Will expand from exchanges and ledger events" tone="dark" />
            </div>
          </article>
        </div>
      ) : null}

      {feedback ? (
        <p className="rounded-lg border border-border bg-card/90 px-4 py-3 text-sm text-foreground">
          {feedback}
        </p>
      ) : null}
    </section>
  )
}
