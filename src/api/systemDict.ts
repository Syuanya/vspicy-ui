import { http } from './http'

export interface SystemDictOverview {
  typeCount: number
  enabledTypeCount: number
  disabledTypeCount: number
  itemCount: number
  enabledItemCount: number
  disabledItemCount: number
}

export interface SystemDictType {
  id: number
  typeCode: string
  typeName: string
  description?: string
  status: number
  editable: boolean
  itemCount: number
  createdAt?: string
  updatedAt?: string
}

export interface SystemDictItem {
  id: number
  typeCode: string
  itemLabel: string
  itemValue: string
  sortNo: number
  cssClass?: string
  extraJson?: string
  status: number
  editable: boolean
  remark?: string
  createdAt?: string
  updatedAt?: string
}

export interface SystemDictTypePayload {
  typeCode?: string
  typeName?: string
  description?: string
  status?: number
  editable?: boolean
}

export interface SystemDictItemPayload {
  typeCode?: string
  itemLabel?: string
  itemValue?: string
  sortNo?: number
  cssClass?: string
  extraJson?: string
  status?: number
  editable?: boolean
  remark?: string
}

export function getSystemDictOverview() {
  return http.get<SystemDictOverview>('/admin/system-dicts/overview')
}

export function listSystemDictTypes(params?: { keyword?: string; status?: number; limit?: number }) {
  return http.get<SystemDictType[]>('/admin/system-dicts/types', { params })
}

export function getSystemDictType(id: number) {
  return http.get<SystemDictType>(`/admin/system-dicts/types/${id}`)
}

export function createSystemDictType(data: SystemDictTypePayload) {
  return http.post<SystemDictType>('/admin/system-dicts/types', data)
}

export function updateSystemDictType(id: number, data: SystemDictTypePayload) {
  return http.put<SystemDictType>(`/admin/system-dicts/types/${id}`, data)
}

export function enableSystemDictType(id: number) {
  return http.post<SystemDictType>(`/admin/system-dicts/types/${id}/enable`)
}

export function disableSystemDictType(id: number) {
  return http.post<SystemDictType>(`/admin/system-dicts/types/${id}/disable`)
}

export function deleteSystemDictType(id: number) {
  return http.delete(`/admin/system-dicts/types/${id}`)
}

export function listSystemDictItems(params?: { typeCode?: string; keyword?: string; status?: number; limit?: number }) {
  return http.get<SystemDictItem[]>('/admin/system-dicts/items', { params })
}

export function listSystemDictItemsByType(typeCode: string, params?: { status?: number; limit?: number }) {
  return http.get<SystemDictItem[]>(`/admin/system-dicts/types/${typeCode}/items`, { params })
}

export function getSystemDictItem(id: number) {
  return http.get<SystemDictItem>(`/admin/system-dicts/items/${id}`)
}

export function createSystemDictItem(data: SystemDictItemPayload) {
  return http.post<SystemDictItem>('/admin/system-dicts/items', data)
}

export function updateSystemDictItem(id: number, data: SystemDictItemPayload) {
  return http.put<SystemDictItem>(`/admin/system-dicts/items/${id}`, data)
}

export function enableSystemDictItem(id: number) {
  return http.post<SystemDictItem>(`/admin/system-dicts/items/${id}/enable`)
}

export function disableSystemDictItem(id: number) {
  return http.post<SystemDictItem>(`/admin/system-dicts/items/${id}/disable`)
}

export function moveSystemDictItem(id: number, sortNo: number) {
  return http.post<SystemDictItem>(`/admin/system-dicts/items/${id}/move`, { sortNo })
}

export function deleteSystemDictItem(id: number) {
  return http.delete(`/admin/system-dicts/items/${id}`)
}
