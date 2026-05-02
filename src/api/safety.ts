import { http } from './http'

export function getSensitiveWordOverview() {
  return http.get('/audit/sensitive-words/overview')
}

export function listSensitiveWords(params?: {
  category?: string
  riskLevel?: string
  status?: number
  keyword?: string
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

export function updateSensitiveWord(id: number, data: {
  word: string
  category: string
  riskLevel: string
}) {
  return http.put(`/audit/sensitive-words/${id}`, data)
}

export function enableSensitiveWord(id: number) {
  return http.post(`/audit/sensitive-words/${id}/enable`)
}

export function disableSensitiveWord(id: number) {
  return http.post(`/audit/sensitive-words/${id}/disable`)
}

export function deleteSensitiveWord(id: number) {
  return http.delete(`/audit/sensitive-words/${id}`)
}

export function testSensitiveWordText(text: string) {
  return http.post('/audit/sensitive-words/test', { text })
}

export function listModerationRecords(params?: {
  bizType?: string
  result?: string
  userId?: number
  limit?: number
}) {
  return http.get('/audit/moderation-records', { params })
}
