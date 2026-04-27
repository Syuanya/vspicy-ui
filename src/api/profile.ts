import { http } from './http'

export function rebuildUserProfile(userId: number) {
  return http.post(`/profiles/users/${userId}/rebuild`)
}

export function getUserInterests(userId: number, limit = 30) {
  return http.get(`/profiles/users/${userId}/interests`, {
    params: { limit }
  })
}

export function bindContentTags(data: {
  contentId: number
  contentType: string
  tagNames: string[]
}) {
  return http.post('/profiles/content-tags', data)
}

export function getContentProfile(targetType: string, targetId: number) {
  return http.get(`/profiles/content/${targetType}/${targetId}`)
}

export function getHotTags(limit = 30) {
  return http.get('/profiles/hot-tags', {
    params: { limit }
  })
}
