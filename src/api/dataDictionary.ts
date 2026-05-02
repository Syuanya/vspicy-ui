import { http } from './http'

export type DictTypeQuery = {
  category?: string
  status?: string
  keyword?: string
  limit?: number
}

export type DictItemQuery = {
  typeCode?: string
  status?: string
  keyword?: string
  limit?: number
}

export type DictTypePayload = {
  typeCode: string
  typeName: string
  category?: string
  description?: string
  status?: string
  builtIn?: boolean
  sortNo?: number
}

export type DictItemPayload = {
  typeCode: string
  itemLabel: string
  itemValue: string
  itemColor?: string
  itemIcon?: string
  description?: string
  status?: string
  builtIn?: boolean
  sortNo?: number
}

export function getDataDictionaryOverview() {
  return http.get('/admin/data-dictionaries/overview') as unknown as Promise<any>
}

export function listDictTypes(params?: DictTypeQuery) {
  return http.get('/admin/data-dictionaries/types', { params }) as unknown as Promise<any[]>
}

export function getDictType(id: number) {
  return http.get(`/admin/data-dictionaries/types/${id}`)
}

export function createDictType(data: DictTypePayload) {
  return http.post('/admin/data-dictionaries/types', data)
}

export function updateDictType(id: number, data: DictTypePayload) {
  return http.put(`/admin/data-dictionaries/types/${id}`, data)
}

export function enableDictType(id: number) {
  return http.post(`/admin/data-dictionaries/types/${id}/enable`)
}

export function disableDictType(id: number) {
  return http.post(`/admin/data-dictionaries/types/${id}/disable`)
}

export function deleteDictType(id: number) {
  return http.delete(`/admin/data-dictionaries/types/${id}`)
}

export function listDictItems(params?: DictItemQuery) {
  return http.get('/admin/data-dictionaries/items', { params }) as unknown as Promise<any[]>
}

export function getDictItem(id: number) {
  return http.get(`/admin/data-dictionaries/items/${id}`)
}

export function createDictItem(data: DictItemPayload) {
  return http.post('/admin/data-dictionaries/items', data)
}

export function updateDictItem(id: number, data: DictItemPayload) {
  return http.put(`/admin/data-dictionaries/items/${id}`, data)
}

export function enableDictItem(id: number) {
  return http.post(`/admin/data-dictionaries/items/${id}/enable`)
}

export function disableDictItem(id: number) {
  return http.post(`/admin/data-dictionaries/items/${id}/disable`)
}

export function moveDictItem(id: number, sortNo: number) {
  return http.post(`/admin/data-dictionaries/items/${id}/move`, { sortNo })
}

export function deleteDictItem(id: number) {
  return http.delete(`/admin/data-dictionaries/items/${id}`)
}
