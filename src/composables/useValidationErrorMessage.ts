import { computed, Ref } from 'vue'
import { normalizeApiError } from '../api/apiError'

export function useValidationErrorMessage(error: Ref<unknown | null | undefined>) {
  const normalized = computed(() => {
    if (!error.value) return null
    return normalizeApiError(error.value)
  })

  const isValidationError = computed(() => normalized.value?.type === 'VALIDATION')
  const validationMessage = computed(() => isValidationError.value ? normalized.value?.message || '' : '')

  return {
    normalized,
    isValidationError,
    validationMessage
  }
}
