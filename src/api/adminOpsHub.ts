import { http } from './http'

export function getAdminOpsHubSummary() {
  return http.get('/videos/admin/ops-hub/summary')
}
