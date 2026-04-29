import { http } from './http'

export function getPlaybackReadiness(videoId: number) {
  return http.get(`/videos/playback/readiness/${videoId}`)
}

export function syncPlaybackReadiness(videoId: number, payload?: {
  dryRun?: boolean
  reason?: string
}) {
  return http.post(`/videos/playback/readiness/${videoId}/sync`, {
    dryRun: payload?.dryRun ?? true,
    reason: payload?.reason || 'manual playback readiness sync'
  })
}
