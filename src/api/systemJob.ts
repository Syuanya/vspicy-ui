import { http } from './http'

export type SysJobView = {
  id: number
  jobCode: string
  jobName: string
  jobGroup: string
  jobType: string
  cronExpression: string
  invokeTarget?: string
  jobParams?: string
  description?: string
  status: number
  allowConcurrent: boolean
  misfirePolicy: number
  runCount: number
  failCount: number
  lastRunAt?: string
  nextRunAt?: string
  lastRunStatus?: string
  lastError?: string
  editable: boolean
  createdAt?: string
  updatedAt?: string
}

export type SysJobLogView = {
  id: number
  jobId: number
  jobCode: string
  jobName: string
  jobGroup: string
  triggerType: string
  runStatus: string
  runMessage?: string
  errorMessage?: string
  costMs?: number
  operatorId?: string
  operatorName?: string
  startedAt?: string
  finishedAt?: string
  createdAt?: string
}

export type SysJobMetricItem = {
  name: string
  value: number
}

export type SysJobOverviewView = {
  totalJobs: number
  enabledJobs: number
  disabledJobs: number
  totalRuns: number
  failedRuns: number
  todayRuns: number
  todayFailedRuns: number
  successRate: number
  groupStats: SysJobMetricItem[]
  statusStats: SysJobMetricItem[]
  recentRunStats: SysJobMetricItem[]
}

export type SysJobCommand = {
  jobCode?: string
  jobName?: string
  jobGroup?: string
  jobType?: string
  cronExpression?: string
  invokeTarget?: string
  jobParams?: string
  description?: string
  status?: number
  allowConcurrent?: boolean
  misfirePolicy?: number
  editable?: boolean
}

export function getSysJobOverview() {
  return http.get('/admin/jobs/overview')
}

export function listSysJobs(params?: {
  group?: string
  status?: number
  keyword?: string
  limit?: number
}) {
  return http.get('/admin/jobs', { params })
}

export function getSysJob(id: number) {
  return http.get(`/admin/jobs/${id}`)
}

export function createSysJob(data: SysJobCommand) {
  return http.post('/admin/jobs', data)
}

export function updateSysJob(id: number, data: SysJobCommand) {
  return http.put(`/admin/jobs/${id}`, data)
}

export function enableSysJob(id: number) {
  return http.post(`/admin/jobs/${id}/enable`)
}

export function disableSysJob(id: number) {
  return http.post(`/admin/jobs/${id}/disable`)
}

export function deleteSysJob(id: number) {
  return http.delete(`/admin/jobs/${id}`)
}

export function runSysJob(id: number) {
  return http.post(`/admin/jobs/${id}/run`)
}

export function listSysJobLogs(params?: {
  jobId?: number
  status?: string
  limit?: number
}) {
  return http.get('/admin/jobs/logs', { params })
}
