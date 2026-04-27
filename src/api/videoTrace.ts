import { http } from './http'

export function listVideoUploadTraces(params?: {
  keyword?: string
  limit?: number
}) {
  return http.get('/videos/upload/traces', { params })
}

export function getVideoUploadTracesByVideo(videoId: number) {
  return http.get(`/videos/upload/traces/by-video/${videoId}`)
}

export function getVideoUploadTracesByRecord(recordId: number) {
  return http.get(`/videos/upload/traces/by-record/${recordId}`)
}

export function getVideoUploadTracesByTask(uploadTaskId: string) {
  return http.get(`/videos/upload/traces/by-task/${uploadTaskId}`)
}

export function linkVideoUploadTrace(data: {
  userId?: number
  recordId?: number
  videoId?: number
  uploadTaskId?: string
  bucket?: string
  objectKey?: string
  fileName?: string
  sizeMb?: number
  source?: string
  remark?: string
}) {
  return http.post('/videos/upload/traces/link', data)
}
