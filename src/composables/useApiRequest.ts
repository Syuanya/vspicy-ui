import { ref } from 'vue'
import {
  NormalizedApiError,
  normalizeApiError,
  unwrapApiResponse
} from '../api/apiError'

export interface UseApiRequestOptions<T> {
  immediate?: boolean
  defaultData?: T | null
  onSuccess?: (data: T) => void
  onError?: (error: NormalizedApiError) => void
}

export function useApiRequest<T = any, Args extends any[] = any[]>(
  requestFn: (...args: Args) => Promise<any>,
  options: UseApiRequestOptions<T> = {}
) {
  const loading = ref(false)
  const error = ref<NormalizedApiError | null>(null)
  const data = ref<T | null>(options.defaultData ?? null)
  const raw = ref<any>(null)

  async function execute(...args: Args): Promise<T | null> {
    loading.value = true
    error.value = null

    try {
      const response = await requestFn(...args)
      raw.value = response
      const unwrapped = unwrapApiResponse<T>(response)
      data.value = unwrapped
      options.onSuccess?.(unwrapped)
      return unwrapped
    } catch (e) {
      const normalized = normalizeApiError(e)
      error.value = normalized
      options.onError?.(normalized)
      return null
    } finally {
      loading.value = false
    }
  }

  function reset() {
    loading.value = false
    error.value = null
    data.value = options.defaultData ?? null
    raw.value = null
  }

  return {
    loading,
    error,
    data,
    raw,
    execute,
    reset
  }
}
