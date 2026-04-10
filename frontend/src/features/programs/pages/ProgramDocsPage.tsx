import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  ArrowLeft,
  BellRing,
  BookText,
  CheckCircle2,
  Clock3,
  ShieldAlert,
  UserPlus,
  Zap,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgramCard } from '@/features/programs/components/ProgramCard'
import { type ProgramRecord } from '@/types/programs'
import { cn } from '@/lib/utils'

type SectionId =
  | 'vue-densemble'
  | 'creation-et-activation'
  | 'modification'
  | 'assignation-des-agents'
  | 'cycle-de-vie'
  | 'archivage-et-suppression'
  | 'notifications'

interface DocSection {
  id: SectionId
  title: string
}

const docSections: DocSection[] = [
  { id: 'vue-densemble', title: "Vue d'ensemble" },
  { id: 'creation-et-activation', title: 'Création et activation' },
  { id: 'modification', title: 'Modification' },
  { id: 'assignation-des-agents', title: 'Assignation des agents' },
  { id: 'cycle-de-vie', title: 'Cycle de vie' },
  { id: 'archivage-et-suppression', title: 'Archivage et suppression' },
  { id: 'notifications', title: 'Notifications' },
]

// A simple rule row: label + pill description — no table
function RuleRow({
  label,
  children,
  tone = 'default',
}: {
  label: string
  children: React.ReactNode
  tone?: 'default' | 'warning' | 'success'
}) {
  const dotColor =
    tone === 'warning'
      ? 'bg-amber-400'
      : tone === 'success'
        ? 'bg-emerald-400'
        : 'bg-muted-foreground/30'

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/30 last:border-0">
      <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', dotColor)} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs leading-5 text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}

// Compact callout — no shadow
function Callout({
  icon: Icon,
  children,
  tone = 'default',
}: {
  icon: typeof Clock3
  children: React.ReactNode
  tone?: 'default' | 'warning'
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-xs leading-5',
        tone === 'warning'
          ? 'border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-300'
          : 'border-border/40 bg-muted/20 text-muted-foreground',
      )}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0 opacity-60" />
      <span>{children}</span>
    </div>
  )
}

// Flat section block — no shadow
function SectionBlock({
  id,
  eyebrow,
  title,
  children,
}: {
  id: SectionId
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div id={id} className="scroll-mt-24 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">
          {eyebrow}
        </span>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      <div className="rounded-lg border border-border/40 bg-card px-4 py-2 space-y-0">
        {children}
      </div>
    </div>
  )
}

// Status legend pills
const STATUS_LEGEND = [
  { label: 'Brouillon', color: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400', note: 'Configuration en attente' },
  { label: 'Actif', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', note: 'Opérationnel' },
  { label: 'En pause', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', note: 'Suspendu temporairement' },
  { label: 'Suspendu', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400', note: 'Fermeture en cours (30j)' },
  { label: 'Archivé', color: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400', note: 'Lecture seule, définitif' },
]

const DEMO_PROGRAM: ProgramRecord = {
  id: 'demo-program-123',
  business_id: 'biz-1',
  business_name: 'Business Example',
  slug: 'programme-vip-gold',
  name: 'Programme VIP Gold',
  description: 'Programme de parrainage exclusif avec de fortes récompenses par transaction.',
  status: 'active',
  commission_type: 'per-transaction',
  points_per_transaction: 500,
  exchange_mode: 'both',
  points_per_euro: 10,
  eligibility_criteria: null,
  rule_version: 1,
  starts_at: null,
  ends_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  activated_at: new Date().toISOString(),
  paused_at: null,
  suspended_at: null,
  suspension_deadline_at: null,
  exchange_pack: null,
  assigned_agents_count: 5,
  has_open_prospects: true,
  actions: {
    can_create: false,
    can_update: true,
    can_edit_general: false,
    can_edit_cash: false,
    can_edit_rewards: true,
    can_pause: true,
    can_reactivate: false,
    can_suspend: false,
    can_lift_suspension: false,
    can_activate: false,
    can_archive: false,
    can_delete_from_archive: false,
    can_soft_delete: false,
    can_assign_agent: true,
  },
}

export function ProgramDocsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('vue-densemble')

  const sectionIds = useMemo(() => docSections.map((s) => s.id), [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length > 0) setActiveSection(visible[0]!.target.id as SectionId)
      },
      { rootMargin: '-18% 0px -62% 0px', threshold: [0.1, 0.25, 0.5, 0.75] },
    )
    sectionIds.forEach((id) => {
      const node = document.getElementById(id)
      if (node) observer.observe(node)
    })
    return () => observer.disconnect()
  }, [sectionIds])

  const scrollToSection = (id: SectionId) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(id)
  }

  return (
    <section className="app-section">
      {/* Back + title */}
      <div className="mb-6 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="size-8">
          <Link to="/programs" aria-label="Retour aux programmes">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <BookText className="size-4 text-muted-foreground" />
          <h1 className="text-base font-semibold text-foreground">Documentation — Programmes</h1>
        </div>
      </div>

      {/* Tag strip */}
      <div className="mb-8 flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1 text-xs">
          <ShieldAlert className="size-3" />
          Règles backend prioritaires
        </Badge>
        <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1 text-xs">
          <Clock3 className="size-3" />
          Archivage après 30 jours
        </Badge>
        <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1 text-xs">
          <BellRing className="size-3" />
          Notifications agents
        </Badge>
      </div>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_210px]">
        {/* ── Main content ── */}
        <div className="min-w-0 max-w-3xl space-y-10">

          {/* ── 01 Vue d'ensemble ── */}
          <div id="vue-densemble" className="scroll-mt-24 space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">01</span>
              <h2 className="text-base font-semibold text-foreground">Vue d'ensemble</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-6">
              Un programme est votre contrat commercial central — il définit la commission, l'échange et les affiliés autorisés. Le backend recalcule toujours les droits réels avant chaque action.
            </p>
            {/* Demo card — non-clickable */}
            <div className="pointer-events-none select-none opacity-90">
              <ProgramCard program={DEMO_PROGRAM} mode="owner" />
            </div>
            {/* Status legend */}
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {STATUS_LEGEND.map((s) => (
                <div key={s.label} className="flex flex-col gap-1 rounded-lg border border-border/30 bg-card px-3 py-2.5">
                  <span className={cn('self-start rounded-full px-2 py-0.5 text-[11px] font-semibold', s.color)}>
                    {s.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-4">{s.note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── 02 Création ── */}
          <SectionBlock id="creation-et-activation" eyebrow="02" title="Création et activation">
            <RuleRow label="Mode transaction">Champ points/transaction obligatoire.</RuleRow>
            <RuleRow label="Échange cash ou mixte">Taux points/euro obligatoire.</RuleRow>
            <RuleRow label="Échange rewards ou mixte">Pack rewards du business obligatoire.</RuleRow>
            <RuleRow label="Activer un brouillon" tone="success">
              Draft → Active. Les agents actifs déjà assignés sont notifiés.
            </RuleRow>
          </SectionBlock>

          {/* ── 03 Modification ── */}
          <SectionBlock id="modification" eyebrow="03" title="Modification">
            <RuleRow label="Réglages généraux & cash" tone="warning">
              Verrouillés dès qu'un agent actif ou un prospect existe déjà.
            </RuleRow>
            <RuleRow label="Pack rewards" tone="success">
              Toujours modifiable, même après usage. La version de règle est incrémentée automatiquement.
            </RuleRow>
          </SectionBlock>

          {/* ── 04 Assignation ── */}
          <SectionBlock id="assignation-des-agents" eyebrow="04" title="Assignation des agents">
            <RuleRow label="Assigner un affilié" tone="success">
              Permission assign-agent requise. Notification in-app créée. Email si programme non brouillon.
            </RuleRow>
            <RuleRow label="Retirer un affilié" tone="warning">
              Impossible si l'affilié a déjà créé au moins un prospect sur ce programme.
            </RuleRow>
            <RuleRow label="Réassigner un affilié retiré">
              Relation réactivée avec une nouvelle date d'assignation.
            </RuleRow>
          </SectionBlock>

          {/* ── 05 Cycle de vie ── */}
          <SectionBlock id="cycle-de-vie" eyebrow="05" title="Cycle de vie">
            <RuleRow label="Pause">Actif → En pause. Notifications de pause envoyées aux affiliés.</RuleRow>
            <RuleRow label="Réactivation après pause" tone="success">
              En pause → Actif. Notifications de reprise envoyées.</RuleRow>
            <RuleRow label="Suspension" tone="warning">
              Actif/Pause → Suspendu. Deadline J+30 calculée. Aucun prospect ouvert autorisé.
            </RuleRow>
            <RuleRow label="Réactivation après suspension" tone="success">
              Suspendu → Actif tant que non archivé.
            </RuleRow>
            <div className="pt-2">
              <Callout icon={Clock3} tone="warning">
                La suspension est bloquée tant qu'au moins un prospect est encore <strong>ouvert</strong>. Fermez ou convertissez-les d'abord.
              </Callout>
            </div>
          </SectionBlock>

          {/* ── 06 Archivage ── */}
          <SectionBlock id="archivage-et-suppression" eyebrow="06" title="Archivage et suppression">
            <RuleRow label="Archiver">Suspendu + délai 30 jours dépassé → Archivé.</RuleRow>
            <RuleRow label="Supprimer (archivé)" tone="success">Autorisé depuis le statut Archivé.</RuleRow>
            <RuleRow label="Supprimer (non archivé)" tone="warning">
              Toléré uniquement si aucune assignation ni prospect — programme jamais exploité.
            </RuleRow>
            <div className="pt-2">
              <Callout icon={Archive}>
                Chemin recommandé : Actif → Suspendu → attendre 30 j → Archivé → Suppression.
              </Callout>
            </div>
          </SectionBlock>

          {/* ── 07 Notifications ── */}
          <SectionBlock id="notifications" eyebrow="07" title="Notifications automatiques">
            <RuleRow label="Activation d'un brouillon">Email + notification aux affiliés actifs déjà assignés.</RuleRow>
            <RuleRow label="Pause / Suspension">Email + notification envoyés à tous les affiliés assignés.</RuleRow>
            <RuleRow label="Réactivation">Notification de reprise envoyée aux affiliés.</RuleRow>
            <RuleRow label="Changement de pack rewards">Notification de mise à jour rewards envoyée aux affiliés.</RuleRow>
            <RuleRow label="Assignation / désassignation">Notification in-app et email ciblé à chaque affilié.</RuleRow>
          </SectionBlock>
        </div>

        {/* ── Sidebar ── */}
        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-4">
            {/* Nav */}
            <Card className="shadow-none border-border/40">
              <CardHeader className="py-3 px-4 border-b border-border/30">
                <CardTitle className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  Sur cette page
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <nav className="flex flex-col">
                  {docSections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => scrollToSection(section.id)}
                      className={cn(
                        'w-full rounded-md px-3 py-2 text-left text-xs font-medium transition-colors',
                        activeSection === section.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>

            {/* Key reminders */}
            <Card className="shadow-none border-border/40 bg-muted/10">
              <CardContent className="p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">À retenir</p>
                <div className="space-y-2.5 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Zap className="mt-0.5 size-3 shrink-0 text-primary" />
                    <span>Le pack rewards reste flexible après usage.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <UserPlus className="mt-0.5 size-3 shrink-0 text-primary" />
                    <span>Un affilié avec prospects est verrouillé au programme.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-primary" />
                    <span>Suspension impossible avec des prospects ouverts.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Archive className="mt-0.5 size-3 shrink-0 text-primary" />
                    <span>30 jours de suspension avant archivage.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </section>
  )
}
