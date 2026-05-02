<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ackOperationAuditAlertEvent,
  getOperationAuditAlertEventSummary,
  listOperationAuditAlertEvents,
  resolveOperationAuditAlertEvent,
  syncOperationAuditAlertEvents,
  type OperationAuditAlertEvent
} from '../../api/videoOperationAudit'
import { useApiRequest } from '../../composables/useApiRequest'
import ApiState from '../common/ApiState.vue'

const props = withDefaults(defineProps<{
  hours?: number
  limit?: number
  compact?: boolean
}>(), {
  hours: 24,
  limit: 20,
  compact: false
})

const router = useRouter()
const status = ref<'OPEN' | 'ACKED' | 'RESOLVED' | 'ALL'>('OPEN')
const level = ref('')
const message = ref('')

const summaryRequest = useApiRequest(getOperationAuditAlertEventSummary)
const listRequest = useApiRequest(listOperationAuditAlertEvents)
const syncRequest = useApiRequest(syncOperationAuditAlertEvents)
const ackRequest = useApiRequest(ackOperationAuditAlertEvent)
const resolveRequest = useApiRequest(resolveOperationAuditAlertEvent)

const summary = computed(() => summaryRequest.data.value)
const rows = computed<OperationAuditAlertEvent[]>(() => listRequest.data.value || [])

function panelClass() {
  const highest = (summary.value?.highestLevel || 'SUCCESS').toLowerCase()
  return props.compact ? `event-inbox compact ${highest}` : `event-inbox ${highest}`
}

function levelClass(value?: string) {
  const levelValue = (value || '').toUpperCase()
  if (levelValue === 'CRITICAL') return 'level critical'
  if (levelValue === 'DANGER') return 'level danger'
  if (levelValue === 'WARNING') return 'level warning'
  return 'level info'
}

function statusClass(value?: string) {
  const statusValue = (value || '').toUpperCase()
  if (statusValue === 'OPEN') return 'status open'
  if (statusValue === 'ACKED') return 'status acked'
  if (statusValue === 'RESOLVED') return 'status resolved'
  return 'status'
}

function clearErrors() {
  listRequest.error.value = null
  summaryRequest.error.value = null
  syncRequest.error.value = null
  ackRequest.error.value = null
  resolveRequest.error.value = null
}

function loadList() {
  return listRequest.execute({
    status: status.value,
    level: level.value || undefined,
    limit: props.limit
  })
}

async function loadAll() {
  message.value = ''
  await Promise.all([
    summaryRequest.execute(),
    loadList()
  ])
}

async function syncInbox() {
  message.value = ''
  const result: any = await syncRequest.execute({ hours: props.hours, limit: Math.max(props.limit, 100) })
  if (result) {
    message.value = `已同步 ${result.generatedCount || 0} 条实时告警，OPEN=${result.openCount || 0}，ACKED=${result.ackedCount || 0}`
    await loadAll()
  }
}

async function ack(row: OperationAuditAlertEvent) {
  if (!row?.id) return
  const result = await ackRequest.execute(row.id)
  if (result) {
    message.value = `已确认告警 #${row.id}`
    await loadAll()
  }
}

async function resolve(row: OperationAuditAlertEvent) {
  if (!row?.id) return
  const result = await resolveRequest.execute(row.id)
  if (result) {
    message.value = `已解决告警 #${row.id}`
    await loadAll()
  }
}

function openAlert(row: OperationAuditAlertEvent) {
  if (row.link) {
    router.push(row.link)
    return
  }
  if (row.targetType && row.targetId) {
    router.push({
      path: '/admin/operation-audit',
      query: {
        resultStatus: 'DANGER',
        targetType: row.targetType,
        targetId: row.targetId
      }
    })
    return
  }
  if (row.requestIp) {
    router.push({ path: '/admin/operation-audit', query: { resultStatus: 'REJECTED', requestIp: row.requestIp } })
    return
  }
  router.push('/admin/operation-audit?resultStatus=DANGER')
}

function meta(row: OperationAuditAlertEvent) {
  const parts = []
  if (row.targetType || row.targetId) parts.push(`${row.targetType || '-'} / ${row.targetId || '-'}`)
  if (row.operatorName || row.operatorId) parts.push(`operator=${row.operatorName || '-'} / ${row.operatorId || '-'}`)
  if (row.requestIp) parts.push(`ip=${row.requestIp}`)
  return parts.length ? parts.join(' · ') : '未绑定 target / operator / IP'
}

onMounted(loadAll)
</script>

<template>
  <div :class="panelClass()">
    <div class="head">
      <div>
        <h3>审计告警收件箱</h3>
        <p>将实时告警同步为可确认、可解决的事件，用于持续跟踪处理闭环。</p>
      </div>
      <div class="head-actions">
        <select v-model="status" class="select" @change="loadList">
          <option value="OPEN">OPEN 待处理</option>
          <option value="ACKED">ACKED 已确认</option>
          <option value="RESOLVED">RESOLVED 已解决</option>
          <option value="ALL">全部状态</option>
        </select>
        <select v-model="level" class="select" @change="loadList">
          <option value="">全部级别</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="DANGER">DANGER</option>
          <option value="WARNING">WARNING</option>
          <option value="INFO">INFO</option>
        </select>
        <button class="small-btn" :disabled="listRequest.loading.value" @click="loadAll">刷新</button>
        <button class="small-btn danger" :disabled="syncRequest.loading.value" @click="syncInbox">
          {{ syncRequest.loading.value ? '同步中...' : '同步实时告警' }}
        </button>
      </div>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="summary-grid">
      <button class="summary-card open" @click="status = 'OPEN'; loadList()">
        <small>OPEN</small>
        <strong>{{ summary?.openCount || 0 }}</strong>
      </button>
      <button class="summary-card critical" @click="status = 'OPEN'; level = 'CRITICAL'; loadList()">
        <small>CRITICAL OPEN</small>
        <strong>{{ summary?.criticalOpenCount || 0 }}</strong>
      </button>
      <button class="summary-card danger" @click="status = 'OPEN'; level = 'DANGER'; loadList()">
        <small>DANGER OPEN</small>
        <strong>{{ summary?.dangerOpenCount || 0 }}</strong>
      </button>
      <button class="summary-card acked" @click="status = 'ACKED'; level = ''; loadList()">
        <small>ACKED</small>
        <strong>{{ summary?.ackedCount || 0 }}</strong>
      </button>
      <button class="summary-card resolved" @click="status = 'RESOLVED'; level = ''; loadList()">
        <small>RESOLVED</small>
        <strong>{{ summary?.resolvedCount || 0 }}</strong>
      </button>
    </div>

    <ApiState
      :loading="listRequest.loading.value || summaryRequest.loading.value"
      :error="listRequest.error.value || summaryRequest.error.value || syncRequest.error.value || ackRequest.error.value || resolveRequest.error.value"
      :empty="!rows.length"
      @retry="loadAll"
      @clear-error="clearErrors"
    >
      <div class="rows">
        <div v-for="row in rows" :key="row.id" class="row">
          <button class="row-main" @click="openAlert(row)">
            <div class="badges">
              <span :class="levelClass(row.alertLevel)">{{ row.alertLevel }}</span>
              <span :class="statusClass(row.status)">{{ row.status }}</span>
              <strong>{{ row.alertType }}</strong>
              <em>{{ row.count || 0 }} 次</em>
            </div>
            <p>{{ row.message || row.title }}</p>
            <small>{{ meta(row) }}</small>
            <small>首次：{{ row.firstSeenAt || '-' }} · 最近：{{ row.lastSeenAt || '-' }}</small>
            <small v-if="row.evidenceAuditIds?.length">证据 ID：{{ row.evidenceAuditIds.slice(0, 8).join(', ') }}</small>
          </button>
          <div class="row-actions">
            <button class="mini" :disabled="row.status !== 'OPEN' || ackRequest.loading.value" @click.stop="ack(row)">确认</button>
            <button class="mini danger" :disabled="row.status === 'RESOLVED' || resolveRequest.loading.value" @click.stop="resolve(row)">解决</button>
          </div>
        </div>
      </div>
    </ApiState>
  </div>
</template>

<style scoped>
.event-inbox {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}

.event-inbox.compact {
  background: #f9fafb;
}

.event-inbox.critical,
.event-inbox.danger {
  border-color: #fecaca;
}

.head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.head h3,
.head p {
  margin-top: 0;
}

.head p,
.message {
  color: #6b7280;
}

.head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.select,
.small-btn,
.mini {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 10px;
  padding: 7px 10px;
  cursor: pointer;
  white-space: nowrap;
}

.small-btn.danger,
.mini.danger {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
  font-weight: 700;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.summary-card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  padding: 14px;
  text-align: left;
  cursor: pointer;
}

.summary-card small {
  display: block;
  color: #6b7280;
}

.summary-card strong {
  display: block;
  font-size: 24px;
  margin-top: 6px;
}

.summary-card.open,
.summary-card.critical {
  border-color: #fecaca;
  background: #fef2f2;
}

.summary-card.danger {
  border-color: #fed7aa;
  background: #fff7ed;
}

.summary-card.acked {
  border-color: #fde68a;
  background: #fffbeb;
}

.summary-card.resolved {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.rows {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.row {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  padding: 12px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.row:hover {
  border-color: #93c5fd;
}

.row-main {
  background: transparent;
  border: 0;
  text-align: left;
  cursor: pointer;
  padding: 0;
  min-width: 0;
}

.badges {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.badges strong {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.badges em {
  color: #6b7280;
  font-style: normal;
}

.row-main p {
  margin: 8px 0;
  color: #374151;
}

.row-main small {
  display: block;
  color: #6b7280;
  margin-top: 3px;
}

.row-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.level,
.status {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.level.critical {
  background: #7f1d1d;
  color: #fff;
}

.level.danger {
  background: #fee2e2;
  color: #991b1b;
}

.level.warning {
  background: #fef3c7;
  color: #92400e;
}

.level.info {
  background: #dbeafe;
  color: #1d4ed8;
}

.status.open {
  background: #fee2e2;
  color: #991b1b;
}

.status.acked {
  background: #fef3c7;
  color: #92400e;
}

.status.resolved {
  background: #dcfce7;
  color: #166534;
}

@media (max-width: 760px) {
  .head,
  .row {
    display: block;
  }

  .head-actions,
  .row-actions {
    justify-content: flex-start;
    margin-top: 12px;
  }
}
</style>
