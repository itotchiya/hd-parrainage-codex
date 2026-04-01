import { apiRequest } from '../../lib/api'
import type { NotificationEnvelope, NotificationListEnvelope } from '../../types/notifications'

export async function fetchNotifications() {
  return apiRequest<NotificationListEnvelope>('/v1/notifications')
}

export async function markNotificationRead(notificationId: string) {
  return apiRequest<NotificationEnvelope>(`/v1/notifications/${notificationId}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
}

export async function markAllNotificationsRead() {
  return apiRequest<{ data: { message: string } }>('/v1/notifications/read-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
}
