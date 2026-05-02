import { http } from './http'

export interface LoginSecurityOverview {
  todayLoginCount: number
  todaySuccessCount: number
  todayFailedCount: number
  todaySuccessRate: number
  onlineSessionCount: number
  lockedSessionCount: number
  abnormalIpCount: number
  statusDistribution: Array<{ name: string; value: number }>
  loginTypeDistribution: Array<{ name: string; value: number }>
  dailyTrend: Array<{ date: string; successCount: number; failedCount: number }>
}

export interface LoginLogItem {
  id: number
  userId: number
  username: string
  nickname: string
  loginType: string
  ip: string
  location: string
  userAgent: string
  device: string
  status: string
  failReason?: string
  createdAt: string
}

export interface OnlineSessionItem {
  id: number
  userId: number
  username: string
  nickname: string
  tokenId: string
  ip: string
  device: string
  status: string
  loginAt: string
  lastActiveAt: string
  expireAt: string
}

export function getLoginSecurityOverview(days = 7) {
  return http.get<LoginSecurityOverview>('/admin/login-security/overview', { params: { days } }) as unknown as Promise<LoginSecurityOverview>
}

export function listLoginLogs(params: { userId?: number | string; status?: string; keyword?: string; limit?: number }) {
  return http.get<LoginLogItem[]>('/admin/login-security/logs', { params }) as unknown as Promise<LoginLogItem[]>
}

export function listOnlineSessions(params: { userId?: number | string; status?: string; keyword?: string; limit?: number }) {
  return http.get<OnlineSessionItem[]>('/admin/login-security/sessions', { params }) as unknown as Promise<OnlineSessionItem[]>
}

export function kickOnlineSession(id: number, reason: string) {
  return http.post<void>(`/admin/login-security/sessions/${id}/kick`, { reason })
}

export function cleanupExpiredSessions() {
  return http.post<number>('/admin/login-security/sessions/cleanup-expired')
}
