import { http } from './http'

export function checkVideoFileConsistency(params?: {
  prefix?: string
  limit?: number
}) {
  return http.get('/videos/upload/storage/file-consistency', { params })
}
