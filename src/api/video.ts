import { http } from './http'

export interface CreateUploadTaskRequest {
  userId?: number
  title: string
  fileName: string
  fileHash: string
  fileSize: number
  chunkSize: number
}

export function createUploadTask(data: CreateUploadTaskRequest) {
  return http.post('/videos/upload-tasks', data)
}

export function uploadVideoChunk(taskId: number, chunkIndex: number, chunk: Blob, chunkHash?: string) {
  const form = new FormData()
  form.append('chunkIndex', String(chunkIndex))
  if (chunkHash) {
    form.append('chunkHash', chunkHash)
  }
  form.append('file', chunk)
  return http.post(`/videos/upload-tasks/${taskId}/chunks`, form, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export function completeUpload(taskId: number) {
  return http.post(`/videos/upload-tasks/${taskId}/complete`)
}

export function getVideo(videoId: number) {
  return http.get(`/videos/${videoId}`)
}

export function getVideoFiles(videoId: number) {
  return http.get(`/videos/${videoId}/files`)
}

export function getPlayInfo(videoId: number) {
  return http.get(`/videos/${videoId}/play-info`)
}
