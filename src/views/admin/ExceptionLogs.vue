<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  cleanupExceptionLogs,
  deleteExceptionLog,
  getExceptionLogOverview,
  ignoreExceptionLog,
  listExceptionLogs,
  reopenExceptionLog,
  resolveExceptionLog
} from '../../api/exceptionLog'

type MetricItem = { name: string; value: number }
type DailyItem = { date: string; total: number; newCount: number; resolvedCount: number; criticalCount: number }
type ExceptionLog = {
  id: number
  traceId?: string
  serviceName?: string
  environment?: string
  severity?: string
  status?: string
  exceptionType?: string
  exceptionMessage?: string
  requestMethod?: string
  requestUri?: string
  requestParams?: string
  userId?: number
  username?: string
  clientIp?: string
  userAgent?: string
  stackTrace?: string
  occurrenceCount?: number
  firstSeenAt?: string
  lastSeenAt?: string
  resolvedBy?: number
  resolvedAt?: string
  resolutionNote?: string
}
type Overview = {
  days: number
  totalCount: number
  newCount: number
  processingCount: number
  resolvedCount: number
  ignoredCount: number
  unresolvedCount: number
  criticalCount: number
  affectedServiceCount: number
  todayNewCount: number
  severityDistribution: MetricItem[]
  statusDistribution: MetricItem[]
  serviceDistribution: MetricItem[]
  exceptionTypeDistribution: MetricItem[]
  dailyTrend: DailyItem[]
}

const logs = ref<ExceptionLog[]>([])
const overview = ref<Overview | null>(null)
const selected = ref<ExceptionLog | null>(null)
const loading = ref(false)
const overviewLoading = ref(false)
const handling = ref(false)
const message = ref('')
const overviewDays = ref(7)
const resolutionNote = ref('')
const cleanupForm = ref({ retentionDays: 90, dryRun: true })

const query = ref({
  serviceName: '',
  severity: '',
  status: '',
  keyword: '',
  startTime: '',
  endTime: '',
  limit: 100
})

const queryParams = computed(() => {
  const params: any = { limit: query.value.limit }
  if (query.value.serviceName) params.serviceName = query.value.serviceName
  if (query.value.severity) params.severity = query.value.severity
  if (query.value.status) params.status = query.value.status
  if (query.value.keyword) params.keyword = query.value.keyword
  if (query.value.startTime) params.startTime = query.value.startTime.replace('T', ' ') + ':00'
  if (query.value.endTime) params.endTime = query.value.endTime.replace('T', ' ') + ':00'
  return params
})

const maxDailyTotal = computed(() => {
  const values = safeDailyTrend().map((item) => item.total || 0)
  return Math.max(1, ...values)
})

function safeMetrics(items?: MetricItem[]) {
  return Array.isArray(items) ? items : []
}

function safeDailyTrend() {
  return Array.isArray(overview.value?.dailyTrend) ? overview.value!.dailyTrend : []
}

function metricValue(value?: number) {
  return value ?? 0
}

function severityClass(value?: string) {
  const severity = (value || 'UNKNOWN').toUpperCase()
  if (severity === 'CRITICAL') return 'tag danger'
  if (severity === 'HIGH') return 'tag warning'
  if (severity === 'MEDIUM') return 'tag info'
  if (severity === 'LOW') return 'tag success'
  return 'tag'
}

function statusClass(value?: string) {
  const status = (value || 'UNKNOWN').toUpperCase()
  if (status === 'RESOLVED') return 'tag success'
  if (status === 'IGNORED') return 'tag muted'
  if (status === 'PROCESSING') return 'tag warning'
  if (status === 'NEW') return 'tag danger'
  return 'tag'
}

async function loadOverview() {
  overviewLoading.value = true
  try {
    const res: any = await getExceptionLogOverview(overviewDays.value)
    if (res.code === 0) overview.value = res.data
  } finally {
    overviewLoading.value = false
  }
}

async function load() {
  loading.value = true
  message.value = ''
  try {
    const res: any = await listExceptionLogs(queryParams.value)
    if (res.code === 0) {
      logs.value = Array.isArray(res.data) ? res.data : []
      if (!selected.value && logs.value.length) selected.value = logs.value[0]
    } else {
      message.value = res.message || '加载失败'
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function refreshAll() {
  await Promise.all([load(), loadOverview()])
}

async function handleResolve() {
  if (!selected.value) return
  handling.value = true
  try {
    const res: any = await resolveExceptionLog(selected.value.id, resolutionNote.value)
    if (res.code === 0) {
      selected.value = res.data
      resolutionNote.value = ''
      message.value = '异常日志已标记为已处理。'
      await refreshAll()
    } else {
      message.value = res.message || '处理失败'
    }
  } finally {
    handling.value = false
  }
}

async function handleIgnore() {
  if (!selected.value) return
  handling.value = true
  try {
    const res: any = await ignoreExceptionLog(selected.value.id, resolutionNote.value)
    if (res.code === 0) {
      selected.value = res.data
      resolutionNote.value = ''
      message.value = '异常日志已忽略。'
      await refreshAll()
    } else {
      message.value = res.message || '操作失败'
    }
  } finally {
    handling.value = false
  }
}

async function handleReopen() {
  if (!selected.value) return
  const res: any = await reopenExceptionLog(selected.value.id)
  if (res.code === 0) {
    selected.value = res.data
    message.value = '异常日志已重新打开。'
    await refreshAll()
  }
}

async function handleDelete() {
  if (!selected.value) return
  if (!window.confirm('确认删除该异常日志？该操作不可恢复。')) return
  const id = selected.value.id
  const res: any = await deleteExceptionLog(id)
  if (res.code === 0) {
    selected.value = null
    message.value = '异常日志已删除。'
    await refreshAll()
  }
}

async function runCleanup(dryRun: boolean) {
  if (!dryRun && !window.confirm(`确认删除 ${cleanupForm.value.retentionDays} 天前已处理/已忽略的异常日志？`)) return
  const res: any = await cleanupExceptionLogs({ retentionDays: cleanupForm.value.retentionDays, dryRun })
  if (res.code === 0) {
    const data = res.data || {}
    message.value = dryRun
      ? `预检完成：匹配 ${data.matchedCount || 0} 条可清理异常日志。`
      : `清理完成：删除 ${data.deletedCount || 0} 条异常日志。`
    await refreshAll()
  } else {
    message.value = res.message || '清理失败'
  }
}

onMounted(refreshAll)
</script>

<template>
  <section class="page-stack exception-page">
    <div class="page-header">
      <div>
        <h2>异常日志中心</h2>
        <p>集中查看系统异常、链路 traceId、影响服务、处理状态和清理策略，补齐生产故障闭环。</p>
      </div>
      <div class="header-actions">
        <select v-model="overviewDays" class="input small" @change="loadOverview">
          <option :value="7">近 7 天</option>
          <option :value="14">近 14 天</option>
          <option :value="30">近 30 天</option>
          <option :value="90">近 90 天</option>
        </select>
        <button class="button secondary" :disabled="overviewLoading" @click="refreshAll">
          {{ overviewLoading ? '刷新中...' : '刷新' }}
        </button>
      </div>
    </div>

    <div v-if="message" class="notice">{{ message }}</div>

    <div class="metric-grid">
      <article class="metric-card"><span>异常总数</span><strong>{{ metricValue(overview?.totalCount) }}</strong><small>{{ overviewDays }} 天内</small></article>
      <article class="metric-card danger-card"><span>未处理</span><strong>{{ metricValue(overview?.unresolvedCount) }}</strong><small>NEW + PROCESSING</small></article>
      <article class="metric-card danger-card"><span>严重异常</span><strong>{{ metricValue(overview?.criticalCount) }}</strong><small>CRITICAL</small></article>
      <article class="metric-card"><span>影响服务</span><strong>{{ metricValue(overview?.affectedServiceCount) }}</strong><small>按 serviceName 去重</small></article>
      <article class="metric-card success-card"><span>已处理</span><strong>{{ metricValue(overview?.resolvedCount) }}</strong><small>RESOLVED</small></article>
      <article class="metric-card"><span>今日新增</span><strong>{{ metricValue(overview?.todayNewCount) }}</strong><small>按 createdAt 统计</small></article>
    </div>

    <div class="overview-grid">
      <section class="card">
        <h3>严重级别分布</h3>
        <div v-if="!safeMetrics(overview?.severityDistribution).length" class="empty">暂无数据</div>
        <div v-for="item in safeMetrics(overview?.severityDistribution)" :key="item.name" class="bar-row">
          <span>{{ item.name }}</span><div class="bar"><i :style="{ width: `${Math.min(100, item.value * 100 / Math.max(1, overview?.totalCount || 1))}%` }"></i></div><b>{{ item.value }}</b>
        </div>
      </section>
      <section class="card">
        <h3>影响服务 Top 10</h3>
        <div v-if="!safeMetrics(overview?.serviceDistribution).length" class="empty">暂无数据</div>
        <div v-for="item in safeMetrics(overview?.serviceDistribution)" :key="item.name" class="bar-row">
          <span>{{ item.name }}</span><div class="bar"><i :style="{ width: `${Math.min(100, item.value * 100 / Math.max(1, overview?.totalCount || 1))}%` }"></i></div><b>{{ item.value }}</b>
        </div>
      </section>
    </div>

    <section class="card">
      <h3>每日趋势</h3>
      <div class="trend-list">
        <div v-for="item in safeDailyTrend()" :key="item.date" class="trend-row">
          <span>{{ item.date }}</span>
          <div class="trend-bar"><i :style="{ width: `${Math.max(3, item.total * 100 / maxDailyTotal)}%` }"></i></div>
          <small>总数 {{ item.total }} / 新增 {{ item.newCount }} / 严重 {{ item.criticalCount }}</small>
        </div>
      </div>
    </section>

    <section class="card filters">
      <input v-model="query.serviceName" class="input" placeholder="服务名，如 vspicy-gateway" />
      <select v-model="query.severity" class="input"><option value="">全部级别</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select>
      <select v-model="query.status" class="input"><option value="">全部状态</option><option>NEW</option><option>PROCESSING</option><option>RESOLVED</option><option>IGNORED</option></select>
      <input v-model="query.keyword" class="input" placeholder="traceId / 异常 / URI / IP" />
      <input v-model="query.startTime" class="input" type="datetime-local" />
      <input v-model="query.endTime" class="input" type="datetime-local" />
      <button class="button" :disabled="loading" @click="load">{{ loading ? '查询中...' : '查询' }}</button>
    </section>

    <div class="main-grid">
      <section class="card table-card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>服务</th><th>级别</th><th>状态</th><th>异常</th><th>URI</th><th>最近出现</th><th>次数</th></tr></thead>
            <tbody>
              <tr v-for="item in logs" :key="item.id" :class="{ active: selected?.id === item.id }" @click="selected = item">
                <td>{{ item.id }}</td><td>{{ item.serviceName || '-' }}</td><td><span :class="severityClass(item.severity)">{{ item.severity || '-' }}</span></td><td><span :class="statusClass(item.status)">{{ item.status || '-' }}</span></td><td class="ellipsis">{{ item.exceptionType || item.exceptionMessage || '-' }}</td><td class="ellipsis">{{ item.requestUri || '-' }}</td><td>{{ item.lastSeenAt || '-' }}</td><td>{{ item.occurrenceCount || 1 }}</td>
              </tr>
              <tr v-if="!logs.length"><td colspan="8" class="empty">暂无异常日志</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside class="card detail-card">
        <h3>异常详情</h3>
        <div v-if="!selected" class="empty">请选择一条异常日志</div>
        <template v-else>
          <div class="detail-row"><span>Trace ID</span><b>{{ selected.traceId || '-' }}</b></div>
          <div class="detail-row"><span>服务</span><b>{{ selected.serviceName || '-' }}</b></div>
          <div class="detail-row"><span>异常类型</span><b>{{ selected.exceptionType || '-' }}</b></div>
          <div class="detail-row"><span>异常信息</span><b>{{ selected.exceptionMessage || '-' }}</b></div>
          <div class="detail-row"><span>请求</span><b>{{ selected.requestMethod || '-' }} {{ selected.requestUri || '' }}</b></div>
          <div class="detail-row"><span>用户</span><b>{{ selected.username || selected.userId || '-' }}</b></div>
          <div class="detail-row"><span>客户端 IP</span><b>{{ selected.clientIp || '-' }}</b></div>
          <div class="detail-row"><span>首次/最近</span><b>{{ selected.firstSeenAt || '-' }} / {{ selected.lastSeenAt || '-' }}</b></div>
          <textarea v-model="resolutionNote" class="input textarea" placeholder="处理说明，例如：已修复 Gateway 路由配置并重启服务。"></textarea>
          <div class="action-row">
            <button class="button" :disabled="handling" @click="handleResolve">标记已处理</button>
            <button class="button secondary" :disabled="handling" @click="handleIgnore">忽略</button>
            <button class="button secondary" @click="handleReopen">重新打开</button>
            <button class="button danger" @click="handleDelete">删除</button>
          </div>
          <pre class="stack">{{ selected.stackTrace || '暂无堆栈信息' }}</pre>
        </template>
      </aside>
    </div>

    <section class="card cleanup-card">
      <h3>异常日志清理</h3>
      <p>仅清理已处理或已忽略的历史异常，未处理异常不会被清理。</p>
      <input v-model.number="cleanupForm.retentionDays" class="input small" type="number" min="7" />
      <button class="button secondary" @click="runCleanup(true)">清理预检</button>
      <button class="button danger" @click="runCleanup(false)">正式清理</button>
    </section>
  </section>
</template>

<style scoped>
.exception-page { display: grid; gap: 16px; }
.header-actions, .filters, .action-row, .cleanup-card { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.metric-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 14px; display: grid; gap: 6px; }
.metric-card span, .metric-card small { color: #64748b; }
.metric-card strong { font-size: 24px; }
.danger-card { border-color: #fecaca; background: #fff7f7; }
.success-card { border-color: #bbf7d0; background: #f0fdf4; }
.overview-grid, .main-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; }
.notice { padding: 10px 12px; border: 1px solid #bfdbfe; background: #eff6ff; color: #1d4ed8; border-radius: 12px; }
.input { border: 1px solid #cbd5e1; border-radius: 10px; padding: 9px 10px; min-height: 38px; background: #fff; }
.input.small { width: 120px; }
.textarea { width: 100%; min-height: 84px; margin-top: 12px; }
.button { border: 0; border-radius: 10px; padding: 9px 14px; background: #111827; color: white; cursor: pointer; }
.button.secondary { background: #f1f5f9; color: #0f172a; }
.button.danger { background: #dc2626; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: left; }
tr.active { background: #f8fafc; }
.ellipsis { max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tag { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #f1f5f9; font-size: 12px; }
.tag.success { background: #dcfce7; color: #166534; }
.tag.warning { background: #fef3c7; color: #92400e; }
.tag.danger { background: #fee2e2; color: #991b1b; }
.tag.info { background: #dbeafe; color: #1e40af; }
.tag.muted { background: #e5e7eb; color: #374151; }
.bar-row, .trend-row, .detail-row { display: grid; grid-template-columns: 150px 1fr auto; gap: 10px; align-items: center; margin: 8px 0; }
.bar, .trend-bar { height: 8px; background: #f1f5f9; border-radius: 999px; overflow: hidden; }
.bar i, .trend-bar i { display: block; height: 100%; background: #111827; border-radius: 999px; }
.detail-card { min-width: 0; }
.detail-row { grid-template-columns: 90px 1fr; }
.detail-row span { color: #64748b; }
.stack { white-space: pre-wrap; max-height: 260px; overflow: auto; background: #0f172a; color: #dbeafe; border-radius: 12px; padding: 12px; font-size: 12px; }
.empty { color: #94a3b8; padding: 16px; text-align: center; }
@media (max-width: 1100px) { .overview-grid, .main-grid { grid-template-columns: 1fr; } }
</style>
