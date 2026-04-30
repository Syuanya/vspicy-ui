<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  cleanupOperationLogs,
  exportOperationLogs,
  getOperationLogOverview,
  listOperationLogs
} from '../../api/admin'

type OperationLog = {
  id: number
  userId?: number
  username?: string
  roles?: string
  operationType?: string
  operationTitle?: string
  requestMethod?: string
  requestUri?: string
  clientIp?: string
  userAgent?: string
  status?: string
  costMs?: number
  errorMessage?: string
  createdAt?: string
}

type MetricItem = {
  name: string
  value: number
}

type DailyItem = {
  date: string
  total: number
  success: number
  failed: number
  slow: number
}

type Overview = {
  days: number
  totalCount: number
  successCount: number
  failedCount: number
  slowCount: number
  uniqueUserCount: number
  avgCostMs: number
  successRate: number
  failedRate: number
  statusDistribution: MetricItem[]
  operationTypeDistribution: MetricItem[]
  topUsers: MetricItem[]
  dailyTrend: DailyItem[]
}

const logs = ref<OperationLog[]>([])
const overview = ref<Overview | null>(null)
const loading = ref(false)
const overviewLoading = ref(false)
const exporting = ref(false)
const cleaning = ref(false)
const message = ref('')
const selected = ref<OperationLog | null>(null)

const query = ref({
  userId: '',
  operationType: '',
  status: '',
  keyword: '',
  startTime: '',
  endTime: '',
  limit: 100
})

const overviewDays = ref(7)
const cleanupForm = ref({
  retentionDays: 90,
  dryRun: true
})

const queryParams = computed(() => {
  const params: any = { limit: query.value.limit }
  if (query.value.userId) params.userId = Number(query.value.userId)
  if (query.value.operationType) params.operationType = query.value.operationType
  if (query.value.status) params.status = query.value.status
  if (query.value.keyword) params.keyword = query.value.keyword
  if (query.value.startTime) params.startTime = query.value.startTime.replace('T', ' ') + ':00'
  if (query.value.endTime) params.endTime = query.value.endTime.replace('T', ' ') + ':00'
  return params
})

const maxDailyTotal = computed(() => {
  const values = overview.value?.dailyTrend?.map((item) => item.total) || []
  return Math.max(1, ...values)
})

async function load() {
  loading.value = true
  message.value = ''
  try {
    const res: any = await listOperationLogs(queryParams.value)
    if (res.code === 0) {
      logs.value = res.data || []
      if (!selected.value && logs.value.length) {
        selected.value = logs.value[0]
      }
    } else {
      message.value = res.message || '加载失败'
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadOverview() {
  overviewLoading.value = true
  try {
    const res: any = await getOperationLogOverview(overviewDays.value)
    if (res.code === 0) {
      overview.value = res.data
    }
  } finally {
    overviewLoading.value = false
  }
}

async function exportCsv() {
  exporting.value = true
  message.value = ''
  try {
    const blob: any = await exportOperationLogs(queryParams.value)
    const url = window.URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.download = `operation-logs-${Date.now()}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '导出失败'
  } finally {
    exporting.value = false
  }
}

async function runCleanup(dryRun: boolean) {
  if (!dryRun) {
    const ok = window.confirm(`确认清理 ${cleanupForm.value.retentionDays} 天以前的操作审计日志？该操作不可恢复。`)
    if (!ok) return
  }

  cleaning.value = true
  message.value = ''
  try {
    const res: any = await cleanupOperationLogs({
      retentionDays: cleanupForm.value.retentionDays,
      dryRun
    })
    if (res.code === 0) {
      const data = res.data
      message.value = dryRun
        ? `预检完成：匹配 ${data.matchedCount} 条可清理日志。`
        : `清理完成：删除 ${data.deletedCount} 条日志。`
      await Promise.all([load(), loadOverview()])
    } else {
      message.value = res.message || '清理失败'
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '清理失败'
  } finally {
    cleaning.value = false
  }
}

function statusClass(status?: string) {
  return status === 'SUCCESS' ? 'tag success' : 'tag danger'
}

function costClass(cost?: number) {
  if (!cost) return 'cost'
  if (cost >= 1000) return 'cost danger-text'
  if (cost >= 500) return 'cost warning-text'
  return 'cost'
}

function metricValue(value?: number) {
  return value ?? 0
}

onMounted(async () => {
  await Promise.all([load(), loadOverview()])
})
</script>

<template>
  <section class="page-stack">
    <div class="page-header">
      <div>
        <h2>操作审计日志</h2>
        <p>集中查看后台高风险操作、失败原因、慢操作和审计留存情况。</p>
      </div>
      <div class="header-actions">
        <select v-model="overviewDays" class="input small" @change="loadOverview">
          <option :value="7">近 7 天</option>
          <option :value="14">近 14 天</option>
          <option :value="30">近 30 天</option>
          <option :value="90">近 90 天</option>
        </select>
        <button class="button secondary" :disabled="overviewLoading" @click="loadOverview">
          {{ overviewLoading ? '刷新中...' : '刷新概览' }}
        </button>
      </div>
    </div>

    <div class="metric-grid">
      <article class="metric-card">
        <span>审计总数</span>
        <strong>{{ metricValue(overview?.totalCount) }}</strong>
        <small>{{ overviewDays }} 天内</small>
      </article>
      <article class="metric-card">
        <span>成功率</span>
        <strong>{{ metricValue(overview?.successRate) }}%</strong>
        <small>{{ metricValue(overview?.successCount) }} 次成功</small>
      </article>
      <article class="metric-card danger-card">
        <span>失败数</span>
        <strong>{{ metricValue(overview?.failedCount) }}</strong>
        <small>失败率 {{ metricValue(overview?.failedRate) }}%</small>
      </article>
      <article class="metric-card warning-card">
        <span>慢操作</span>
        <strong>{{ metricValue(overview?.slowCount) }}</strong>
        <small>耗时 ≥ 1000ms</small>
      </article>
      <article class="metric-card">
        <span>平均耗时</span>
        <strong>{{ metricValue(overview?.avgCostMs) }}ms</strong>
        <small>按已有 costMs 统计</small>
      </article>
      <article class="metric-card">
        <span>活跃操作者</span>
        <strong>{{ metricValue(overview?.uniqueUserCount) }}</strong>
        <small>按 userId 去重</small>
      </article>
    </div>

    <div class="overview-grid">
      <section class="card">
        <h3>操作类型分布</h3>
        <div v-if="!overview?.operationTypeDistribution?.length" class="empty">暂无数据</div>
        <div v-for="item in overview?.operationTypeDistribution || []" :key="item.name" class="bar-row">
          <span>{{ item.name }}</span>
          <div class="bar"><i :style="{ width: `${Math.min(100, item.value * 100 / Math.max(1, overview?.totalCount || 1))}%` }"></i></div>
          <b>{{ item.value }}</b>
        </div>
      </section>

      <section class="card">
        <h3>每日趋势</h3>
        <div v-if="!overview?.dailyTrend?.length" class="empty">暂无数据</div>
        <div v-for="item in overview?.dailyTrend || []" :key="item.date" class="trend-row">
          <span>{{ item.date.slice(5) }}</span>
          <div class="bar"><i :style="{ width: `${item.total * 100 / maxDailyTotal}%` }"></i></div>
          <b>{{ item.total }}</b>
          <small>失败 {{ item.failed }} / 慢 {{ item.slow }}</small>
        </div>
      </section>
    </div>

    <section class="card">
      <div class="section-title">
        <div>
          <h3>查询与导出</h3>
          <p>支持按用户、类型、状态、关键词和时间范围检索，最多导出 5000 条 CSV。</p>
        </div>
        <div class="actions">
          <button class="button secondary" :disabled="loading" @click="load">
            {{ loading ? '加载中...' : '查询' }}
          </button>
          <button class="button" :disabled="exporting" @click="exportCsv">
            {{ exporting ? '导出中...' : '导出 CSV' }}
          </button>
        </div>
      </div>

      <div class="filter">
        <input v-model="query.userId" class="input" placeholder="userId" />
        <select v-model="query.operationType" class="input">
          <option value="">全部类型</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="ASSIGN">ASSIGN</option>
          <option value="AUDIT">AUDIT</option>
          <option value="OTHER">OTHER</option>
        </select>
        <select v-model="query.status" class="input">
          <option value="">全部状态</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILED">FAILED</option>
        </select>
        <input v-model="query.keyword" class="input wide" placeholder="用户名 / 操作 / URI / IP / 错误" />
        <input v-model="query.startTime" type="datetime-local" class="input" />
        <input v-model="query.endTime" type="datetime-local" class="input" />
        <input v-model="query.limit" type="number" min="1" max="1000" class="input tiny" placeholder="limit" />
      </div>

      <p v-if="message" class="message">{{ message }}</p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>时间</th>
              <th>用户</th>
              <th>类型</th>
              <th>操作</th>
              <th>状态</th>
              <th>耗时</th>
              <th>请求</th>
              <th>IP</th>
              <th>详情</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id" :class="{ active: selected?.id === log.id }">
              <td>{{ log.id }}</td>
              <td>{{ log.createdAt }}</td>
              <td>{{ log.username || '-' }} / {{ log.userId || '-' }}</td>
              <td>{{ log.operationType }}</td>
              <td>{{ log.operationTitle }}</td>
              <td><span :class="statusClass(log.status)">{{ log.status }}</span></td>
              <td><span :class="costClass(log.costMs)">{{ log.costMs || 0 }}ms</span></td>
              <td>{{ log.requestMethod }} {{ log.requestUri }}</td>
              <td>{{ log.clientIp || '-' }}</td>
              <td><button class="link-button" @click="selected = log">查看</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div class="bottom-grid">
      <section class="card detail-card">
        <h3>审计详情</h3>
        <div v-if="!selected" class="empty">请选择一条审计日志。</div>
        <dl v-else>
          <dt>ID</dt><dd>{{ selected.id }}</dd>
          <dt>用户</dt><dd>{{ selected.username || '-' }} / {{ selected.userId || '-' }}</dd>
          <dt>角色</dt><dd>{{ selected.roles || '-' }}</dd>
          <dt>操作</dt><dd>{{ selected.operationType }} - {{ selected.operationTitle }}</dd>
          <dt>请求</dt><dd>{{ selected.requestMethod }} {{ selected.requestUri }}</dd>
          <dt>客户端 IP</dt><dd>{{ selected.clientIp || '-' }}</dd>
          <dt>User-Agent</dt><dd>{{ selected.userAgent || '-' }}</dd>
          <dt>错误信息</dt><dd class="error-text">{{ selected.errorMessage || '-' }}</dd>
        </dl>
      </section>

      <section class="card cleanup-card">
        <h3>审计留存清理</h3>
        <p>只清理早于保留天数的日志。正式删除前建议先执行预检。</p>
        <div class="cleanup-form">
          <label>
            保留天数
            <input v-model="cleanupForm.retentionDays" type="number" min="7" max="3650" class="input" />
          </label>
          <div class="actions">
            <button class="button secondary" :disabled="cleaning" @click="runCleanup(true)">预检</button>
            <button class="button danger" :disabled="cleaning" @click="runCleanup(false)">正式清理</button>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.page-stack {
  display: grid;
  gap: 18px;
}

.page-header,
.section-title {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.page-header h2,
.section-title h3,
.card h3 {
  margin: 0 0 6px;
}

.page-header p,
.section-title p,
.cleanup-card p {
  margin: 0;
  color: #64748b;
}

.header-actions,
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.metric-card,
.card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  padding: 16px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
}

.metric-card span,
.metric-card small {
  display: block;
  color: #64748b;
}

.metric-card strong {
  display: block;
  margin: 8px 0 4px;
  color: #0f172a;
  font-size: 26px;
}

.danger-card strong,
.danger-text,
.error-text {
  color: #b91c1c;
}

.warning-card strong,
.warning-text {
  color: #b45309;
}

.overview-grid,
.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.bar-row,
.trend-row {
  display: grid;
  grid-template-columns: 120px 1fr 50px auto;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
  color: #334155;
  font-size: 13px;
}

.bar {
  height: 8px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #2563eb;
}

.filter {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin: 16px 0;
}

.input {
  min-width: 140px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 9px 10px;
  background: #fff;
}

.input.small {
  min-width: 120px;
}

.input.tiny {
  min-width: 90px;
  max-width: 100px;
}

.input.wide {
  min-width: 260px;
}

.button {
  border: none;
  border-radius: 10px;
  padding: 9px 14px;
  background: #2563eb;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.button.secondary {
  background: #e5e7eb;
  color: #0f172a;
}

.button.danger {
  background: #dc2626;
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.message {
  color: #b45309;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border-bottom: 1px solid #e5e7eb;
  padding: 10px;
  text-align: left;
  font-size: 13px;
  white-space: nowrap;
}

tr.active {
  background: #eff6ff;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
}

.success {
  background: #dcfce7;
  color: #166534;
}

.danger {
  background: #fee2e2;
  color: #991b1b;
}

.cost {
  font-weight: 700;
}

.link-button {
  border: none;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
}

dl {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 10px;
  margin: 0;
}

dt {
  color: #64748b;
}

dd {
  margin: 0;
  word-break: break-all;
}

.cleanup-form {
  display: grid;
  gap: 14px;
}

.empty {
  color: #94a3b8;
  padding: 18px 0;
}

@media (max-width: 1100px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview-grid,
  .bottom-grid {
    grid-template-columns: 1fr;
  }

  .page-header,
  .section-title {
    flex-direction: column;
  }
}
</style>
