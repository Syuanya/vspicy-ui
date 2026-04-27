import { http } from './http'

export function listStorageAlerts(params?: {
  status?: string
  level?: string
  limit?: number
}) {
  return http.get('/videos/upload/storage/alerts', { params })
}

export function generateStorageAlerts(data?: {
  prefix?: string
  limit?: number
  threshold?: number
  hlsLimit?: number
}) {
  return http.post('/videos/upload/storage/alerts/generate', data || {})
}

export function ackStorageAlert(id: number) {
  return http.post(`/videos/upload/storage/alerts/${id}/ack`)
}

export function resolveStorageAlert(id: number) {
  return http.post(`/videos/upload/storage/alerts/${id}/resolve`)
}
