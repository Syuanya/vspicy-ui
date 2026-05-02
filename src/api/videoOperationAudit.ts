import { http } from './http'

export interface OperationAuditQuery {
  action?: string
  targetType?: string
  targetId?: string
  operatorId?: number
  requestIp?: string
  startTime?: string
  endTime?: string
  resultStatus?: 'ALL' | 'REJECTED' | 'DANGER' | 'SUCCESS' | string
  limit?: number
}

export function listOperationAudit(params?: {
  action?: string
  targetType?: string
  targetId?: string
  operatorId?: number
  requestIp?: string
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
  if (params?.targetId) search.set('targetId', params.targetId)
  if (params?.operatorId) search.set('operatorId', String(params.operatorId))
  if (params?.requestIp) search.set('requestIp', params.requestIp)
  if (params?.startTime) search.set('startTime', params.startTime)
  if (params?.endTime) search.set('endTime', params.endTime)
  if (params?.resultStatus) search.set('resultStatus', params.resultStatus)
  if (params?.limit) search.set('limit', String(params.limit))

  const suffix = search.toString()
  return `/api/videos/admin/operation-audit/export.csv${suffix ? `?${suffix}` : ''}`
}

export function getOperationAuditRiskSummary(params?: {
  hours?: number
  limit?: number
}) {
  return http.get('/videos/admin/operation-audit/risk-summary', { params })
}

export function getOperationAuditEvidence(id: number | string, params?: { limit?: number }) {
  return http.get(`/videos/admin/operation-audit/${id}/evidence`, { params })
}

export interface OperationAuditAlert {
  alertLevel: 'INFO' | 'WARNING' | 'DANGER' | 'CRITICAL' | 'SUCCESS' | string
  alertType: string
  message: string
  action?: string
  targetType?: string
  targetId?: string
  operatorId?: number
  operatorName?: string
  requestIp?: string
  count: number
  firstTime?: string
  lastTime?: string
  evidenceAuditIds?: number[]
  link?: string
}

export interface OperationAuditAlertSummary {
  generatedAt: string
  hours: number
  totalAlerts: number
  criticalCount: number
  dangerCount: number
  warningCount: number
  infoCount: number
  highestLevel: string
  recentAlerts: OperationAuditAlert[]
}

export function getOperationAuditAlerts(params?: {
  hours?: number
  limit?: number
}) {
  return http.get('/videos/admin/operation-audit/alerts', { params })
}

export function getOperationAuditAlertSummary(params?: {
  hours?: number
  limit?: number
}) {
  return http.get('/videos/admin/operation-audit/alerts/summary', { params })
}

export interface OperationAuditAlertEvent {
  id: number
  dedupKey: string
  alertType: string
  alertLevel: 'INFO' | 'WARNING' | 'DANGER' | 'CRITICAL' | 'SUCCESS' | string
  title: string
  message?: string
  action?: string
  targetType?: string
  targetId?: string
  operatorId?: number
  operatorName?: string
  requestIp?: string
  count: number
  evidenceAuditIds?: number[]
  link?: string
  status: 'OPEN' | 'ACKED' | 'RESOLVED' | string
  firstSeenAt?: string
  lastSeenAt?: string
  ackedAt?: string
  resolvedAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface OperationAuditAlertEventSummary {
  generatedAt: string
  openCount: number
  ackedCount: number
  resolvedCount: number
  criticalOpenCount: number
  dangerOpenCount: number
  warningOpenCount: number
  totalCount: number
  highestLevel: string
}

export function listOperationAuditAlertEvents(params?: {
  status?: 'OPEN' | 'ACKED' | 'RESOLVED' | 'ALL' | string
  level?: string
  alertType?: string
  limit?: number
}) {
  return http.get('/videos/admin/operation-audit/alert-events', { params })
}

export function getOperationAuditAlertEventSummary() {
  return http.get('/videos/admin/operation-audit/alert-events/summary')
}

export function syncOperationAuditAlertEvents(payload?: {
  hours?: number
  limit?: number
}) {
  return http.post('/videos/admin/operation-audit/alert-events/sync', payload || { hours: 24, limit: 100 })
}

export function ackOperationAuditAlertEvent(id: number) {
  return http.post(`/videos/admin/operation-audit/alert-events/${id}/ack`)
}

export function resolveOperationAuditAlertEvent(id: number) {
  return http.post(`/videos/admin/operation-audit/alert-events/${id}/resolve`)
}


export interface OperationAuditAlertEventAutomationStatus {
  generatedAt: string
  enabled: boolean
  running: boolean
  fixedDelayMs: number
  initialDelayMs: number
  hours: number
  limit: number
  lastRunAt?: string
  lastSuccessAt?: string
  lastErrorAt?: string
  lastErrorMessage?: string
  lastGeneratedCount?: number
  lastOpenCount?: number
  lastAckedCount?: number
  lastResolvedCount?: number
  lastMessage?: string
}

export interface OperationAuditAlertEventCleanupResult {
  retentionDays: number
  limit: number
  dryRun: boolean
  candidateCount: number
  deletedCount: number
  message: string
}

export function getOperationAuditAlertEventAutomationStatus() {
  return http.get('/videos/admin/operation-audit/alert-events/automation/status')
}

export function syncOperationAuditAlertEventsOnce(payload?: {
  hours?: number
  limit?: number
}) {
  return http.post('/videos/admin/operation-audit/alert-events/automation/sync-once', payload || { hours: 24, limit: 100 })
}

export function cleanupResolvedOperationAuditAlertEvents(payload?: {
  retentionDays?: number
  limit?: number
  dryRun?: boolean
}) {
  return http.post('/videos/admin/operation-audit/alert-events/automation/cleanup-resolved', payload || {
    retentionDays: 30,
    limit: 500,
    dryRun: true
  })
}
