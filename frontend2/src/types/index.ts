export type UserRole = 'super-admin' | 'business-owner' | 'agent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  companyId?: string;
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
  permissions?: string[];
  agentProfileId?: string;
}

export interface Business {
  id: string;
  name: string;
  ownerId: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  industry: string;
  website?: string;
  createdAt: string;
}

export interface Program {
  id: string;
  name: string;
  description: string;
  businessId: string;
  businessName: string;
  commissionType: 'per-transaction' | 'revenue-tier';
  exchangeMode: 'cash' | 'reward' | 'both';
  pointsPerTransaction?: number;
  pointsPerEuro?: number;
  exchangePackId?: string;
  redemptionOptions?: string[];
  status: 'draft' | 'pending' | 'active' | 'paused' | 'suspended' | 'archived' | 'rejected';
  eligibilityCriteria: string;
  createdAt: string;
  assignedAgentIds?: string[];
  assignedAgentsCount?: number;
}

export interface ExchangePackItem {
  id: string;
  label: string;
  pointsCost: number;
}

export interface ExchangePack {
  id: string;
  name: string;
  items: ExchangePackItem[];
  updatedAt: string;
}

export interface Agent {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: 'pending' | 'interview' | 'approved' | 'rejected' | 'suspended';
  programs: string[];
  totalEarnings: number;
  availableBalance: number;
  pendingCommissions: number;
  createdAt: string;
  activatedAt?: string;
  lastActivityAt?: string;
  notes?: string;
}

export interface Prospect {
  id: string;
  agentId: string;
  agentName: string;
  agentEmail?: string;
  programId: string;
  programName: string;
  programStatus?: string;
  businessId: string;
  businessName: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  companyName?: string;
  status: 'suspect' | 'prospect-froid' | 'prospect-tiede' | 'prospect-chaud';
  submittedAt: string;
  submissionStatus?: string;
  deletedAt?: string;
  softDeleteReason?: string;
  historyCount?: number;
}

export interface Transaction {
  id: string;
  prospectId: string;
  agentId: string;
  agentName: string;
  agentEmail?: string;
  programId: string;
  programName: string;
  businessId: string;
  businessName: string;
  clientName: string;
  prospectCompanyName?: string;
  productName?: string;
  transactionReference?: string;
  amount: number;
  currency: string;
  commission: number;
  status: 'detected' | 'pending' | 'validated' | 'rejected' | 'paid';
  invoiceStatus: 'pending' | 'paid';
  createdAt: string;
}

export interface Payout {
  id: string;
  agentId: string;
  agentName: string;
  amount: number;
  currency: string;
  status: 'requested' | 'approved' | 'rejected' | 'processing' | 'completed';
  requestedAt: string;
  processedAt?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalCommissions: number;
  totalBusinesses: number;
  totalPrograms: number;
  totalAgents: number;
  conversionRate: number;
  activePrograms: number;
  pendingApplications: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  audience?: UserRole[];
  relatedExchangeRequestId?: string;
}

export interface ExchangeRequest {
  id: string;
  agentId: string;
  agentName: string;
  businessId: string;
  businessName: string;
  programId: string;
  programName: string;
  exchangeType: 'reward' | 'cash';
  rewardTitle: string;
  pointsSpent: number;
  cashAmount?: number;
  status: 'requested' | 'approved' | 'rejected' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
  resolvedAt?: string;
}
