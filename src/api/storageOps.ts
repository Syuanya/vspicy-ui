import { http } from './http'

export function getStorageOpsConsole(params?: {
  prefix?: string
  limit?: number
  threshold?: number
}) {
  return http.get('/videos/upload/storage/ops/console', { params })
}
