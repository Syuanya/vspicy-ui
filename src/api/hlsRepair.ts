import { http } from './http'

export function listHlsRepairTasks(params?: {
  status?: string
  limit?: number
}) {
  return http.get('/videos/upload/storage/hls-repair/tasks', { params })
}

export function generateHlsRepairTasks(data?: {
  prefix?: string
  limit?: number
}) {
  return http.post('/videos/upload/storage/hls-repair/generate', data || {})
}

export function generateHlsRepairTasksFromAlerts(data?: {
  limit?: number
}) {
  return http.post('/videos/upload/storage/hls-repair/generate-from-alerts', data || {})
}

export function previewHlsRepairDispatch(limit = 10) {
  return http.get('/videos/upload/storage/hls-repair/dispatch/preview', {
    params: { limit }
  })
}

export function dispatchHlsRepairTasks(data?: {
  limit?: number
  dryRun?: boolean
}) {
  return http.post('/videos/upload/storage/hls-repair/dispatch', data || {})
}

export function previewHlsRepairExecute(limit = 10) {
  return http.get('/videos/upload/storage/hls-repair/execute/preview', {
    params: { limit }
  })
}

export function executeHlsRepairTasks(data?: {
  limit?: number
  dryRun?: boolean
  allowPending?: boolean
}) {
  return http.post('/videos/upload/storage/hls-repair/execute', data || {})
}

export function executeHlsRepairTask(id: number, data?: {
  dryRun?: boolean
  allowPending?: boolean
}) {
  return http.post(`/videos/upload/storage/hls-repair/execute/${id}`, data || {})
}

export function previewHlsRepairVerify(limit = 10) {
  return http.get('/videos/upload/storage/hls-repair/verify/preview', {
    params: { limit }
  })
}

export function verifyHlsRepairTasks(data?: {
  limit?: number
  dryRun?: boolean
  markFailedOnError?: boolean
}) {
  return http.post('/videos/upload/storage/hls-repair/verify', data || {})
}

export function verifyHlsRepairTask(id: number, data?: {
  dryRun?: boolean
  markFailedOnError?: boolean
}) {
  return http.post(`/videos/upload/storage/hls-repair/verify/${id}`, data || {})
}

export function retryHlsRepairTask(id: number) {
  return http.post(`/videos/upload/storage/hls-repair/tasks/${id}/retry`)
}

export function cancelHlsRepairTask(id: number) {
  return http.post(`/videos/upload/storage/hls-repair/tasks/${id}/cancel`)
}

export function successHlsRepairTask(id: number) {
  return http.post(`/videos/upload/storage/hls-repair/tasks/${id}/success`)
}

export function failHlsRepairTask(id: number, errorMessage = '手动标记失败') {
  return http.post(`/videos/upload/storage/hls-repair/tasks/${id}/fail`, {
    errorMessage
  })
}
