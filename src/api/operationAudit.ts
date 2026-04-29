import { http } from './http'

export interface OperationAuditQuery {
  action?: string
  targetType?: string
  operatorId?: number
  startTime?: string
  endTime?: string
  limit?: number
}

export function listOperationAudit(params?: {
  action?: string
  targetType?: string
  operatorId?: number
  limit?: number
}) {
  return http.get('/videos/admin/operation-audit/list', { params })
}

export function listOperationAuditAdvanced(params?: OperationAuditQuery) {
  return http.get('/videos/admin/operation-audit/list-advanced', { params })
}

export function getOperationAuditActions() {
  return http.get('/videos/admin/operation-audit/actions')
}

export function getRecentOperationAudit(limit = 10) {
  return http.get('/videos/admin/operation-audit/recent', { params: { limit } })
}

export function getOperationAuditStats() {
  return http.get('/videos/admin/operation-audit/stats')
}

export function recordOperationAudit(payload: {
  action: string
  targetType?: string
  targetId?: string
  operatorId?: number
  operatorName?: string
  description?: string
  detailJson?: string
}) {
  return http.post('/videos/admin/operation-audit/record', payload)
}

export function buildOperationAuditExportUrl(params?: OperationAuditQuery) {
  const search = new URLSearchParams()
  if (params?.action) search.set('action', params.action)
  if (params?.targetType) search.set('targetType', params.targetType)
  if (params?.operatorId) search.set('operatorId', String(params.operatorId))
  if (params?.startTime) search.set('startTime', params.startTime)
  if (params?.endTime) search.set('endTime', params.endTime)
  if (params?.limit) search.set('limit', String(params.limit))

  const suffix = search.toString()
  return `/api/videos/admin/operation-audit/export.csv${suffix ? `?${suffix}` : ''}`
}
