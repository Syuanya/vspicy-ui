import { http } from './http'

export type SystemReleaseStatus = 'DRAFT' | 'PLANNED' | 'RELEASING' | 'SUCCESS' | 'FAILED' | 'ROLLED_BACK' | 'CANCELLED'
export type SystemReleaseRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type SystemReleaseEnv = 'DEV' | 'TEST' | 'STAGING' | 'PROD'

export interface SystemReleaseMetricItem {
  name: string
  value: number
}

export interface SystemReleaseOverviewView {
  totalReleases: number
  plannedReleases: number
  releasingReleases: number
  successReleases: number
  failedReleases: number
  rolledBackReleases: number
  highRiskReleases: number
  todayReleases: number
  statusDistribution: SystemReleaseMetricItem[]
  environmentDistribution: SystemReleaseMetricItem[]
  riskDistribution: SystemReleaseMetricItem[]
}

export interface SystemReleaseCheckItemView {
  id: number
  releaseId: number
  checkName: string
  checkType: string
  status: 'PENDING' | 'PASS' | 'FAIL' | 'SKIPPED'
  resultNote?: string
  sortNo: number
  checkedBy?: number
  checkedAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface SystemReleaseView {
  id: number
  releaseNo: string
  versionName: string
  environment: SystemReleaseEnv
  status: SystemReleaseStatus
  riskLevel: SystemReleaseRisk
  title: string
  description?: string
  services?: string
  gitBranch?: string
  gitCommit?: string
  imageTag?: string
  releaseNote?: string
  operatorId?: number
  reviewerId?: number
  plannedAt?: string
  startedAt?: string
  finishedAt?: string
  rollbackAt?: string
  rollbackReason?: string
  statusNote?: string
  totalChecks: number
  passedChecks: number
  failedChecks: number
  createdAt?: string
  updatedAt?: string
  checks?: SystemReleaseCheckItemView[]
}

export interface SystemReleaseCommand {
  releaseNo?: string
  versionName?: string
  environment?: string
  status?: string
  riskLevel?: string
  title?: string
  description?: string
  services?: string
  gitBranch?: string
  gitCommit?: string
  imageTag?: string
  releaseNote?: string
  plannedAt?: string
  statusNote?: string
  rollbackReason?: string
  reviewerId?: number
}

export interface SystemReleaseCheckCommand {
  checkName?: string
  checkType?: string
  status?: string
  resultNote?: string
  sortNo?: number
}

export function getSystemReleaseOverview(days = 30) {
  return http.get<SystemReleaseOverviewView>('/admin/releases/overview', { params: { days } })
}

export function listSystemReleases(params: Record<string, any>) {
  return http.get<SystemReleaseView[]>('/admin/releases', { params })
}

export function getSystemRelease(id: number) {
  return http.get<SystemReleaseView>(`/admin/releases/${id}`)
}

export function createSystemRelease(data: SystemReleaseCommand) {
  return http.post<SystemReleaseView>('/admin/releases', data)
}

export function updateSystemRelease(id: number, data: SystemReleaseCommand) {
  return http.put<SystemReleaseView>(`/admin/releases/${id}`, data)
}

export function startSystemRelease(id: number, data?: SystemReleaseCommand) {
  return http.post<SystemReleaseView>(`/admin/releases/${id}/start`, data || {})
}

export function markSystemReleaseSuccess(id: number, data?: SystemReleaseCommand) {
  return http.post<SystemReleaseView>(`/admin/releases/${id}/success`, data || {})
}

export function markSystemReleaseFail(id: number, data?: SystemReleaseCommand) {
  return http.post<SystemReleaseView>(`/admin/releases/${id}/fail`, data || {})
}

export function rollbackSystemRelease(id: number, data?: SystemReleaseCommand) {
  return http.post<SystemReleaseView>(`/admin/releases/${id}/rollback`, data || {})
}

export function deleteSystemRelease(id: number) {
  return http.delete<void>(`/admin/releases/${id}`)
}

export function listSystemReleaseChecks(id: number) {
  return http.get<SystemReleaseCheckItemView[]>(`/admin/releases/${id}/checks`)
}

export function createSystemReleaseCheck(id: number, data: SystemReleaseCheckCommand) {
  return http.post<SystemReleaseCheckItemView>(`/admin/releases/${id}/checks`, data)
}

export function updateSystemReleaseCheck(checkId: number, data: SystemReleaseCheckCommand) {
  return http.put<SystemReleaseCheckItemView>(`/admin/releases/checks/${checkId}`, data)
}

export function passSystemReleaseCheck(checkId: number, data?: SystemReleaseCheckCommand) {
  return http.post<SystemReleaseCheckItemView>(`/admin/releases/checks/${checkId}/pass`, data || {})
}

export function failSystemReleaseCheck(checkId: number, data?: SystemReleaseCheckCommand) {
  return http.post<SystemReleaseCheckItemView>(`/admin/releases/checks/${checkId}/fail`, data || {})
}
