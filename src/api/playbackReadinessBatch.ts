import { http } from './http'

export function scanPlaybackReadinessBatch(params?: {
  limit?: number
  onlyProblem?: boolean
}) {
  return http.get('/videos/playback/readiness-batch/scan', { params })
}

export function syncPlaybackReadinessBatch(payload?: {
  dryRun?: boolean
  limit?: number
  onlyProblem?: boolean
  reason?: string
}) {
  return http.post('/videos/playback/readiness-batch/sync', {
    dryRun: payload?.dryRun ?? true,
    limit: payload?.limit ?? 100,
    onlyProblem: payload?.onlyProblem ?? true,
    reason: payload?.reason || 'batch playback readiness sync'
  })
}
