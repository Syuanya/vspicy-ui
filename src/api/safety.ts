import { http } from './http'

export function listSensitiveWords(params?: {
  category?: string
  status?: number
  limit?: number
}) {
  return http.get('/audit/sensitive-words', { params })
}

export function createSensitiveWord(data: {
  word: string
  category: string
  riskLevel: string
}) {
  return http.post('/audit/sensitive-words', data)
}

export function enableSensitiveWord(id: number) {
  return http.post(`/audit/sensitive-words/${id}/enable`)
}

export function disableSensitiveWord(id: number) {
  return http.post(`/audit/sensitive-words/${id}/disable`)
}

export function listModerationRecords(params?: {
  bizType?: string
  result?: string
  userId?: number
  limit?: number
}) {
  return http.get('/audit/moderation-records', { params })
}
