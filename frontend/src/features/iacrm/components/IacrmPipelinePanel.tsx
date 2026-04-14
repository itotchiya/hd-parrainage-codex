import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useIacrmPipelineMerged, useIacrmStagesMerged } from '../hooks'
import { promoteAndSetStage } from '../prospectStore'
import { moveIacrmProspectStage } from '../api'
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
import { formatAppDate } from '@/lib/locale'

const funnelColors: Record<IacrmPipelineStage, string> = {
  suspect: 'bg-gray-400',
  prospect_froid: 'bg-blue-500',
  prospect_tiede: 'bg-amber-500',
  prospect_chaud: 'bg-emerald-500',
  converted: 'bg-green-600',
  lost: 'bg-red-500',
}

const allStages: IacrmPipelineStage[] = [
  'suspect',
  'prospect_froid',
  'prospect_tiede',
  'prospect_chaud',
  'converted',
  'lost',
]

function isLocal(prospect: IacrmPipelineProspect): boolean {
  return prospect.iacrm_id.startsWith('local_')
}

export function IacrmPipelinePanel() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const stagesQuery = useIacrmStagesMerged()
  const prospectsQuery = useIacrmPipelineMerged()
  const stageUpdateMutation = useMutation({
    mutationFn: async ({
      prospect,
      stage,
    }: {
      prospect: IacrmPipelineProspect
      stage: IacrmPipelineStage
    }) => {
      if (isLocal(prospect)) {
        promoteAndSetStage(prospect, stage)
        return null
      }

      return moveIacrmProspectStage(prospect.iacrm_id, stage, 'Updated from HD Parrainage IACRM pipeline')
    },
    onSuccess: async (_, variables) => {
      if (!isLocal(variables.prospect)) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['iacrm', 'pipeline', 'prospects'] }),
          queryClient.invalidateQueries({ queryKey: ['iacrm', 'pipeline', 'stages'] }),
          queryClient.invalidateQueries({ queryKey: ['iacrm', 'request-logs'] }),
        ])
      }
    },
  })

  const stages = stagesQuery.data?.data ?? []
  const prospects = prospectsQuery.data?.data ?? []
  const maxCount = Math.max(...stages.map((s) => s.count), 1)

  return (
    <div className="space-y-6">
      <article className="rounded-lg border border-border bg-card app-card-padding">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {t('iacrm.panels.pipeline.eyebrow')}
        </p>
        <h2 className="app-section-title mt-2">{t('iacrm.panels.pipeline.funnelTitle')}</h2>

        {stagesQuery.isPending ? (
          <p className="mt-4 text-sm text-muted-foreground">{t('iacrm.panels.pipeline.loadingStages')}</p>
        ) : stagesQuery.isError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {t('iacrm.panels.pipeline.errorStages')}
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {stages.map((stage) => {
              const pct = Math.round((stage.count / maxCount) * 100)
              const color = funnelColors[stage.stage] ?? 'bg-gray-400'
              return (
                <div key={stage.stage} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-sm font-medium text-foreground">
                    {stage.label}
                  </span>
                  <div className="h-7 flex-1 overflow-hidden rounded-md bg-muted/30">
                    <div className={`h-full rounded-md ${color} transition-all`} style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                  <span className="w-10 text-right text-sm font-semibold text-foreground">{stage.count}</span>
                </div>
              )
            })}
          </div>
        )}
      </article>

      <article className="rounded-lg border border-border bg-card app-card-padding">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {t('iacrm.panels.pipeline.prospectsEyebrow')}
        </p>
        <h2 className="app-section-title mt-2">
          {t('iacrm.panels.pipeline.prospectsTitle', { count: prospects.length })}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('iacrm.panels.pipeline.prospectsHint')}
        </p>

        {prospectsQuery.isPending ? (
          <p className="mt-4 text-sm text-muted-foreground">{t('iacrm.panels.pipeline.loadingProspects')}</p>
        ) : prospectsQuery.isError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {t('iacrm.panels.pipeline.errorProspects')}
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('iacrm.panels.pipeline.columns.contact')}</TableHead>
                  <TableHead>{t('iacrm.panels.pipeline.columns.company')}</TableHead>
                  <TableHead>{t('iacrm.panels.pipeline.columns.stage')}</TableHead>
                  <TableHead>{t('iacrm.panels.pipeline.columns.status')}</TableHead>
                  <TableHead>{t('iacrm.panels.pipeline.columns.agent')}</TableHead>
                  <TableHead>{t('iacrm.panels.pipeline.columns.source')}</TableHead>
                  <TableHead>{t('iacrm.panels.pipeline.columns.updatedAt')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospects.map((prospect) => {
                  const local = isLocal(prospect)
                  return (
                    <TableRow key={prospect.iacrm_id}>
                      <TableCell className="font-medium">{prospect.contact_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{prospect.company_name ?? '—'}</TableCell>
                      <TableCell>
                        <select
                          value={prospect.stage}
                          disabled={stageUpdateMutation.isPending}
                          onChange={(e) =>
                            stageUpdateMutation.mutate({
                              prospect,
                              stage: e.target.value as IacrmPipelineStage,
                            })
                          }
                          className="rounded-lg border border-input bg-background px-2 py-1 text-xs text-foreground outline-none transition focus:ring-1 focus:ring-ring/30"
                        >
                          {allStages.map((stage) => (
                            <option key={stage} value={stage}>
                              {t(`prospects.stages.${stage}`)}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{prospect.progression_status ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{prospect.assigned_agent ?? '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            local
                              ? 'border-amber-300 bg-amber-500/10 text-amber-800 text-[10px]'
                              : 'border-border bg-muted/30 text-muted-foreground text-[10px]'
                          }
                        >
                          {local ? t('app.name') : 'IACRM'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatAppDate(prospect.updated_at)}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {prospects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      {t('iacrm.panels.pipeline.empty')}
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
