import { http } from './http'

export interface ArticleSaveRequest {
  userId?: number
  title: string
  summary?: string
  coverUrl?: string
  content: string
}

export function createArticleDraft(data: ArticleSaveRequest) {
  return http.post('/articles/drafts', data)
}

export function updateArticle(articleId: number, data: ArticleSaveRequest) {
  return http.put(`/articles/${articleId}`, data)
}

export function submitArticle(articleId: number) {
  return http.post(`/articles/${articleId}/submit`)
}

export function getArticle(articleId: number) {
  return http.get(`/articles/${articleId}`)
}

export function listArticles(params?: {
  status?: string
  userId?: number
  limit?: number
}) {
  return http.get('/articles', { params })
}
