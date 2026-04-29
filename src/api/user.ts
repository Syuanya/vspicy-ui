import { http } from './http'

export function getUser(userId: number) {
  return http.get(`/users/${userId}`)
}

export function listUsers(params?: {
  keyword?: string
  status?: number
  userType?: number
  limit?: number
}) {
  return http.get('/users', { params })
}

export function updateUserStatus(userId: number, status: number) {
  return http.put(`/users/${userId}/status`, { status })
}

export function updateUserType(userId: number, userType: number) {
  return http.put(`/users/${userId}/type`, { userType })
}
