import { http } from './http'

export function createComment(data: {
  contentId: number
  contentType: string
  parentId?: number
  userId?: number
  replyToUserId?: number
  content: string
}) {
  return http.post('/interactions/comments', data)
}

export function listComments(params: {
  contentId: number
  contentType: string
  parentId?: number
  limit?: number
}) {
  return http.get('/interactions/comments', { params })
}

export function toggleLike(data: {
  userId?: number
  targetId: number
  targetType: string
}) {
  return http.post('/interactions/likes/toggle', data)
}

export function toggleFavorite(data: {
  userId?: number
  targetId: number
  targetType: string
}) {
  return http.post('/interactions/favorites/toggle', data)
}

export function getInteractionStatus(params: {
  userId?: number
  targetId: number
  targetType: string
}) {
  return http.get('/interactions/likes/status', { params })
}

export function recordBehavior(data: {
  userId?: number
  targetId: number
  targetType: string
  actionType: string
  durationSeconds?: number
  extraJson?: string
}) {
  return http.post('/interactions/behaviors', data)
}

export function getHotContent(params?: {
  targetType?: string
  limit?: number
}) {
  return http.get('/interactions/analytics/hot-content', { params })
}
