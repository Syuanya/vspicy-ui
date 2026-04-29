<script setup lang="ts">
import { computed } from 'vue'
import { normalizeApiError } from '../../api/apiError'

const props = defineProps<{
  error?: unknown | null
}>()

const normalized = computed(() => {
  if (!props.error) return null
  return normalizeApiError(props.error)
})

const visible = computed(() => normalized.value?.type === 'VALIDATION')
</script>

<template>
  <div v-if="visible" class="validation-hint">
    <strong>校验未通过</strong>
    <p>{{ normalized?.message }}</p>
  </div>
</template>

<style scoped>
.validation-hint {
  border: 1px solid #fde68a;
  background: #fffbeb;
  color: #92400e;
  border-radius: 14px;
  padding: 12px;
  margin: 10px 0;
}

.validation-hint strong,
.validation-hint p {
  display: block;
}

.validation-hint p {
  margin: 6px 0 0;
}
</style>
