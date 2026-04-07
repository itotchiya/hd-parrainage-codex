import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  ArrowLeft,
  BellRing,
  BookText,
  Clock3,
  FileText,
  ShieldAlert,
  UserPlus,
  Zap,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
  summary: string
}

const docSections: DocSection[] = [
  {
    id: 'vue-densemble',
    title: "Vue d'ensemble",
    summary: "Ce que pilote un programme et quelles règles backend priment toujours sur l'interface.",
  },
  {
    id: 'creation-et-activation',
    title: 'Création et activation',
    summary: "Les prérequis minimums avant d'utiliser un programme en production.",
  },
  {
    id: 'modification',
    title: 'Modification du programme',
    summary: "Ce qui reste modifiable ou non une fois que le programme est réellement utilisé.",
  },
  {
    id: 'assignation-des-agents',
    title: 'Assignation des agents',
    summary: "Quand un affilié peut être ajouté, retiré ou verrouillé sur un programme.",
  },
  {
    id: 'cycle-de-vie',
    title: 'Pause, suspension et réactivation',
    summary: "Le comportement exact des changements d'état avant l'archivage.",
  },
  {
    id: 'archivage-et-suppression',
    title: 'Archivage et suppression',
    summary: "Quand l'archivage devient possible, puis dans quels cas la suppression est autorisée.",
  },
  {
    id: 'notifications',
    title: 'Notifications automatiques',
    summary: "Les événements qui déclenchent un email ou une notification côté agents.",
  },
]

function InlineCode({ children }: { children: string }) {
  return (
    <code className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[12px] text-foreground">
      {children}
    </code>
  )
}

function RuleTable({
  rows,
}: {
  rows: Array<{ action: string; condition: string; outcome: string }>
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
      <table className="w-full text-sm">
        <thead className="bg-muted/25">
          <tr className="border-b border-border/60">
            <th className="px-4 py-3 text-left font-medium text-foreground">Action</th>
            <th className="px-4 py-3 text-left font-medium text-foreground">Condition</th>
            <th className="px-4 py-3 text-left font-medium text-foreground">Effet système</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.action} className="border-b border-border/50 last:border-b-0">
              <td className="px-4 py-3 align-top font-medium text-foreground">{row.action}</td>
              <td className="px-4 py-3 align-top text-muted-foreground">{row.condition}</td>
              <td className="px-4 py-3 align-top text-muted-foreground">{row.outcome}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Callout({
  icon: Icon,
  title,
  children,
  tone = 'default',
}: {
  icon: typeof Clock3
  title: string
  children: React.ReactNode
  tone?: 'default' | 'warning'
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-4',
        tone === 'warning'
          ? 'border-amber-500/25 bg-amber-500/8'
          : 'border-border/60 bg-muted/20',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'rounded-lg p-2',
            tone === 'warning'
              ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <div className="text-sm leading-7 text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  )
}

function SectionBlock({
  id,
  eyebrow,
  title,
  summary,
  children,
}: {
  id: SectionId
  eyebrow: string
  title: string
  summary: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-5">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          {eyebrow}
        </p>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{summary}</p>
        </div>
      </div>
      <div className="space-y-5 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  )
}

export function ProgramDocsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('vue-densemble')

  const sectionIds = useMemo(() => docSections.map((section) => section.id), [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        if (visible.length > 0) {
          setActiveSection(visible[0]!.target.id as SectionId)
        }
      },
      {
        rootMargin: '-18% 0px -62% 0px',
        threshold: [0.1, 0.25, 0.5, 0.75],
      },
    )

    sectionIds.forEach((id) => {
      const node = document.getElementById(id)
      if (node) observer.observe(node)
    })

    return () => observer.disconnect()
  }, [sectionIds])

  const scrollToSection = (id: SectionId) => {
    const node = document.getElementById(id)
    if (!node) return
    node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(id)
  }

  return (
    <section className="app-section">
      <div className="mb-8 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="size-8">
          <Link to="/programs" aria-label="Retour aux programmes">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </Button>
        <h2 className="text-base font-semibold text-foreground sm:text-lg">
          Documentation des programmes
        </h2>
      </div>

      <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          <div className="max-w-4xl space-y-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs font-medium text-muted-foreground">
                <BookText className="size-3.5" />
                Référence métier côté Business Owner
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground">
                  Comprendre les règles de vie d&apos;un programme
                </h1>
                <p className="max-w-3xl text-base leading-8 text-muted-foreground">
                  Cette page décrit les règles réellement appliquées par le backend sur la création,
                  l&apos;édition, l&apos;assignation, la suspension, l&apos;archivage et la suppression
                  d&apos;un programme. Si l&apos;interface semble autoriser ou masquer une action, c&apos;est
                  toujours le backend qui tranche.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1">
                  <ShieldAlert className="size-3.5" />
                  Règles backend prioritaires
                </Badge>
                <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1">
                  <Clock3 className="size-3.5" />
                  Archivage après 30 jours de suspension
                </Badge>
                <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1">
                  <BellRing className="size-3.5" />
                  Notifications agents automatiques
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Édition
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Les réglages généraux et cash se verrouillent dès qu&apos;un agent actif ou un
                  prospect existe déjà.
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Suspension
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Impossible tant qu&apos;il reste des prospects ouverts dans le programme.
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Suppression
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Recommandée après archivage, sauf cas très limité d&apos;un programme encore vide.
                </p>
              </div>
            </div>

            <Separator />

            <SectionBlock
              id="vue-densemble"
              eyebrow="01"
              title="Vue d'ensemble"
              summary="Un programme pilote à la fois les règles de commission, le mode d'échange, un pack rewards éventuel et les affiliés autorisés à prospecter dessus."
            >
              <p>
                Dans le frontend, un programme sert de cadre commercial. Il détermine comment les
                points sont attribués, si un échange cash est autorisé, quel pack rewards est
                rattaché et quels agents peuvent l&apos;utiliser. Les permissions d&apos;écran ne suffisent
                pas : avant chaque action, le backend recalcule ce qui est réellement permis.
              </p>
              <RuleTable
                rows={[
                  {
                    action: 'Créer un programme',
                    condition: 'Permission programme.create dans le business courant.',
                    outcome:
                      'Le programme est créé avec ses règles de base et son statut initial demandé.',
                  },
                  {
                    action: 'Voir un programme',
                    condition: 'Permission programme.view.',
                    outcome:
                      'La ressource renvoie aussi les indicateurs d’actions possibles calculés côté backend.',
                  },
                  {
                    action: 'Faire évoluer le cycle de vie',
                    condition: 'Permissions programme.update ou programme.pause selon l’action.',
                    outcome:
                      'Le backend revalide les prérequis métier avant de modifier le statut.',
                  },
                ]}
              />
            </SectionBlock>

            <Separator />

            <SectionBlock
              id="creation-et-activation"
              eyebrow="02"
              title="Création et activation"
              summary="Les prérequis changent selon le type de commission et le mode d'échange sélectionné."
            >
              <RuleTable
                rows={[
                  {
                    action: 'Créer en mode transaction',
                    condition: 'Le champ points par transaction doit être renseigné.',
                    outcome: 'Sinon la création ou la mise à jour est refusée.',
                  },
                  {
                    action: 'Activer un échange cash ou both',
                    condition: 'Le champ points par euro doit être défini.',
                    outcome: "Sans taux cash, l'activation est refusée.",
                  },
                  {
                    action: 'Activer un échange reward ou both',
                    condition: 'Un pack rewards du business doit être sélectionné.',
                    outcome: "Sans pack rewards, l'activation est refusée.",
                  },
                  {
                    action: 'Activer un brouillon',
                    condition: 'Statut courant = draft avec tous les prérequis remplis.',
                    outcome:
                      'Le programme passe à active et les agents actifs déjà assignés peuvent être notifiés.',
                  },
                ]}
              />
              <p>
                Le backend accepte les statuts de création <InlineCode>draft</InlineCode>,{' '}
                <InlineCode>active</InlineCode> et <InlineCode>paused</InlineCode>. Pour certains
                types comme le revenue tier, le statut par défaut reste{' '}
                <InlineCode>draft</InlineCode> afin d&apos;obliger une validation avant usage.
              </p>
            </SectionBlock>

            <Separator />

            <SectionBlock
              id="modification"
              eyebrow="03"
              title="Modification du programme"
              summary="Dès qu'un programme est utilisé sur le terrain, le backend verrouille les réglages les plus structurants."
            >
              <p>
                Le backend fait une différence entre les réglages généraux/cash et le pack rewards.
                Dès qu&apos;un agent actif est assigné ou qu&apos;un prospect existe déjà sur le programme,
                les changements qui peuvent casser l&apos;historique commercial sont bloqués.
              </p>
              <RuleTable
                rows={[
                  {
                    action:
                      'Modifier nom, description, type de commission, statut, dates ou critères',
                    condition: 'Aucun agent actif assigné et aucun prospect déjà lié.',
                    outcome: 'Sinon la modification est refusée.',
                  },
                  {
                    action: 'Modifier le cash (points / euro)',
                    condition: 'Aucun agent actif assigné et aucun prospect déjà lié.',
                    outcome: 'Sinon la modification est refusée.',
                  },
                  {
                    action: 'Modifier le pack rewards',
                    condition: 'Programme non archivé.',
                    outcome:
                      'Autorisé même si des agents ou prospects existent déjà sur le programme.',
                  },
                ]}
              />
              <Callout icon={Zap} title="Exception importante">
                Le pack rewards reste modifiable après usage. Lorsqu&apos;il change, le backend incrémente
                la version de règle du programme et peut prévenir les agents déjà assignés.
              </Callout>
            </SectionBlock>

            <Separator />

            <SectionBlock
              id="assignation-des-agents"
              eyebrow="04"
              title="Assignation des agents"
              summary="L'assignation reste gérée au niveau du business, mais elle est verrouillée dès qu'un affilié a réellement commencé à prospecter."
            >
              <RuleTable
                rows={[
                  {
                    action: 'Assigner un agent',
                    condition:
                      'Permission programme.assign-agent et agent appartenant bien au business.',
                    outcome:
                      "Assignation active enregistrée, notification in-app créée, email possible si le programme n'est pas en draft.",
                  },
                  {
                    action: 'Retirer un agent',
                    condition:
                      "Autorisé uniquement si cet agent n'a encore créé aucun prospect dans ce programme.",
                    outcome:
                      "Sinon le retrait est refusé pour préserver l'historique de prospection.",
                  },
                  {
                    action: 'Réassigner un agent retiré',
                    condition: 'Même agent + même programme.',
                    outcome:
                      'La relation est réactivée avec une nouvelle date d’assignation.',
                  },
                ]}
              />
              <p>
                En pratique, un agent qui a déjà lancé de la prospection sur un programme devient un
                point d&apos;ancrage métier. Le backend empêche sa désassignation pour éviter de casser
                les liens de suivi, les attributions futures ou la lecture du pipeline.
              </p>
            </SectionBlock>

            <Separator />

            <SectionBlock
              id="cycle-de-vie"
              eyebrow="05"
              title="Pause, suspension et réactivation"
              summary="La pause stoppe temporairement l'activité. La suspension ouvre une période de fermeture contrôlée avant archivage."
            >
              <RuleTable
                rows={[
                  {
                    action: 'Pause',
                    condition: "Le frontend l'expose depuis un programme actif.",
                    outcome:
                      'Le programme passe à paused et les agents reçoivent une information de pause.',
                  },
                  {
                    action: 'Réactivation après pause',
                    condition: 'Statut actuel = paused.',
                    outcome:
                      'Retour à active, remise à zéro de paused_at, notifications de reprise.',
                  },
                  {
                    action: 'Suspension',
                    condition:
                      'Statut actuel = active ou paused, avec zéro prospect ouvert restant.',
                    outcome:
                      'Le programme passe à suspended et une date limite à J+30 est calculée.',
                  },
                  {
                    action: 'Réactivation après suspension',
                    condition: 'Statut actuel = suspended.',
                    outcome:
                      "Retour à active tant que le programme n'a pas été archivé.",
                  },
                ]}
              />
              <Callout icon={Clock3} title="Blocage critique avant suspension" tone="warning">
                Le backend refuse la suspension tant qu&apos;un prospect conserve le statut{' '}
                <InlineCode>open</InlineCode>. Il faut d&apos;abord fermer, convertir ou requalifier ces
                prospects avant d&apos;engager la suspension.
              </Callout>
            </SectionBlock>

            <Separator />

            <SectionBlock
              id="archivage-et-suppression"
              eyebrow="06"
              title="Archivage et suppression"
              summary="L'archivage est la vraie étape de fermeture. La suppression reste une opération finale et plus encadrée."
            >
              <RuleTable
                rows={[
                  {
                    action: 'Archiver un programme',
                    condition:
                      'Statut = suspended et date limite de suspension dépassée après 30 jours.',
                    outcome: 'Le programme passe à archived.',
                  },
                  {
                    action: 'Supprimer un programme archivé',
                    condition: 'Statut = archived.',
                    outcome: 'Suppression autorisée.',
                  },
                  {
                    action: 'Supprimer un programme non archivé',
                    condition: 'Aucune assignation agent active et aucun prospect lié.',
                    outcome:
                      "Toléré uniquement pour un programme encore vide et jamais réellement exploité.",
                  },
                ]}
              />
              <Callout icon={Archive} title="Chemin recommandé par le backend">
                Pour un programme déjà utilisé, le scénario propre est{' '}
                <InlineCode>active/paused</InlineCode> {'->'} <InlineCode>suspended</InlineCode>{' '}
                {'->'} attendre 30 jours {'->'} <InlineCode>archived</InlineCode> {'->'} suppression
                si nécessaire.
              </Callout>
            </SectionBlock>

            <Separator />

            <SectionBlock
              id="notifications"
              eyebrow="07"
              title="Notifications automatiques"
              summary="Plusieurs changements de programme déclenchent automatiquement une information vers les agents concernés."
            >
              <RuleTable
                rows={[
                  {
                    action: "Activation d'un brouillon",
                    condition: 'Le programme passe de draft à active.',
                    outcome:
                      "Notification d'assignation envoyée aux agents actifs déjà liés.",
                  },
                  {
                    action: 'Pause',
                    condition: 'Pause enregistrée avec succès.',
                    outcome:
                      'Email et notification de pause envoyés aux agents assignés.',
                  },
                  {
                    action: 'Suspension',
                    condition: 'Suspension enregistrée avec succès.',
                    outcome:
                      'Email et notification de suspension envoyés aux agents.',
                  },
                  {
                    action: 'Réactivation',
                    condition: 'Sortie de paused ou suspended.',
                    outcome:
                      'Notification de reprise envoyée aux agents assignés.',
                  },
                  {
                    action: 'Changement de pack rewards',
                    condition: 'Le pack rewards lié au programme change.',
                    outcome:
                      'Notification de mise à jour rewards envoyée aux agents assignés.',
                  },
                  {
                    action: 'Assignation ou désassignation agent',
                    condition: 'Synchronisation des agents validée.',
                    outcome:
                      'Notification in-app et email ciblé à chaque agent concerné.',
                  },
                ]}
              />
              <p>
                Ces notifications n&apos;assouplissent aucune règle métier. Elles servent uniquement à
                informer les agents qu&apos;un programme change d&apos;état, qu&apos;un pack évolue ou que leur
                périmètre d&apos;utilisation a été modifié.
              </p>
            </SectionBlock>
          </div>
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Sur cette page
              </p>
              <nav className="space-y-1">
                {docSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      'w-full border-l pl-4 pr-2 py-1.5 text-left text-sm transition-colors',
                      activeSection === section.id
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                    )}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-background p-2 text-muted-foreground shadow-sm">
                  <FileText className="size-4" />
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">À retenir</p>
                  <div className="grid gap-2 text-xs leading-6 text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <Zap className="mt-1 size-3.5 shrink-0" />
                      <span>Le pack rewards reste le seul bloc vraiment flexible après usage.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <UserPlus className="mt-1 size-3.5 shrink-0" />
                      <span>
                        Un agent ayant déjà créé des prospects ne peut plus être retiré du programme.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Archive className="mt-1 size-3.5 shrink-0" />
                      <span>L&apos;archivage n&apos;est possible qu&apos;après 30 jours de suspension.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
