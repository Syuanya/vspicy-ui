<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getOperationAuditEvidence } from '../../api/operationAudit'
import { useApiRequest } from '../../composables/useApiRequest'
import ApiState from '../common/ApiState.vue'

const props = defineProps<{
  auditId?: number | string | null
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const request = useApiRequest(getOperationAuditEvidence)
const evidence = computed(() => request.data.value || null)
const current = computed(() => evidence.value?.current || null)

watch(
  () => props.auditId,
  () => reloadEvidence(),
  { immediate: true }
)

function reloadEvidence() {
  const id = props.auditId
  if (id !== null && id !== undefined && id !== '') {
    return request.execute(id, { limit: 30 })
  }
  request.reset()
  return Promise.resolve(null)
}

function close() {
  emit('close')
}

function parseDetail(item: any) {
  if (!item?.detailJson) return null
  try {
    return JSON.parse(item.detailJson)
  } catch {
    return null
  }
}

function prettyDetail(item: any) {
  const parsed = parseDetail(item)
  if (parsed) return JSON.stringify(parsed, null, 2)
  return item?.detailJson || '-'
}

function reasonOf(item: any) {
  const detail = parseDetail(item)
  if (detail?.reason) return detail.reason

  const desc = item?.description || ''
  const marker = 'reason='
  const index = desc.indexOf(marker)
  if (index >= 0) return desc.slice(index + marker.length)

  return '-'
}

function statusOf(item: any) {
  const action = item?.action || ''
  const detail = parseDetail(item)
  if (action.endsWith('_REJECTED') || detail?.rejected === true) return 'REJECTED'
  if (action.includes('FAILED') || action.includes('FAIL')) return 'FAILED'
  if (['RERUN', 'RESET', 'CANCEL', 'SYNC', 'CLEANUP', 'REPAIR'].some((key) => action.includes(key))) return 'DANGER'
  if (action.includes('SUCCESS')) return 'SUCCESS'
  return 'NORMAL'
}

function statusClass(item: any) {
  const status = statusOf(item)
  if (status === 'REJECTED' || status === 'FAILED') return 'pill danger'
  if (status === 'DANGER') return 'pill warning'
  if (status === 'SUCCESS') return 'pill success'
  return 'pill info'
}

function goTargetTimeline() {
  const item = current.value
  if (!item?.targetType || !item?.targetId) return
  router.push({
    path: '/admin/operation-audit',
    query: {
      targetType: item.targetType,
      targetId: item.targetId
    }
  })
  close()
}

function goOperator() {
  const item = current.value
  if (!item?.operatorId) return
  router.push({
    path: '/admin/operation-audit',
    query: {
      operatorId: item.operatorId
    }
  })
  close()
}
</script>

<template>
  <Teleport to="body">
    <div v-if="props.auditId" class="overlay" @click.self="close">
      <aside class="drawer">
        <div class="drawer-head">
          <div>
            <h3>审计证据</h3>
            <p>聚合同 target、同操作人、同 IP 的近期证据，辅助复盘高危操作。</p>
          </div>
          <button class="icon-btn" @click="close">×</button>
        </div>

        <ApiState
          :loading="request.loading.value"
          :error="request.error.value"
          :empty="!evidence || !current"
          @retry="reloadEvidence"
          @clear-error="request.error.value = null"
        >
          <div v-if="current" class="content">
            <section class="summary-card">
              <div class="summary-top">
                <span :class="statusClass(current)">{{ statusOf(current) }}</span>
                <strong>#{{ current.id }}</strong>
              </div>
              <h4>{{ current.action || '-' }}</h4>
              <p>{{ current.description || '-' }}</p>
              <div class="kv-grid">
                <div><small>target</small><span>{{ current.targetType || '-' }} / {{ current.targetId || '-' }}</span></div>
                <div><small>operator</small><span>{{ current.operatorName || '-' }} / {{ current.operatorId || '-' }}</span></div>
                <div><small>ip</small><span>{{ current.requestIp || '-' }}</span></div>
                <div><small>createdAt</small><span>{{ current.createdAt || '-' }}</span></div>
                <div class="wide"><small>reason</small><span>{{ reasonOf(current) }}</span></div>
              </div>
              <div class="drawer-actions">
                <button class="small-btn" :disabled="!current.targetType || !current.targetId" @click="goTargetTimeline">筛选同 target</button>
                <button class="small-btn" :disabled="!current.operatorId" @click="goOperator">筛选同操作人</button>
              </div>
            </section>

            <section v-if="evidence.riskHints?.length" class="hint-card">
              <h4>风险提示</h4>
              <ul>
                <li v-for="hint in evidence.riskHints" :key="hint">{{ hint }}</li>
              </ul>
            </section>

            <section class="block">
              <h4>detailJson</h4>
              <pre>{{ prettyDetail(current) }}</pre>
            </section>

            <section class="block">
              <h4>同 target 时间线</h4>
              <div v-if="evidence.targetTimeline?.length" class="timeline">
                <article v-for="item in evidence.targetTimeline" :key="item.id" class="timeline-item">
                  <span :class="statusClass(item)">{{ statusOf(item) }}</span>
                  <strong>#{{ item.id }} {{ item.action }}</strong>
                  <p>{{ item.description || '-' }}</p>
                  <small>{{ item.createdAt }} · {{ item.operatorName || '-' }} / {{ item.requestIp || '-' }}</small>
                </article>
              </div>
              <p v-else class="empty">暂无同 target 记录</p>
            </section>

            <section class="block two-col">
              <div>
                <h4>同操作人近期</h4>
                <div v-if="evidence.sameOperatorRecent?.length" class="mini-list">
                  <article v-for="item in evidence.sameOperatorRecent" :key="item.id">
                    <strong>#{{ item.id }} {{ item.action }}</strong>
                    <small>{{ item.targetType || '-' }} / {{ item.targetId || '-' }} · {{ item.createdAt }}</small>
                  </article>
                </div>
                <p v-else class="empty">暂无同操作人记录</p>
              </div>
              <div>
                <h4>同 IP 近期</h4>
                <div v-if="evidence.sameIpRecent?.length" class="mini-list">
                  <article v-for="item in evidence.sameIpRecent" :key="item.id">
                    <strong>#{{ item.id }} {{ item.action }}</strong>
                    <small>{{ item.operatorName || '-' }} · {{ item.createdAt }}</small>
                  </article>
                </div>
                <p v-else class="empty">暂无同 IP 记录</p>
              </div>
            </section>
          </div>
        </ApiState>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(17, 24, 39, 0.42);
  display: flex;
  justify-content: flex-end;
}

.drawer {
  width: min(900px, 96vw);
  height: 100vh;
  overflow-y: auto;
  background: #fff;
  box-shadow: -12px 0 30px rgba(15, 23, 42, 0.22);
  padding: 22px;
}

.drawer-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 14px;
  margin-bottom: 16px;
}

.drawer-head h3,
.drawer-head p,
.summary-card h4,
.block h4,
.hint-card h4 {
  margin-top: 0;
}

.drawer-head p,
.summary-card p,
.empty,
.timeline-item small,
.mini-list small {
  color: #6b7280;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background: #fff;
  cursor: pointer;
  font-size: 22px;
}

.content {
  display: grid;
  gap: 16px;
}

.summary-card,
.hint-card,
.block {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 16px;
  background: #fff;
}

.summary-top,
.drawer-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.kv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.kv-grid div {
  border: 1px solid #f3f4f6;
  border-radius: 12px;
  padding: 10px;
  background: #f9fafb;
}

.kv-grid .wide {
  grid-column: 1 / -1;
}

.kv-grid small,
.kv-grid span {
  display: block;
}

.kv-grid small {
  color: #6b7280;
  margin-bottom: 4px;
}

.drawer-actions {
  justify-content: flex-start;
  margin-top: 12px;
}

.small-btn {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 10px;
  padding: 7px 10px;
  cursor: pointer;
}

.small-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.hint-card {
  border-color: #fde68a;
  background: #fffbeb;
}

.hint-card ul {
  margin-bottom: 0;
  padding-left: 18px;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  background: #111827;
  color: #f9fafb;
  border-radius: 12px;
  padding: 14px;
  max-height: 360px;
  overflow: auto;
}

.timeline,
.mini-list {
  display: grid;
  gap: 10px;
}

.timeline-item,
.mini-list article {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 10px;
  background: #f9fafb;
}

.timeline-item strong,
.timeline-item p,
.timeline-item small,
.mini-list strong,
.mini-list small {
  display: block;
  margin-top: 6px;
}

.two-col {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.pill {
  display: inline-block;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
}

.pill.info {
  background: #e5e7eb;
  color: #374151;
}

.pill.success {
  background: #dcfce7;
  color: #166534;
}

.pill.warning {
  background: #fef3c7;
  color: #92400e;
}

.pill.danger {
  background: #fee2e2;
  color: #991b1b;
}

@media (max-width: 760px) {
  .drawer {
    width: 100vw;
    padding: 16px;
  }
}
</style>
