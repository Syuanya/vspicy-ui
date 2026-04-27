import { http } from './http'

export function getRecommendFeed(params?: {
  userId?: number
  limit?: number
}) {
  return http.get('/recommend/feed', { params })
}

export function getHotRecommend(params?: {
  targetType?: string
  limit?: number
}) {
  return http.get('/recommend/hot', { params })
}

export function getPersonalizedRecommend(params?: {
  userId?: number
  limit?: number
}) {
  return http.get('/recommend/personalized', { params })
}

export function getSimilarRecommend(params: {
  targetId: number
  targetType: string
  limit?: number
}) {
  return http.get('/recommend/similar', { params })
}

export function getRecommendDebug(userId: number) {
  return http.get(`/recommend/debug/users/${userId}`)
}

export function getRecommendCacheStats() {
  return http.get('/recommend/cache/stats')
}

export function clearRecommendCache() {
  return http.delete('/recommend/cache')
}

export function recordRecommendExposure(data: {
  userId?: number
  targetId: number
  targetType: string
  scene?: string
  rankNo?: number
  score?: number
  requestId?: string
}) {
  return http.post('/recommend/exposures', data)
}

export function recordRecommendFeedback(data: {
  userId?: number
  targetId: number
  targetType: string
  scene?: string
  feedbackType: string
  requestId?: string
}) {
  return http.post('/recommend/feedback', data)
}
