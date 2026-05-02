import { http } from './http'

export type SystemConfigQuery = {
  category?: string
  valueType?: string
  status?: string
  editable?: boolean
  sensitive?: boolean
  keyword?: string
  includeSensitive?: boolean
  limit?: number
}

export type SystemConfigPayload = {
  configKey?: string
  configName?: string
  configValue?: string
  defaultValue?: string
  category?: string
  valueType?: string
  editable?: boolean
  sensitive?: boolean
  required?: boolean
  validationRule?: string
  description?: string
  status?: string
  changeReason?: string
}

export type SystemConfigBatchUpdatePayload = {
  items: Array<{ configKey: string; configValue: string }>
  changeReason?: string
}

export function getSystemConfigOverview() {
  return http.get('/admin/system-configs/overview')
}

export function listSystemConfigs(params?: SystemConfigQuery) {
  return http.get('/admin/system-configs', { params })
}

export function getSystemConfig(id: number, includeSensitive = false) {
  return http.get(`/admin/system-configs/${id}`, { params: { includeSensitive } })
}

export function getSystemConfigByKey(configKey: string, includeSensitive = false) {
  return http.get(`/admin/system-configs/key/${encodeURIComponent(configKey)}`, { params: { includeSensitive } })
}

export function createSystemConfig(data: SystemConfigPayload) {
  return http.post('/admin/system-configs', data)
}

export function updateSystemConfig(id: number, data: SystemConfigPayload) {
  return http.put(`/admin/system-configs/${id}`, data)
}

export function batchUpdateSystemConfigs(data: SystemConfigBatchUpdatePayload) {
  return http.post('/admin/system-configs/batch-update', data)
}

export function enableSystemConfig(id: number, changeReason?: string) {
  return http.post(`/admin/system-configs/${id}/enable`, { changeReason })
}

export function disableSystemConfig(id: number, changeReason?: string) {
  return http.post(`/admin/system-configs/${id}/disable`, { changeReason })
}

export function resetSystemConfig(id: number, changeReason?: string) {
  return http.post(`/admin/system-configs/${id}/reset`, { changeReason })
}

export function listSystemConfigChanges(id: number, limit = 100) {
  return http.get(`/admin/system-configs/${id}/changes`, { params: { limit } })
}

export function deleteSystemConfig(id: number, changeReason?: string) {
  return http.delete(`/admin/system-configs/${id}`, { data: { changeReason } })
}
