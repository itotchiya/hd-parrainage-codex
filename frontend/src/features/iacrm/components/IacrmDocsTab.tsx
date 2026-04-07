import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function MethodBadge({ method }: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE' }) {
  const map = {
    GET: 'border-blue-300 bg-blue-500/10 text-blue-800',
    POST: 'border-green-400 bg-green-500/10 text-green-800',
    PATCH: 'border-amber-300 bg-amber-500/10 text-amber-800',
    DELETE: 'border-red-300 bg-red-500/10 text-red-800',
  }
  return (
    <Badge variant="outline" className={`font-mono text-[10px] ${map[method]}`}>
      {method}
    </Badge>
  )
}

function DirectionBadge({ dir }: { dir: 'pull' | 'push' }) {
  return dir === 'pull' ? (
    <Badge variant="outline" className="border-blue-300 bg-blue-500/10 text-blue-800 gap-1 text-[10px]">
      <ArrowDown className="size-3" /> Pull
    </Badge>
  ) : (
    <Badge variant="outline" className="border-emerald-300 bg-emerald-500/10 text-emerald-700 gap-1 text-[10px]">
      <ArrowUp className="size-3" /> Push
    </Badge>
  )
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="app-section-title mt-1">{title}</h2>
    </div>
  )
}

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs leading-6 text-foreground">
      {children}
    </pre>
  )
}

function FlowStep({
  number,
  label,
  sub,
  arrow = true,
}: {
  number: number
  label: string
  sub: string
  arrow?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {number}
        </div>
        {arrow ? <div className="mt-1 h-6 w-px bg-border" /> : null}
      </div>
      <div className="pb-2 pt-0.5">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Endpoint rows
// ---------------------------------------------------------------------------

const endpoints: Array<{
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  dir: 'pull' | 'push'
  when: string
  dataIn?: string
  dataOut: string
}> = [
  {
    method: 'POST',
    path: '/auth/token',
    dir: 'push',
    when: 'Clic sur "Tester la connexion" dans Paramètres',
    dataIn: '{ "api_key": "...", "grant_type": "api_key" }',
    dataOut: '{ "access_token": "...", "token_type": "Bearer", "expires_in": 3600 }',
  },
  {
    method: 'GET',
    path: '/services',
    dir: 'pull',
    when: 'Onglet Services · Ouverture du formulaire de programme',
    dataOut:
      '{ "data": [ { "iacrm_id", "name", "description", "category", "unit_price", "currency", "is_active" }, ... ] }',
  },
  {
    method: 'POST',
    path: '/services',
    dir: 'push',
    when: 'Création de service depuis IACRM (futur)',
    dataIn: '{ "name", "description", "category", "unit_price", "currency", "is_active" }',
    dataOut: '{ "data": { <IacrmService> } }',
  },
  {
    method: 'GET',
    path: '/clients',
    dir: 'pull',
    when: 'Onglet Clients · Dialog "Ajouter un affilié" (clients existants)',
    dataOut:
      '{ "data": [ { "iacrm_id", "company_name", "contact_name", "contact_email", "contact_phone", "status", "since" }, ... ] }',
  },
  {
    method: 'GET',
    path: '/pipeline/prospects',
    dir: 'pull',
    when: 'Onglet Pipeline — liste complète ou filtrée par stage',
    dataOut:
      '{ "data": [ { "iacrm_id", "contact_name", "company_name", "stage", "progression_status", "assigned_agent", "created_at", "updated_at" }, ... ] }',
  },
  {
    method: 'POST',
    path: '/pipeline/prospects',
    dir: 'push',
    when: "Création d'un prospect dans HD Parrainage (si IACRM configuré + auto-sync activé)",
    dataIn: '{ "contact_name", "company_name", "stage": "suspect", "assigned_agent" }',
    dataOut: '{ "data": { <IacrmPipelineProspect> } }',
  },
  {
    method: 'PATCH',
    path: '/pipeline/prospects/:id/stage',
    dir: 'push',
    when: 'Changement de stage via le select dans le tableau Pipeline',
    dataIn: '{ "stage": "prospect_tiede", "reason": "..." }',
    dataOut: '{ "data": { <IacrmPipelineProspect> } }',
  },
  {
    method: 'GET',
    path: '/pipeline/stages',
    dir: 'pull',
    when: 'Onglet Pipeline — graphique en barres horizontales',
    dataOut:
      '{ "data": [ { "stage", "label", "count" }, ... ] }',
  },
  {
    method: 'GET',
    path: '/invoices',
    dir: 'pull',
    when: 'Onglet Facturation — tableau des factures',
    dataOut:
      '{ "data": [ { "iacrm_id", "invoice_reference", "client_id", "client_name", "amount", "currency", "status", "issued_at", "due_at", "paid_at" }, ... ] }',
  },
  {
    method: 'GET',
    path: '/invoices/summary',
    dir: 'pull',
    when: 'Onglet Facturation — cartes KPI (total, payé, en retard)',
    dataOut:
      '{ "data": { "total_count", "total_amount", "paid_count", "paid_amount", "overdue_count", "overdue_amount" } }',
  },
]

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function IacrmDocsTab() {
  return (
    <div className="space-y-8">

      {/* ── Overview ──────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <SectionTitle eyebrow="Vue d'ensemble" title="Comment fonctionne l'intégration IACRM" />
          <p className="text-sm leading-7 text-muted-foreground">
            HD Parrainage se connecte à un CRM externe (IACRM) via une API REST. L'intégration est
            bidirectionnelle : l'application <strong className="text-foreground">tire</strong> des données depuis
            IACRM (services, clients, pipeline, facturation) et <strong className="text-foreground">pousse</strong> des
            données vers IACRM (prospects créés, changements de stage). La connexion utilise une clé API
            transmise dans l'en-tête <code className="font-mono text-xs text-foreground">X-IACRM-API-Key</code>.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              {
                color: 'border-blue-200 bg-blue-50',
                label: 'Pull — HD Parrainage lit',
                items: ['Services catalogue', 'Clients IACRM', 'Pipeline prospects', 'Stages & funnel', 'Factures & KPIs'],
              },
              {
                color: 'border-emerald-200 bg-emerald-50',
                label: 'Push — HD Parrainage écrit',
                items: ['Prospect créé → IACRM pipeline', 'Stage modifié → PATCH /stage', 'Test connexion → /auth/token'],
              },
              {
                color: 'border-amber-200 bg-amber-50',
                label: 'Déclenché dans l\'UI',
                items: ['Formulaire nouveau programme', 'Dialog ajouter affilié', 'Création prospect', 'Paramètres → Tester'],
              },
            ].map(({ color, label, items }) => (
              <div key={label} className={`rounded-lg border ${color} p-4`}>
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <ul className="mt-3 space-y-1">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ArrowRight className="mt-0.5 size-3 shrink-0 text-muted-foreground/60" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Authentication ────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <SectionTitle eyebrow="Authentification" title="Clé API et en-têtes HTTP" />
          <p className="text-sm leading-7 text-muted-foreground">
            Chaque requête vers IACRM inclut l'en-tête <code className="font-mono text-xs text-foreground">X-IACRM-API-Key</code>.
            Aucun cookie ni CSRF n'est utilisé — l'auth est découplée du backend Laravel.
          </p>
          <Code>{`// En-tête attaché sur toutes les requêtes IACRM
X-IACRM-API-Key: iacrm-mock-key-dev-2026
Accept: application/json

// Endpoint de test de connexion
POST /auth/token
Body: { "api_key": "<votre clé>", "grant_type": "api_key" }

// Réponse attendue
{ "access_token": "...", "token_type": "Bearer", "expires_in": 3600 }`}</Code>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Mock server :</strong> La clé mock est <code className="font-mono text-xs">iacrm-mock-key-dev-2026</code>.
            L'URL du mock Postman est <code className="font-mono text-xs">https://0bf6bfea-8d59-45b6-9872-1df0366d1b95.mock.pstmn.io</code>.
          </div>
        </CardContent>
      </Card>

      {/* ── Endpoints Reference ───────────────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <SectionTitle eyebrow="Référence complète" title="Tous les endpoints" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="pb-2 pr-3 w-16">Méthode</th>
                  <th className="pb-2 pr-3 w-20">Direction</th>
                  <th className="pb-2 pr-4">Endpoint</th>
                  <th className="pb-2 pr-4">Déclenché par</th>
                  <th className="pb-2">Corps envoyé / Réponse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {endpoints.map((ep) => (
                  <tr key={`${ep.method}-${ep.path}`} className="align-top hover:bg-muted/20">
                    <td className="py-3 pr-3">
                      <MethodBadge method={ep.method} />
                    </td>
                    <td className="py-3 pr-3">
                      <DirectionBadge dir={ep.dir} />
                    </td>
                    <td className="py-3 pr-4">
                      <code className="font-mono text-xs text-foreground">{ep.path}</code>
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{ep.when}</td>
                    <td className="py-3">
                      {ep.dataIn ? (
                        <div className="mb-1">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Envoi → </span>
                          <code className="font-mono text-[11px] text-foreground">{ep.dataIn}</code>
                        </div>
                      ) : null}
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Réponse → </span>
                        <code className="font-mono text-[11px] text-foreground">{ep.dataOut}</code>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Data Flows ────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Prospect creation flow */}
        <Card>
          <CardContent className="p-6">
            <SectionTitle eyebrow="Flux de données" title="Création d'un prospect" />
            <div className="mt-2">
              <FlowStep number={1} label="Agent remplit le formulaire" sub='Onglet Prospects → "Nouveau prospect"' />
              <FlowStep number={2} label="POST /v1/prospects" sub="Laravel crée l'enregistrement local" />
              <FlowStep number={3} label="IACRM configuré ?" sub="Vérifie la présence de base_url dans localStorage" />
              <FlowStep number={4} label="POST /pipeline/prospects" sub="Prospect envoyé vers IACRM avec stage=suspect" />
              <FlowStep number={5} label="Prospect visible dans Pipeline" sub='Badge "App" — différencié des entrées mock' arrow={false} />
            </div>
          </CardContent>
        </Card>

        {/* Stage change flow */}
        <Card>
          <CardContent className="p-6">
            <SectionTitle eyebrow="Flux de données" title="Changement de stage (IACRM joue le rôle CRM)" />
            <div className="mt-2">
              <FlowStep number={1} label="Naviguer vers IACRM → Pipeline" sub="Tableau des prospects avec colonne Stage interactive" />
              <FlowStep number={2} label="Changer le stage via le select" sub="Ex. Suspect → Prospect Tiède" />
              <FlowStep number={3} label="promoteAndSetStage()" sub="Met à jour le store localStorage. Mock IACRM = clone promoté." />
              <FlowStep number={4} label="PATCH /pipeline/prospects/:id/stage" sub="Requête envoyée vers le mock (fire-and-forget)" />
              <FlowStep number={5} label="Funnel mis à jour en temps réel" sub="useIacrmStagesMerged recompute les compteurs" arrow={false} />
            </div>
          </CardContent>
        </Card>

        {/* Program creation flow */}
        <Card>
          <CardContent className="p-6">
            <SectionTitle eyebrow="Flux de données" title="Création de programme depuis un service IACRM" />
            <div className="mt-2">
              <FlowStep number={1} label="Ouvrir le formulaire de programme" sub='Programmes → "Nouveau programme"' />
              <FlowStep number={2} label="GET /services" sub="Catalogue IACRM chargé en arrière-plan" />
              <FlowStep number={3} label="Sélectionner un service IACRM" sub="Bandeau ambre affiché si IACRM configuré" />
              <FlowStep number={4} label="Nom + description pré-remplis" sub="Depuis service.name et service.description" />
              <FlowStep number={5} label="Soumission normale du programme" sub="POST /v1/programs → Laravel (pas d'écriture IACRM)" arrow={false} />
            </div>
          </CardContent>
        </Card>

        {/* Agent invite flow */}
        <Card>
          <CardContent className="p-6">
            <SectionTitle eyebrow="Flux de données" title="Inviter un affilié depuis un client IACRM" />
            <div className="mt-2">
              <FlowStep number={1} label="Agents → Ajouter un affilié" sub='"Parmi les clients existants" sélectionné' />
              <FlowStep number={2} label="GET /clients" sub="Liste des clients IACRM actifs chargée" />
              <FlowStep number={3} label="Sélectionner un client" sub="Nom et email pré-remplis depuis contact_name / contact_email" />
              <FlowStep number={4} label="Envoyer l'invitation" sub="POST /v1/agents/invite → Laravel envoie l'email" arrow={false} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Data Models ───────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <SectionTitle eyebrow="Types TypeScript" title="Modèles de données IACRM" />
          <div className="grid gap-4 lg:grid-cols-2">

            <div>
              <p className="text-xs font-semibold text-foreground">IacrmService</p>
              <Code>{`interface IacrmService {
  iacrm_id:    string
  name:        string
  description: string | null
  category:    string          // "Comptabilite", "Digital"…
  unit_price:  number          // EUR
  currency:    string          // "EUR"
  is_active:   boolean
}`}</Code>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground">IacrmClient</p>
              <Code>{`interface IacrmClient {
  iacrm_id:      string
  company_name:  string
  contact_name:  string
  contact_email: string | null
  contact_phone: string | null
  status:        "active" | "inactive"
  since:         string        // "2024-03-15"
}`}</Code>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground">IacrmPipelineProspect</p>
              <Code>{`interface IacrmPipelineProspect {
  iacrm_id:           string
  contact_name:       string
  company_name:       string | null
  stage:              IacrmPipelineStage
  progression_status: string | null
  assigned_agent:     string | null
  created_at:         string   // ISO 8601
  updated_at:         string   // ISO 8601
}

type IacrmPipelineStage =
  | "suspect"
  | "prospect_froid"
  | "prospect_tiede"
  | "prospect_chaud"
  | "converted"
  | "lost"`}</Code>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground">IacrmInvoice + IacrmInvoiceSummary</p>
              <Code>{`interface IacrmInvoice {
  iacrm_id:          string
  invoice_reference: string   // "FAC-2026-0001"
  client_id:         string
  client_name:       string | null
  amount:            number   // EUR
  currency:          string
  status:            IacrmInvoiceStatus
  issued_at:         string
  due_at:            string
  paid_at:           string | null
}
type IacrmInvoiceStatus =
  | "pending" | "paid" | "unpaid"
  | "overdue" | "cancelled"

interface IacrmInvoiceSummary {
  total_count:    number
  total_amount:   number
  paid_count:     number
  paid_amount:    number
  overdue_count:  number
  overdue_amount: number
}`}</Code>
            </div>

            <div className="lg:col-span-2">
              <p className="text-xs font-semibold text-foreground">IacrmApiConfig (stocké dans localStorage)</p>
              <Code>{`interface IacrmApiConfig {
  base_url:          string            // URL du serveur IACRM ou mock
  api_key:           string            // Valeur de X-IACRM-API-Key
  auto_sync_enabled: boolean           // Sync auto des prospects
  last_tested_at:    string | null     // ISO 8601
  connection_status: "untested" | "connected" | "failed"
}
// Clé localStorage : "iacrm_api_config"`}</Code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Error handling ────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <SectionTitle eyebrow="Gestion des erreurs" title="Comportement en cas d'échec" />
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            {[
              {
                title: 'IACRM non configuré',
                desc: 'Si base_url est absent du localStorage, tous les hooks sont désactivés (enabled: false). Les panneaux affichent un message de configuration.',
                color: 'border-amber-200 bg-amber-50 text-amber-900',
              },
              {
                title: 'Erreur réseau / timeout',
                desc: 'Chaque requête est wrappée dans un try/catch. L\'erreur est loggée dans le journal d\'activité (type: error). L\'UI affiche "Failed to load…" sans crasher.',
                color: 'border-red-200 bg-red-50 text-red-900',
              },
              {
                title: 'Push fire-and-forget',
                desc: 'Les appels POST/PATCH vers IACRM (création de prospect, changement de stage) sont fire-and-forget. Un échec n\'empêche pas l\'opération locale.',
                color: 'border-blue-200 bg-blue-50 text-blue-900',
              },
            ].map(({ title, desc, color }) => (
              <div key={title} className={`rounded-lg border p-4 ${color}`}>
                <p className="font-semibold text-sm">{title}</p>
                <p className="mt-2 text-xs leading-5 opacity-90">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
