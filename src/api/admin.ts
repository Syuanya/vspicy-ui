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
  limit?: number
}) {
  return http.get('/admin/operation-logs', { params })
}
