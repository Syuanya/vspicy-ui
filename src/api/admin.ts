import { http } from './http'

export function listRoles() {
  return http.get('/admin/roles')
}

export function createRole(data: {
  roleCode: string
  roleName: string
  description?: string
}) {
  return http.post('/admin/roles', data)
}

export function listPermissions(type?: string) {
  return http.get('/admin/permissions', {
    params: type ? { type } : undefined
  })
}

export function createPermission(data: {
  parentId?: number
  permissionCode: string
  permissionName: string
  permissionType: string
  path?: string
  component?: string
  icon?: string
  sortNo?: number
}) {
  return http.post('/admin/permissions', data)
}

export function getUserRoles(userId: number) {
  return http.get(`/admin/users/${userId}/roles`)
}

export function assignUserRoles(userId: number, roleIds: number[]) {
  return http.post(`/admin/users/${userId}/roles`, { roleIds })
}

export function getRolePermissions(roleId: number) {
  return http.get(`/admin/roles/${roleId}/permissions`)
}

export function assignRolePermissions(roleId: number, permissionIds: number[]) {
  return http.post(`/admin/roles/${roleId}/permissions`, { permissionIds })
}

export function getUserPermissionView(userId: number) {
  return http.get(`/admin/users/${userId}/permission-view`)
}

export function listOperationLogs(params?: {
  userId?: number
  operationType?: string
  status?: string
  keyword?: string
  startTime?: string
  endTime?: string
  limit?: number
}) {
  return http.get('/admin/operation-logs', { params })
}

export function listSystemConfigs(params?: {
  groupCode?: string
  keyword?: string
  status?: number
  limit?: number
}) {
  return http.get('/admin/system-configs', { params })
}

export function listSystemConfigGroups() {
  return http.get('/admin/system-configs/groups')
}

export function getSystemConfig(id: number) {
  return http.get(`/admin/system-configs/${id}`)
}

export function createSystemConfig(data: {
  configKey: string
  configName: string
  configValue?: string
  configType?: string
  groupCode?: string
  description?: string
  editable?: boolean
  encrypted?: boolean
  status?: number
}) {
  return http.post('/admin/system-configs', data)
}

export function updateSystemConfig(id: number, data: {
  configKey?: string
  configName?: string
  configValue?: string
  configType?: string
  groupCode?: string
  description?: string
  editable?: boolean
  encrypted?: boolean
  status?: number
}) {
  return http.put(`/admin/system-configs/${id}`, data)
}

export function enableSystemConfig(id: number) {
  return http.post(`/admin/system-configs/${id}/enable`)
}

export function disableSystemConfig(id: number) {
  return http.post(`/admin/system-configs/${id}/disable`)
}

export function deleteSystemConfig(id: number) {
  return http.delete(`/admin/system-configs/${id}`)
}

export function getOperationLogOverview(days = 7) {
  return http.get('/admin/operation-logs/overview', { params: { days } })
}

export function exportOperationLogs(params?: {
  userId?: number
  operationType?: string
  status?: string
  keyword?: string
  startTime?: string
  endTime?: string
}) {
  return http.get('/admin/operation-logs/export', {
    params,
    responseType: 'blob'
  })
}

export function cleanupOperationLogs(data: {
  retentionDays: number
  dryRun: boolean
}) {
  return http.post('/admin/operation-logs/cleanup', data)
}

export function getDictionaryOverview() {
  return http.get('/admin/dictionaries/overview')
}

export function listDictionaryTypes(params?: {
  keyword?: string
  status?: number
  limit?: number
}) {
  return http.get('/admin/dictionaries/types', { params })
}

export function createDictionaryType(data: {
  typeCode: string
  typeName: string
  description?: string
  status?: number
  editable?: boolean
}) {
  return http.post('/admin/dictionaries/types', data)
}

export function updateDictionaryType(id: number, data: {
  typeCode?: string
  typeName?: string
  description?: string
  status?: number
  editable?: boolean
}) {
  return http.put(`/admin/dictionaries/types/${id}`, data)
}

export function enableDictionaryType(id: number) {
  return http.post(`/admin/dictionaries/types/${id}/enable`)
}

export function disableDictionaryType(id: number) {
  return http.post(`/admin/dictionaries/types/${id}/disable`)
}

export function deleteDictionaryType(id: number) {
  return http.delete(`/admin/dictionaries/types/${id}`)
}

export function listDictionaryItems(params?: {
  typeCode?: string
  keyword?: string
  status?: number
  limit?: number
}) {
  return http.get('/admin/dictionaries/items', { params })
}

export function createDictionaryItem(data: {
  typeCode: string
  itemLabel: string
  itemValue: string
  sortNo?: number
  cssClass?: string
  extraJson?: string
  status?: number
  editable?: boolean
  remark?: string
}) {
  return http.post('/admin/dictionaries/items', data)
}

export function updateDictionaryItem(id: number, data: {
  typeCode?: string
  itemLabel?: string
  itemValue?: string
  sortNo?: number
  cssClass?: string
  extraJson?: string
  status?: number
  editable?: boolean
  remark?: string
}) {
  return http.put(`/admin/dictionaries/items/${id}`, data)
}

export function enableDictionaryItem(id: number) {
  return http.post(`/admin/dictionaries/items/${id}/enable`)
}

export function disableDictionaryItem(id: number) {
  return http.post(`/admin/dictionaries/items/${id}/disable`)
}

export function deleteDictionaryItem(id: number) {
  return http.delete(`/admin/dictionaries/items/${id}`)
}
