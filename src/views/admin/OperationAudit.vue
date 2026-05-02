<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  buildOperationAuditExportUrl,
  getOperationAuditActions,
  getOperationAuditStats,
  listOperationAuditAdvanced,
  recordOperationAudit
} from '../../api/videoOperationAudit'
import { useApiRequest } from '../../composables/useApiRequest'
import ApiState from '../../components/common/ApiState.vue'
import OperationAuditRiskPanel from '../../components/admin/OperationAuditRiskPanel.vue'
import OperationAuditAlertPanel from '../../components/admin/OperationAuditAlertPanel.vue'
import OperationAuditAlertEventInbox from '../../components/admin/OperationAuditAlertEventInbox.vue'
import OperationAuditAlertAutomationPanel from '../../components/admin/OperationAuditAlertAutomationPanel.vue'
import OperationAuditEvidenceDrawer from '../../components/admin/OperationAuditEvidenceDrawer.vue'

const route = useRoute()
const statsRequest = useApiRequest(getOperationAuditStats)
const actionsRequest = useApiRequest(getOperationAuditActions)
const listRequest = useApiRequest(listOperationAuditAdvanced)
const message = ref('')
const selectedAuditId = ref<number | null>(null)

const filter = ref({
  action: '',
  targetType: '',
  targetId: '',
  operatorId: '',
  requestIp: '',
  startTime: '',
  endTime: '',
  resultStatus: 'ALL',
  limit: 100
})

const testForm = ref({
  action: 'TEST',
  targetType: 'SYSTEM',
  targetId: 'manual',
  operatorId: 1,
  operatorName: 'vspicy',
  description: 'manual audit test',
  detailJson: '{"source":"OperationAudit.vue","reason":"manual test reason"}'
})

const statsCards = computed(() => {
  const s = statsRequest.data.value || {}
  return [
    { label: 'TOTAL', value: s.totalCount || 0 },
    { label: 'TODAY', value: s.todayCount || 0 },
    { label: 'TRANSCODE', value: s.transcodeActionCount || 0 },
    { label: 'PLAYBACK', value: s.playbackActionCount || 0 },
    { label: 'CLEANUP', value: s.cleanupActionCount || 0 },
    { label: 'HLS REPAIR', value: s.hlsRepairActionCount || 0 },
    { label: 'STORAGE', value: s.storageActionCount || 0 },
    { label: 'REJECTED', value: s.rejectedActionCount || 0, level: 'danger' },
    { label: 'DANGER', value: s.dangerActionCount || 0, level: 'warning' },
    { label: 'SUCCESS', value: s.successActionCount || 0, level: 'success' }
  ]
})

function applyRouteQuery() {
  const q = route.query
  filter.value.action = typeof q.action === 'string' ? q.action : ''
  filter.value.targetType = typeof q.targetType === 'string' ? q.targetType : ''
  filter.value.targetId = typeof q.targetId === 'string' ? q.targetId : ''
  filter.value.operatorId = typeof q.operatorId === 'string' ? q.operatorId : ''
  filter.value.requestIp = typeof q.requestIp === 'string' ? q.requestIp : ''
  filter.value.resultStatus = typeof q.resultStatus === 'string' && q.resultStatus ? q.resultStatus : 'ALL'
}

function queryParams() {
  return {
    action: filter.value.action || undefined,
    targetType: filter.value.targetType || undefined,
    targetId: filter.value.targetId || undefined,
    operatorId: filter.value.operatorId ? Number(filter.value.operatorId) : undefined,
    requestIp: filter.value.requestIp || undefined,
    startTime: filter.value.startTime || undefined,
    endTime: filter.value.endTime || undefined,
    resultStatus: filter.value.resultStatus && filter.value.resultStatus !== 'ALL' ? filter.value.resultStatus : undefined,
    limit: Number(filter.value.limit) || 100
  }
}

async function loadAll() {
  await Promise.all([
    statsRequest.execute(),
    actionsRequest.execute(),
    search()
  ])
}

async function search() {
  await listRequest.execute(queryParams())
}

function resetFilter() {
  filter.value = {
    action: '',
    targetType: '',
    targetId: '',
    operatorId: '',
    requestIp: '',
    startTime: '',
    endTime: '',
    resultStatus: 'ALL',
    limit: 100
  }
  search()
}

function exportCsv() {
  const url = buildOperationAuditExportUrl({
    ...queryParams(),
    limit: Math.max(Number(filter.value.limit) || 500, 500)
  })
  window.open(url, '_blank')
}

async function recordTest() {
  message.value = ''
  const res: any = await recordOperationAudit({
    action: testForm.value.action,
    targetType: testForm.value.targetType,
    targetId: testForm.value.targetId,
    operatorId: Number(testForm.value.operatorId),
    operatorName: testForm.value.operatorName,
    description: testForm.value.description,
    detailJson: testForm.value.detailJson
  })

  if (res.code === 0) {
    message.value = '测试审计日志已写入'
    await loadAll()
  } else {
    message.value = res.message || '写入失败'
  }
}

function isRejected(item: any) {
  const action = item?.action || ''
  const detail = parseDetail(item)
  return action.endsWith('_REJECTED') || detail.rejected === true
}

function isDangerAction(action: string) {
  return ['RERUN', 'RESET', 'CANCEL', 'FAIL', 'SYNC', 'CLEANUP', 'REPAIR']
    .some((key) => action.includes(key))
}

function auditStatus(item: any) {
  const action = item?.action || ''
  if (isRejected(item)) return 'REJECTED'
  if (action.includes('FAILED') || action.includes('FAIL')) return 'FAILED'
  if (isDangerAction(action)) return 'DANGER'
  if (action.includes('SUCCESS')) return 'SUCCESS'
  return 'NORMAL'
}

function actionClass(action: string) {
  if (!action) return 'action'
  if (action.endsWith('_REJECTED')) return 'action danger'
  if (action.includes('FAILED') || action.includes('FAIL') || action.includes('CANCEL') || action.includes('CLEANUP')) return 'action danger'
  if (action.includes('RERUN') || action.includes('RESET') || action.includes('SYNC') || action.includes('REPAIR')) return 'action warning'
  if (action.includes('SUCCESS')) return 'action success'
  return 'action info'
}

function statusClass(item: any) {
  const status = auditStatus(item)
  if (status === 'REJECTED' || status === 'FAILED') return 'status danger'
  if (status === 'DANGER') return 'status warning'
  if (status === 'SUCCESS') return 'status success'
  return 'status info'
}

function rowClass(item: any) {
  return isRejected(item) ? 'rejected-row' : ''
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

  return '-'
}

watch(
  () => route.query,
  () => {
    applyRouteQuery()
    search()
  }
)

onMounted(() => {
  applyRouteQuery()
  loadAll()
})
</script>

<template>
  <section class="card">
    <div class="top">
      <div>
        <h2>操作审计</h2>
        <p>查看运维操作记录，支持 action、操作人、时间范围筛选和 CSV 导出。</p>
      </div>
      <button class="button" @click="loadAll">刷新</button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <ApiState
      :loading="statsRequest.loading.value"
      :error="statsRequest.error.value"
      :empty="!statsRequest.data.value"
      @retry="statsRequest.execute"
      @clear-error="statsRequest.error.value = null"
    >
      <div class="stats">
        <div v-for="item in statsCards" :key="item.label" :class="item.level ? `stat ${item.level}` : 'stat'">
          <small>{{ item.label }}</small>
          <strong>{{ item.value }}</strong>
        </div>
      </div>
    </ApiState>

    <OperationAuditAlertPanel :hours="24" :limit="8" />
    <OperationAuditAlertEventInbox :hours="24" :limit="12" />

    <OperationAuditRiskPanel :hours="24" :limit="8" />

    <div class="panel">
      <h3>筛选</h3>
      <div class="form-grid">
        <select v-model="filter.action" class="input">
          <option value="">全部 action</option>
          <option v-for="action in actionsRequest.data.value || []" :key="action" :value="action">
            {{ action }}
          </option>
        </select>
        <input v-model="filter.targetType" class="input" placeholder="targetType，例如 TRANSCODE_TASK" />
        <input v-model="filter.targetId" class="input" placeholder="targetId，例如 videoId / taskId" />
        <input v-model="filter.operatorId" class="input" placeholder="operatorId" />
        <input v-model="filter.requestIp" class="input" placeholder="requestIp，例如 127.0.0.1" />
        <input v-model="filter.startTime" class="input" type="datetime-local" />
        <input v-model="filter.endTime" class="input" type="datetime-local" />
        <select v-model="filter.resultStatus" class="input">
          <option value="ALL">全部状态</option>
          <option value="REJECTED">只看被拒绝</option>
          <option value="DANGER">只看高危</option>
          <option value="SUCCESS">只看成功/已通过</option>
        </select>
        <input v-model="filter.limit" class="input" type="number" min="1" max="5000" />
      </div>

      <div class="actions">
        <button class="button" @click="search">查询</button>
        <button class="button danger-button" @click="filter.resultStatus = 'REJECTED'; search()">只看被拒绝</button>
        <button class="button secondary" @click="resetFilter">重置</button>
        <button class="button secondary" @click="exportCsv">导出 CSV</button>
      </div>
    </div>

    <div class="panel">
      <h3>手动写入测试</h3>
      <div class="form-grid">
        <input v-model="testForm.action" class="input" placeholder="action" />
        <input v-model="testForm.targetType" class="input" placeholder="targetType" />
        <input v-model="testForm.targetId" class="input" placeholder="targetId" />
        <input v-model="testForm.operatorId" class="input" placeholder="operatorId" />
        <input v-model="testForm.operatorName" class="input" placeholder="operatorName" />
        <input v-model="testForm.description" class="input" placeholder="description" />
      </div>
      <textarea v-model="testForm.detailJson" class="textarea" placeholder="detailJson"></textarea>
      <button class="button secondary" @click="recordTest">写入测试日志</button>
    </div>

    <div class="panel">
      <h3>日志列表</h3>
      <ApiState
        :loading="listRequest.loading.value"
        :error="listRequest.error.value"
        :empty="!(listRequest.data.value && listRequest.data.value.length)"
        @retry="search"
        @clear-error="listRequest.error.value = null"
      >
        <div style="overflow-x:auto;">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>action</th>
                <th>target</th>
                <th>operator</th>
                <th>status</th>
                <th>reason</th>
                <th>description</th>
                <th>ip</th>
                <th>createdAt</th>
                <th>detail</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in listRequest.data.value" :key="item.id" :class="rowClass(item)">
                <td>{{ item.id }}</td>
                <td><span :class="actionClass(item.action)">{{ item.action }}</span></td>
                <td>{{ item.targetType || '-' }} / {{ item.targetId || '-' }}</td>
                <td>{{ item.operatorName || '-' }} / {{ item.operatorId || '-' }}</td>
                <td><span :class="statusClass(item)">{{ auditStatus(item) }}</span></td>
                <td class="path reason">{{ reasonOf(item) }}</td>
                <td class="path">{{ item.description || '-' }}</td>
                <td>{{ item.requestIp || '-' }}</td>
                <td>{{ item.createdAt }}</td>
                <td class="path">{{ item.detailJson || '-' }}</td>
                <td><button class="mini-button" @click="selectedAuditId = item.id">证据</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </ApiState>
    </div>
    <OperationAuditEvidenceDrawer :audit-id="selectedAuditId" @close="selectedAuditId = null" />
</section>
</template>

<style scoped>
.top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.message {
  color: #374151;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.stat {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 14px;
  background: #fff;
}

.stat.danger {
  border-color: #fecaca;
  background: #fef2f2;
}

.stat.warning {
  border-color: #fde68a;
  background: #fffbeb;
}

.stat.success {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.stats small {
  display: block;
  color: #6b7280;
}

.stats strong {
  display: block;
  font-size: 26px;
  margin-top: 6px;
}

.panel {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.textarea {
  width: 100%;
  min-height: 90px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 10px;
  margin: 0 0 12px;
}

.secondary {
  background: #374151;
}

.danger-button {
  background: #991b1b;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  border-bottom: 1px solid #e5e7eb;
  padding: 9px;
  text-align: left;
  white-space: nowrap;
  font-size: 13px;
}

.path {
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reason {
  color: #92400e;
  font-weight: 600;
}

.rejected-row {
  background: #fff1f2;
}

.status {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.status.info {
  background: #e5e7eb;
  color: #374151;
}

.status.success {
  background: #dcfce7;
  color: #166534;
}

.status.warning {
  background: #fef3c7;
  color: #92400e;
}

.status.danger {
  background: #fee2e2;
  color: #991b1b;
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

.mini-button {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 8px;
  padding: 5px 9px;
  cursor: pointer;
  white-space: nowrap;
}

.mini-button:hover {
  border-color: #93c5fd;
  color: #1d4ed8;
}
</style>
