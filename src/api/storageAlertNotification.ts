import { http } from './http'

export function listStorageAlertNotifications(params?: {
  status?: string
  limit?: number
}) {
  return http.get('/videos/upload/storage/alert-notifications', { params })
}

export function syncStorageAlertNotifications(data?: {
  limit?: number
  level?: string
  targetUserId?: number
}) {
  return http.post('/videos/upload/storage/alert-notifications/sync', data || {})
}

export function retryStorageAlertNotification(id: number) {
  return http.post(`/videos/upload/storage/alert-notifications/${id}/retry`)
}
