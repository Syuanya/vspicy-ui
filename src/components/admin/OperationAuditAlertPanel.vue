<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  getOperationAuditAlertSummary,
  type OperationAuditAlert
} from '../../api/videoOperationAudit'
import { useApiRequest } from '../../composables/useApiRequest'
import ApiState from '../common/ApiState.vue'

const props = withDefaults(defineProps<{
  hours?: number
  limit?: number
  compact?: boolean
}>(), {
  hours: 24,
  limit: 10,
  compact: false
})

const router = useRouter()
const alertRequest = useApiRequest(getOperationAuditAlertSummary)
const summary = computed(() => alertRequest.data.value)

async function load() {
  await alertRequest.execute({ hours: props.hours, limit: props.limit })
}

function levelClass(level?: string) {
  const value = (level || '').toUpperCase()
  if (value === 'CRITICAL') return 'level critical'
  if (value === 'DANGER') return 'level danger'
  if (value === 'WARNING') return 'level warning'
  if (value === 'INFO') return 'level info'
  return 'level success'
}

function panelClass() {
  const level = (summary.value?.highestLevel || '').toUpperCase()
  if (props.compact) return `alert-panel compact ${level.toLowerCase() || 'success'}`
  return `alert-panel ${level.toLowerCase() || 'success'}`
}

function openAlert(alert: OperationAuditAlert) {
  if (alert.link) {
    router.push(alert.link)
    return
  }
  if (alert.targetType && alert.targetId) {
    router.push({
      path: '/admin/operation-audit',
      query: {
        resultStatus: 'DANGER',
        targetType: alert.targetType,
        targetId: alert.targetId
      }
    })
    return
  }
  if (alert.operatorId) {
    router.push({
      path: '/admin/operation-audit',
      query: {
        resultStatus: 'DANGER',
        operatorId: String(alert.operatorId)
      }
    })
    return
  }
  if (alert.requestIp) {
    router.push({
      path: '/admin/operation-audit',
      query: {
        resultStatus: 'REJECTED',
        requestIp: alert.requestIp
      }
    })
    return
  }
  router.push('/admin/operation-audit?resultStatus=DANGER')
}

function openRejected() {
  router.push('/admin/operation-audit?resultStatus=REJECTED')
}

function openDanger() {
  router.push('/admin/operation-audit?resultStatus=DANGER')
}

function alertMeta(alert: OperationAuditAlert) {
  const parts = []
  if (alert.targetType || alert.targetId) parts.push(`${alert.targetType || '-'} / ${alert.targetId || '-'}`)
  if (alert.operatorName || alert.operatorId) parts.push(`operator=${alert.operatorName || '-'} / ${alert.operatorId || '-'}`)
  if (alert.requestIp) parts.push(`ip=${alert.requestIp}`)
  return parts.length ? parts.join(' · ') : '未绑定具体 target / operator / IP'
}

onMounted(load)
</script>

<template>
  <div :class="panelClass()">
    <div class="alert-head">
      <div>
        <h3>操作审计告警</h3>
        <p>基于最近 {{ props.hours }} 小时审计日志实时聚合，可同步到告警收件箱。</p>
      </div>
      <div class="alert-actions">
        <button class="small-btn" :disabled="alertRequest.loading.value" @click="load">
          {{ alertRequest.loading.value ? '刷新中...' : '刷新告警' }}
        </button>
        <button class="small-btn danger" @click="openRejected">只看被拒绝</button>
        <button class="small-btn warning" @click="openDanger">只看高危</button>
      </div>
    </div>

    <ApiState
      :loading="alertRequest.loading.value"
      :error="alertRequest.error.value"
      :empty="!summary"
      @retry="load"
      @clear-error="alertRequest.error.value = null"
    >
      <div class="summary-grid">
        <button class="summary-card critical" @click="openDanger">
          <small>CRITICAL</small>
          <strong>{{ summary?.criticalCount || 0 }}</strong>
        </button>
        <button class="summary-card danger" @click="openDanger">
          <small>DANGER</small>
          <strong>{{ summary?.dangerCount || 0 }}</strong>
        </button>
        <button class="summary-card warning" @click="openDanger">
          <small>WARNING</small>
          <strong>{{ summary?.warningCount || 0 }}</strong>
        </button>
        <button class="summary-card total" @click="router.push('/admin/operation-audit')">
          <small>ALERTS</small>
          <strong>{{ summary?.totalAlerts || 0 }}</strong>
        </button>
      </div>

      <div v-if="summary?.recentAlerts?.length" class="alert-list">
        <button
          v-for="alert in summary.recentAlerts"
          :key="`${alert.alertType}-${alert.targetType || ''}-${alert.targetId || ''}-${alert.operatorId || ''}-${alert.requestIp || ''}`"
          class="alert-row"
          @click="openAlert(alert)"
        >
          <div class="row-main">
            <span :class="levelClass(alert.alertLevel)">{{ alert.alertLevel }}</span>
            <strong>{{ alert.alertType }}</strong>
            <em>{{ alert.count }} 次</em>
          </div>
          <p>{{ alert.message }}</p>
          <small>{{ alertMeta(alert) }}</small>
          <small>窗口：{{ alert.firstTime || '-' }} ~ {{ alert.lastTime || '-' }}</small>
          <small v-if="alert.evidenceAuditIds?.length">证据 ID：{{ alert.evidenceAuditIds.slice(0, 8).join(', ') }}</small>
        </button>
      </div>
      <p v-else class="empty">当前统计窗口内暂无触发规则的审计告警。</p>
    </ApiState>
  </div>
</template>

<style scoped>
.alert-panel {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}

.alert-panel.compact {
  background: #f9fafb;
}

.alert-panel.critical,
.alert-panel.danger {
  border-color: #fecaca;
}

.alert-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.alert-head h3,
.alert-head p {
  margin-top: 0;
}

.alert-head p,
.empty {
  color: #6b7280;
  margin-bottom: 0;
}

.alert-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.small-btn {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 10px;
  padding: 7px 10px;
  cursor: pointer;
  white-space: nowrap;
}

.small-btn.danger {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
  font-weight: 700;
}

.small-btn.warning {
  border-color: #fde68a;
  background: #fffbeb;
  color: #92400e;
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
  font-size: 26px;
  margin-top: 6px;
}

.summary-card.critical {
  border-color: #fecaca;
  background: #fef2f2;
}

.summary-card.danger {
  border-color: #fed7aa;
  background: #fff7ed;
}

.summary-card.warning {
  border-color: #fde68a;
  background: #fffbeb;
}

.summary-card.total {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.alert-list {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.alert-row {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  padding: 12px;
  text-align: left;
  cursor: pointer;
}

.alert-row:hover {
  border-color: #93c5fd;
  background: #f8fafc;
}

.row-main {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.row-main strong {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.row-main em {
  color: #6b7280;
  font-style: normal;
}

.alert-row p {
  margin: 8px 0;
  color: #374151;
}

.alert-row small {
  display: block;
  color: #6b7280;
  margin-top: 3px;
}

.level {
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

.level.success {
  background: #dcfce7;
  color: #166534;
}

@media (max-width: 760px) {
  .alert-head {
    display: block;
  }

  .alert-actions {
    justify-content: flex-start;
    margin-top: 12px;
  }
}
</style>
