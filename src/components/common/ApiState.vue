<script setup lang="ts">
import ApiErrorBanner from './ApiErrorBanner.vue'

const props = withDefaults(defineProps<{
  loading?: boolean
  error?: unknown | null
  empty?: boolean
  loadingText?: string
  emptyText?: string
  retryText?: string
}>(), {
  loading: false,
  error: null,
  empty: false,
  loadingText: '加载中...',
  emptyText: '暂无数据',
  retryText: '重试'
})

const emit = defineEmits<{
  retry: []
  clearError: []
}>()
</script>

<template>
  <div class="api-state">
    <div v-if="props.loading" class="state loading">
      <slot name="loading">
        {{ props.loadingText }}
      </slot>
    </div>

    <ApiErrorBanner
      v-else-if="props.error"
      :error="props.error"
      @close="emit('clearError')"
    />

    <div v-else-if="props.empty" class="state empty">
      <slot name="empty">
        <p>{{ props.emptyText }}</p>
        <button type="button" @click="emit('retry')">{{ props.retryText }}</button>
      </slot>
    </div>

    <slot v-else></slot>
  </div>
</template>

<style scoped>
.api-state {
  width: 100%;
}

.state {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 18px;
  background: #fff;
  color: #374151;
}

.loading {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.empty {
  text-align: center;
  color: #6b7280;
}

.empty button {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #fff;
  padding: 7px 12px;
  cursor: pointer;
}
</style>
