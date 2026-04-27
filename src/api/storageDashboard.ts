import { http } from './http'

export function getStorageDashboard(params?: {
  prefix?: string
  limit?: number
  threshold?: number
}) {
  return http.get('/videos/upload/storage/dashboard', { params })
}
