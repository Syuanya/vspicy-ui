import { http } from './http'

export type DeptCommand = {
  parentId?: number
  deptCode: string
  deptName: string
  leaderName?: string
  leaderPhone?: string
  sortNo?: number
  status?: number
  editable?: boolean
  remark?: string
}

export type PostCommand = {
  postCode: string
  postName: string
  sortNo?: number
  status?: number
  editable?: boolean
  remark?: string
}

export function getOrgOverview() {
  return http.get('/admin/org/overview')
}

export function listDepartments(params?: { keyword?: string; status?: number }) {
  return http.get('/admin/org/depts', { params })
}

export function createDepartment(data: DeptCommand) {
  return http.post('/admin/org/depts', data)
}

export function updateDepartment(id: number, data: Partial<DeptCommand>) {
  return http.put(`/admin/org/depts/${id}`, data)
}

export function enableDepartment(id: number) {
  return http.post(`/admin/org/depts/${id}/enable`)
}

export function disableDepartment(id: number) {
  return http.post(`/admin/org/depts/${id}/disable`)
}

export function deleteDepartment(id: number) {
  return http.delete(`/admin/org/depts/${id}`)
}

export function listPosts(params?: { keyword?: string; status?: number }) {
  return http.get('/admin/org/posts', { params })
}

export function createPost(data: PostCommand) {
  return http.post('/admin/org/posts', data)
}

export function updatePost(id: number, data: Partial<PostCommand>) {
  return http.put(`/admin/org/posts/${id}`, data)
}

export function enablePost(id: number) {
  return http.post(`/admin/org/posts/${id}/enable`)
}

export function disablePost(id: number) {
  return http.post(`/admin/org/posts/${id}/disable`)
}

export function deletePost(id: number) {
  return http.delete(`/admin/org/posts/${id}`)
}

export function getUserOrg(userId: number) {
  return http.get(`/admin/org/users/${userId}`)
}

export function assignUserOrg(userId: number, data: { deptIds: number[]; primaryDeptId?: number; postIds: number[] }) {
  return http.post(`/admin/org/users/${userId}`, data)
}
