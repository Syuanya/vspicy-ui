<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getOperationAuditRiskSummary } from '../../api/operationAudit'
import { useApiRequest } from '../../composables/useApiRequest'
import ApiState from '../common/ApiState.vue'

const props = withDefaults(defineProps<{
  hours?: number
  limit?: number
  compact?: boolean
}>(), {
  hours: 24,
  limit: 8,
  compact: false
})

const router = useRouter()
const request = useApiRequest(getOperationAuditRiskSummary)
const summary = computed(() => request.data.value || null)

function load() {
  return request.execute({ hours: props.hours, limit: props.limit })
}

function cardClass(level?: string) {
  if (level === 'critical') return 'risk-card critical'
  if (level === 'danger') return 'risk-card danger'
  if (level === 'warning') return 'risk-card warning'
  return 'risk-card success'
}

function rowLevelClass(level?: string) {
  if (level === 'critical') return 'risk-row critical'
  if (level === 'danger') return 'risk-row danger'
  if (level === 'warning') return 'risk-row warning'
  return 'risk-row success'
}

function goAudit(resultStatus?: string) {
  router.push({
    path: '/admin/operation-audit',
    query: resultStatus ? { resultStatus } : undefined
  })
}

function parseDetail(item: any) {
  if (!item?.detailJson) return {}
  try {
    return JSON.parse(item.detailJson)
  } catch {
    return {}
  }
}


function goTarget(item: any) {
  if (item?.targetType && item?.targetId) {
    router.push({
      path: '/admin/operation-audit',
      query: {
        targetType: item.targetType,
        targetId: item.targetId,
        resultStatus: 'REJECTED'
      }
    })
    return
  }

  goAudit('REJECTED')
}

function reasonOf(item: any) {
  const detail = parseDetail(item)
  if (detail.reason) return detail.reason

  const desc = item?.description || ''
  const marker = 'reason='
  const index = desc.indexOf(marker)
  if (index >= 0) return desc.slice(index + marker.length)

  return '-'
}

onMounted(load)
</script>

<template>
  <div :class="props.compact ? 'risk-panel compact' : 'risk-panel'">
    <div class="risk-head">
      <div>
        <h3>操作审计风险聚合</h3>
        <p>按最近 {{ props.hours }} 小时聚合高危、被拒绝操作，并列出 Top action / operator / IP。</p>
      </div>
      <div class="risk-actions">
        <button class="small-btn" :disabled="request.loading.value" @click="load">
          {{ request.loading.value ? '刷新中...' : '刷新' }}
        </button>
        <button class="small-btn danger" @click="goAudit('REJECTED')">查看被拒绝</button>
      </div>
    </div>

    <ApiState
      :loading="request.loading.value"
      :error="request.error.value"
      :empty="!summary"
      @retry="load"
      @clear-error="request.error.value = null"
    >
      <div v-if="summary" class="risk-summary">
        <button :class="cardClass(summary.riskLevel)" @click="goAudit('DANGER')">
          <small>风险等级</small>
          <strong>{{ String(summary.riskLevel || 'success').toUpperCase() }}</strong>
        </button>
        <button class="risk-card" @click="goAudit()">
          <small>总操作</small>
          <strong>{{ summary.totalCount || 0 }}</strong>
        </button>
        <button class="risk-card danger" @click="goAudit('REJECTED')">
          <small>被拒绝</small>
          <strong>{{ summary.rejectedCount || 0 }}</strong>
        </button>
        <button class="risk-card warning" @click="goAudit('DANGER')">
          <small>高危</small>
          <strong>{{ summary.dangerCount || 0 }}</strong>
        </button>
      </div>

      <div v-if="summary" class="risk-grids">
        <div class="risk-block">
          <h4>Top action</h4>
          <div v-if="summary.actionStats?.length" class="risk-list">
            <button
              v-for="item in summary.actionStats"
              :key="item.action || 'unknown'"
              :class="rowLevelClass(item.riskLevel)"
              @click="router.push({ path: '/admin/operation-audit', query: { action: item.action } })"
            >
              <span>{{ item.action || '-' }}</span>
              <strong>{{ item.count || 0 }}</strong>
              <small>拒绝 {{ item.rejectedCount || 0 }} / 高危 {{ item.dangerCount || 0 }}</small>
            </button>
          </div>
          <p v-else class="empty">暂无 action 聚合数据</p>
        </div>

        <div class="risk-block">
          <h4>Top operator</h4>
          <div v-if="summary.operatorStats?.length" class="risk-list">
            <button
              v-for="item in summary.operatorStats"
              :key="`${item.operatorId || 'system'}-${item.operatorName}`"
              :class="rowLevelClass(item.riskLevel)"
              @click="router.push({ path: '/admin/operation-audit', query: { operatorId: item.operatorId || '' } })"
            >
              <span>{{ item.operatorName || 'system' }}</span>
              <strong>{{ item.count || 0 }}</strong>
              <small>拒绝 {{ item.rejectedCount || 0 }} / 高危 {{ item.dangerCount || 0 }}</small>
            </button>
          </div>
          <p v-else class="empty">暂无操作人聚合数据</p>
        </div>

        <div class="risk-block">
          <h4>Top IP</h4>
          <div v-if="summary.ipStats?.length" class="risk-list">
            <div
              v-for="item in summary.ipStats"
              :key="item.requestIp || '-'"
              :class="rowLevelClass(item.riskLevel)"
            >
              <span>{{ item.requestIp || '-' }}</span>
              <strong>{{ item.count || 0 }}</strong>
              <small>拒绝 {{ item.rejectedCount || 0 }} / 高危 {{ item.dangerCount || 0 }}</small>
            </div>
          </div>
          <p v-else class="empty">暂无 IP 聚合数据</p>
        </div>
      </div>

      <div v-if="summary?.recentRejected?.length" class="rejected-box">
        <div class="sub-head">
          <h4>最近被拒绝操作</h4>
          <button class="small-link" @click="goAudit('REJECTED')">进入审计页</button>
        </div>
        <div class="rejected-list">
          <button v-for="item in summary.recentRejected" :key="item.id" class="rejected-item" @click="goTarget(item)">
            <span>{{ item.action }}</span>
            <strong>{{ item.targetType || '-' }} / {{ item.targetId || '-' }}</strong>
            <p>{{ item.description || '-' }}</p>
            <small>reason：{{ reasonOf(item) }} · {{ item.createdAt }}</small>
          </button>
        </div>
      </div>
    </ApiState>
  </div>
</template>

<style scoped>
.risk-panel {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}

.risk-panel.compact {
  background: #f9fafb;
}

.risk-head,
.sub-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.risk-head h3,
.risk-head p,
.sub-head h4 {
  margin-top: 0;
}

.risk-head p,
.empty {
  color: #6b7280;
  margin-bottom: 0;
}

.risk-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.small-btn,
.small-link {
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

.small-link {
  color: #2563eb;
}

.risk-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.risk-card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  padding: 14px;
  text-align: left;
  cursor: pointer;
}

.risk-card small,
.risk-row small {
  display: block;
  color: #6b7280;
}

.risk-card strong {
  display: block;
  font-size: 24px;
  margin-top: 6px;
}

.risk-grids {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.risk-block {
  border: 1px solid #f3f4f6;
  border-radius: 16px;
  padding: 14px;
  background: #fff;
}

.risk-block h4 {
  margin: 0 0 10px;
}

.risk-list {
  display: grid;
  gap: 8px;
}

.risk-row {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 10px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.risk-row span,
.risk-row strong {
  display: block;
}

.risk-row strong {
  font-size: 20px;
  margin-top: 4px;
}

.risk-card.success,
.risk-row.success {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.risk-card.warning,
.risk-row.warning {
  border-color: #fde68a;
  background: #fffbeb;
}

.risk-card.danger,
.risk-row.danger {
  border-color: #fecaca;
  background: #fef2f2;
}

.risk-card.critical,
.risk-row.critical {
  border-color: #fca5a5;
  background: #fee2e2;
}

.rejected-box {
  margin-top: 16px;
  border: 1px solid #fecaca;
  border-radius: 16px;
  padding: 14px;
  background: #fff1f2;
}

.rejected-list {
  display: grid;
  gap: 8px;
}

.rejected-item {
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: #fff;
  padding: 10px;
  text-align: left;
  cursor: pointer;
}

.rejected-item span {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 999px;
  background: #fee2e2;
  color: #991b1b;
  font-size: 12px;
  font-weight: 700;
}

.rejected-item strong,
.rejected-item p,
.rejected-item small {
  display: block;
  margin-top: 6px;
}

.rejected-item p,
.rejected-item small {
  color: #6b7280;
}

@media (max-width: 760px) {
  .risk-head,
  .sub-head {
    display: block;
  }

  .risk-actions {
    justify-content: flex-start;
    margin-top: 10px;
  }
}
</style>
