<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  cleanupResolvedOperationAuditAlertEvents,
  getOperationAuditAlertEventAutomationStatus,
  syncOperationAuditAlertEventsOnce
} from '../../api/videoOperationAudit'
import { useApiRequest } from '../../composables/useApiRequest'
import ApiState from '../common/ApiState.vue'

const props = withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false
})

const statusRequest = useApiRequest(getOperationAuditAlertEventAutomationStatus)
const cleanupResult = ref<any>(null)
const message = ref('')
const operating = ref(false)

const syncForm = ref({
  hours: 24,
  limit: 100
})

const cleanupForm = ref({
  retentionDays: 30,
  limit: 500
})

async function load() {
  message.value = ''
  await statusRequest.execute()
}

async function syncOnce() {
  operating.value = true
  message.value = ''

  try {
    const res: any = await syncOperationAuditAlertEventsOnce({
      hours: Number(syncForm.value.hours),
      limit: Number(syncForm.value.limit)
    })

    if (res.code === 0) {
      message.value = '告警同步已触发'
      await load()
    } else {
      message.value = res.message || '同步失败'
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '同步失败'
  } finally {
    operating.value = false
  }
}

async function cleanup(dryRun: boolean) {
  operating.value = true
  message.value = ''

  try {
    const res: any = await cleanupResolvedOperationAuditAlertEvents({
      retentionDays: Number(cleanupForm.value.retentionDays),
      limit: Number(cleanupForm.value.limit),
      dryRun
    })

    if (res.code === 0) {
      cleanupResult.value = res.data
      message.value = res.data?.message || '清理完成'
    } else {
      message.value = res.message || '清理失败'
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '清理失败'
  } finally {
    operating.value = false
  }
}

function statusClass(enabled: boolean, running: boolean, lastErrorMessage?: string) {
  if (running) return 'pill warning'
  if (lastErrorMessage) return 'pill danger'
  if (enabled) return 'pill success'
  return 'pill info'
}

onMounted(load)

defineExpose({
  refresh: load
})
</script>

<template>
  <section class="automation-panel">
    <div class="head">
      <div>
        <h3>告警自动化</h3>
        <p class="muted">自动同步操作审计告警收件箱，并清理历史 RESOLVED 告警。</p>
      </div>
      <button class="small-btn" :disabled="statusRequest.loading.value" @click="load">
        {{ statusRequest.loading.value ? '刷新中...' : '刷新' }}
      </button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <ApiState
      :loading="statusRequest.loading.value"
      :error="statusRequest.error.value"
      :empty="!statusRequest.data.value"
      @retry="load"
      @clear-error="statusRequest.error.value = null"
    >
      <div v-if="statusRequest.data.value" class="summary">
        <span :class="statusClass(statusRequest.data.value.enabled, statusRequest.data.value.running, statusRequest.data.value.lastErrorMessage)">
          {{ statusRequest.data.value.running ? 'RUNNING' : (statusRequest.data.value.enabled ? 'ENABLED' : 'DISABLED') }}
        </span>
        <div>
          <small>hours / limit</small>
          <strong>{{ statusRequest.data.value.hours }} / {{ statusRequest.data.value.limit }}</strong>
        </div>
        <div>
          <small>delay</small>
          <strong>{{ Math.round((statusRequest.data.value.fixedDelayMs || 0) / 1000) }}s</strong>
        </div>
        <div>
          <small>last generated</small>
          <strong>{{ statusRequest.data.value.lastGeneratedCount ?? '-' }}</strong>
        </div>
        <div>
          <small>last open</small>
          <strong>{{ statusRequest.data.value.lastOpenCount ?? '-' }}</strong>
        </div>
      </div>

      <div v-if="statusRequest.data.value" class="meta-grid">
        <p><strong>lastRunAt：</strong>{{ statusRequest.data.value.lastRunAt || '-' }}</p>
        <p><strong>lastSuccessAt：</strong>{{ statusRequest.data.value.lastSuccessAt || '-' }}</p>
        <p><strong>lastErrorAt：</strong>{{ statusRequest.data.value.lastErrorAt || '-' }}</p>
        <p><strong>lastMessage：</strong>{{ statusRequest.data.value.lastMessage || '-' }}</p>
        <p v-if="statusRequest.data.value.lastErrorMessage" class="error">
          <strong>lastError：</strong>{{ statusRequest.data.value.lastErrorMessage }}
        </p>
      </div>

      <div class="ops-grid" :class="{ compact: props.compact }">
        <div class="op-card">
          <h4>手动同步一次</h4>
          <div class="form-grid">
            <label>
              <span>hours</span>
              <input v-model="syncForm.hours" class="input" type="number" min="1" max="168" />
            </label>
            <label>
              <span>limit</span>
              <input v-model="syncForm.limit" class="input" type="number" min="1" max="500" />
            </label>
          </div>
          <button class="small-btn primary" :disabled="operating" @click="syncOnce">
            同步一次
          </button>
        </div>

        <div class="op-card">
          <h4>清理 RESOLVED 告警</h4>
          <div class="form-grid">
            <label>
              <span>保留天数</span>
              <input v-model="cleanupForm.retentionDays" class="input" type="number" min="1" max="365" />
            </label>
            <label>
              <span>limit</span>
              <input v-model="cleanupForm.limit" class="input" type="number" min="1" max="5000" />
            </label>
          </div>
          <div class="button-row">
            <button class="small-btn" :disabled="operating" @click="cleanup(true)">dryRun</button>
            <button class="small-btn danger" :disabled="operating" @click="cleanup(false)">正式清理</button>
          </div>
        </div>
      </div>

      <div v-if="cleanupResult" class="cleanup-result">
        <h4>最近清理结果</h4>
        <p>
          candidate={{ cleanupResult.candidateCount }},
          deleted={{ cleanupResult.deletedCount }},
          dryRun={{ cleanupResult.dryRun ? 'YES' : 'NO' }}
        </p>
        <p class="muted">{{ cleanupResult.message }}</p>
      </div>
    </ApiState>
  </section>
</template>

<style scoped>
.automation-panel {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}

.head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.muted {
  color: #6b7280;
  margin: 4px 0 0;
}

.message {
  color: #374151;
}

.error {
  color: #991b1b;
}

.small-btn {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 10px;
  padding: 7px 10px;
  cursor: pointer;
}

.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.danger {
  background: #dc2626;
  border-color: #dc2626;
  color: #fff;
}

.summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.summary > div,
.summary > span {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 10px;
  background: #f9fafb;
}

.summary small {
  display: block;
  color: #6b7280;
}

.summary strong {
  display: block;
  margin-top: 5px;
  font-size: 20px;
}

.pill {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.pill.success {
  background: #dcfce7;
  color: #166534;
  border-color: #bbf7d0;
}

.pill.warning {
  background: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
}

.pill.danger {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fecaca;
}

.pill.info {
  background: #dbeafe;
  color: #1d4ed8;
  border-color: #bfdbfe;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 8px 14px;
  color: #374151;
  margin-bottom: 14px;
}

.meta-grid p {
  margin: 0;
  word-break: break-all;
}

.ops-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.ops-grid.compact {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.op-card {
  border: 1px solid #f3f4f6;
  border-radius: 16px;
  padding: 14px;
  background: #f9fafb;
}

.op-card h4 {
  margin: 0 0 10px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

label span {
  display: block;
  color: #6b7280;
  margin-bottom: 5px;
  font-size: 12px;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cleanup-result {
  border: 1px solid #dbeafe;
  background: #eff6ff;
  border-radius: 14px;
  padding: 12px;
  margin-top: 14px;
}
</style>
