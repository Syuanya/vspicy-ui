import { clearTokens, http, saveTokens } from './http'

export function login(data: {
  username: string
  password: string
}) {
  return http.post('/auth/login', data)
}

export function register(data: {
  username: string
  password: string
  nickname?: string
  email?: string
  phone?: string
}) {
  return http.post('/auth/register', data)
}

export function me() {
  return http.get('/auth/me')
}

export function updateProfile(data: {
  nickname?: string
  avatarUrl?: string
  email?: string
  phone?: string
}) {
  return http.put('/auth/profile', data)
}

export function devToken() {
  return http.get('/auth/dev-token')
}

export function saveLoginResult(data: any) {
  saveTokens(data.accessToken, data.refreshToken)
  localStorage.setItem('vspicy_user_id', String(data.user.userId))
  localStorage.setItem('vspicy_permission_view', JSON.stringify({
    userId: data.user.userId,
    roles: (data.user.roles || []).map((roleCode: string) => ({ roleCode, roleName: roleCode })),
    menus: [],
    permissionCodes: data.user.permissions || []
  }))
}

export function logout() {
  clearTokens()
  localStorage.removeItem('vspicy_user_id')
  localStorage.removeItem('vspicy_permission_view')
}
