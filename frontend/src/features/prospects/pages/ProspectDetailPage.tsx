import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../../lib/api'
import { useAuthSession } from '../../auth/session'
import { fetchProspect, fetchProspectHistory } from '../api'
import { PageHeader } from '@/components/app/PageHeader'
import {
  DetailEmptyState,
  DetailMetaGrid,
  DetailMetaItem,
  DetailSectionCard,
} from '@/components/app/DetailPageKit'

const stagePresentation = {
  suspect: { label: 'Suspect', className: 'bg-slate-100 text-slate-700' },
  prospect_froid: { label: 'Cold', className: 'bg-blue-100 text-blue-700' },
  prospect_tiede: { label: 'Warm', className: 'bg-amber-100 text-amber-700' },
  prospect_chaud: { label: 'Hot', className: 'bg-emerald-100 text-emerald-700' },
} as const

const submissionPresentation = {
  pending_sync: 'Pending sync',
  synced: 'Synced',
  sync_failed: 'Sync failed',
  deleted: 'Deleted',
} as const

const conversionPresentation = {
  open: 'Open',
  converted: 'Converted',
  lost: 'Lost',
  locked: 'Locked',
} as const

function formatDate(value: string | null, withTime = false) {
  if (!value) {
    return 'Not available'
  }

  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
        }
      : {}),
  })
}

export function ProspectDetailPage() {
  const { prospectId } = useParams<{ prospectId: string }>()
  const { hasPermission } = useAuthSession()

  const prospectQuery = useQuery({
    queryKey: ['prospects', 'detail', prospectId],
    queryFn: async () => fetchProspect(prospectId ?? ''),
    enabled: Boolean(prospectId),
  })

  const historyQuery = useQuery({
    queryKey: ['prospects', 'detail', prospectId, 'history'],
    queryFn: async () => fetchProspectHistory(prospectId ?? ''),
    enabled: Boolean(prospectId),
  })

  if (!prospectId) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Prospect identifier is missing from the current route.
      </article>
    )
  }

  if (prospectQuery.isPending || historyQuery.isPending) {
    return (
      <article className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading prospect detail...
      </article>
    )
  }

  if (prospectQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(prospectQuery.error as ApiError).message}
      </article>
    )
  }

  if (historyQuery.isError) {
    return (
      <article className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(historyQuery.error as ApiError).message}
      </article>
    )
  }

  const prospect = prospectQuery.data.data
  const history = historyQuery.data.data
  const stage = stagePresentation[prospect.pipeline_stage]
  const canDelete = prospect.actions.can_delete && hasPermission('prospect.delete-own-soft')

  return (
    <section className="app-section">
      <PageHeader
        title={prospect.contact_name}
        titleAddon={
          <>
            <span className={`rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${stage.className}`}>
              {stage.label}
            </span>
            <span className="rounded-md bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
              {submissionPresentation[prospect.submission_status]}
            </span>
            <span className="rounded-md bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
              {conversionPresentation[prospect.conversion_status]}
            </span>
          </>
        }
        right={
          <Link
            to="/prospects"
            className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            Back
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
        <DetailSectionCard
          title="Contact"
          description={`${prospect.company_name ?? 'No company'} / ${prospect.program_name ?? 'No program'} / ${prospect.agent_name ?? 'No agent'}`}
        >
          <DetailMetaGrid>
            <DetailMetaItem label="Email" value={prospect.contact_email ?? 'Not provided'} />
            <DetailMetaItem label="Phone" value={prospect.contact_phone_raw ?? 'Not provided'} />
            <DetailMetaItem label="Submitted" value={formatDate(prospect.submitted_at, true)} />
            <DetailMetaItem label="Last sync" value={formatDate(prospect.last_synced_at, true)} />
            <DetailMetaItem label="IACRM ref" value={prospect.iacrm_prospect_id ?? 'Pending first sync'} />
            <DetailMetaItem label="IACRM status" value={prospect.iacrm_status_label ?? 'Not received'} />
            <DetailMetaItem label="Source" value={prospect.source} />
            <DetailMetaItem
              label="Conversion lock"
              value={
                prospect.conversion_locked_at
                  ? formatDate(prospect.conversion_locked_at, true)
                  : 'Not locked'
              }
            />
          </DetailMetaGrid>

          {prospect.sync_error_message ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {prospect.sync_error_message}
            </div>
          ) : null}

          {prospect.deleted_at ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Deleted {formatDate(prospect.deleted_at, true)} by{' '}
              {prospect.deleted_by_user?.display_name ?? 'Unknown user'}
              {prospect.soft_delete_reason ? `. Reason: ${prospect.soft_delete_reason}` : ''}
            </div>
          ) : null}
        </DetailSectionCard>

        <DetailSectionCard
          id="prospect-timeline"
          className="scroll-mt-20"
          title="Timeline"
          right={<span className="text-xs text-muted-foreground">{history.length} events</span>}
        >
          <div className="space-y-3">
            {history.length === 0 ? (
              <DetailEmptyState message="No lifecycle events have been recorded for this prospect yet." />
            ) : (
              history.map((event) => (
                <article key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {event.new_progression_status ?? 'No progression update'} /{' '}
                        {event.new_submission_status ?? 'No submission update'}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {event.source_system} / {event.changed_by_user?.display_name ?? 'System'}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">{formatDate(event.created_at, true)}</p>
                  </div>
                  {event.reason ? (
                    <p className="mt-3 text-sm leading-6 text-slate-600">{event.reason}</p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </DetailSectionCard>
      </div>

      <DetailSectionCard
        title="Actions"
        right={
          <span className="text-xs text-muted-foreground">
            {canDelete ? 'Soft delete available' : 'Read only'}
          </span>
        }
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-md bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            View history
          </span>
          {canDelete ? (
            <span className="rounded-md bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
              Soft delete eligible
            </span>
          ) : null}
        </div>
      </DetailSectionCard>
    </section>
  )
}
