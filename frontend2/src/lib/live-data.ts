import { apiRequest } from '@/lib/api';
import type { AuthenticatedUser } from '@/types/auth';
import type { Agent, Business, ExchangePack, ExchangeRequest, Notification, Program, Prospect, Transaction, User } from '@/types';

interface ExchangePackItemRecord {
  id: string;
  title: string;
  points_cost: number;
}

interface ExchangePackRecord {
  id: string;
  name: string;
  updated_at: string | null;
  items: ExchangePackItemRecord[];
}

interface ProgramRecord {
  id: string;
  business_id: string;
  business_name: string | null;
  name: string;
  description: string | null;
  commission_type: Program['commissionType'];
  exchange_mode: Program['exchangeMode'];
  points_per_transaction: number | null;
  points_per_euro: number | null;
  exchange_pack: ExchangePackRecord | null;
  eligibility_criteria: string | null;
  status: string;
  created_at: string | null;
  assigned_agents_count?: number;
  assigned_agents?: Array<{
    agent: {
      id: string;
      user_id: string;
      display_name: string | null;
      email: string | null;
      status: string | null;
    } | null;
  }>;
}

interface AppNotificationRecord {
  id: string;
  title: string;
  message: string;
  severity: string;
  metadata?: {
    exchange_request_id?: string;
    [key: string]: unknown;
  } | null;
  read_at: string | null;
  created_at: string | null;
}

interface ExchangeRequestRecord {
  id: string;
  agent_id: string;
  agent_name: string | null;
  business_id: string;
  business_name: string | null;
  program_id: string | null;
  program_name: string | null;
  request_type: ExchangeRequest['exchangeType'];
  requested_reward_title: string | null;
  points_amount: number;
  cash_amount: number | null;
  status: string;
  requested_at: string | null;
  approved_at: string | null;
  processed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  rejected_at: string | null;
}

interface ProspectRecord {
  id: string;
  business_id: string;
  business_name: string | null;
  program_id: string;
  program_name: string | null;
  program_status?: string | null;
  agent_id: string;
  agent_name: string | null;
  agent_email?: string | null;
  contact_name: string;
  contact_email: string | null;
  contact_phone_raw: string | null;
  company_name?: string | null;
  submission_status?: string | null;
  deleted_at?: string | null;
  soft_delete_reason?: string | null;
  history_count?: number | null;
  pipeline_stage: string;
  submitted_at: string | null;
}

interface BusinessRecord {
  id: string;
  slug: string;
  legal_name: string;
  display_name: string;
  industry: string | null;
  website_url: string | null;
  status: string;
  created_at: string | null;
  owner?: {
    user_id: string;
  } | null;
}

interface AgentRecord {
  id: string;
  user_id: string;
  agent_code: string | null;
  status: string;
  invited_at: string | null;
  activated_at: string | null;
  last_activity_at?: string | null;
  display_name: string | null;
  email: string | null;
  notes?: string | null;
}

interface AgentEnvelope {
  data: AgentRecord;
  meta?: {
    activation_url?: string;
    assigned_program_id?: string;
    assigned_program_name?: string;
  };
}

interface SettingsRecord {
  user: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    email: string;
    status: string;
  };
  business: {
    id: string;
    slug: string;
    display_name: string;
    legal_name: string;
    contact_email: string | null;
    contact_phone: string | null;
    website_url: string | null;
    timezone: string;
    currency_code: string;
  } | null;
  permissions: {
    can_update_own: boolean;
    can_update_business: boolean;
  };
}

interface DashboardMetricCardRecord {
  key: string;
  title: string;
  value: string;
  description: string;
  tone: string;
  badge: {
    tone: string;
    label: string;
    helper_text?: string | null;
    icon?: string | null;
  };
}

interface BusinessDashboardSummaryRecord {
  cards: DashboardMetricCardRecord[];
}

interface TransactionRecord {
  id: string;
  business_id: string;
  business_name: string | null;
  program_id: string;
  program_name: string | null;
  agent_id: string;
  agent_name: string | null;
  agent_email?: string | null;
  prospect_id: string | null;
  prospect_name: string | null;
  prospect_company_name?: string | null;
  transaction_reference: string;
  product_name?: string | null;
  amount: number;
  currency_code: string;
  status: Transaction['status'];
  invoice_status: Transaction['invoiceStatus'] | null;
  points_awarded: number | null;
  occurred_at: string | null;
  created_at: string | null;
}

interface TransactionSummaryRecord {
  transaction_count: number;
  total_amount: number;
  validated_amount: number;
  paid_amount: number;
  points_awarded_total: number;
  linked_prospect_count: number;
  status_breakdown: Record<Transaction['status'], number>;
}

interface PointsSummaryRecord {
  forecast_points: number;
  pending_points: number;
  available_points: number;
  locked_points: number;
  consumed_points: number;
  reversed_points: number;
  open_prospect_count: number;
  ledger_entry_count: number;
  active_exchange_request_count: number;
}

interface PointsProgramBalanceRecord {
  program_id: string;
  program_name: string | null;
  exchange_mode: Program['exchangeMode'] | null;
  exchange_pack_name: string | null;
  exchange_pack_items: Array<{
    id: string;
    title: string;
    points_cost: number;
    status: string;
  }>;
  forecast_points: number;
  pending_points: number;
  available_points: number;
  locked_points: number;
  consumed_points: number;
  reversed_points: number;
  open_prospect_count: number;
  ledger_entry_count: number;
}

interface ProgramListEnvelope {
  data: ProgramRecord[];
}

interface ExchangePackListEnvelope {
  data: ExchangePackRecord[];
}

interface ExchangePackEnvelope {
  data: ExchangePackRecord;
}

interface NotificationListEnvelope {
  data: AppNotificationRecord[];
}

interface ExchangeRequestsEnvelope {
  data: ExchangeRequestRecord[];
}

interface ProspectListEnvelope {
  data: ProspectRecord[];
}

interface ProspectEnvelope {
  data: ProspectRecord;
}

interface BusinessListEnvelope {
  data: BusinessRecord[];
}

interface BusinessEnvelope {
  data: BusinessRecord;
}

interface AgentListEnvelope {
  data: AgentRecord[];
}

interface SettingsEnvelope {
  data: SettingsRecord;
}

interface BusinessDashboardSummaryEnvelope {
  data: BusinessDashboardSummaryRecord;
}

interface TransactionListEnvelope {
  data: TransactionRecord[];
}

interface TransactionSummaryEnvelope {
  data: TransactionSummaryRecord;
}

interface PointsSummaryEnvelope {
  data: PointsSummaryRecord;
}

interface PointsByProgramEnvelope {
  data: PointsProgramBalanceRecord[];
}

interface ProgramEnvelope {
  data: ProgramRecord;
}

interface AgentDetailEnvelope {
  data: AgentRecord;
}

interface TransactionEnvelope {
  data: TransactionRecord;
}

interface ProspectHistoryItemRecord {
  id: string;
  source_system: string;
  old_submission_status: string | null;
  new_submission_status: string | null;
  old_progression_status: string | null;
  new_progression_status: string | null;
  reason: string | null;
  payload_snapshot: Record<string, unknown>;
  changed_by_user: {
    id: string;
    display_name: string;
    email: string;
  } | null;
  created_at: string | null;
}

interface ProspectHistoryEnvelope {
  data: ProspectHistoryItemRecord[];
}

interface Frontend2ExchangePackMutationPayload {
  name: string;
  items: Array<{
    id?: string;
    title: string;
    points_cost: number;
  }>;
}

export interface Frontend2AgentInvitePayload {
  displayName: string;
  email: string;
  programId: string;
  notes?: string;
}

export interface LiveTransactionSummary {
  transactionCount: number;
  totalAmount: number;
  validatedAmount: number;
  paidAmount: number;
  pointsAwardedTotal: number;
  linkedProspectCount: number;
  statusBreakdown: Record<Transaction['status'], number>;
}

export interface LivePointsSummary {
  forecastPoints: number;
  pendingPoints: number;
  availablePoints: number;
  lockedPoints: number;
  consumedPoints: number;
  reversedPoints: number;
  openProspectCount: number;
  ledgerEntryCount: number;
  activeExchangeRequestCount: number;
}

export interface LivePointsProgramBalance {
  programId: string;
  programName: string;
  exchangeMode: Program['exchangeMode'] | null;
  exchangePackName: string | null;
  exchangePackItems: Array<{
    id: string;
    title: string;
    pointsCost: number;
    status: string;
  }>;
  forecastPoints: number;
  pendingPoints: number;
  availablePoints: number;
  lockedPoints: number;
  consumedPoints: number;
  reversedPoints: number;
  openProspectCount: number;
  ledgerEntryCount: number;
}

export interface LiveProgramDetail extends Program {
  assignedAgents: Array<{
    id: string;
    userId: string;
    name: string;
    email: string;
    status: string;
  }>;
}

export interface LiveAgentDetail extends Agent {
  agentCode?: string;
}

export interface LiveTransactionDetail extends Transaction {
  invoiceStatusRaw?: string | null;
}

export interface LiveProspectHistoryItem {
  id: string;
  sourceSystem: string;
  oldSubmissionStatus?: string | null;
  newSubmissionStatus?: string | null;
  oldProgressionStatus?: string | null;
  newProgressionStatus?: string | null;
  reason?: string | null;
  changedBy?: {
    id: string;
    displayName: string;
    email: string;
  } | null;
  createdAt: string;
}

export interface CreateRewardExchangePayload {
  programId: string;
  exchangePackItemId: string;
}

export interface CreateCashExchangePayload {
  programId: string;
  pointsAmount: number;
}

export interface LiveAgentInvitePayload {
  displayName: string;
  email: string;
  notes?: string;
}

export interface LiveProspectCreatePayload {
  programId: string;
  contactName: string;
  contactEmail: string;
  contactPhoneRaw?: string;
  companyName?: string;
}

export interface LiveSettingsPayload {
  user: SettingsRecord['user'];
  business: SettingsRecord['business'];
  permissions: SettingsRecord['permissions'];
}

export interface LiveDashboardSummary {
  cards: DashboardMetricCardRecord[];
}

function isUuidLike(value: string | undefined | null): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function normalizeProgramStatus(status: string): Program['status'] {
  if (
    status === 'active' ||
    status === 'paused' ||
    status === 'draft' ||
    status === 'suspended' ||
    status === 'archived'
  ) {
    return status;
  }

  return 'pending';
}

function normalizeNotificationType(severity: string): Notification['type'] {
  if (severity === 'success' || severity === 'warning' || severity === 'error') {
    return severity;
  }

  return 'info';
}

function normalizeAgentStatus(status: string): 'pending' | 'interview' | 'approved' | 'rejected' | 'suspended' {
  switch (status) {
    case 'active':
      return 'approved';
    case 'onboarding':
      return 'interview';
    case 'rejected':
      return 'rejected';
    case 'suspended':
      return 'suspended';
    default:
      return 'pending';
  }
}

function normalizeProspectStage(stage: string): Prospect['status'] {
  switch (stage) {
    case 'suspect':
      return 'suspect';
    case 'prospect_froid':
      return 'prospect-froid';
    case 'prospect_tiede':
      return 'prospect-tiede';
    case 'prospect_chaud':
      return 'prospect-chaud';
    default:
      return 'suspect';
  }
}

export function toPrototypeUser(user: AuthenticatedUser): User {
  return {
    id: user.id,
    name: user.display_name,
    email: user.email,
    role: user.prototype_role,
    avatar: user.avatar_url ?? undefined,
    companyId: user.current_business_id ?? user.primary_business?.id ?? undefined,
    status: user.status === 'suspended' ? 'suspended' : user.status === 'pending' ? 'pending' : 'active',
    createdAt: user.last_activity_at ?? user.last_login_at ?? new Date().toISOString(),
    permissions: user.permissions,
    agentProfileId: user.agent_profile?.id ?? undefined,
  };
}

function toPrototypeProgram(record: ProgramRecord): Program {
  return {
    id: record.id,
    name: record.name,
    description: record.description ?? '',
    businessId: record.business_id,
    businessName: record.business_name ?? 'Business',
    commissionType: record.commission_type,
    exchangeMode: record.exchange_mode,
    pointsPerTransaction: record.points_per_transaction ?? undefined,
    pointsPerEuro: record.points_per_euro ?? undefined,
    exchangePackId: record.exchange_pack?.id,
    redemptionOptions: record.exchange_pack?.items.map((item) => item.title) ?? [],
    status: normalizeProgramStatus(record.status),
    eligibilityCriteria: record.eligibility_criteria ?? '',
    createdAt: record.created_at ?? new Date().toISOString(),
    assignedAgentIds:
      record.assigned_agents
        ?.map((assignment) => assignment.agent?.id)
        .filter((value): value is string => Boolean(value)) ?? [],
    assignedAgentsCount: record.assigned_agents_count ?? record.assigned_agents?.length ?? 0,
  };
}

function toPrototypeExchangePack(record: ExchangePackRecord): ExchangePack {
  return {
    id: record.id,
    name: record.name,
    items: record.items.map((item) => ({
      id: item.id,
      label: item.title,
      pointsCost: item.points_cost,
    })),
    updatedAt: record.updated_at ?? new Date().toISOString(),
  };
}

function toPrototypeNotification(record: AppNotificationRecord): Notification {
  return {
    id: record.id,
    title: record.title,
    message: record.message,
    type: normalizeNotificationType(record.severity),
    read: record.read_at !== null,
    createdAt: record.created_at ?? new Date().toISOString(),
    relatedExchangeRequestId: record.metadata?.exchange_request_id,
  };
}

function toPrototypeExchangeRequest(record: ExchangeRequestRecord): ExchangeRequest {
  const normalizedStatus: ExchangeRequest['status'] =
    record.status === 'approved' ||
    record.status === 'rejected' ||
    record.status === 'processing' ||
    record.status === 'completed' ||
    record.status === 'cancelled'
      ? record.status
      : 'requested';

  const resolvedAt =
    record.approved_at ??
    record.rejected_at ??
    record.processed_at ??
    record.completed_at ??
    record.cancelled_at ??
    undefined;

  return {
    id: record.id,
    agentId: record.agent_id,
    agentName: record.agent_name ?? 'Agent',
    businessId: record.business_id,
    businessName: record.business_name ?? 'Business',
    programId: record.program_id ?? '',
    programName: record.program_name ?? 'Programme',
    exchangeType: record.request_type,
    rewardTitle: record.requested_reward_title ?? '',
    pointsSpent: record.points_amount,
    cashAmount: record.cash_amount ?? undefined,
    status: normalizedStatus,
    createdAt: record.requested_at ?? new Date().toISOString(),
    resolvedAt,
  };
}

function toPrototypeProspect(record: ProspectRecord): Prospect {
  return {
    id: record.id,
    agentId: record.agent_id,
    agentName: record.agent_name ?? 'Affilie',
    programId: record.program_id,
    programName: record.program_name ?? 'Programme',
    businessId: record.business_id,
    businessName: record.business_name ?? 'Business',
    clientName: record.contact_name,
    clientEmail: record.contact_email ?? '',
    clientPhone: record.contact_phone_raw ?? undefined,
    companyName: record.company_name ?? undefined,
    agentEmail: record.agent_email ?? undefined,
    programStatus: record.program_status ?? undefined,
    status: normalizeProspectStage(record.pipeline_stage),
    submittedAt: record.submitted_at ?? new Date().toISOString(),
    submissionStatus: record.submission_status ?? undefined,
    deletedAt: record.deleted_at ?? undefined,
    softDeleteReason: record.soft_delete_reason ?? undefined,
    historyCount: record.history_count ?? undefined,
  };
}

function toPrototypeTransaction(record: TransactionRecord): Transaction {
  return {
    id: record.id,
    prospectId: record.prospect_id ?? '',
    agentId: record.agent_id,
    agentName: record.agent_name ?? 'Affilie',
    agentEmail: record.agent_email ?? undefined,
    programId: record.program_id,
    programName: record.program_name ?? 'Programme',
    businessId: record.business_id,
    businessName: record.business_name ?? 'Business',
    clientName: record.prospect_name ?? record.transaction_reference,
    prospectCompanyName: record.prospect_company_name ?? undefined,
    productName: record.product_name ?? undefined,
    transactionReference: record.transaction_reference,
    amount: record.amount,
    currency: record.currency_code,
    commission: record.points_awarded ?? 0,
    status: record.status,
    invoiceStatus: record.invoice_status === 'paid' ? 'paid' : 'pending',
    createdAt: record.occurred_at ?? record.created_at ?? new Date().toISOString(),
  };
}

function toPrototypeBusiness(record: BusinessRecord): Business {
  return {
    id: record.id,
    name: record.display_name,
    ownerId: record.owner?.user_id ?? '',
    status:
      record.status === 'approved' || record.status === 'pending' || record.status === 'rejected'
        ? record.status
        : 'suspended',
    industry: record.industry ?? 'Non renseigne',
    website: record.website_url ?? undefined,
    createdAt: record.created_at ?? new Date().toISOString(),
  };
}

function toPrototypeAgent(record: AgentRecord): Agent {
  return {
    id: record.id,
    userId: record.user_id,
    name: record.display_name ?? 'Affilie',
    email: record.email ?? 'email-indisponible@example.test',
    status: normalizeAgentStatus(record.status),
    programs: [],
    totalEarnings: 0,
    availableBalance: 0,
    pendingCommissions: 0,
    createdAt: record.activated_at ?? record.invited_at ?? new Date().toISOString(),
    activatedAt: record.activated_at ?? undefined,
    lastActivityAt: record.last_activity_at ?? undefined,
    notes: record.notes ?? undefined,
  };
}

function toLiveTransactionSummary(record: TransactionSummaryRecord): LiveTransactionSummary {
  return {
    transactionCount: record.transaction_count,
    totalAmount: record.total_amount,
    validatedAmount: record.validated_amount,
    paidAmount: record.paid_amount,
    pointsAwardedTotal: record.points_awarded_total,
    linkedProspectCount: record.linked_prospect_count,
    statusBreakdown: record.status_breakdown,
  };
}

function toLivePointsSummary(record: PointsSummaryRecord): LivePointsSummary {
  return {
    forecastPoints: record.forecast_points,
    pendingPoints: record.pending_points,
    availablePoints: record.available_points,
    lockedPoints: record.locked_points,
    consumedPoints: record.consumed_points,
    reversedPoints: record.reversed_points,
    openProspectCount: record.open_prospect_count,
    ledgerEntryCount: record.ledger_entry_count,
    activeExchangeRequestCount: record.active_exchange_request_count,
  };
}

function toLivePointsProgramBalance(record: PointsProgramBalanceRecord): LivePointsProgramBalance {
  return {
    programId: record.program_id,
    programName: record.program_name ?? 'Programme',
    exchangeMode: record.exchange_mode,
    exchangePackName: record.exchange_pack_name,
    exchangePackItems: record.exchange_pack_items.map((item) => ({
      id: item.id,
      title: item.title,
      pointsCost: item.points_cost,
      status: item.status,
    })),
    forecastPoints: record.forecast_points,
    pendingPoints: record.pending_points,
    availablePoints: record.available_points,
    lockedPoints: record.locked_points,
    consumedPoints: record.consumed_points,
    reversedPoints: record.reversed_points,
    openProspectCount: record.open_prospect_count,
    ledgerEntryCount: record.ledger_entry_count,
  };
}

export async function fetchPrograms() {
  const response = await apiRequest<ProgramListEnvelope>('/v1/programs');
  return response.data.map(toPrototypeProgram);
}

function toLiveProgramDetail(record: ProgramRecord): LiveProgramDetail {
  const program = toPrototypeProgram(record);

  return {
    ...program,
    assignedAgents:
      record.assigned_agents
        ?.map((assignment) => assignment.agent)
        .filter((agent): agent is NonNullable<typeof agent> => Boolean(agent))
        .map((agent) => ({
          id: agent.id,
          userId: agent.user_id,
          name: agent.display_name ?? 'Affilie',
          email: agent.email ?? 'email-indisponible@example.test',
          status: agent.status ?? 'unknown',
        })) ?? [],
  };
}

export async function fetchProgramDetail(programId: string) {
  const response = await apiRequest<ProgramEnvelope>(`/v1/programs/${programId}`);
  return toLiveProgramDetail(response.data);
}

function toProgramMutationPayload(program: Pick<
  Program,
  | 'name'
  | 'description'
  | 'commissionType'
  | 'exchangeMode'
  | 'pointsPerTransaction'
  | 'pointsPerEuro'
  | 'exchangePackId'
  | 'eligibilityCriteria'
  | 'status'
>) {
  return {
    name: program.name,
    description: program.description,
    commission_type: program.commissionType,
    exchange_mode: program.exchangeMode,
    points_per_transaction: program.pointsPerTransaction ?? null,
    points_per_euro: program.exchangeMode === 'cash' || program.exchangeMode === 'both'
      ? program.pointsPerEuro ?? null
      : null,
    exchange_pack_id: program.exchangeMode === 'reward' || program.exchangeMode === 'both'
      ? program.exchangePackId ?? null
      : null,
    eligibility_criteria: program.eligibilityCriteria ?? '',
    status: program.status,
  };
}

export async function createFrontend2Program(
  program: Pick<
    Program,
    | 'name'
    | 'description'
    | 'commissionType'
    | 'exchangeMode'
    | 'pointsPerTransaction'
    | 'pointsPerEuro'
    | 'exchangePackId'
    | 'eligibilityCriteria'
    | 'status'
  >,
) {
  const response = await apiRequest<ProgramEnvelope>('/v1/frontend2/programs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toProgramMutationPayload(program)),
  });

  return toPrototypeProgram(response.data);
}

export async function updateFrontend2Program(
  programId: string,
  program: Pick<
    Program,
    | 'name'
    | 'description'
    | 'commissionType'
    | 'exchangeMode'
    | 'pointsPerTransaction'
    | 'pointsPerEuro'
    | 'exchangePackId'
    | 'eligibilityCriteria'
    | 'status'
  >,
) {
  const response = await apiRequest<ProgramEnvelope>(`/v1/frontend2/programs/${programId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toProgramMutationPayload(program)),
  });

  return toPrototypeProgram(response.data);
}

export async function suspendFrontend2Program(programId: string) {
  const response = await apiRequest<ProgramEnvelope>(`/v1/frontend2/programs/${programId}/suspend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  return toPrototypeProgram(response.data);
}

export async function reactivateFrontend2Program(programId: string) {
  const response = await apiRequest<ProgramEnvelope>(`/v1/frontend2/programs/${programId}/reactivate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  return toPrototypeProgram(response.data);
}

export async function fetchExchangePacks() {
  const response = await apiRequest<ExchangePackListEnvelope>('/v1/exchange-packs');
  return response.data.map(toPrototypeExchangePack);
}

export async function createFrontend2ExchangePack(payload: Frontend2ExchangePackMutationPayload) {
  const response = await apiRequest<ExchangePackEnvelope>('/v1/frontend2/exchange-packs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return toPrototypeExchangePack(response.data);
}

export async function updateFrontend2ExchangePack(exchangePackId: string, payload: Frontend2ExchangePackMutationPayload) {
  const sanitizedPayload: Frontend2ExchangePackMutationPayload = {
    name: payload.name,
    items: payload.items.map((item) => ({
      ...(isUuidLike(item.id) ? { id: item.id } : {}),
      title: item.title,
      points_cost: item.points_cost,
    })),
  };

  const response = await apiRequest<ExchangePackEnvelope>(`/v1/frontend2/exchange-packs/${exchangePackId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sanitizedPayload),
  });

  return toPrototypeExchangePack(response.data);
}

export async function deleteFrontend2ExchangePack(exchangePackId: string) {
  await apiRequest(`/v1/frontend2/exchange-packs/${exchangePackId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function fetchNotifications() {
  const response = await apiRequest<NotificationListEnvelope>('/v1/notifications');
  return response.data.map(toPrototypeNotification);
}

export async function fetchExchangeRequests() {
  const response = await apiRequest<ExchangeRequestsEnvelope>('/v1/exchange-requests');
  return response.data.map(toPrototypeExchangeRequest);
}

export async function fetchProspects() {
  const response = await apiRequest<ProspectListEnvelope>('/v1/prospects');
  return response.data.map(toPrototypeProspect);
}

export async function fetchProspectDetail(prospectId: string) {
  const response = await apiRequest<ProspectEnvelope>(`/v1/prospects/${prospectId}`);
  return toPrototypeProspect(response.data);
}

export async function fetchProspectHistory(prospectId: string) {
  const response = await apiRequest<ProspectHistoryEnvelope>(`/v1/prospects/${prospectId}/history`);

  return response.data.map((item): LiveProspectHistoryItem => ({
    id: item.id,
    sourceSystem: item.source_system,
    oldSubmissionStatus: item.old_submission_status,
    newSubmissionStatus: item.new_submission_status,
    oldProgressionStatus: item.old_progression_status,
    newProgressionStatus: item.new_progression_status,
    reason: item.reason,
    changedBy: item.changed_by_user
      ? {
          id: item.changed_by_user.id,
          displayName: item.changed_by_user.display_name,
          email: item.changed_by_user.email,
        }
      : null,
    createdAt: item.created_at ?? new Date().toISOString(),
  }));
}

export async function createProspect(payload: LiveProspectCreatePayload) {
  const response = await apiRequest<ProspectEnvelope>('/v1/prospects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      program_id: payload.programId,
      contact_name: payload.contactName,
      contact_email: payload.contactEmail || null,
      contact_phone_raw: payload.contactPhoneRaw || null,
      company_name: payload.companyName || null,
    }),
  });

  return toPrototypeProspect(response.data);
}

export async function fetchBusinesses() {
  const response = await apiRequest<BusinessListEnvelope>('/v1/businesses');
  return response.data.map(toPrototypeBusiness);
}

export async function approveBusiness(businessId: string) {
  const response = await apiRequest<BusinessEnvelope>(`/v1/businesses/${businessId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  return toPrototypeBusiness(response.data);
}

export async function rejectBusiness(businessId: string) {
  const response = await apiRequest<BusinessEnvelope>(`/v1/businesses/${businessId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  return toPrototypeBusiness(response.data);
}

export async function fetchAgents() {
  const response = await apiRequest<AgentListEnvelope>('/v1/agents');
  return response.data.map(toPrototypeAgent);
}

export async function fetchAgentDetail(agentId: string) {
  const response = await apiRequest<AgentDetailEnvelope>(`/v1/agents/${agentId}`);

  return {
    ...toPrototypeAgent(response.data),
    agentCode: response.data.agent_code ?? undefined,
  } satisfies LiveAgentDetail;
}

export async function inviteAgent(payload: LiveAgentInvitePayload) {
  const response = await apiRequest<AgentEnvelope>('/v1/agents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      display_name: payload.displayName,
      email: payload.email,
      notes: payload.notes ?? undefined,
    }),
  });

  return {
    agent: toPrototypeAgent(response.data),
    activationUrl: response.meta?.activation_url ?? null,
  };
}

export async function inviteFrontend2Agent(payload: Frontend2AgentInvitePayload) {
  const response = await apiRequest<AgentEnvelope>('/v1/frontend2/agents/invite-with-program', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      display_name: payload.displayName,
      email: payload.email,
      program_id: payload.programId,
      notes: payload.notes ?? undefined,
    }),
  });

  return {
    agent: toPrototypeAgent(response.data),
    activationUrl: response.meta?.activation_url ?? null,
    assignedProgramId: response.meta?.assigned_program_id ?? payload.programId,
    assignedProgramName: response.meta?.assigned_program_name ?? null,
  };
}

export async function suspendAgent(agentId: string) {
  const response = await apiRequest<AgentEnvelope>(`/v1/agents/${agentId}/suspend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  return toPrototypeAgent(response.data);
}

export async function reactivateAgent(agentId: string) {
  const response = await apiRequest<AgentEnvelope>(`/v1/agents/${agentId}/reactivate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  return toPrototypeAgent(response.data);
}

export async function fetchTransactions() {
  const response = await apiRequest<TransactionListEnvelope>('/v1/transactions');
  return response.data.map(toPrototypeTransaction);
}

export async function fetchTransactionDetail(transactionId: string) {
  const response = await apiRequest<TransactionEnvelope>(`/v1/transactions/${transactionId}`);

  return {
    ...toPrototypeTransaction(response.data),
    invoiceStatusRaw: response.data.invoice_status,
  } satisfies LiveTransactionDetail;
}

export async function fetchTransactionSummary() {
  const response = await apiRequest<TransactionSummaryEnvelope>('/v1/transactions/summary');
  return toLiveTransactionSummary(response.data);
}

export async function fetchPointsSummary() {
  const response = await apiRequest<PointsSummaryEnvelope>('/v1/points/summary');
  return toLivePointsSummary(response.data);
}

export async function fetchPointsByProgram() {
  const response = await apiRequest<PointsByProgramEnvelope>('/v1/points/by-program');
  return response.data.map(toLivePointsProgramBalance);
}

export async function fetchFrontend2PointsSummary() {
  const response = await apiRequest<PointsSummaryEnvelope>('/v1/frontend2/points/summary');
  return toLivePointsSummary(response.data);
}

export async function fetchFrontend2PointsByProgram() {
  const response = await apiRequest<PointsByProgramEnvelope>('/v1/frontend2/points/by-program');
  return response.data.map(toLivePointsProgramBalance);
}

export async function fetchSettings() {
  const response = await apiRequest<SettingsEnvelope>('/v1/settings');
  return response.data;
}

export async function updateOwnSettings(payload: { displayName: string; avatarUrl?: string | null }) {
  const response = await apiRequest<SettingsEnvelope>('/v1/settings/own', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      display_name: payload.displayName,
      avatar_url: payload.avatarUrl ?? null,
    }),
  });

  return response.data;
}

export async function uploadOwnAvatar(file: File) {
  const body = new FormData();
  body.append('avatar', file);

  const response = await apiRequest<SettingsEnvelope>('/v1/settings/own/avatar', {
    method: 'POST',
    body,
  });

  return response.data;
}

export async function updateBusinessSettings(payload: {
  displayName: string;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
  timezone?: string;
}) {
  const response = await apiRequest<SettingsEnvelope>('/v1/settings/business', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      display_name: payload.displayName,
      contact_email: payload.contactEmail || null,
      contact_phone: payload.contactPhone || null,
      website_url: payload.websiteUrl || null,
      timezone: payload.timezone || null,
    }),
  });

  return response.data;
}

export async function fetchFrontend2DashboardSummary() {
  const response = await apiRequest<BusinessDashboardSummaryEnvelope>('/v1/frontend2/dashboard/summary');
  return response.data;
}

export async function fetchBusinessDashboardSummary() {
  const response = await apiRequest<BusinessDashboardSummaryEnvelope>('/v1/dashboard/business-summary');
  return response.data;
}

export async function markNotificationRead(notificationId: string) {
  await apiRequest(`/v1/notifications/${notificationId}/read`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
}

export async function markAllNotificationsRead() {
  await apiRequest('/v1/notifications/read-all', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
}

export async function approveExchangeRequest(requestId: string) {
  await apiRequest(`/v1/exchange-requests/${requestId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
}

export async function rejectExchangeRequest(requestId: string) {
  await apiRequest(`/v1/exchange-requests/${requestId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
}

export async function approveFrontend2ExchangeRequest(requestId: string) {
  await apiRequest(`/v1/frontend2/exchange-requests/${requestId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
}

export async function rejectFrontend2ExchangeRequest(requestId: string) {
  await apiRequest(`/v1/frontend2/exchange-requests/${requestId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
}

export async function markFrontend2ExchangeRequestProcessing(requestId: string) {
  await apiRequest(`/v1/frontend2/exchange-requests/${requestId}/processing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
}

export async function completeFrontend2ExchangeRequest(requestId: string) {
  await apiRequest(`/v1/frontend2/exchange-requests/${requestId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
}

export async function cancelFrontend2ExchangeRequest(requestId: string) {
  await apiRequest(`/v1/frontend2/exchange-requests/${requestId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
}

export async function createRewardExchangeRequest(payload: CreateRewardExchangePayload) {
  await apiRequest('/v1/exchange-requests/reward', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      program_id: payload.programId,
      exchange_pack_item_id: payload.exchangePackItemId,
    }),
  });
}

export async function createCashExchangeRequest(payload: CreateCashExchangePayload) {
  await apiRequest('/v1/exchange-requests/cash', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      program_id: payload.programId,
      points_amount: payload.pointsAmount,
    }),
  });
}

export async function createFrontend2RewardExchangeRequest(payload: CreateRewardExchangePayload) {
  await apiRequest('/v1/frontend2/exchange-requests/reward', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      program_id: payload.programId,
      exchange_pack_item_id: payload.exchangePackItemId,
    }),
  });
}

export async function createFrontend2CashExchangeRequest(payload: CreateCashExchangePayload) {
  await apiRequest('/v1/frontend2/exchange-requests/cash', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      program_id: payload.programId,
      points_amount: payload.pointsAmount,
    }),
  });
}
