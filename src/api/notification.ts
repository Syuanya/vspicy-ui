import { http } from './http'

export function publishSystemNotification(data: {
  title: string
  content: string
  notificationType?: string
  bizType?: string
  bizId?: number
  priority?: string
  receiverUserIds?: number[]
}) {
  return http.post('/notifications/system', data)
}

export function publishTranscodeEvent(data: {
  receiverUserId: number
  bizId?: number
  title?: string
  result?: string
  reason?: string
  priority?: string
}) {
  return http.post('/notifications/events/transcode', data)
}

export function publishAuditEvent(data: {
  receiverUserId: number
  bizId?: number
  title?: string
  result?: string
  reason?: string
  priority?: string
}) {
  return http.post('/notifications/events/audit', data)
}

export function publishInteractionEvent(data: {
  receiverUserId: number
  bizId?: number
  title?: string
  content?: string
  actorName?: string
  priority?: string
}) {
  return http.post('/notifications/events/interaction', data)
}

export function publishSecurityEvent(data: {
  receiverUserId: number
  bizId?: number
  title?: string
  content?: string
  reason?: string
  priority?: string
}) {
  return http.post('/notifications/events/security', data)
}

export function publishAsyncTranscodeEvent(data: {
  receiverUserId: number
  bizId?: number
  title?: string
  result?: string
  reason?: string
  priority?: string
}) {
  return http.post('/notifications/events/async/transcode', data)
}

export function publishAsyncAuditEvent(data: {
  receiverUserId: number
  bizId?: number
  title?: string
  result?: string
  reason?: string
  priority?: string
}) {
  return http.post('/notifications/events/async/audit', data)
}

export function publishAsyncInteractionEvent(data: {
  receiverUserId: number
  bizId?: number
  title?: string
  content?: string
  actorName?: string
  priority?: string
}) {
  return http.post('/notifications/events/async/interaction', data)
}

export function listNotificationPreferences() {
  return http.get('/notifications/preferences')
}

export function saveNotificationPreferences(data: {
  preferences: Array<{
    notificationType: string
    notificationName?: string
    enabled: boolean
    forced?: boolean
  }>
}) {
  return http.put('/notifications/preferences', data)
}

export function listNotificationEventLogs(params?: {
  status?: string
  eventType?: string
  receiverUserId?: number
  limit?: number
}) {
  return http.get('/notifications/event-logs', { params })
}

export function retryNotificationEvent(eventId: string) {
  return http.post(`/notifications/event-logs/${eventId}/retry`)
}

export function listNotifications(params?: {
  readStatus?: number
  limit?: number
}) {
  return http.get('/notifications/inbox', { params })
}

export function unreadNotificationCount() {
  return http.get('/notifications/unread-count')
}

export function markNotificationRead(inboxId: number) {
  return http.post(`/notifications/inbox/${inboxId}/read`)
}

export function markNotificationsRead(inboxIds: number[]) {
  return http.post('/notifications/inbox/read-batch', { inboxIds })
}

export function markAllNotificationsRead() {
  return http.post('/notifications/inbox/read-all')
}

export function deleteNotification(inboxId: number) {
  return http.delete(`/notifications/inbox/${inboxId}`)
}

export function deleteNotifications(inboxIds: number[]) {
  return http.post('/notifications/inbox/delete-batch', { inboxIds })
}

export function clearReadNotifications() {
  return http.post('/notifications/inbox/clear-read')
}

export function listAnnouncements(limit = 20) {
  return http.get('/notifications/announcements', {
    params: { limit }
  })
}

export interface NotificationTemplatePayload {
  templateCode: string
  templateName: string
  titleTemplate: string
  contentTemplate: string
  notificationType?: string
  bizType?: string
  priority?: string
  enabled?: boolean
  remark?: string
}

export interface NotificationTemplatePublishPayload {
  receiverUserIds?: number[]
  variables?: Record<string, string>
  bizId?: number
  bizType?: string
  priority?: string
}

export interface NotificationTemplateValidationResult {
  valid: boolean
  requiredVariables: string[]
  missingVariables: string[]
  extraVariables: string[]
}

export interface NotificationTemplatePublishCheckResult {
  templateId: number
  templateCode: string
  templateName: string
  receiverMode: 'ALL' | 'SPECIFIED'
  receiverCount: number
  title: string
  content: string
  notificationType: string
  bizType?: string
  priority: string
  validation: NotificationTemplateValidationResult
}

export interface NotificationTemplateCopyPayload {
  templateCode?: string
  templateName?: string
  enabled?: boolean
}

export function listNotificationTemplates(params?: {
  keyword?: string
  enabled?: boolean
  limit?: number
}) {
  return http.get('/notifications/templates', { params })
}

export function createNotificationTemplate(data: NotificationTemplatePayload) {
  return http.post('/notifications/templates', data)
}

export function updateNotificationTemplate(id: number, data: NotificationTemplatePayload) {
  return http.put(`/notifications/templates/${id}`, data)
}

export function deleteNotificationTemplate(id: number) {
  return http.delete(`/notifications/templates/${id}`)
}

export function copyNotificationTemplate(id: number, data?: NotificationTemplateCopyPayload) {
  return http.post(`/notifications/templates/${id}/copy`, data || {})
}

export function validateNotificationTemplate(id: number, data: NotificationTemplatePublishPayload) {
  return http.post(`/notifications/templates/${id}/validate`, data)
}

export function previewNotificationTemplate(id: number, data: NotificationTemplatePublishPayload) {
  return http.post(`/notifications/templates/${id}/preview`, data)
}

export function checkNotificationTemplatePublish(id: number, data: NotificationTemplatePublishPayload) {
  return http.post(`/notifications/templates/${id}/publish-check`, data)
}

export function publishNotificationTemplate(id: number, data: NotificationTemplatePublishPayload) {
  return http.post(`/notifications/templates/${id}/publish`, data)
}

export function getNotificationOverview(params?: { days?: number }) {
  return http.get('/notifications/admin/overview', { params })
}

export interface NotificationTemplatePublishLogItem {
  id: number
  templateId?: number
  templateCode?: string
  templateName?: string
  messageId?: number
  title: string
  content: string
  notificationType: string
  bizType?: string
  bizId?: number
  priority: string
  receiverMode: 'ALL' | 'SPECIFIED'
  receiverCount: number
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  errorMessage?: string
  variablesJson?: string
  receiverUserIdsJson?: string
  operatorId?: number
  createdAt: string
  updatedAt: string
}

export function listNotificationTemplatePublishLogs(params?: {
  templateId?: number
  status?: string
  limit?: number
}) {
  return http.get('/notifications/templates/publish-logs', { params })
}

export function getNotificationTemplatePublishLog(logId: number) {
  return http.get(`/notifications/templates/publish-logs/${logId}`)
}

export function retryNotificationTemplatePublishLog(logId: number) {
  return http.post(`/notifications/templates/publish-logs/${logId}/retry`)
}

export interface NotificationAdminInboxItem {
  inboxId: number
  messageId: number
  userId: number
  username?: string
  nickname?: string
  title: string
  content: string
  notificationType: string
  bizType?: string
  bizId?: number
  priority: string
  publishScope: string
  messageStatus: string
  readStatus: number
  readAt?: string
  deleted: number
  deliveredAt: string
  senderId?: number
  messageCreatedAt: string
}

export interface NotificationAdminInboxSummary {
  userId: number
  username?: string
  nickname?: string
  totalDeliveries: number
  unreadDeliveries: number
  readDeliveries: number
  deletedDeliveries: number
  highPriorityDeliveries: number
  latestDeliveredAt?: string
}

export function listNotificationAdminInbox(params?: {
  userId?: number
  readStatus?: number
  deleted?: number
  notificationType?: string
  keyword?: string
  limit?: number
}) {
  return http.get('/notifications/admin/inbox', { params })
}

export function getNotificationAdminInboxDetail(inboxId: number) {
  return http.get(`/notifications/admin/inbox/${inboxId}`)
}

export function getNotificationAdminInboxSummary(userId: number) {
  return http.get(`/notifications/admin/users/${userId}/inbox-summary`)
}
