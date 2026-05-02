import { http } from './http'

export type MenuCommand = {
  parentId?: number
  menuCode: string
  menuName: string
  menuType: string
  path?: string
  component?: string
  icon?: string
  permissionCode?: string
  sortNo?: number
  visible?: boolean
  status?: number
  editable?: boolean
  remark?: string
}

export function getMenuOverview() {
  return http.get('/admin/menus/overview')
}

export function listMenus(params?: {
  keyword?: string
  status?: number
  visible?: boolean
}) {
  return http.get('/admin/menus', { params })
}

export function getMenu(id: number) {
  return http.get(`/admin/menus/${id}`)
}

export function createMenu(data: MenuCommand) {
  return http.post('/admin/menus', data)
}

export function updateMenu(id: number, data: Partial<MenuCommand>) {
  return http.put(`/admin/menus/${id}`, data)
}

export function enableMenu(id: number) {
  return http.post(`/admin/menus/${id}/enable`)
}

export function disableMenu(id: number) {
  return http.post(`/admin/menus/${id}/disable`)
}

export function showMenu(id: number) {
  return http.post(`/admin/menus/${id}/show`)
}

export function hideMenu(id: number) {
  return http.post(`/admin/menus/${id}/hide`)
}

export function deleteMenu(id: number) {
  return http.delete(`/admin/menus/${id}`)
}

export function getRoleMenus(roleId: number) {
  return http.get(`/admin/menus/roles/${roleId}`)
}

export function assignRoleMenus(roleId: number, menuIds: number[]) {
  return http.post(`/admin/menus/roles/${roleId}`, { menuIds })
}
