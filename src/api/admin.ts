import { http } from './http'
import {
  createSystemConfig as createSystemConfigV2,
  deleteSystemConfig as deleteSystemConfigV2,
  disableSystemConfig as disableSystemConfigV2,
  enableSystemConfig as enableSystemConfigV2,
  getSystemConfigOverview as getSystemConfigOverviewV2,
  listSystemConfigs as listSystemConfigsV2,
  updateSystemConfig as updateSystemConfigV2,
  type SystemConfigPayload,
  type SystemConfigQuery
} from './systemConfig'
import {
  createSystemDictItem,
  createSystemDictType,
  deleteSystemDictItem,
  deleteSystemDictType,
  disableSystemDictItem,
  disableSystemDictType,
  enableSystemDictItem,
  enableSystemDictType,
  getSystemDictOverview,
  listSystemDictItems,
  listSystemDictTypes,
  updateSystemDictItem,
  updateSystemDictType,
  type SystemDictItemPayload,
  type SystemDictTypePayload
} from './systemDict'

export function listRoles(params?: { keyword?: string; status?: number }) {
  return http.get('/admin/roles', { params })
}

export function createRole(data: {
  roleCode: string
  roleName: string
  description?: string
  status?: number
}) {
  return http.post('/admin/roles', data)
}

export function listPermissions(type?: string, params?: { keyword?: string; status?: number }) {
  return http.get('/admin/permissions', {
    params: { ...(params || {}), ...(type ? { type } : {}) }
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
  status?: number
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

export function getPermissionOverview() {
  return http.get('/admin/permissions/overview')
}

export function getRole(roleId: number) {
  return http.get(`/admin/roles/${roleId}`)
}

export function updateRole(roleId: number, data: {
  roleCode?: string
  roleName?: string
  description?: string
  status?: number
}) {
  return http.put(`/admin/roles/${roleId}`, data)
}

export function enableRole(roleId: number) {
  return http.post(`/admin/roles/${roleId}/enable`)
}

export function disableRole(roleId: number) {
  return http.post(`/admin/roles/${roleId}/disable`)
}

export function getPermission(permissionId: number) {
  return http.get(`/admin/permissions/${permissionId}`)
}

export function updatePermission(permissionId: number, data: {
  parentId?: number
  permissionCode?: string
  permissionName?: string
  permissionType?: string
  path?: string
  component?: string
  icon?: string
  sortNo?: number
  status?: number
}) {
  return http.put(`/admin/permissions/${permissionId}`, data)
}

export function enablePermission(permissionId: number) {
  return http.post(`/admin/permissions/${permissionId}/enable`)
}

export function disablePermission(permissionId: number) {
  return http.post(`/admin/permissions/${permissionId}/disable`)
}

export function getRolePermissionSummary(roleId: number) {
  return http.get(`/admin/roles/${roleId}/permission-summary`)
}

export function listSystemConfigs(params?: SystemConfigQuery & { groupCode?: string; configType?: string; encrypted?: boolean }) {
  const mappedParams = {
    ...params,
    category: params?.category || params?.groupCode,
    valueType: params?.valueType || params?.configType,
    sensitive: params?.sensitive ?? params?.encrypted
  }
  return listSystemConfigsV2(mappedParams)
}

export async function listSystemConfigGroups() {
  const res: any = await getSystemConfigOverviewV2()
  return res?.data?.groups || res?.groups || []
}

export function createSystemConfig(data: Omit<SystemConfigPayload, 'status'> & {
  groupCode?: string
  configType?: string
  encrypted?: boolean
  status?: string | number
}) {
  return createSystemConfigV2({
    ...data,
    category: data.category || data.groupCode,
    valueType: data.valueType || data.configType,
    sensitive: data.sensitive ?? data.encrypted,
    status: data.status == null ? undefined : String(data.status)
  })
}

export function updateSystemConfig(id: number, data: Omit<SystemConfigPayload, 'status'> & {
  groupCode?: string
  configType?: string
  encrypted?: boolean
  status?: string | number
}) {
  return updateSystemConfigV2(id, {
    ...data,
    category: data.category || data.groupCode,
    valueType: data.valueType || data.configType,
    sensitive: data.sensitive ?? data.encrypted,
    status: data.status == null ? undefined : String(data.status)
  })
}

export function enableSystemConfig(id: number) {
  return enableSystemConfigV2(id)
}

export function disableSystemConfig(id: number) {
  return disableSystemConfigV2(id)
}

export function deleteSystemConfig(id: number) {
  return deleteSystemConfigV2(id)
}

export function getDictionaryOverview() {
  return getSystemDictOverview()
}

export function listDictionaryTypes(params?: { keyword?: string; status?: number | string; limit?: number }) {
  return listSystemDictTypes({
    ...params,
    status: typeof params?.status === 'string' && params.status !== '' ? Number(params.status) : params?.status as number | undefined
  })
}

export function createDictionaryType(data: SystemDictTypePayload) {
  return createSystemDictType(data)
}

export function updateDictionaryType(id: number, data: SystemDictTypePayload) {
  return updateSystemDictType(id, data)
}

export function enableDictionaryType(id: number) {
  return enableSystemDictType(id)
}

export function disableDictionaryType(id: number) {
  return disableSystemDictType(id)
}

export function deleteDictionaryType(id: number) {
  return deleteSystemDictType(id)
}

export function listDictionaryItems(params?: { typeCode?: string; keyword?: string; status?: number | string; limit?: number }) {
  return listSystemDictItems({
    ...params,
    status: typeof params?.status === 'string' && params.status !== '' ? Number(params.status) : params?.status as number | undefined
  })
}

export function createDictionaryItem(data: SystemDictItemPayload) {
  return createSystemDictItem(data)
}

export function updateDictionaryItem(id: number, data: SystemDictItemPayload) {
  return updateSystemDictItem(id, data)
}

export function enableDictionaryItem(id: number) {
  return enableSystemDictItem(id)
}

export function disableDictionaryItem(id: number) {
  return disableSystemDictItem(id)
}

export function deleteDictionaryItem(id: number) {
  return deleteSystemDictItem(id)
}
