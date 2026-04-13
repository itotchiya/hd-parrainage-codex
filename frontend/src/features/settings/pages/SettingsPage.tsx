import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../../lib/api'
import { compressAvatarFile, validateAvatarFile } from '../../../lib/avatar-upload'
import { useAuthSession } from '../../auth/session'
import {
  fetchSettings,
  fetchSyncOverview,
  requestOwnEmailChange,
  resendOwnEmailVerification,
  updateBusinessSettings,
  updateOwnPassword,
  updateOwnSettings,
  uploadBusinessLogo,
  uploadOwnAvatar,
  verifyOwnEmailCode,
} from '../api'
import { PageHeader, PageHeaderToolbar } from '@/components/app/PageHeader'
import { TablePaginationBar } from '@/components/app/TablePaginationBar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { formatAppDateTime, formatAppTime } from '@/lib/locale'
import { toast } from 'sonner'
import { IacrmApiSettingsTab } from '../components/IacrmApiSettingsTab'
import { SettingsPreviewItem } from '../components/SettingsPreviewItem'
import {
  BadgeCheck,
  Camera,
  Database,
  Globe,
  History,
  Inbox,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

type SettingsTabId = 'profile' | 'notifications' | 'security' | 'api'
type SettingsDialogId = 'name' | 'avatar' | 'email' | 'business' | 'business-logo' | 'notifications' | 'password' | 'sync-issues' | null
type NotificationPreferenceKey = keyof NotificationPreferences

const settingsQueryKey = ['settings', 'profile']
const notificationStorageKey = 'frontend-settings-notification-preferences'

function getSettingsTabs(t: (key: string) => string): Array<{ id: SettingsTabId; label: string; icon?: ReactNode }> {
  return [
    { id: 'profile', label: t('settings.tabs.profile') },
    { id: 'notifications', label: t('settings.tabs.notifications') },
    { id: 'security', label: t('settings.tabs.security') },
    { id: 'api', label: t('settings.tabs.api'), icon: <KeyRound className="size-3.5" /> },
  ]
}

function getNotificationOptions(t: (key: string) => string): Array<{
  key: NotificationPreferenceKey
  title: string
  label: string
  description: string
}> {
  return [
    {
      key: 'inbox',
      title: t('settings.notifications.options.inbox.title'),
      label: t('settings.notifications.options.inbox.label'),
      description: t('settings.notifications.options.inbox.description'),
    },
    {
      key: 'security',
      title: t('settings.notifications.options.security.title'),
      label: t('settings.notifications.options.security.label'),
      description: t('settings.notifications.options.security.description'),
    },
    {
      key: 'crm',
      title: t('settings.notifications.options.crm.title'),
      label: t('settings.notifications.options.crm.label'),
      description: t('settings.notifications.options.crm.description'),
    },
  ]
}

interface NotificationPreferences {
  inbox: boolean
  security: boolean
  crm: boolean
}

type SettingsTone = 'neutral' | 'active' | 'success' | 'warning' | 'danger'

function settingsToneBadgeClass(tone: SettingsTone) {
  switch (tone) {
    case 'active':
      return 'border-transparent bg-sky-500/15 text-sky-900 dark:bg-sky-500/20 dark:text-sky-300'
    case 'success':
      return 'border-transparent bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
    case 'warning':
      return 'border-transparent bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
    case 'danger':
      return 'border-transparent bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
    default:
      return 'border-transparent bg-muted text-muted-foreground'
  }
}

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function splitDisplayName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)

  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  }
}

function formatDateTime(value: string | null, fallback: string) {
  if (!value) {
    return fallback
  }

  return formatAppDateTime(value)
}

function formatVerificationExpiry(value: string | null, fallback: string) {
  if (!value) {
    return fallback
  }

  return formatAppTime(value)
}

function readNotificationPreferences(): NotificationPreferences {
  try {
    const rawValue = window.localStorage.getItem(notificationStorageKey)
    if (!rawValue) {
      return { inbox: true, security: true, crm: true }
    }

    const parsed = JSON.parse(rawValue) as Partial<NotificationPreferences>
    return {
      inbox: parsed.inbox ?? true,
      security: parsed.security ?? true,
      crm: parsed.crm ?? true,
    }
  } catch {
    return { inbox: true, security: true, crm: true }
  }
}

function writeNotificationPreferences(preferences: NotificationPreferences) {
  window.localStorage.setItem(notificationStorageKey, JSON.stringify(preferences))
}

function SettingsPageSkeleton() {
  return (
    <section className="app-section">
      <PageHeader
        title={
          <div className="space-y-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-72" />
          </div>
        }
        titleAddon={<Skeleton className="hidden h-7 w-24 rounded-full sm:block" />}
        right={
          <PageHeaderToolbar>
            <Skeleton className="h-8 w-full rounded-full sm:w-[320px]" />
          </PageHeaderToolbar>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
        <Card className="overflow-hidden border-border/70">
          <CardHeader>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2 border-b border-border/50 pb-4 last:border-b-0 last:pb-0">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/70">
          <CardHeader>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function SectionCard({
  children,
}: {
  children: ReactNode
}) {
  return (
    <Card className="overflow-hidden rounded-xl border-border/70 bg-card">
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  )
}

function SettingsSectionHeader({
  title,
  aside,
  action,
}: {
  title: string
  aside?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="h-6 w-1 rounded-full bg-foreground/85" />
        <div className="flex items-center gap-3">
          <h3 className="text-[1.05rem] font-semibold tracking-tight text-foreground">{title}</h3>
          {aside ? <div className="text-sm text-muted-foreground">{aside}</div> : null}
        </div>
      </div>
      {action}
    </div>
  )
}

function ResponsiveActionButton({
  label,
  onClick,
  icon = <Pencil className="size-3.5" />,
}: {
  label: string
  onClick: () => void
  icon?: ReactNode
}) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="hidden gap-2 text-sm sm:inline-flex"
        onClick={onClick}
      >
        {icon}
        {label}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={label}
        className="sm:hidden"
        onClick={onClick}
      >
        {icon}
      </Button>
    </>
  )
}

export function SettingsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuthSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<SettingsTabId>(() =>
    requestedTab === 'notifications' || requestedTab === 'security' || requestedTab === 'api' ? requestedTab : 'profile',
  )
  const [activeDialog, setActiveDialog] = useState<SettingsDialogId>(null)
  const [notificationDialogKey, setNotificationDialogKey] = useState<NotificationPreferenceKey | null>(null)
  const [securityLogPage, setSecurityLogPage] = useState(1)
  const [securityLogPageSize, setSecurityLogPageSize] = useState(5)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [pendingEmailInput, setPendingEmailInput] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessWebsite, setBusinessWebsite] = useState('')
  const [businessTimezone, setBusinessTimezone] = useState('')
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    inbox: true,
    security: true,
    crm: true,
  })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const settingsTabs = useMemo(() => getSettingsTabs(t), [t])
  const notificationOptions = useMemo(() => getNotificationOptions(t), [t])

  const settingsQuery = useQuery({
    queryKey: settingsQueryKey,
    queryFn: fetchSettings,
  })

  const canViewSync = user?.permissions.includes('iacrm.sync-view') ?? false
  useEffect(() => {
    setActiveTab(
      requestedTab === 'notifications' || requestedTab === 'security' || requestedTab === 'api' ? requestedTab : 'profile',
    )
  }, [requestedTab])

  function handleTabChange(nextTab: SettingsTabId) {
    setActiveTab(nextTab)
    const nextParams = new URLSearchParams(searchParams)
    if (nextTab === 'profile') {
      nextParams.delete('tab')
    } else {
      nextParams.set('tab', nextTab)
    }
    setSearchParams(nextParams, { replace: true })
  }

  const syncOverviewQuery = useQuery({
    queryKey: ['sync', 'overview'],
    queryFn: fetchSyncOverview,
    enabled: canViewSync,
  })

  useEffect(() => {
    setNotificationPreferences(readNotificationPreferences())
  }, [])

  useEffect(() => {
    if (!settingsQuery.data) {
      return
    }

    const payload = settingsQuery.data.data
    const identity = splitDisplayName(payload.user.display_name)
    setFirstName(identity.firstName)
    setLastName(identity.lastName)
    setPendingEmailInput(payload.user.pending_email ?? payload.user.email)
    setBusinessName(payload.business?.display_name ?? '')
    setBusinessEmail(payload.business?.contact_email ?? '')
    setBusinessPhone(payload.business?.contact_phone ?? '')
    setBusinessWebsite(payload.business?.website_url ?? '')
    setBusinessTimezone(payload.business?.timezone ?? '')
  }, [settingsQuery.data])

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl !== null) {
        URL.revokeObjectURL(avatarPreviewUrl)
      }
    }
  }, [avatarPreviewUrl])

  useEffect(() => {
    if (activeDialog === null) {
      setNotificationDialogKey(null)
    }
  }, [activeDialog])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('emailVerified') !== '1') {
      return
    }

    void (async () => {
      await queryClient.invalidateQueries({ queryKey: settingsQueryKey })
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
      toast.success(t('settings.toasts.emailVerifiedSuccess'), { id: 'settings-toast' })
      url.searchParams.delete('emailVerified')
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    })()
  }, [queryClient])

  const settingsData = settingsQuery.data?.data ?? null
  const profileInitials = useMemo(() => {
    const source = settingsData?.user.display_name?.trim() || user?.display_name || 'HD Parrainage'

    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
  }, [settingsData?.user.display_name, user?.display_name])
  const resolvedAvatarPreview = avatarPreviewUrl ?? (settingsData?.user.avatar_url?.trim() || null)
  const pendingEmail = settingsData?.user.pending_email ?? null
  const emailVerified = Boolean(settingsData?.user.email_verified_at)
  const syncOverview = syncOverviewQuery.data?.data
  const syncAlertsValue = !canViewSync
    ? t('settings.sync.noVisibility')
    : syncOverviewQuery.isPending
      ? t('settings.sync.loading')
      : syncOverviewQuery.isError
        ? t('settings.sync.unavailable')
        : t('settings.sync.activeIssues', { count: syncOverview?.failed_jobs_total ?? 0 })
  const activeNotificationOption = notificationDialogKey
    ? notificationOptions.find((option) => option.key === notificationDialogKey) ?? null
    : null
  const securitySessionRows = useMemo(
    () =>
      [
        {
          id: 'last-login',
          event: t('settings.security.events.login'),
          status: t('settings.security.status.success'),
          timestamp: user?.last_login_at ?? null,
          detail: t('settings.security.details.lastLogin'),
        },
        {
          id: 'last-activity',
          event: t('settings.security.events.activity'),
          status: t('settings.security.status.active'),
          timestamp: user?.last_activity_at ?? null,
          detail: t('settings.security.details.lastActivity'),
        },
      ].filter((row) => row.timestamp !== null),
    [user?.last_activity_at, user?.last_login_at],
  )
  const paginatedSecuritySessionRows = useMemo(() => {
    const start = (securityLogPage - 1) * securityLogPageSize
    return securitySessionRows.slice(start, start + securityLogPageSize)
  }, [securityLogPage, securityLogPageSize, securitySessionRows])

  const saveNameMutation = useMutation({
    mutationFn: async (payload: { display_name: string; email: string; phone_number?: string | null; avatar_url?: string | null }) =>
      updateOwnSettings(payload),
    onSuccess: async (response) => {
      queryClient.setQueryData(settingsQueryKey, response)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
      setActiveDialog(null)
      toast.success(t('settings.toasts.nameUpdated'), { id: 'settings-toast' })
    },
    onError: (error) => toast.error((error as ApiError).message, { id: 'settings-toast' }),
  })

  const avatarMutation = useMutation({
    mutationFn: async () => {
      if (!settingsData || avatarFile === null) {
        throw new Error('Select an image before saving.')
      }

      const compressedAvatar = await compressAvatarFile(avatarFile)
      const avatarResponse = await uploadOwnAvatar(compressedAvatar)

      return updateOwnSettings({
        display_name: settingsData.user.display_name,
        email: settingsData.user.email,
        phone_number: settingsData.user.phone_number ?? null,
        avatar_url: avatarResponse.data.user.avatar_url,
      })
    },
    onSuccess: async (response) => {
      queryClient.setQueryData(settingsQueryKey, response)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
      setActiveDialog(null)
      setAvatarFile(null)
      if (avatarPreviewUrl !== null) {
        URL.revokeObjectURL(avatarPreviewUrl)
      }
      setAvatarPreviewUrl(null)
      toast.success(t('settings.toasts.avatarUpdated'), { id: 'settings-toast' })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t('settings.toasts.avatarUpdateFailed'), { id: 'settings-toast' }),
  })

  const logoMutation = useMutation({
    mutationFn: async () => {
      if (logoFile === null) throw new Error('Select an image before saving.')
      const compressedLogo = await compressAvatarFile(logoFile)
      return uploadBusinessLogo(compressedLogo)
    },
    onSuccess: async (response) => {
      queryClient.setQueryData(settingsQueryKey, response)
      setActiveDialog(null)
      setLogoFile(null)
      if (logoPreviewUrl !== null) URL.revokeObjectURL(logoPreviewUrl)
      setLogoPreviewUrl(null)
      toast.success(t('settings.toasts.logoUpdated'), { id: 'settings-toast' })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t('settings.toasts.logoUpdateFailed'), { id: 'settings-toast' }),
  })

  const emailChangeMutation = useMutation({
    mutationFn: async (payload: { email: string }) => requestOwnEmailChange(payload),
    onSuccess: async (response) => {
      queryClient.setQueryData(settingsQueryKey, response)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
      setEmailCode('')
      toast.success(t('settings.toasts.emailVerificationSent'), { id: 'settings-toast' })
    },
    onError: (error) => toast.error((error as ApiError).message, { id: 'settings-toast' }),
  })

  const emailVerifyMutation = useMutation({
    mutationFn: async (payload: { code: string }) => verifyOwnEmailCode(payload),
    onSuccess: async (response) => {
      queryClient.setQueryData(settingsQueryKey, response)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
      setEmailCode('')
      setActiveDialog(null)
      toast.success(t('settings.toasts.emailVerified'), { id: 'settings-toast' })
    },
    onError: (error) => toast.error((error as ApiError).message, { id: 'settings-toast' }),
  })

  const emailResendMutation = useMutation({
    mutationFn: resendOwnEmailVerification,
    onSuccess: () => {
      toast.success(t('settings.toasts.emailVerificationResent'), { id: 'settings-toast' })
    },
    onError: (error) => toast.error((error as ApiError).message, { id: 'settings-toast' }),
  })

  const businessMutation = useMutation({
    mutationFn: updateBusinessSettings,
    onSuccess: async (response) => {
      queryClient.setQueryData(settingsQueryKey, response)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
      setActiveDialog(null)
      toast.success(t('settings.toasts.businessUpdated'), { id: 'settings-toast' })
    },
    onError: (error) => toast.error((error as ApiError).message, { id: 'settings-toast' }),
  })

  const passwordMutation = useMutation({
    mutationFn: updateOwnPassword,
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setActiveDialog(null)
      toast.success(t('settings.toasts.passwordUpdated'), { id: 'settings-toast' })
    },
    onError: (error) => toast.error((error as ApiError).message, { id: 'settings-toast' }),
  })

  if (settingsQuery.isPending) {
    return <SettingsPageSkeleton />
  }

  if (settingsQuery.isError || settingsData === null) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {((settingsQuery.error as ApiError | undefined)?.message) ?? t('settings.errors.loadFailed')}
      </article>
    )
  }

  const fullName = `${firstName} ${lastName}`.trim()
  const normalizedBusinessEmail = businessEmail.trim()
  const businessEmailIsValid =
    normalizedBusinessEmail.length === 0 || isValidEmailAddress(normalizedBusinessEmail)

  return (
    <section className="app-section">
      <PageHeader
        title={t('settings.title')}
        right={
          <PageHeaderToolbar>
            <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as SettingsTabId)}>
              <TabsList>
                {settingsTabs
                  .filter((tab) => tab.id !== 'api' || canViewSync)
                  .map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id}>
                      <span className="inline-flex items-center gap-1.5">
                        {tab.icon}
                        <span>{tab.label}</span>
                      </span>
                    </TabsTrigger>
                  ))}
              </TabsList>
            </Tabs>
          </PageHeaderToolbar>
        }
      />

      {activeTab === 'profile' ? (
        <div className="space-y-5">
          <SectionCard>
            <SettingsSectionHeader title={t('settings.profile.personalIdentity')} />

            <div className="space-y-3">
              <SettingsPreviewItem
                media={
                  <>
                    <Avatar className="size-14 border border-border/70 bg-background">
                      {resolvedAvatarPreview ? <AvatarImage src={resolvedAvatarPreview} alt={settingsData.user.display_name} /> : null}
                      <AvatarFallback className="bg-transparent text-muted-foreground">
                        <UserRound className="size-6" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-1 -right-1 rounded-full border border-border/70 bg-background p-1 text-muted-foreground">
                      <Camera className="size-3" />
                    </span>
                  </>
                }
                title={t('settings.profile.profileImage')}
                value={resolvedAvatarPreview ? t('settings.profile.avatarActive') : t('settings.profile.noAvatar')}
                description={t('settings.profile.avatarHint')}
                badges={
                  <Badge
                    variant="outline"
                    size="sm"
                    className={cn('rounded-full', settingsToneBadgeClass(resolvedAvatarPreview ? 'success' : 'warning'))}
                  >
                    {resolvedAvatarPreview ? t('settings.common.active') : t('settings.common.pending')}
                  </Badge>
                }
                action={<ResponsiveActionButton label={t('settings.profile.changeAvatar')} onClick={() => setActiveDialog('avatar')} />}
                mediaVariant="custom"
              />
              <SettingsPreviewItem
                media={<UserRound className="size-4" />}
                title={t('settings.profile.displayName')}
                value={settingsData.user.display_name}
                description={t('settings.profile.displayNameDescription')}
                action={<ResponsiveActionButton label={t('settings.profile.changeDisplayName')} onClick={() => setActiveDialog('name')} />}
              />
              <SettingsPreviewItem
                media={<Mail className="size-4" />}
                title={t('settings.profile.email')}
                value={settingsData.user.email}
                description={t('settings.profile.emailDescription')}
                badges={
                  <Badge
                    variant="outline"
                    size="sm"
                    className={cn('rounded-full', settingsToneBadgeClass(emailVerified ? 'success' : 'warning'))}
                  >
                    {emailVerified ? t('settings.common.verified') : t('settings.common.pending')}
                  </Badge>
                }
                action={<ResponsiveActionButton label={t('settings.profile.changeEmail')} onClick={() => setActiveDialog('email')} />}
              />
            </div>
          </SectionCard>

          <SectionCard>
            <SettingsSectionHeader
              title="Business identity"
              action={
                settingsData.permissions.can_update_business ? (
                  <ResponsiveActionButton label="Modifier l'identite business" onClick={() => setActiveDialog('business')} />
                ) : null
              }
            />

            {settingsData.business ? (
              <div className="space-y-3">
                <SettingsPreviewItem
                  media={
                    <Avatar className="size-8 rounded-md">
                      <AvatarImage src={settingsData.business.logo_url ?? undefined} alt={settingsData.business.display_name} className="object-contain" />
                      <AvatarFallback className="rounded-md text-xs font-semibold">
                        {settingsData.business.display_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  }
                  title="Logo"
                  value={settingsData.business.logo_url ? 'Logo défini' : 'Aucun logo'}
                  badges={
                    <Badge variant="outline" size="sm" className={cn('rounded-full', settingsToneBadgeClass(settingsData.business.logo_url ? 'success' : 'warning'))}>
                      {settingsData.business.logo_url ? 'Défini' : 'Manquant'}
                    </Badge>
                  }
                  description="Logo ou avatar affiché dans les programmes et tableaux"
                  action={
                    settingsData.permissions.can_update_business ? (
                      <ResponsiveActionButton label="Changer le logo" onClick={() => setActiveDialog('business-logo')} />
                    ) : null
                  }
                />
                <SettingsPreviewItem
                  media={<BadgeCheck className="size-4" />}
                  title="Display name"
                  value={settingsData.business.display_name}
                  badges={
                    <Badge variant="outline" size="sm" className={cn('rounded-full', settingsToneBadgeClass('active'))}>
                      {t('settings.common.active')}
                    </Badge>
                  }
                  description={`${settingsData.business.legal_name} · slug: ${settingsData.business.slug} · ${settingsData.business.currency_code} · ${settingsData.business.timezone}`}
                />
                <SettingsPreviewItem
                  media={<Mail className="size-4" />}
                  title={t('settings.business.contactEmail')}
                  value={settingsData.business.contact_email ?? t('settings.common.notSet')}
                  badges={
                    <Badge
                      variant="outline"
                      size="sm"
                      className={cn(
                        'rounded-full',
                        settingsToneBadgeClass(settingsData.business.contact_email ? 'success' : 'warning'),
                      )}
                    >
                      {settingsData.business.contact_email ? t('settings.common.set') : t('settings.common.missing')}
                    </Badge>
                  }
                  description={t('settings.business.contactEmailDescription')}
                />
                <SettingsPreviewItem
                  media={<Phone className="size-4" />}
                  title={t('settings.business.contactPhone')}
                  value={settingsData.business.contact_phone ?? t('settings.common.notSet')}
                  badges={
                    <Badge
                      variant="outline"
                      size="sm"
                      className={cn(
                        'rounded-full',
                        settingsToneBadgeClass(settingsData.business.contact_phone ? 'success' : 'warning'),
                      )}
                    >
                      {settingsData.business.contact_phone ? t('settings.common.set') : t('settings.common.missing')}
                    </Badge>
                  }
                  description={t('settings.business.contactPhoneDescription')}
                />
                <SettingsPreviewItem
                  media={<Globe className="size-4" />}
                  title={t('settings.business.publicWebsite')}
                  value={settingsData.business.website_url ?? t('settings.common.notSet')}
                  badges={
                    <Badge
                      variant="outline"
                      size="sm"
                      className={cn(
                        'rounded-full',
                        settingsToneBadgeClass(settingsData.business.website_url ? 'active' : 'warning'),
                      )}
                    >
                      {settingsData.business.website_url ? t('settings.common.online') : t('settings.common.missing')}
                    </Badge>
                  }
                  description={t('settings.business.publicWebsiteDescription')}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-sm leading-6 text-muted-foreground">
                {t('settings.business.noBusinessProfile')}
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}

      {activeTab === 'notifications' ? (
        <SectionCard>
          <SettingsSectionHeader title={t('settings.notifications.title')} />
          <div className="space-y-3">
              <SettingsPreviewItem
                media={<Inbox className="size-4" />}
                title={t('settings.notifications.options.inbox.title')}
                value={notificationPreferences.inbox ? t('settings.common.enabled') : t('settings.common.muted')}
                badges={
                  <Badge
                    variant="outline"
                    size="sm"
                    className={cn('rounded-full', settingsToneBadgeClass(notificationPreferences.inbox ? 'success' : 'neutral'))}
                  >
                    {notificationPreferences.inbox ? t('settings.common.active') : t('settings.common.mutedShort')}
                  </Badge>
                }
              description={t('settings.notifications.options.inbox.description')}
              action={
                <ResponsiveActionButton
                  label={t('settings.notifications.editInbox')}
                  onClick={() => {
                    setNotificationDialogKey('inbox')
                    setActiveDialog('notifications')
                  }}
                />
              }
            />
              <SettingsPreviewItem
                media={<ShieldCheck className="size-4" />}
                title={t('settings.notifications.options.security.title')}
                value={notificationPreferences.security ? t('settings.common.enabled') : t('settings.common.muted')}
                badges={
                  <Badge
                    variant="outline"
                    size="sm"
                    className={cn('rounded-full', settingsToneBadgeClass(notificationPreferences.security ? 'success' : 'neutral'))}
                  >
                    {notificationPreferences.security ? t('settings.common.active') : t('settings.common.mutedShort')}
                  </Badge>
                }
              description={t('settings.notifications.options.security.description')}
              action={
                <ResponsiveActionButton
                  label={t('settings.notifications.editSecurity')}
                  onClick={() => {
                    setNotificationDialogKey('security')
                    setActiveDialog('notifications')
                  }}
                />
              }
            />
            <SettingsPreviewItem
              media={<RefreshCw className="size-4" />}
              title={t('settings.notifications.options.crm.title')}
              value={notificationPreferences.crm ? t('settings.common.enabled') : t('settings.common.muted')}
              badges={
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    size="sm"
                    className={cn('rounded-full', settingsToneBadgeClass(notificationPreferences.crm ? 'active' : 'neutral'))}
                  >
                    {notificationPreferences.crm ? t('settings.common.active') : t('settings.common.mutedShort')}
                  </Badge>
                  {canViewSync ? (
                    <Badge
                      variant="outline"
                      size="sm"
                      className={cn(
                        'rounded-full',
                        settingsToneBadgeClass((syncOverview?.failed_jobs_total ?? 0) > 0 ? 'warning' : 'success'),
                      )}
                    >
                      {(syncOverview?.failed_jobs_total ?? 0) > 0 ? t('settings.sync.incidents') : t('settings.sync.healthy')}
                    </Badge>
                  ) : null}
                </div>
              }
              description={syncAlertsValue}
              action={
                <div className="flex items-center gap-2">
                  <ResponsiveActionButton
                    label={t('settings.sync.viewIncidents')}
                    onClick={() => setActiveDialog('sync-issues')}
                    icon={<History className="size-3.5" />}
                  />
                  <ResponsiveActionButton
                    label={t('settings.notifications.editCrmSync')}
                    onClick={() => {
                      setNotificationDialogKey('crm')
                      setActiveDialog('notifications')
                    }}
                  />
                </div>
              }
            />
          </div>
        </SectionCard>
      ) : null}

      {activeTab === 'security' ? (
        <div className="space-y-5">
          <SectionCard>
            <SettingsSectionHeader title={t('settings.security.title')} />
            <div className="space-y-4">
              <SettingsPreviewItem
                media={<KeyRound className="size-4" />}
                title={t('settings.security.password')}
                value="•••••••••••••••"
                badges={
                  <Badge variant="outline" size="sm" className={cn('rounded-full', settingsToneBadgeClass('active'))}>
                    {t('settings.security.protected')}
                  </Badge>
                }
                description={t('settings.security.passwordDescription')}
                action={<Button type="button" variant="outline" size="sm" onClick={() => setActiveDialog('password')}>{t('settings.security.changePassword')}</Button>}
              />
              <SettingsPreviewItem
                media={<BadgeCheck className="size-4 text-emerald-600" />}
                title={t('settings.security.recoveryEmail')}
                value={settingsData.user.email}
                badges={
                  <Badge
                    variant="outline"
                    size="sm"
                    className={cn('rounded-full', settingsToneBadgeClass(emailVerified ? 'success' : 'warning'))}
                  >
                    {emailVerified ? t('settings.common.verified') : t('settings.common.pending')}
                  </Badge>
                }
                description={t('settings.security.recoveryEmailDescription')}
              />
            </div>
          </SectionCard>

          <SectionCard>
            <SettingsSectionHeader
              title={t('settings.security.latestSessions')}
              action={<Badge variant="outline" size="sm">{t('settings.security.entries', { count: securitySessionRows.length })}</Badge>}
            />
            <div className="overflow-hidden rounded-xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('settings.security.table.event')}</TableHead>
                    <TableHead>{t('settings.security.table.status')}</TableHead>
                    <TableHead>{t('settings.security.table.detail')}</TableHead>
                    <TableHead className="text-right">{t('settings.security.table.timestamp')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSecuritySessionRows.length > 0 ? (
                    paginatedSecuritySessionRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium text-foreground">{row.event}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            size="sm"
                            className={cn(
                              'rounded-full',
                              settingsToneBadgeClass(row.status === t('settings.security.status.success') ? 'success' : row.status === t('settings.security.status.active') ? 'active' : 'neutral'),
                            )}
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[24rem] text-sm text-muted-foreground">{row.detail}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {row.timestamp ? formatDateTime(row.timestamp, t('settings.common.notAvailable')) : t('settings.common.unavailable')}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                        {t('settings.security.noSessionSignals')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <TablePaginationBar
                page={securityLogPage}
                pageSize={securityLogPageSize}
                totalItems={securitySessionRows.length}
                onPageChange={setSecurityLogPage}
                onPageSizeChange={setSecurityLogPageSize}
                pageSizeOptions={[5, 10, 20]}
              />
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === 'api' ? (
        <IacrmApiSettingsTab
          syncAlertsValue={syncAlertsValue}
          failedJobsValue={t('settings.sync.activeIssues', { count: syncOverview?.failed_jobs_total ?? 0 })}
        />
      ) : null}

      <Dialog open={activeDialog === 'name'} onOpenChange={(open) => setActiveDialog(open ? 'name' : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('settings.dialogs.name.title')}</DialogTitle>
            <DialogDescription>{t('settings.dialogs.name.description')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-first-name">{t('settings.dialogs.name.firstName')}</label>
              <Input id="settings-first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-last-name">{t('settings.dialogs.name.lastName')}</label>
              <Input id="settings-last-name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>{t('common.cancel')}</Button>
            <Button
              type="button"
              disabled={saveNameMutation.isPending || fullName.length === 0}
              onClick={() =>
                saveNameMutation.mutate({
                  display_name: fullName,
                  email: settingsData.user.email,
                  phone_number: settingsData.user.phone_number ?? null,
                  avatar_url: settingsData.user.avatar_url,
                })
              }
            >
              {saveNameMutation.isPending ? t('settings.dialogs.name.saving') : t('settings.dialogs.name.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'avatar'} onOpenChange={(open) => setActiveDialog(open ? 'avatar' : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier la photo de profil</DialogTitle>
            <DialogDescription>Upload a source image. The browser compresses it before the backend writes it to Cloudflare R2.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-muted/20 p-4">
              <Avatar className="size-20 border border-border bg-card">
                {resolvedAvatarPreview ? <AvatarImage src={resolvedAvatarPreview} alt={settingsData.user.display_name} /> : null}
                <AvatarFallback className="text-lg font-semibold">{profileInitials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-foreground">Current preview</p>
                <p className="mt-1 text-sm leading-7 text-muted-foreground">JPG, PNG, and WebP are accepted. Final storage format is 512x512 WebP.</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-avatar-file">Select image</label>
              <Input
                id="settings-avatar-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null
                  if (nextFile === null) {
                    return
                  }

                  try {
                    validateAvatarFile(nextFile)
                    if (avatarPreviewUrl !== null) {
                      URL.revokeObjectURL(avatarPreviewUrl)
                    }
                    setAvatarFile(nextFile)
                    setAvatarPreviewUrl(URL.createObjectURL(nextFile))
                  } catch (error) {
                    setAvatarFile(null)
                    event.currentTarget.value = ''
                    toast.error(error instanceof Error ? error.message : "Impossible de sélectionner l'image.", {
                      id: 'settings-toast',
                    })
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>Annuler</Button>
            <Button type="button" disabled={avatarMutation.isPending || avatarFile === null} onClick={() => avatarMutation.mutate()}>
              {avatarMutation.isPending ? 'Uploading...' : 'Save avatar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'business-logo'} onOpenChange={(open) => setActiveDialog(open ? 'business-logo' : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le logo du business</DialogTitle>
            <DialogDescription>Upload a source image. The browser compresses it before the backend writes it to Cloudflare R2.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-muted/20 p-4">
              <Avatar className="size-20 rounded-xl border border-border bg-card">
                {(logoPreviewUrl ?? settingsData?.business?.logo_url) ? (
                  <AvatarImage src={logoPreviewUrl ?? settingsData?.business?.logo_url ?? undefined} alt="Logo preview" className="object-contain p-1" />
                ) : null}
                <AvatarFallback className="rounded-xl text-lg font-semibold">
                  {settingsData?.business?.display_name.slice(0, 2).toUpperCase() ?? 'BU'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-foreground">Current preview</p>
                <p className="mt-1 text-sm leading-7 text-muted-foreground">JPG, PNG, and WebP are accepted. Final storage format is 512x512 WebP.</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-logo-file">Select image</label>
              <Input
                id="settings-logo-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null
                  if (nextFile === null) return
                  try {
                    validateAvatarFile(nextFile)
                    if (logoPreviewUrl !== null) URL.revokeObjectURL(logoPreviewUrl)
                    setLogoFile(nextFile)
                    setLogoPreviewUrl(URL.createObjectURL(nextFile))
                  } catch (error) {
                    setLogoFile(null)
                    event.currentTarget.value = ''
                    toast.error(error instanceof Error ? error.message : "Impossible de sélectionner l'image.", { id: 'settings-toast' })
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>Annuler</Button>
            <Button type="button" disabled={logoMutation.isPending || logoFile === null} onClick={() => logoMutation.mutate()}>
              {logoMutation.isPending ? 'Uploading...' : 'Save logo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'email'} onOpenChange={(open) => setActiveDialog(open ? 'email' : null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Change account email</DialogTitle>
            <DialogDescription>The system sends both a signed verification link and a 6-digit code so the user can choose the faster path.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Current email</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-foreground">{settingsData.user.email}</p>
                <Badge variant={emailVerified ? 'default' : 'outline'} size="sm">
                  {emailVerified ? 'Verified' : 'Verification pending'}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-email-input">New email</label>
              <Input
                id="settings-email-input"
                type="email"
                value={pendingEmailInput}
                onChange={(event) => setPendingEmailInput(event.target.value)}
                placeholder="name@company.com"
              />
              <p className="text-sm leading-7 text-muted-foreground">Submitting this form does not replace the active account email immediately. It creates a pending email until verification succeeds.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={emailChangeMutation.isPending || pendingEmailInput.trim().length === 0}
                onClick={() => emailChangeMutation.mutate({ email: pendingEmailInput.trim() })}
              >
                {emailChangeMutation.isPending ? 'Sending...' : 'Send verification email'}
              </Button>
              {pendingEmail ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={emailResendMutation.isPending}
                  onClick={() => emailResendMutation.mutate()}
                >
                  {emailResendMutation.isPending ? 'Resending...' : 'Resend link and code'}
                </Button>
              ) : null}
            </div>

            {pendingEmail ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-800">En attente de vérification</p>
                <p className="mt-3 text-sm leading-7 text-amber-900">
                  <strong>{pendingEmail}</strong> is waiting for verification. Use the signed inbox link or enter the 6-digit code before {formatVerificationExpiry(settingsData.user.pending_email_verification_expires_at)}.
                </p>
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium text-amber-900" htmlFor="settings-email-code">6-digit code</label>
                  <Input
                    id="settings-email-code"
                    inputMode="numeric"
                    maxLength={6}
                    value={emailCode}
                    onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="font-mono tracking-[0.35em]"
                    placeholder="000000"
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    disabled={emailVerifyMutation.isPending || emailCode.length !== 6}
                    onClick={() => emailVerifyMutation.mutate({ code: emailCode })}
                  >
                    {emailVerifyMutation.isPending ? 'Verifying...' : 'Verify with code'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEmailCode('')}>
                    Clear code
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'business'} onOpenChange={(open) => setActiveDialog(open ? 'business' : null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier l'identité du business</DialogTitle>
            <DialogDescription>Group contact and public-facing fields into one focused edit flow.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-business-name">Display name</label>
              <Input id="settings-business-name" value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-business-email">Contact email</label>
              <Input
                id="settings-business-email"
                type="email"
                value={businessEmail}
                onChange={(event) => setBusinessEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-business-phone">Contact phone</label>
              <Input id="settings-business-phone" value={businessPhone} onChange={(event) => setBusinessPhone(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-business-website">Website</label>
              <Input id="settings-business-website" value={businessWebsite} onChange={(event) => setBusinessWebsite(event.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-business-timezone">Timezone</label>
              <Input id="settings-business-timezone" value={businessTimezone} onChange={(event) => setBusinessTimezone(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>Annuler</Button>
            <Button
              type="button"
              disabled={businessMutation.isPending || businessName.trim().length === 0 || !businessEmailIsValid}
              onClick={() => {
                if (!businessEmailIsValid) {
                  toast.error('Veuillez saisir une adresse e-mail valide pour le contact business.', {
                    id: 'settings-toast',
                  })
                  return
                }

                const normalizedWebsite = businessWebsite.trim()
                const websiteUrl =
                  normalizedWebsite.length === 0
                    ? null
                    : /^https?:\/\//i.test(normalizedWebsite)
                      ? normalizedWebsite
                      : `https://${normalizedWebsite}`

                businessMutation.mutate({
                  display_name: businessName.trim(),
                  contact_email: normalizedBusinessEmail || null,
                  contact_phone: businessPhone.trim() || null,
                  website_url: websiteUrl,
                  timezone: businessTimezone.trim() || null,
                })
              }}
            >
              {businessMutation.isPending ? 'Saving...' : 'Save business settings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'notifications'} onOpenChange={(open) => setActiveDialog(open ? 'notifications' : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {activeNotificationOption ? `Modifier ${activeNotificationOption.title}` : 'Modifier les notifications'}
            </DialogTitle>
            <DialogDescription>
              Ces préférences sont actuellement enregistrées localement dans ce navigateur pour le frontend principal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(activeNotificationOption ? [activeNotificationOption] : notificationOptions).map((item) => (
              <label key={item.key} className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPreferences[item.key as keyof NotificationPreferences]}
                  onChange={(event) =>
                    setNotificationPreferences((current) => ({
                      ...current,
                      [item.key]: event.target.checked,
                    }))
                  }
                  className="size-4 rounded border-border"
                />
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>Annuler</Button>
            <Button
              type="button"
              onClick={() => {
                writeNotificationPreferences(notificationPreferences)
                setActiveDialog(null)
                toast.success('Préférences de notification enregistrées localement dans ce navigateur.', {
                  id: 'settings-toast',
                })
              }}
            >
              Save preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'sync-issues'} onOpenChange={(open) => setActiveDialog(open ? 'sync-issues' : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Incidents CRM sync</DialogTitle>
            <DialogDescription>Vue rapide de l'état actuel des échecs et du dernier incident remonté par le backend.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <SettingsPreviewItem
              media={<RefreshCw className="size-4" />}
              title="Active issues"
              value={syncOverview?.failed_jobs_total ?? 0}
              badges={
                <Badge
                  variant="outline"
                  size="sm"
                  className={cn(
                    'rounded-full',
                    settingsToneBadgeClass((syncOverview?.failed_jobs_total ?? 0) > 0 ? 'danger' : 'success'),
                  )}
                >
                  {(syncOverview?.failed_jobs_total ?? 0) > 0 ? 'À traiter' : 'Stable'}
                </Badge>
              }
              description={syncAlertsValue}
            />
            <SettingsPreviewItem
              media={<History className="size-4" />}
              title="Latest failure"
              value={syncOverview?.latest_failure?.failure_code ?? 'No failure recorded'}
              badges={
                syncOverview?.latest_failure ? (
                  <Badge variant="outline" size="sm" className={cn('rounded-full', settingsToneBadgeClass('danger'))}>
                    Erreur
                  </Badge>
                ) : (
                  <Badge variant="outline" size="sm" className={cn('rounded-full', settingsToneBadgeClass('success'))}>
                    Aucun échec
                  </Badge>
                )
              }
              description={syncOverview?.latest_failure?.failure_message ?? 'No failure details are currently available.'}
            />
            <SettingsPreviewItem
              media={<Database className="size-4" />}
              title="Queue"
              value={syncOverview?.latest_failure?.queue_name ?? 'Unavailable'}
              badges={
                <Badge variant="outline" size="sm" className={cn('rounded-full', settingsToneBadgeClass('active'))}>
                  File
                </Badge>
              }
              description={
                syncOverview?.latest_failure?.failed_at
                  ? `Failed at ${formatDateTime(syncOverview.latest_failure.failed_at)}`
                  : 'No failed timestamp available.'
              }
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'password'} onOpenChange={(open) => setActiveDialog(open ? 'password' : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Confirmez le mot de passe actuel avant de le remplacer par un nouveau.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-current-password">Current password</label>
              <Input id="settings-current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-new-password">New password</label>
              <Input id="settings-new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-confirm-password">Confirmer le mot de passe</label>
              <Input id="settings-confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>Annuler</Button>
            <Button
              type="button"
              disabled={
                passwordMutation.isPending ||
                currentPassword.length === 0 ||
                newPassword.length < 8 ||
                confirmPassword !== newPassword
              }
              onClick={() =>
                passwordMutation.mutate({
                  current_password: currentPassword,
                  password: newPassword,
                  password_confirmation: confirmPassword,
                })
              }
            >
              {passwordMutation.isPending ? 'Updating...' : 'Save password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

