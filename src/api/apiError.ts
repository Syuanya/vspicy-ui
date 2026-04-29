export interface NormalizedApiError {
  status?: number
  code?: number | string
  message: string
  detail?: string
  type:
    | 'BUSINESS'
    | 'HTTP'
    | 'NETWORK'
    | 'TIMEOUT'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'VALIDATION'
    | 'UNKNOWN'
  raw?: unknown
}

export interface ApiResponseLike<T = any> {
  code?: number | string
  message?: string
  msg?: string
  success?: boolean
  data?: T
  result?: T
}

export function isSuccessResponse(response: ApiResponseLike | any): boolean {
  if (!response || typeof response !== 'object') {
    return false
  }

  if (response.success === true) {
    return true
  }

  return response.code === 0 || response.code === 200 || response.code === '0' || response.code === '200'
}

export function getResponseMessage(response: ApiResponseLike | any, fallback = '请求失败'): string {
  if (!response || typeof response !== 'object') {
    return fallback
  }

  return response.message || response.msg || response.error || fallback
}

export function unwrapApiResponse<T = any>(response: ApiResponseLike<T> | any): T {
  if (isSuccessResponse(response)) {
    if ('data' in response) return response.data as T
    if ('result' in response) return response.result as T
    return response as T
  }

  throw normalizeApiError(response, '业务请求失败')
}

export function normalizeApiError(error: unknown, fallback = '请求失败'): NormalizedApiError {
  if (isNormalizedApiError(error)) {
    return error
  }

  if (typeof error === 'string') {
    return {
      message: error || fallback,
      type: 'UNKNOWN',
      raw: error
    }
  }

  const anyError = error as any

  if (anyError?.response) {
    const status = anyError.response.status
    const body = anyError.response.data
    const bodyMessage = getResponseMessage(body, '')
    const statusText = anyError.response.statusText

    if (status === 400) {
      return {
        status,
        code: body?.code,
        message: bodyMessage || '参数校验失败，请检查输入',
        detail: statusText,
        type: 'VALIDATION',
        raw: error
      }
    }

    if (status === 401) {
      return {
        status,
        code: body?.code,
        message: bodyMessage || '登录已过期，请重新登录',
        detail: statusText,
        type: 'UNAUTHORIZED',
        raw: error
      }
    }

    if (status === 403) {
      return {
        status,
        code: body?.code,
        message: bodyMessage || '没有权限执行该操作',
        detail: statusText,
        type: 'FORBIDDEN',
        raw: error
      }
    }

    if (status === 404) {
      return {
        status,
        code: body?.code,
        message: bodyMessage || '接口不存在或资源不存在',
        detail: statusText,
        type: 'NOT_FOUND',
        raw: error
      }
    }

    if (status >= 500) {
      return {
        status,
        code: body?.code,
        message: bodyMessage || '服务端异常，请查看后端日志',
        detail: statusText,
        type: 'HTTP',
        raw: error
      }
    }

    return {
      status,
      code: body?.code,
      message: bodyMessage || statusText || fallback,
      detail: statusText,
      type: 'HTTP',
      raw: error
    }
  }

  if (anyError?.code === 'ECONNABORTED' || String(anyError?.message || '').toLowerCase().includes('timeout')) {
    return {
      code: anyError.code,
      message: '请求超时，请检查服务是否正常',
      detail: anyError.message,
      type: 'TIMEOUT',
      raw: error
    }
  }

  if (anyError?.request && !anyError?.response) {
    return {
      message: '网络请求失败，请检查后端服务或网关是否启动',
      detail: anyError.message,
      type: 'NETWORK',
      raw: error
    }
  }

  if (anyError && typeof anyError === 'object') {
    if ('code' in anyError || 'message' in anyError || 'msg' in anyError) {
      const code = anyError.code
      const type = code === 400 || code === '400' ? 'VALIDATION' : 'BUSINESS'
      return {
        code,
        message: getResponseMessage(anyError, fallback),
        detail: anyError.detail,
        type,
        raw: error
      }
    }
  }

  if (anyError?.message) {
    return {
      message: anyError.message,
      type: 'UNKNOWN',
      raw: error
    }
  }

  return {
    message: fallback,
    type: 'UNKNOWN',
    raw: error
  }
}

export function isNormalizedApiError(error: unknown): error is NormalizedApiError {
  return Boolean(error && typeof error === 'object' && 'type' in error && 'message' in error)
}

export function formatApiError(error: unknown, fallback = '请求失败'): string {
  const normalized = normalizeApiError(error, fallback)
  if (normalized.status) {
    return `[${normalized.status}] ${normalized.message}`
  }
  if (normalized.code !== undefined && normalized.code !== null) {
    return `[${normalized.code}] ${normalized.message}`
  }
  return normalized.message
}
