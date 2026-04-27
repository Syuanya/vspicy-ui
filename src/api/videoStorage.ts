import { http } from './http'

export function scanVideoStorage(params?: {
  prefix?: string
  limit?: number
}) {
  return http.get('/videos/upload/storage/scan', { params })
}

export function cleanupVideoStorage(data?: {
  prefix?: string
  limit?: number
  dryRun?: boolean
}) {
  return http.post('/videos/upload/storage/cleanup', data || {})
}
