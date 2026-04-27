import { http } from './http'

export function listMemberPlans() {
  return http.get('/members/plans')
}

export function getMyMembership(userId?: number) {
  return http.get('/members/me', {
    params: userId ? { userId } : undefined
  })
}

export function subscribeMember(data: {
  userId?: number
  planCode: string
  months?: number
}) {
  return http.post('/members/subscribe', data)
}

export function cancelMembership(userId?: number) {
  return http.post('/members/cancel', null, {
    params: userId ? { userId } : undefined
  })
}

export function refreshMemberCache(userId?: number) {
  return http.post('/members/cache/refresh', null, {
    params: userId ? { userId } : undefined
  })
}

export function evictMemberCache(userId?: number) {
  return http.delete('/members/cache', {
    params: userId ? { userId } : undefined
  })
}

export function getMemberBenefits(userId?: number) {
  return http.get('/members/benefits', {
    params: userId ? { userId } : undefined
  })
}

export function checkHdPlay(userId?: number) {
  return http.get('/members/check/hd', {
    params: userId ? { userId } : undefined
  })
}

export function checkUpload(sizeMb: number, userId?: number) {
  return http.get('/members/check/upload', {
    params: userId ? { userId, sizeMb } : { sizeMb }
  })
}
