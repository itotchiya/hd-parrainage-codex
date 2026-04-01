export type TransactionStatus = 'detected' | 'pending' | 'validated' | 'rejected' | 'paid'

export type TransactionInvoiceStatus = 'pending' | 'paid' | 'unpaid' | 'overdue' | null

export interface TransactionRecord {
  id: string
  business_id: string
  business_name: string | null
  program_id: string
  program_name: string | null
  program_slug: string | null
  agent_id: string
  agent_name: string | null
  agent_email: string | null
  prospect_id: string | null
  prospect_name: string | null
  prospect_company_name: string | null
  iacrm_transaction_id: string | null
  transaction_reference: string
  product_name: string
  amount: number
  currency_code: string
  status: TransactionStatus
  invoice_status: TransactionInvoiceStatus
  points_awarded: number | null
  occurred_at: string | null
  recognized_at: string | null
  validated_at: string | null
  rejected_at: string | null
  paid_at: string | null
  last_synced_at: string | null
  created_at: string | null
  updated_at: string | null
  prospect: {
    id: string
    contact_name: string
    company_name: string | null
    pipeline_stage: string
    conversion_status: string
  } | null
  actions: {
    can_export: boolean
  }
}

export interface TransactionSummaryRecord {
  transaction_count: number
  total_amount: number
  validated_amount: number
  paid_amount: number
  points_awarded_total: number
  linked_prospect_count: number
  status_breakdown: Record<TransactionStatus, number>
}

export interface TransactionListEnvelope {
  data: TransactionRecord[]
}

export interface TransactionDetailEnvelope {
  data: TransactionRecord
}

export interface TransactionSummaryEnvelope {
  data: TransactionSummaryRecord
}
