import { http } from './http'

export function uploadFile(file: File, bizType = 'COMMON') {
  const form = new FormData()
  form.append('file', file)
  form.append('bizType', bizType)
  return http.post('/files/upload', form, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
