import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertCircleIcon, CheckCircle2, Loader, PauseCircle, OctagonX } from 'lucide-react'
import { ApiError, apiRequest } from '@/lib/api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type ProgramStatus = 'active' | 'paused' | 'suspended'

interface PortalInfo {
  business_name: string
  program_name: string
  program_description: string | null
  program_status: ProgramStatus
}

interface PortalInfoEnvelope {
  data: PortalInfo
}

interface PublicProspectPayload {
  agent_code: string
  program_id: string
  contact_name: string
  contact_email: string | null
  contact_phone_raw: string | null
  company_name: string | null
}

async function fetchPortalInfo(programId: string, agentCode: string): Promise<PortalInfo> {
  const res = await apiRequest<PortalInfoEnvelope>(
    `/public/programs/${encodeURIComponent(programId)}/portal-info?agent_code=${encodeURIComponent(agentCode)}`,
  )
  return res.data
}

async function submitPublicProspect(payload: PublicProspectPayload) {
  return apiRequest('/public/prospects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

type FieldErrors = Record<string, string>

/* ── Logo mark — adapts to light / dark via CSS ── */
function BrandMark() {
  return (
    <div className="flex items-center justify-center">
      <img src="/Uploads/logo-mark-light.svg" alt="HD Parrainage" className="h-10 w-10 dark:hidden" />
      <img src="/Uploads/logo-mark-dark.svg" alt="HD Parrainage" className="hidden h-10 w-10 dark:block" />
    </div>
  )
}

/* ── Shared page shell ── */
function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 py-14">
        <BrandMark />
        <div className="mt-8 w-full">
          {children}
        </div>
      </div>
    </div>
  )
}

/* ── Status screens ── */
function PausedScreen({ programName, businessName }: { programName: string; businessName: string }) {
  return (
    <PortalShell>
      <div className="space-y-2 text-center mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{businessName}</p>
        <h1 className="text-xl font-semibold text-foreground">{programName}</h1>
      </div>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center space-y-3 dark:border-amber-800/40 dark:bg-amber-950/20">
        <PauseCircle className="mx-auto size-10 text-amber-500" />
        <p className="text-sm font-medium text-foreground">Inscriptions temporairement suspendues</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ce programme est actuellement en pause. Les inscriptions reprendront prochainement.
          Revenez plus tard ou contactez votre conseiller.
        </p>
      </div>
    </PortalShell>
  )
}

function SuspendedScreen({ programName, businessName }: { programName: string; businessName: string }) {
  return (
    <PortalShell>
      <div className="space-y-2 text-center mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{businessName}</p>
        <h1 className="text-xl font-semibold text-foreground">{programName}</h1>
      </div>
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-6 text-center space-y-3 dark:border-orange-800/40 dark:bg-orange-950/20">
        <OctagonX className="mx-auto size-10 text-orange-500" />
        <p className="text-sm font-medium text-foreground">Programme non disponible</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ce programme n'accepte plus de nouvelles inscriptions.
          Contactez votre conseiller pour plus d'informations.
        </p>
      </div>
    </PortalShell>
  )
}

export function PublicProspectPortalPage() {
  const { agentCode = '', programId = '' } = useParams<{ agentCode: string; programId: string }>()

  const [portalInfo, setPortalInfo] = useState<PortalInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [contactName, setContactName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [clientError, setClientError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    fetchPortalInfo(programId, agentCode)
      .then((info) => { if (!cancelled) { setPortalInfo(info); setLoading(false) } })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : 'Lien invalide ou expiré.')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [programId, agentCode])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contactEmail.trim() && !contactPhone.trim()) {
      setClientError('Veuillez renseigner au moins un moyen de contact : email ou téléphone.')
      return
    }
    setClientError(null)
    setFieldErrors({})
    setSubmitError(null)
    setSubmitting(true)
    try {
      await submitPublicProspect({
        agent_code: agentCode,
        program_id: programId,
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim() || null,
        contact_phone_raw: contactPhone.trim() || null,
        company_name: companyName.trim() || null,
      })
      setSubmitted(true)
    } catch (err: unknown) {
      const errors = err instanceof ApiError ? (err.errors ?? {}) : {}
      const flat: FieldErrors = {}
      for (const [key, msgs] of Object.entries(errors)) {
        flat[key] = msgs[0] ?? ''
      }
      setFieldErrors(flat)
      if (Object.keys(flat).length === 0) {
        setSubmitError(err instanceof ApiError ? err.message : 'Erreur lors de la soumission.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  /* ── Invalid link ── */
  if (loadError || !portalInfo) {
    return (
      <PortalShell>
        <div className="rounded-lg border border-border bg-card p-8 text-center space-y-3">
          <AlertCircleIcon className="mx-auto size-9 text-destructive" />
          <p className="text-sm font-medium text-foreground">Lien invalide</p>
          <p className="text-sm text-muted-foreground">
            Ce lien de parrainage n'existe pas ou n'est plus valide. Contactez votre conseiller.
          </p>
        </div>
      </PortalShell>
    )
  }

  /* ── Program paused ── */
  if (portalInfo.program_status === 'paused') {
    return <PausedScreen programName={portalInfo.program_name} businessName={portalInfo.business_name} />
  }

  /* ── Program suspended ── */
  if (portalInfo.program_status === 'suspended') {
    return <SuspendedScreen programName={portalInfo.program_name} businessName={portalInfo.business_name} />
  }

  /* ── Success ── */
  if (submitted) {
    return (
      <PortalShell>
        <div className="rounded-lg border border-border bg-card p-8 text-center space-y-3">
          <CheckCircle2 className="mx-auto size-9 text-emerald-500" />
          <p className="text-sm font-medium text-foreground">Demande envoyée !</p>
          <p className="text-sm text-muted-foreground">
            Votre demande a bien été enregistrée. Un conseiller vous contactera prochainement.
          </p>
        </div>
      </PortalShell>
    )
  }

  /* ── Active: form ── */
  return (
    <PortalShell>
      {/* Program header */}
      <div className="mb-6 text-center space-y-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {portalInfo.business_name}
        </p>
        <h1 className="text-xl font-semibold text-foreground">{portalInfo.program_name}</h1>
        {portalInfo.program_description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{portalInfo.program_description}</p>
        )}
      </div>

      {/* Form card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-5 text-sm font-semibold text-foreground">Vos coordonnées</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="pub-contact-name">
                Nom complet <span className="text-destructive">*</span>
              </label>
              <Input
                id="pub-contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Jean Dupont"
                required
              />
              {fieldErrors.contact_name && (
                <p className="text-xs text-destructive">{fieldErrors.contact_name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="pub-company">
                Entreprise
              </label>
              <Input
                id="pub-company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Mon Entreprise"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="pub-email">
                Email
              </label>
              <Input
                id="pub-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="jean@exemple.fr"
              />
              {fieldErrors.contact_email && (
                <p className="text-xs text-destructive">{fieldErrors.contact_email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="pub-phone">
                Téléphone
              </label>
              <Input
                id="pub-phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="06 12 34 56 78"
              />
              {fieldErrors.contact_phone_raw && (
                <p className="text-xs text-destructive">{fieldErrors.contact_phone_raw}</p>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Renseignez au moins un moyen de contact (email ou téléphone).
          </p>

          {clientError && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Contact requis</AlertTitle>
              <AlertDescription>{clientError}</AlertDescription>
            </Alert>
          )}

          {submitError && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={submitting || !contactName.trim()}>
            {submitting ? 'Envoi en cours...' : 'Envoyer ma demande'}
          </Button>
        </form>
      </div>
    </PortalShell>
  )
}
