import { http } from './http'

export type AnnouncementQuery = {
  status?: string
  category?: string
  priority?: string
  pinned?: boolean
  onlyEffective?: boolean
  keyword?: string
  limit?: number
}

export type AnnouncementPayload = {
  title: string
  content: string
  category?: string
  priority?: string
  pinned?: boolean
  publishStartAt?: string
  publishEndAt?: string
  remark?: string
}

export function getAnnouncementOverview() {
  return http.get('/notifications/admin/announcements/overview')
}

export function listAnnouncementsAdmin(params?: AnnouncementQuery) {
  return http.get('/notifications/admin/announcements', { params })
}

export function getAnnouncement(id: number) {
  return http.get(`/notifications/admin/announcements/${id}`)
}

export function createAnnouncement(data: AnnouncementPayload) {
  return http.post('/notifications/admin/announcements', data)
}

export function updateAnnouncement(id: number, data: AnnouncementPayload) {
  return http.put(`/notifications/admin/announcements/${id}`, data)
}

export function publishAnnouncement(id: number, data?: { publishStartAt?: string; publishEndAt?: string; pinned?: boolean }) {
  return http.post(`/notifications/admin/announcements/${id}/publish`, data || {})
}

export function offlineAnnouncement(id: number) {
  return http.post(`/notifications/admin/announcements/${id}/offline`)
}

export function archiveAnnouncement(id: number) {
  return http.post(`/notifications/admin/announcements/${id}/archive`)
}

export function deleteAnnouncement(id: number) {
  return http.delete(`/notifications/admin/announcements/${id}`)
}
