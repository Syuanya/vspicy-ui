import { http } from './http'

export function listAuditTasks(params?: {
  status?: string
  bizType?: string
  limit?: number
}) {
  return http.get('/audit/tasks', { params })
}

export function passAuditTask(taskId: number, reason = '') {
  return http.post(`/audit/tasks/${taskId}/pass`, {
    reviewerId: 1,
    reason
  })
}

export function rejectAuditTask(taskId: number, reason: string) {
  return http.post(`/audit/tasks/${taskId}/reject`, {
    reviewerId: 1,
    reason
  })
}
