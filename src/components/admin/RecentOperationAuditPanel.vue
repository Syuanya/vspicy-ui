<script setup lang="ts">
import { onMounted } from 'vue'
import { getRecentOperationAudit } from '../../api/operationAudit'
import { useApiRequest } from '../../composables/useApiRequest'
import ApiState from '../common/ApiState.vue'

const props = withDefaults(defineProps<{
  limit?: number
}>(), {
  limit: 10
})

const request = useApiRequest(() => getRecentOperationAudit(props.limit))

function isRejected(item: any) {
  const action = item?.action || ''
  const detail = parseDetail(item)
  return action.endsWith('_REJECTED') || detail.rejected === true
}

function actionClass(action: string) {
  if (!action) return 'action'
  if (action.endsWith('_REJECTED')) return 'action danger'
  if (action.includes('FAILED') || action.includes('FAIL') || action.includes('CANCEL') || action.includes('CLEANUP')) return 'action danger'
  if (action.includes('RERUN') || action.includes('RESET') || action.includes('SYNC') || action.includes('REPAIR')) return 'action warning'
  if (action.includes('SUCCESS')) return 'action success'
  return 'action info'
}

function itemClass(item: any) {
  return isRejected(item) ? 'audit-item rejected' : 'audit-item'
}

function parseDetail(item: any) {
  if (!item?.detailJson) return {}
  try {
    return JSON.parse(item.detailJson)
  } catch {
    return {}
  }
}

function reasonOf(item: any) {
  const detail = parseDetail(item)
  if (detail.reason) return detail.reason

  const desc = item.description || ''
  const marker = 'reason='
  const index = desc.indexOf(marker)
  if (index >= 0) return desc.slice(index + marker.length)

  return ''
}

onMounted(() => request.execute())

defineExpose({
  refresh: request.execute
})
</script>

<template>
  <div class="recent-audit-panel">
    <div class="head">
      <div>
        <h3>最近运维操作</h3>
        <p class="muted">展示最近 {{ props.limit }} 条审计记录。</p>
      </div>
      <button class="small-btn" :disabled="request.loading.value" @click="request.execute">
        {{ request.loading.value ? '刷新中...' : '刷新' }}
      </button>
    </div>

    <ApiState
      :loading="request.loading.value"
      :error="request.error.value"
      :empty="!(request.data.value && request.data.value.length)"
      empty-text="暂无运维操作记录"
      @retry="request.execute"
      @clear-error="request.error.value = null"
    >
      <div class="audit-list">
        <div v-for="item in request.data.value" :key="item.id" :class="itemClass(item)">
          <div>
            <span :class="actionClass(item.action)">{{ item.action }}</span>
            <span v-if="isRejected(item)" class="rejected-badge">已拒绝</span>
            <strong>{{ item.targetType || '-' }} / {{ item.targetId || '-' }}</strong>
            <p>{{ item.description || '-' }}</p>
            <p v-if="reasonOf(item)" class="reason">reason：{{ reasonOf(item) }}</p>
          </div>
          <div class="meta">
            <span>{{ item.operatorName || 'system' }}</span>
            <small>{{ item.createdAt }}</small>
          </div>
        </div>
      </div>
    </ApiState>
  </div>
</template>

<style scoped>
.recent-audit-panel {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}

.head,
.audit-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.muted {
  color: #6b7280;
  margin: 4px 0 0;
}

.small-btn {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 10px;
  padding: 7px 10px;
  cursor: pointer;
}

.audit-list {
  display: grid;
  gap: 10px;
}

.audit-item {
  border: 1px solid #f3f4f6;
  border-radius: 14px;
  padding: 12px;
  background: #f9fafb;
}

.audit-item.rejected {
  border-color: #fecaca;
  background: #fff1f2;
}

.rejected-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 3px 9px;
  border-radius: 999px;
  background: #fee2e2;
  color: #991b1b;
  font-size: 12px;
  font-weight: 700;
}

.audit-item strong,
.audit-item p {
  display: block;
  margin-top: 6px;
}

.audit-item p {
  color: #6b7280;
}

.audit-item .reason {
  color: #92400e;
  font-weight: 600;
}

.meta {
  text-align: right;
  white-space: nowrap;
}

.meta span,
.meta small {
  display: block;
}

.meta small {
  color: #6b7280;
  margin-top: 4px;
}

.action {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 12px;
}

.action.info {
  background: #dbeafe;
  color: #1d4ed8;
}

.action.success {
  background: #dcfce7;
  color: #166534;
}

.action.warning {
  background: #fef3c7;
  color: #92400e;
}

.action.danger {
  background: #fee2e2;
  color: #991b1b;
}
</style>
