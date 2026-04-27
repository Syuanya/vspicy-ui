import { http } from './http'

export function getDashboardOverview() {
  return http.get('/dashboard/overview')
}

export function getDashboardTrends(days = 7) {
  return http.get('/dashboard/trends', {
    params: { days }
  })
}

export function getDashboardContentRank(limit = 20) {
  return http.get('/dashboard/content-rank', {
    params: { limit }
  })
}
