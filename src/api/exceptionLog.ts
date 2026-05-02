import { http } from './http'

export type ExceptionLogQuery = {
  serviceName?: string
  severity?: string
  status?: string
  keyword?: string
  startTime?: string
  endTime?: string
  limit?: number
}

export function getExceptionLogOverview(days = 7) {
  return http.get('/admin/exception-logs/overview', { params: { days } })
}

export function listExceptionLogs(params?: ExceptionLogQuery) {
  return http.get('/admin/exception-logs', { params })
}

export function getExceptionLog(id: number) {
  return http.get(`/admin/exception-logs/${id}`)
}

export function resolveExceptionLog(id: number, resolutionNote?: string) {
  return http.post(`/admin/exception-logs/${id}/resolve`, { resolutionNote })
}

export function ignoreExceptionLog(id: number, resolutionNote?: string) {
  return http.post(`/admin/exception-logs/${id}/ignore`, { resolutionNote })
}

export function reopenExceptionLog(id: number) {
  return http.post(`/admin/exception-logs/${id}/reopen`)
}

export function deleteExceptionLog(id: number) {
  return http.delete(`/admin/exception-logs/${id}`)
}

export function cleanupExceptionLogs(data: { retentionDays: number; dryRun: boolean }) {
  return http.post('/admin/exception-logs/cleanup', data)
}
