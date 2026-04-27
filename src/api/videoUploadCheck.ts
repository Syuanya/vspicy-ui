import { http } from './http'

export function checkVideoUpload(sizeMb: number) {
  return http.get('/videos/upload/check', {
    params: { sizeMb }
  })
}
