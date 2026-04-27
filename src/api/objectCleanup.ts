import { http } from './http'

export function listObjectCleanupRequests(params?: {
  status?: string
  limit?: number
}) {
  return http.get('/videos/upload/storage/cleanup-requests', { params })
}

export function generateObjectCleanupRequests(data?: {
  prefix?: string
  limit?: number
}) {
  return http.post('/videos/upload/storage/cleanup-requests/generate', data || {})
}

export function approveObjectCleanupRequest(id: number) {
  return http.post(`/videos/upload/storage/cleanup-requests/${id}/approve`)
}

export function rejectObjectCleanupRequest(id: number) {
  return http.post(`/videos/upload/storage/cleanup-requests/${id}/reject`)
}

export function executeObjectCleanupRequest(id: number, data?: {
  dryRun?: boolean
}) {
  return http.post(`/videos/upload/storage/cleanup-requests/${id}/execute`, data || {})
}

export function executeApprovedObjectCleanupRequests(data?: {
  limit?: number
  dryRun?: boolean
}) {
  return http.post('/videos/upload/storage/cleanup-requests/execute-approved', data || {})
}
