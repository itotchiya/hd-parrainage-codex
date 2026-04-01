export interface AppNotificationRecord {
  id: string
  recipient_user_id: string
  business_id: string | null
  notification_type: string
  title: string
  message: string
  severity: string
  metadata: Record<string, unknown> | null
  read_at: string | null
  created_at: string | null
}

export interface NotificationListEnvelope {
  data: AppNotificationRecord[]
  meta: {
    unread_count: number
  }
}

export interface NotificationEnvelope {
  data: AppNotificationRecord
}
