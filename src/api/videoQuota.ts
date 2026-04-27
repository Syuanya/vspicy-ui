import { http } from './http'

export function getVideoUploadQuota() {
  return http.get('/videos/upload/quota')
}

export function listVideoUploadQuotaRecords(limit = 50) {
  return http.get('/videos/upload/quota/records', {
    params: { limit }
  })
}

export function checkVideoUploadQuota(sizeMb: number) {
  return http.get('/videos/upload/quota/check', {
    params: { sizeMb }
  })
}

export function confirmVideoUploadQuota(data: {
  userId?: number
  videoId?: number
  fileName?: string
  sizeMb: number
}) {
  return http.post('/videos/upload/quota/confirm', data)
}

export function releaseVideoUploadQuota(data: {
  recordId?: number
  videoId?: number
  reason?: string
}) {
  return http.post('/videos/upload/quota/release', data)
}

export function previewVideoUploadQuotaReconcile(userId?: number) {
  return http.get('/videos/upload/quota/reconcile/preview', {
    params: userId ? { userId } : undefined
  })
}

export function reconcileVideoUploadQuota(userId?: number) {
  return http.post('/videos/upload/quota/reconcile', null, {
    params: userId ? { userId } : undefined
  })
}
