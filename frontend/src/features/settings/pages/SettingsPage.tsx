import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
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
type SettingsDialogId = 'name' | 'avatar' | 'email' | 'business' | 'notifications' | 'password' | 'sync-issues' | null
type NotificationPreferenceKey = keyof NotificationPreferences

const settingsQueryKey = ['settings', 'profile']
const notificationStorageKey = 'frontend-settings-notification-preferences'

const settingsTabs: Array<{ id: SettingsTabId; label: string; icon?: ReactNode }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'security', label: 'Security' },
  { id: 'api', label: 'IACRM API', icon: <KeyRound className="size-3.5" /> },
]

const notificationOptions: Array<{
  key: NotificationPreferenceKey
  title: string
  label: string
  description: string
}> = [
  {
    key: 'inbox',
    title: 'Inbox',
    label: 'In-app operational inbox',
    description: 'Queue changes, exchange events, and owner alerts.',
  },
  {
    key: 'security',
    title: 'Security',
    label: 'Security alerts',
    description: 'Verification and account-level trust alerts.',
  },
  {
    key: 'crm',
    title: 'CRM sync',
    label: 'CRM sync alerts',
    description: 'Live sync warnings and delivery failures from the CRM bridge.',
  },
]

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

function formatVerificationExpiry(value: string | null) {
  if (!value) {
    return 'No code requested'
  }

  return new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
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
      toast.success('Adresse e-mail vérifiée avec succès.', { id: 'settings-toast' })
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
    ? 'No sync visibility in this role'
    : syncOverviewQuery.isPending
      ? 'Loading live sync overview...'
      : syncOverviewQuery.isError
        ? 'Live sync overview unavailable'
        : `${syncOverview?.failed_jobs_total ?? 0} active issue(s)`
  const activeNotificationOption = notificationDialogKey
    ? notificationOptions.find((option) => option.key === notificationDialogKey) ?? null
    : null
  const securitySessionRows = useMemo(
    () =>
      [
        {
          id: 'last-login',
          event: 'Connexion',
          status: 'Réussie',
          timestamp: user?.last_login_at ?? null,
          detail: 'Dernière ouverture de session enregistrée.',
        },
        {
          id: 'last-activity',
          event: 'Activité',
          status: 'Active',
          timestamp: user?.last_activity_at ?? null,
          detail: 'Dernière activité détectée sur le shell sécurisé.',
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
      toast.success('Nom affiché mis à jour.', { id: 'settings-toast' })
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
      toast.success('Photo de profil mise à jour.', { id: 'settings-toast' })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Impossible de mettre à jour la photo de profil.', { id: 'settings-toast' }),
  })

  const emailChangeMutation = useMutation({
    mutationFn: async (payload: { email: string }) => requestOwnEmailChange(payload),
    onSuccess: async (response) => {
      queryClient.setQueryData(settingsQueryKey, response)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
      setEmailCode('')
      toast.success('E-mail de vérification envoyé. Un lien et un code à 6 chiffres ont été envoyés.', { id: 'settings-toast' })
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
      toast.success('Le nouvel e-mail a été vérifié et activé.', { id: 'settings-toast' })
    },
    onError: (error) => toast.error((error as ApiError).message, { id: 'settings-toast' }),
  })

  const emailResendMutation = useMutation({
    mutationFn: resendOwnEmailVerification,
    onSuccess: () => {
      toast.success('E-mail de vérification renvoyé.', { id: 'settings-toast' })
    },
    onError: (error) => toast.error((error as ApiError).message, { id: 'settings-toast' }),
  })

  const businessMutation = useMutation({
    mutationFn: updateBusinessSettings,
    onSuccess: async (response) => {
      queryClient.setQueryData(settingsQueryKey, response)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
      setActiveDialog(null)
      toast.success('Identité business mise à jour.', { id: 'settings-toast' })
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
      toast.success('Mot de passe mis à jour.', { id: 'settings-toast' })
    },
    onError: (error) => toast.error((error as ApiError).message, { id: 'settings-toast' }),
  })

  if (settingsQuery.isPending) {
    return <SettingsPageSkeleton />
  }

  if (settingsQuery.isError || settingsData === null) {
    return (
      <article className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {((settingsQuery.error as ApiError | undefined)?.message) ?? 'Settings could not be loaded.'}
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
        title="Settings"
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
            <SettingsSectionHeader title="Personal identity" />

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
                title="Profile image"
                value={resolvedAvatarPreview ? 'Avatar active' : 'No avatar'}
                description="512×512 WebP ready"
                badges={
                  <Badge
                    variant="outline"
                    size="sm"
                    className={cn('rounded-full', settingsToneBadgeClass(resolvedAvatarPreview ? 'success' : 'warning'))}
                  >
                    {resolvedAvatarPreview ? 'Actif' : 'À ajouter'}
                  </Badge>
                }
                action={<ResponsiveActionButton label="Changer la photo de profil" onClick={() => setActiveDialog('avatar')} />}
                mediaVariant="custom"
              />
              <SettingsPreviewItem
                media={<UserRound className="size-4" />}
                title="Display name"
                value={settingsData.user.display_name}
                description="Identité affichée dans l’application"
                action={<ResponsiveActionButton label="Changer le nom affiché" onClick={() => setActiveDialog('name')} />}
              />
              <SettingsPreviewItem
                media={<Mail className="size-4" />}
                title="Email"
                value={settingsData.user.email}
                description="Adresse utilisée pour la connexion et la vérification"
                badges={
                  <Badge
                    variant="outline"
                    size="sm"
                    className={cn('rounded-full', settingsToneBadgeClass(emailVerified ? 'success' : 'warning'))}
                  >
                    {emailVerified ? 'Vérifié' : 'En attente'}
                  </Badge>
                }
                action={<ResponsiveActionButton label="Changer l’adresse e-mail" onClick={() => setActiveDialog('email')} />}
              />
            </div>
          </SectionCard>

          <SectionCard>
            <SettingsSectionHeader
              title="Business identity"
              action={
                settingsData.permissions.can_update_business ? (
                  <ResponsiveActionButton label="Modifier l’identité business" onClick={() => setActiveDialog('business')} />
                ) : null
              }
            />

            {settingsData.business ? (
              <div className="space-y-3">
                <SettingsPreviewItem
                  media={<BadgeCheck className="size-4" />}
                  title="Display name"
                  value={settingsData.business.display_name}
                  badges={
                    <Badge variant="outline" size="sm" className={cn('rounded-full', settingsToneBadgeClass('active'))}>
                      Actif
                    </Badge>
                  }
                  description={`${settingsData.business.legal_name} · slug: ${settingsData.business.slug} · ${settingsData.business.currency_code} · ${settingsData.business.timezone}`}
                />
                <SettingsPreviewItem
                  media={<Mail className="size-4" />}
                  title="Contact email"
                  value={settingsData.business.contact_email ?? 'Not set'}
                  badges={
                    <Badge
                      variant="outline"
                      size="sm"
                      className={cn(
                        'rounded-full',
                        settingsToneBadgeClass(settingsData.business.contact_email ? 'success' : 'warning'),
                      )}
                    >
                      {settingsData.business.contact_email ? 'Renseigné' : 'Manquant'}
                    </Badge>
                  }
                  description="Adresse e-mail publique du business"
                />
                <SettingsPreviewItem
                  media={<Phone className="size-4" />}
                  title="Contact phone"
                  value={settingsData.business.contact_phone ?? 'Not set'}
                  badges={
                    <Badge
                      variant="outline"
                      size="sm"
                      className={cn(
                        'rounded-full',
                        settingsToneBadgeClass(settingsData.business.contact_phone ? 'success' : 'warning'),
                      )}
                    >
                      {settingsData.business.contact_phone ? 'Renseigné' : 'Manquant'}
                    </Badge>
                  }
                  description="Numéro de contact public du business"
                />
                <SettingsPreviewItem
                  media={<Globe className="size-4" />}
                  title="Public website"
                  value={settingsData.business.website_url ?? 'Not set'}
                  badges={
                    <Badge
                      variant="outline"
                      size="sm"
                      className={cn(
                        'rounded-full',
                        settingsToneBadgeClass(settingsData.business.website_url ? 'active' : 'warning'),
                      )}
                    >
                      {settingsData.business.website_url ? 'En ligne' : 'Manquant'}
                    </Badge>
                  }
                  description="Site public lié au business"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-sm leading-6 text-muted-foreground">
                This account does not currently resolve to a tenant-scoped business profile.
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}

      {activeTab === 'notifications' ? (
        <SectionCard>
          <SettingsSectionHeader title="Notifications" />
          <div className="space-y-3">
              <SettingsPreviewItem
                media={<Inbox className="size-4" />}
                title="Inbox"
                value={notificationPreferences.inbox ? 'Enabled' : 'Muted'}
                badges={
                  <Badge
                    variant="outline"
                    size="sm"
                    className={cn('rounded-full', settingsToneBadgeClass(notificationPreferences.inbox ? 'success' : 'neutral'))}
                  >
                    {notificationPreferences.inbox ? 'Actif' : 'Muet'}
                  </Badge>
                }
              description="Queue changes, exchange events, and owner alerts."
              action={
                <ResponsiveActionButton
                  label="Modifier l’inbox"
                  onClick={() => {
                    setNotificationDialogKey('inbox')
                    setActiveDialog('notifications')
                  }}
                />
              }
            />
              <SettingsPreviewItem
                media={<ShieldCheck className="size-4" />}
                title="Security"
                value={notificationPreferences.security ? 'Enabled' : 'Muted'}
                badges={
                  <Badge
                    variant="outline"
                    size="sm"
                    className={cn('rounded-full', settingsToneBadgeClass(notificationPreferences.security ? 'success' : 'neutral'))}
                  >
                    {notificationPreferences.security ? 'Actif' : 'Muet'}
                  </Badge>
                }
              description="Verification and account-level trust alerts."
              action={
                <ResponsiveActionButton
                  label="Modifier la sécurité"
                  onClick={() => {
                    setNotificationDialogKey('security')
                    setActiveDialog('notifications')
                  }}
                />
              }
            />
            <SettingsPreviewItem
              media={<RefreshCw className="size-4" />}
              title="CRM sync"
              value={notificationPreferences.crm ? 'Enabled' : 'Muted'}
              badges={
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    size="sm"
                    className={cn('rounded-full', settingsToneBadgeClass(notificationPreferences.crm ? 'active' : 'neutral'))}
                  >
                    {notificationPreferences.crm ? 'Actif' : 'Muet'}
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
                      {(syncOverview?.failed_jobs_total ?? 0) > 0 ? 'Incidents' : 'Sain'}
                    </Badge>
                  ) : null}
                </div>
              }
              description={syncAlertsValue}
              action={
                <div className="flex items-center gap-2">
                  <ResponsiveActionButton
                    label="Voir les incidents"
                    onClick={() => setActiveDialog('sync-issues')}
                    icon={<History className="size-3.5" />}
                  />
                  <ResponsiveActionButton
                    label="Modifier CRM sync"
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
            <SettingsSectionHeader title="Security" />
            <div className="space-y-4">
              <SettingsPreviewItem
                media={<KeyRound className="size-4" />}
                title="Password"
                value="•••••••••••••••"
                badges={
                  <Badge variant="outline" size="sm" className={cn('rounded-full', settingsToneBadgeClass('active'))}>
                    Protégé
                  </Badge>
                }
                description="Modifier le mot de passe dans un dialogue dédié avec contrôle de l’ancien et du nouveau secret."
                action={<Button type="button" variant="outline" size="sm" onClick={() => setActiveDialog('password')}>Changer le mot de passe</Button>}
              />
              <SettingsPreviewItem
                media={<BadgeCheck className="size-4 text-emerald-600" />}
                title="Recovery email"
                value={settingsData.user.email}
                badges={
                  <Badge
                    variant="outline"
                    size="sm"
                    className={cn('rounded-full', settingsToneBadgeClass(emailVerified ? 'success' : 'warning'))}
                  >
                    {emailVerified ? 'Vérifié' : 'En attente'}
                  </Badge>
                }
                description="Adresse utilisée pour la récupération et la confiance du compte."
              />
            </div>
          </SectionCard>

          <SectionCard>
            <SettingsSectionHeader
              title="Latest sessions"
              action={<Badge variant="outline" size="sm">{securitySessionRows.length} entrées</Badge>}
            />
            <div className="overflow-hidden rounded-xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Événement</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Détail</TableHead>
                    <TableHead className="text-right">Horodatage</TableHead>
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
                              settingsToneBadgeClass(row.status === 'Réussie' ? 'success' : row.status === 'Active' ? 'active' : 'neutral'),
                            )}
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[24rem] text-sm text-muted-foreground">{row.detail}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {row.timestamp ? formatDateTime(row.timestamp) : 'Indisponible'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                        Aucun signal de session disponible.
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
          failedJobsValue={`${syncOverview?.failed_jobs_total ?? 0} active issue(s)`}
        />
      ) : null}

      <Dialog open={activeDialog === 'name'} onOpenChange={(open) => setActiveDialog(open ? 'name' : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit display name</DialogTitle>
            <DialogDescription>Update the first and last name shown across the shell and operational records.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-first-name">First name</label>
              <Input id="settings-first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-last-name">Last name</label>
              <Input id="settings-last-name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
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
              {saveNameMutation.isPending ? 'Saving...' : 'Save name'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'avatar'} onOpenChange={(open) => setActiveDialog(open ? 'avatar' : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit profile image</DialogTitle>
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
                    toast.error(error instanceof Error ? error.message : 'Impossible de sélectionner l’image.', {
                      id: 'settings-toast',
                    })
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
            <Button type="button" disabled={avatarMutation.isPending || avatarFile === null} onClick={() => avatarMutation.mutate()}>
              {avatarMutation.isPending ? 'Uploading...' : 'Save avatar'}
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-800">Pending verification</p>
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
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'business'} onOpenChange={(open) => setActiveDialog(open ? 'business' : null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit business identity</DialogTitle>
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
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
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
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
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
            <DialogDescription>Vue rapide de l’état actuel des échecs et du dernier incident remonté par le backend.</DialogDescription>
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
            <DialogDescription>Confirm the current password before replacing it with a new one.</DialogDescription>
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
              <label className="text-sm font-medium text-foreground" htmlFor="settings-confirm-password">Confirm password</label>
              <Input id="settings-confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
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

