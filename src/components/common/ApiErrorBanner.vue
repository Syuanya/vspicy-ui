<script setup lang="ts">
import { computed } from 'vue'
import type { NormalizedApiError } from '../../api/apiError'
import { normalizeApiError } from '../../api/apiError'

const props = defineProps<{
  error?: NormalizedApiError | string | unknown | null
  title?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const normalized = computed(() => {
  if (!props.error) return null
  return normalizeApiError(props.error)
})

const titleText = computed(() => {
  if (props.title) return props.title
  if (normalized.value?.type === 'VALIDATION') return '参数校验失败'
  if (normalized.value?.type === 'UNAUTHORIZED') return '登录状态异常'
  if (normalized.value?.type === 'FORBIDDEN') return '权限不足'
  if (normalized.value?.type === 'NETWORK') return '网络异常'
  if (normalized.value?.type === 'TIMEOUT') return '请求超时'
  return '请求异常'
})

function typeClass(type?: string) {
  if (type === 'VALIDATION' || type === 'UNAUTHORIZED' || type === 'FORBIDDEN' || type === 'NETWORK' || type === 'TIMEOUT') {
    return 'banner warning'
  }
  return 'banner danger'
}
</script>

<template>
  <div v-if="normalized" :class="typeClass(normalized.type)">
    <div>
      <strong>{{ titleText }}</strong>
      <p>{{ normalized.message }}</p>
      <small v-if="normalized.status">HTTP {{ normalized.status }}</small>
      <small v-if="normalized.code !== undefined && normalized.code !== null">CODE {{ normalized.code }}</small>
      <small v-if="normalized.detail">{{ normalized.detail }}</small>
    </div>
    <button type="button" @click="emit('close')">关闭</button>
  </div>
</template>

<style scoped>
.banner {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-radius: 8px;
  padding: 12px 14px;
  margin: 12px 0;
  border: 1px solid;
}

.banner strong {
  display: block;
}

.banner p {
  margin: 5px 0;
}

.banner small {
  display: inline-block;
  margin-right: 10px;
  color: #6b7280;
}

.banner button {
  border: 0;
  background: transparent;
  cursor: pointer;
  color: inherit;
}

.danger {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

.warning {
  border-color: #fde68a;
  background: #fffbeb;
  color: #92400e;
}
</style>
