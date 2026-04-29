import { computed, ref } from 'vue'

export interface DangerActionConfirmOptions {
  title?: string
  message?: string
  targetName?: string
  actionLabel?: string
  level?: 'warning' | 'danger'
  confirmText?: string
  defaultReason?: string
  impacts?: string[]
}

export interface DangerActionConfirmPayload {
  reason: string
  confirmText: string
}

const defaultOptions: Required<DangerActionConfirmOptions> = {
  title: '确认操作',
  message: '该操作可能影响系统状态，请确认后继续。',
  targetName: '',
  actionLabel: '确认',
  level: 'warning',
  confirmText: '',
  defaultReason: '',
  impacts: []
}

export function useDangerActionConfirm() {
  const visible = ref(false)
  const loading = ref(false)
  const options = ref<Required<DangerActionConfirmOptions>>({ ...defaultOptions })
  let resolver: ((payload: DangerActionConfirmPayload | null) => void) | null = null

  const modalProps = computed(() => ({
    visible: visible.value,
    loading: loading.value,
    ...options.value
  }))

  function open(nextOptions: DangerActionConfirmOptions = {}) {
    options.value = {
      ...defaultOptions,
      ...nextOptions,
      impacts: nextOptions.impacts || []
    }
    visible.value = true

    return new Promise<DangerActionConfirmPayload | null>((resolve) => {
      resolver = resolve
    })
  }

  function cancel() {
    visible.value = false
    loading.value = false
    resolver?.(null)
    resolver = null
  }

  function confirm(payload: DangerActionConfirmPayload) {
    visible.value = false
    resolver?.(payload)
    resolver = null
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  return {
    visible,
    loading,
    modalProps,
    open,
    cancel,
    confirm,
    setLoading
  }
}
