import { http } from './http'

export function getUser(userId: number) {
  return http.get(`/users/${userId}`)
}

export function getUserDetail(userId: number) {
  return http.get(`/users/${userId}/detail`)
}

export function getUserOverview() {
  return http.get('/users/overview')
}

export function listUsers(params?: {
  keyword?: string
  status?: number
  userType?: number
  limit?: number
}) {
  return http.get('/users', { params })
}

export function updateUser(userId: number, data: {
  nickname?: string
  avatarUrl?: string
  email?: string
  phone?: string
  status?: number
  userType?: number
}) {
  return http.put(`/users/${userId}`, data)
}

export function updateUserStatus(userId: number, status: number) {
  return http.put(`/users/${userId}/status`, { status })
}

export function updateUserType(userId: number, userType: number) {
  return http.put(`/users/${userId}/type`, { userType })
}

export function resetUserPassword(userId: number, password: string) {
  return http.put(`/users/${userId}/password`, { password })
}
