import { clearTokens, http, saveTokens, USER_ID_KEY } from './http'

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

function unwrapLoginPayload(data: any) {
  if (!data) {
    return {}
  }

  // 兼容直接传 LoginResponse，也兼容误传 Result<LoginResponse>。
  if (!data.accessToken && data.data?.accessToken) {
    return data.data
  }

  return data
}

function resolveUser(payload: any) {
  return payload?.user || payload?.currentUser || payload?.profile || {}
}

export function saveLoginResult(data: any) {
  const payload = unwrapLoginPayload(data)
  const user = resolveUser(payload)
  const accessToken = payload.accessToken || payload.access_token || payload.token || payload.jwt
  const refreshToken = payload.refreshToken || payload.refresh_token
  const saved = saveTokens(accessToken, refreshToken)

  if (!saved) {
    throw new Error('登录接口未返回合法 accessToken，请检查 auth 服务返回结构或重启 vspicy-auth')
  }

  const userId = user.userId || user.id || payload.userId || payload.id
  if (userId !== undefined && userId !== null && userId !== '') {
    localStorage.setItem(USER_ID_KEY, String(userId))
  }

  localStorage.setItem('vspicy_permission_view', JSON.stringify({
    userId,
    roles: (user.roles || []).map((roleCode: string) => ({ roleCode, roleName: roleCode })),
    menus: [],
    permissionCodes: user.permissions || []
  }))
}

export function logout() {
  clearTokens()
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem('vspicy_permission_view')
}
