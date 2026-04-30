import axios from 'axios'

export const ACCESS_TOKEN_KEY = 'vspicy_access_token'
export const REFRESH_TOKEN_KEY = 'vspicy_refresh_token'
export const USER_ID_KEY = 'vspicy_user_id'

export const http = axios.create({
  baseURL: '/api',
  timeout: 30000
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
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
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getCurrentUserId() {
  const value = localStorage.getItem(USER_ID_KEY)
  return value ? Number(value) : undefined
}

export function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}
