import { http } from './http'

export function scanHlsIntegrity(params?: {
  prefix?: string
  limit?: number
}) {
  return http.get('/videos/upload/storage/hls-integrity', { params })
}

export function checkHlsObject(objectKey: string) {
  return http.get('/videos/upload/storage/hls-integrity/object', {
    params: { objectKey }
  })
}
