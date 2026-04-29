import { http } from './http'

export function getTranscodeProgressByVideoId(videoId: number) {
  return http.get(`/videos/transcode/progress/video/${videoId}`)
}

export function getTranscodeProgressByTaskId(taskId: number) {
  return http.get(`/videos/transcode/progress/task/${taskId}`)
}
