import { http } from './http'

export type SupportTicketQuery = {
  status?: string
  category?: string
  priority?: string
  assigneeId?: number
  keyword?: string
  limit?: number
}

export type SupportTicketPayload = {
  title: string
  content: string
  category?: string
  priority?: string
  submitterId?: number
  submitterName?: string
  contact?: string
  assigneeId?: number
  assigneeName?: string
  tags?: string
  source?: string
  remark?: string
}

export function getSupportTicketOverview() {
  return http.get('/admin/support-tickets/overview')
}

export function listSupportTickets(params?: SupportTicketQuery) {
  return http.get('/admin/support-tickets', { params })
}

export function getSupportTicket(id: number) {
  return http.get(`/admin/support-tickets/${id}`)
}

export function createSupportTicket(data: SupportTicketPayload) {
  return http.post('/admin/support-tickets', data)
}

export function updateSupportTicket(id: number, data: SupportTicketPayload) {
  return http.put(`/admin/support-tickets/${id}`, data)
}

export function assignSupportTicket(id: number, data: { assigneeId: number; assigneeName?: string; remark?: string }) {
  return http.post(`/admin/support-tickets/${id}/assign`, data)
}

export function replySupportTicket(id: number, data: { content: string; replyType?: string; visibleToUser?: boolean }) {
  return http.post(`/admin/support-tickets/${id}/reply`, data)
}

export function resolveSupportTicket(id: number) {
  return http.post(`/admin/support-tickets/${id}/resolve`)
}

export function closeSupportTicket(id: number) {
  return http.post(`/admin/support-tickets/${id}/close`)
}

export function reopenSupportTicket(id: number) {
  return http.post(`/admin/support-tickets/${id}/reopen`)
}

export function deleteSupportTicket(id: number) {
  return http.delete(`/admin/support-tickets/${id}`)
}
