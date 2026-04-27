import { http } from './http'

export function listTranscodeTasks(params?: {
  status?: string
  videoId?: number
  limit?: number
}) {
  return http.get('/videos/transcode-tasks', { params })
}

export function getTranscodeTask(taskId: number) {
  return http.get(`/videos/transcode-tasks/${taskId}`)
}

export function retryTranscodeTask(taskId: number) {
  return http.post(`/videos/transcode-tasks/${taskId}/retry`)
}

export function retryTranscodeByVideoId(videoId: number) {
  return http.post(`/videos/${videoId}/retry-transcode`)
}

export function compensateTranscodeTasks() {
  return http.post('/videos/transcode-tasks/compensate')
}
