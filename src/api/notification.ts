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

export function listNotificationPreferences(userId?: number) {
  return http.get('/notifications/preferences', {
    params: userId ? { userId } : undefined
  })
}

export function saveNotificationPreferences(data: {
  userId?: number
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
  userId?: number
  readStatus?: number
  limit?: number
}) {
  return http.get('/notifications/inbox', { params })
}

export function unreadNotificationCount(userId?: number) {
  return http.get('/notifications/unread-count', {
    params: userId ? { userId } : undefined
  })
}

export function markNotificationRead(inboxId: number, userId?: number) {
  return http.post(`/notifications/inbox/${inboxId}/read`, null, {
    params: userId ? { userId } : undefined
  })
}

export function markAllNotificationsRead(userId?: number) {
  return http.post('/notifications/inbox/read-all', null, {
    params: userId ? { userId } : undefined
  })
}

export function deleteNotification(inboxId: number, userId?: number) {
  return http.delete(`/notifications/inbox/${inboxId}`, {
    params: userId ? { userId } : undefined
  })
}

export function listAnnouncements(limit = 20) {
  return http.get('/notifications/announcements', {
    params: { limit }
  })
}
