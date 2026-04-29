import { http } from './http'

export function getTranscodeDispatchHealth() {
  return http.get('/videos/transcode/dispatch/health')
}

export function dispatchTranscodeTask(taskId: number) {
  return http.post(`/videos/transcode/dispatch/${taskId}`)
}

export function dispatchTranscodeTaskLocal(taskId: number) {
  return http.post(`/videos/transcode/dispatch/${taskId}/local`)
}

export function getTranscodeStateStats() {
  return http.get('/videos/transcode/state/stats')
}

export function listTranscodeStateTasks(params?: {
  status?: string
  limit?: number
}) {
  return http.get('/videos/transcode/state/tasks', { params })
}

export function retryTranscodeTask(taskId: number, reason = 'manual retry') {
  return http.post(`/videos/transcode/state/${taskId}/retry`, { reason })
}

export function rerunTranscodeTask(taskId: number, reason = 'manual rerun') {
  return http.post(`/videos/transcode/state/${taskId}/rerun`, { reason })
}

export function cancelTranscodeTask(taskId: number, reason = 'manual cancel') {
  return http.post(`/videos/transcode/state/${taskId}/cancel`, { reason })
}

export function resetTranscodeTask(taskId: number, reason = 'manual reset') {
  return http.post(`/videos/transcode/state/${taskId}/reset`, { reason })
}

export function successTranscodeTask(taskId: number, reason = 'manual success') {
  return http.post(`/videos/transcode/state/${taskId}/success`, { reason })
}

export function failTranscodeTask(taskId: number, reason = 'manual fail') {
  return http.post(`/videos/transcode/state/${taskId}/fail`, { reason })
}
