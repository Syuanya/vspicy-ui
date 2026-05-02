import { http } from './http'

export type OperationAuditQuery = {
  serviceName?: string
  actionType?: string
  riskLevel?: string
  handleStatus?: string
  success?: boolean
  operatorId?: number
  keyword?: string
  limit?: number
}

export type OperationAuditPayload = {
  traceId?: string
  serviceName?: string
  moduleName?: string
  actionType?: string
  operationName: string
  requestMethod?: string
  requestUri?: string
  requestParams?: string
  requestBody?: string
  responseStatus?: number
  success?: boolean
  errorMessage?: string
  riskLevel?: string
  operatorId?: number
  operatorName?: string
  operatorIp?: string
  userAgent?: string
  costMs?: number
}

export function getOperationAuditOverview() {
  return http.get('/admin/operation-audit-logs/overview')
}

export function listOperationAuditLogs(params?: OperationAuditQuery) {
  return http.get('/admin/operation-audit-logs', { params })
}

export function getOperationAuditLog(id: number) {
  return http.get(`/admin/operation-audit-logs/${id}`)
}

export function createOperationAuditLog(data: OperationAuditPayload) {
  return http.post('/admin/operation-audit-logs', data)
}

export function reviewOperationAuditLog(id: number, handleRemark?: string) {
  return http.post(`/admin/operation-audit-logs/${id}/review`, { handleRemark })
}

export function ignoreOperationAuditLog(id: number, handleRemark?: string) {
  return http.post(`/admin/operation-audit-logs/${id}/ignore`, { handleRemark })
}

export function reopenOperationAuditLog(id: number) {
  return http.post(`/admin/operation-audit-logs/${id}/reopen`)
}

export function deleteOperationAuditLog(id: number) {
  return http.delete(`/admin/operation-audit-logs/${id}`)
}

export function previewOperationAuditCleanup(params: { beforeDays?: number; onlyHandled?: boolean }) {
  return http.get('/admin/operation-audit-logs/cleanup-preview', { params })
}

export function cleanupOperationAuditLogs(data: { beforeDays?: number; onlyHandled?: boolean }) {
  return http.post('/admin/operation-audit-logs/cleanup', data)
}
