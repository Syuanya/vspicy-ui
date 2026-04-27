import { http } from './http'

export function listUserSpaces(params?: {
  keyword?: string
  limit?: number
}) {
  return http.get('/videos/upload/space/users', { params })
}

export function listUserSpaceRecords(userId: number, limit = 100) {
  return http.get(`/videos/upload/space/users/${userId}/records`, {
    params: { limit }
  })
}

export function reconcileUserSpace(userId: number) {
  return http.post(`/videos/upload/space/users/${userId}/reconcile`)
}
