import { useState } from 'react'
import { ClipboardList, Copy, Check, Link2, QrCode, Download, Share2, Mail, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProgramRecord } from '@/types/programs'

type Step = 'select' | 'link' | 'qr'

const shareMessage = (url: string) =>
  `Bonjour ! Je vous invite à rejoindre notre programme de parrainage :\n${url}`

interface AddProspectMethodDialogProps {
  open: boolean
  /** Fixed program ID (from ProgramCard / ProgramDetailPage context). */
  programId?: string
  agentCode: string
  /** When provided with multiple entries, user picks a program before seeing link/QR. */
  programs?: ProgramRecord[]
  onClose: () => void
  onSelectForm: () => void
}

export function AddProspectMethodDialog({
  open,
  programId: fixedProgramId,
  agentCode,
  programs = [],
  onClose,
  onSelectForm,
}: AddProspectMethodDialogProps) {
  const [step, setStep] = useState<Step>('select')
  const [copied, setCopied] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [sharingQr, setSharingQr] = useState(false)

  const activeProgramId = fixedProgramId ?? selectedId
  const eligiblePrograms = programs.filter((p) => p.status === 'active')
  const needsProgramSelect = !fixedProgramId && eligiblePrograms.length > 1

  const portalUrl = activeProgramId && agentCode
    ? `${window.location.origin}/portal/${encodeURIComponent(agentCode)}/${encodeURIComponent(activeProgramId)}`
    : ''

  const qrApiUrl = portalUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(portalUrl)}`
    : ''

  const activeShareMessage = portalUrl ? shareMessage(portalUrl) : ''

  function reset() {
    setStep('select')
    setCopied(false)
    setSelectedId('')
    setSharingQr(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function goToLink() {
    if (!fixedProgramId && eligiblePrograms.length === 1) {
      setSelectedId(eligiblePrograms[0]!.id)
    }
    setStep('link')
  }

  function goToQr() {
    if (!fixedProgramId && eligiblePrograms.length === 1) {
      setSelectedId(eligiblePrograms[0]!.id)
    }
    setStep('qr')
  }

  async function handleCopy() {
    if (!portalUrl) return
    await navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownloadQr() {
    if (!qrApiUrl) return
    const a = document.createElement('a')
    a.href = qrApiUrl
    a.download = `qr-${activeProgramId}.png`
    a.target = '_blank'
    a.click()
  }

  /** Native Web Share API — opens the system share sheet with all installed apps */
  async function handleNativeShare() {
    if (!portalUrl) return
    if (!navigator.share) {
      // Fallback: copy the message
      await navigator.clipboard.writeText(activeShareMessage)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return
    }
    try {
      await navigator.share({ text: activeShareMessage, url: portalUrl })
    } catch {
      // User cancelled — ignore
    }
  }

  /** Native share with QR image as a file attachment */
  async function handleNativeShareQr() {
    if (!qrApiUrl || !portalUrl) return
    setSharingQr(true)
    try {
      // Fetch the QR image and convert to a shareable File
      const res = await fetch(qrApiUrl)
      const blob = await res.blob()
      const file = new File([blob], `qr-${activeProgramId}.png`, { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: activeShareMessage })
      } else if (navigator.share) {
        // Fallback: share just the link+message
        await navigator.share({ text: activeShareMessage, url: portalUrl })
      } else {
        await navigator.clipboard.writeText(activeShareMessage)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // User cancelled or fetch failed — ignore
    } finally {
      setSharingQr(false)
    }
  }

  function handleWhatsApp() {
    if (!portalUrl) return
    const text = encodeURIComponent(activeShareMessage)
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  function handleEmail() {
    if (!portalUrl) return
    const subject = encodeURIComponent('Invitation à notre programme de parrainage')
    const body = encodeURIComponent(activeShareMessage)
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self')
  }

  function handleSms() {
    if (!portalUrl) return
    const body = encodeURIComponent(activeShareMessage)
    window.open(`sms:?body=${body}`, '_self')
  }

  const hasNativeShare = typeof navigator !== 'undefined' && 'share' in navigator

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Ajouter un prospect</DialogTitle>
          {step === 'select' && (
            <DialogDescription>
              Choisissez comment vous souhaitez ajouter un prospect à ce programme.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* ── STEP: SELECT ── */}
        {step === 'select' ? (
          <div className="space-y-3 py-1">
            <MethodCard
              icon={<Link2 className="size-5" />}
              iconBg="bg-primary/10 text-primary"
              title="Obtenir mon lien d'affiliation"
              description="Partagez votre lien unique sur les réseaux"
              fullWidth
              onClick={goToLink}
            />
            <div className="grid grid-cols-2 gap-3">
              <MethodCard
                icon={<QrCode className="size-5" />}
                iconBg="bg-primary/10 text-primary"
                title="Code QR"
                description="Présentation physique"
                onClick={goToQr}
              />
              <MethodCard
                icon={<ClipboardList className="size-5" />}
                iconBg="bg-emerald-500/10 text-emerald-600"
                title="Formulaire"
                description="Saisie immédiate"
                onClick={() => { reset(); onSelectForm() }}
              />
            </div>
          </div>

        /* ── STEP: LINK ── */
        ) : step === 'link' ? (
          <div className="space-y-4 py-1 max-h-[70vh] overflow-y-auto pr-0.5">
            {needsProgramSelect && (
              <ProgramSelector
                programs={eligiblePrograms}
                value={selectedId}
                onChange={setSelectedId}
              />
            )}

            {/* Link row */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Votre lien</p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={portalUrl}
                  className="flex-1 text-xs"
                  onFocus={(e) => e.target.select()}
                  placeholder={needsProgramSelect && !selectedId ? 'Sélectionnez un programme…' : ''}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  disabled={!portalUrl}
                  aria-label="Copier le lien"
                >
                  {copied
                    ? <Check className="size-4 text-emerald-600" />
                    : <Copy className="size-4" />}
                </Button>
              </div>
              {copied && <p className="text-xs text-emerald-600">Copié !</p>}
            </div>


            {/* Share buttons */}
            <ShareButtons
              disabled={!portalUrl}
              hasNativeShare={hasNativeShare}
              onNativeShare={handleNativeShare}
              onWhatsApp={handleWhatsApp}
              onEmail={handleEmail}
              onSms={handleSms}
            />

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setStep('select')}>
                Retour
              </Button>
            </DialogFooter>
          </div>

        /* ── STEP: QR ── */
        ) : (
          <div className="space-y-4 py-1 max-h-[70vh] overflow-y-auto pr-0.5">
            {needsProgramSelect && (
              <ProgramSelector
                programs={eligiblePrograms}
                value={selectedId}
                onChange={setSelectedId}
              />
            )}

            {/* QR image */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-center rounded-xl border border-border bg-white p-3 shadow-sm min-h-[200px] w-full">
                {portalUrl ? (
                  <img
                    src={qrApiUrl}
                    alt="QR code du lien d'affiliation"
                    width={200}
                    height={200}
                    className="block"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground text-center px-4">
                    Sélectionnez un programme pour générer le QR code.
                  </p>
                )}
              </div>
              {portalUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleDownloadQr}
                >
                  <Download className="size-4 mr-1.5" />
                  Télécharger
                </Button>
              )}
            </div>


            {/* Share buttons */}
            <ShareButtons
              disabled={!portalUrl}
              hasNativeShare={hasNativeShare}
              onNativeShare={handleNativeShareQr}
              nativeShareLoading={sharingQr}
              onWhatsApp={handleWhatsApp}
              onEmail={handleEmail}
              onSms={handleSms}
            />

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setStep('select')}>
                Retour
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ─── Sub-components ─── */

function ProgramSelector({
  programs,
  value,
  onChange,
}: {
  programs: ProgramRecord[]
  value: string
  onChange: (slug: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">Programme</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Sélectionner un programme" />
        </SelectTrigger>
        <SelectContent>
          {programs.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}


function ShareButtons({
  disabled,
  hasNativeShare,
  onNativeShare,
  nativeShareLoading = false,
  onWhatsApp,
  onEmail,
  onSms,
}: {
  disabled: boolean
  hasNativeShare: boolean
  onNativeShare: () => void
  nativeShareLoading?: boolean
  onWhatsApp: () => void
  onEmail: () => void
  onSms: () => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Partager via</p>
      <div className="grid grid-cols-2 gap-2">
        {/* Native share sheet — covers all installed apps on mobile/desktop */}
        {hasNativeShare && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || nativeShareLoading}
            onClick={onNativeShare}
            className="gap-2 col-span-2"
          >
            <Share2 className="size-4" />
            {nativeShareLoading ? 'Préparation…' : 'Partager…'}
          </Button>
        )}

        {/* WhatsApp */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={onWhatsApp}
          className="gap-2 border-[#25D366]/40 text-[#128C7E] hover:bg-[#25D366]/10 hover:border-[#25D366]/60"
        >
          {/* WhatsApp icon as inline SVG */}
          <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          WhatsApp
        </Button>

        {/* Email */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={onEmail}
          className="gap-2"
        >
          <Mail className="size-4" />
          Email
        </Button>

        {/* SMS */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={onSms}
          className="gap-2 col-span-2"
        >
          <MessageSquare className="size-4" />
          SMS
        </Button>
      </div>
    </div>
  )
}

function MethodCard({
  icon,
  iconBg,
  title,
  description,
  fullWidth = false,
  onClick,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
  fullWidth?: boolean
  onClick: () => void
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={cn(
        'cursor-pointer border-2 border-border transition-colors select-none hover:border-primary/40 hover:bg-muted/20',
        fullWidth ? 'w-full' : '',
      )}
    >
      <CardContent className={cn('p-4', fullWidth ? 'flex items-center gap-4' : 'flex flex-col gap-3')}>
        <div className={cn('flex shrink-0 items-center justify-center rounded-xl size-12', iconBg)}>
          {icon}
        </div>
        <div className={cn(fullWidth ? '' : 'space-y-0.5')}>
          <p className="text-sm font-semibold text-foreground leading-snug">{title}</p>
          <p className="text-xs text-muted-foreground leading-snug">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}
