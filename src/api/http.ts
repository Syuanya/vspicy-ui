import axios from 'axios'

export const ACCESS_TOKEN_KEY = 'vspicy_access_token'
export const REFRESH_TOKEN_KEY = 'vspicy_refresh_token'
export const USER_ID_KEY = 'vspicy_user_id'

// JWT 本身可能因权限码较多超过 4KB。后端已同步瘦身 token，前端这里保留较宽松上限，
// 主要拦截 HTML/JSON/重复 Bearer 等明显异常值，避免再次撑爆请求头。
const MAX_AUTH_TOKEN_LENGTH = 16384

function clearAuthStorage() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem('vspicy_permission_view')
}

function normalizeToken(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }

  const token = value.trim().replace(/^bearer\s+/i, '')
  const lower = token.toLowerCase()

  if (
    !token ||
    token.length > MAX_AUTH_TOKEN_LENGTH ||
    token.startsWith('{') ||
    token.startsWith('[') ||
    lower.startsWith('<!doctype') ||
    lower.startsWith('<html') ||
    /^bearer\s+/i.test(token) ||
    /\s/.test(token)
  ) {
    return ''
  }

  return token
}

function readSafeAccessToken() {
  const rawToken = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (!rawToken) {
    return ''
  }

  const token = normalizeToken(rawToken)
  if (!token) {
    console.warn('检测到异常登录 token，已清理本地登录态，请重新登录。')
    clearAuthStorage()
    return ''
  }

  if (token !== rawToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
  }

  return token
}

export const http = axios.create({
  baseURL: '/api',
  timeout: 30000
})

http.interceptors.request.use((config) => {
  const token = readSafeAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const userId = localStorage.getItem(USER_ID_KEY)
  if (userId) {
    config.headers['X-User-Id'] = userId
  }

  return config
})

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      console.warn('未登录或登录已过期')
    }
    if (status === 403) {
      console.warn('无权限访问')
    }
    return Promise.reject(error)
  }
)

export function getAccessToken() {
  return readSafeAccessToken()
}

export function getCurrentUserId() {
  const value = localStorage.getItem(USER_ID_KEY)
  return value ? Number(value) : undefined
}

export function saveTokens(accessToken: unknown, refreshToken?: unknown) {
  const safeAccessToken = normalizeToken(accessToken)
  const safeRefreshToken = normalizeToken(refreshToken)

  if (!safeAccessToken) {
    console.warn('登录接口返回的 accessToken 异常，已拒绝写入本地缓存。', {
      type: typeof accessToken,
      length: typeof accessToken === 'string' ? accessToken.length : undefined
    })
    clearAuthStorage()
    return false
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, safeAccessToken)

  if (safeRefreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, safeRefreshToken)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  return true
}

export function clearTokens() {
  clearAuthStorage()
}
