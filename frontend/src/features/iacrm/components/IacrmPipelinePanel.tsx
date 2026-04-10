import { useIacrmPipelineMerged, useIacrmStagesMerged } from '../hooks'
import { promoteAndSetStage } from '../prospectStore'
import type { IacrmPipelineProspect, IacrmPipelineStage } from '../../../types/iacrm'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const stagePresentation: Record<IacrmPipelineStage, { label: string; className: string }> = {
  suspect: { label: 'Suspect', className: 'border-border bg-muted/40 text-foreground' },
  prospect_froid: {
    label: 'Prospect Froid',
    className: 'border-blue-300 bg-blue-500/10 text-blue-800',
  },
  prospect_tiede: {
    label: 'Prospect Tiede',
    className: 'border-amber-300 bg-amber-500/10 text-amber-800',
  },
  prospect_chaud: {
    label: 'Prospect Chaud',
    className: 'border-emerald-300 bg-emerald-500/10 text-emerald-800',
  },
  converted: {
    label: 'Converti',
    className: 'border-green-400 bg-green-500/15 text-green-800',
  },
  lost: {
    label: 'Perdu',
    className: 'border-red-300 bg-red-500/10 text-red-800',
  },
}

const funnelColors: Record<IacrmPipelineStage, string> = {
  suspect: 'bg-gray-400',
  prospect_froid: 'bg-blue-500',
  prospect_tiede: 'bg-amber-500',
  prospect_chaud: 'bg-emerald-500',
  converted: 'bg-green-600',
  lost: 'bg-red-500',
}

const allStages = Object.keys(stagePresentation) as IacrmPipelineStage[]

function isLocal(prospect: IacrmPipelineProspect): boolean {
  return prospect.iacrm_id.startsWith('local_')
}

export function IacrmPipelinePanel() {
  const stagesQuery = useIacrmStagesMerged()
  const prospectsQuery = useIacrmPipelineMerged()

  const stages = stagesQuery.data?.data ?? []
  const prospects = prospectsQuery.data?.data ?? []
  const maxCount = Math.max(...stages.map((s) => s.count), 1)

  return (
    <div className="space-y-6">
      {/* Funnel visualization */}
      <article className="rounded-lg border border-border bg-card app-card-padding">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Pipeline funnel
        </p>
        <h2 className="app-section-title mt-2">Prospect distribution by stage</h2>

        {stagesQuery.isPending ? (
          <p className="mt-4 text-sm text-muted-foreground">Chargement des étapes du pipeline...</p>
        ) : stagesQuery.isError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load pipeline stages.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {stages.map((stage) => {
              const pct = Math.round((stage.count / maxCount) * 100)
              const color = funnelColors[stage.stage] ?? 'bg-gray-400'
              return (
                <div key={stage.stage} className="flex items-center gap-3">
                  <span className="w-32 text-sm font-medium text-foreground shrink-0">
                    {stage.label}
                  </span>
                  <div className="flex-1 h-7 rounded-md bg-muted/30 overflow-hidden">
                    <div
                      className={`h-full rounded-md ${color} transition-all`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-sm font-semibold text-foreground">
                    {stage.count}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </article>

      {/* Prospects table */}
      <article className="rounded-lg border border-border bg-card app-card-padding">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Pipeline prospects
        </p>
        <h2 className="app-section-title mt-2">
          {prospects.length} prospect{prospects.length !== 1 ? 's' : ''} tracked
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Use the Stage dropdown on each row to move a prospect through the funnel.
        </p>

        {prospectsQuery.isPending ? (
          <p className="mt-4 text-sm text-muted-foreground">Chargement des prospects...</p>
        ) : prospectsQuery.isError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load pipeline prospects.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Mis à jour</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospects.map((prospect) => {
                  const local = isLocal(prospect)
                  return (
                    <TableRow key={prospect.iacrm_id}>
                      <TableCell className="font-medium">{prospect.contact_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {prospect.company_name ?? '-'}
                      </TableCell>
                      <TableCell>
                        <select
                          value={prospect.stage}
                          onChange={(e) =>
                            promoteAndSetStage(prospect, e.target.value as IacrmPipelineStage)
                          }
                          className="rounded-lg border border-input bg-background px-2 py-1 text-xs text-foreground outline-none transition focus:ring-1 focus:ring-ring/30"
                        >
                          {allStages.map((s) => (
                            <option key={s} value={s}>
                              {stagePresentation[s].label}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {prospect.progression_status ?? '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {prospect.assigned_agent ?? '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            local
                              ? 'border-amber-300 bg-amber-500/10 text-amber-800 text-[10px]'
                              : 'border-border bg-muted/30 text-muted-foreground text-[10px]'
                          }
                        >
                          {local ? 'App' : 'IACRM'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(prospect.updated_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {prospects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      No prospects in the pipeline.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        )}
      </article>
    </div>
  )
}
