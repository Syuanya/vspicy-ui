import { http } from './http'

export function getServiceHealthSummary() {
  return http.get('/videos/admin/service-health/summary')
}
