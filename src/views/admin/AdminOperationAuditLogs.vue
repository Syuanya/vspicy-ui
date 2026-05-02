<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  cleanupOperationAuditLogs,
  createOperationAuditLog,
  deleteOperationAuditLog,
  getOperationAuditLog,
  getOperationAuditOverview,
  ignoreOperationAuditLog,
  listOperationAuditLogs,
  previewOperationAuditCleanup,
  reopenOperationAuditLog,
  reviewOperationAuditLog
} from '../../api/operationAudit'

type MetricItem = { name: string; value: number }
type AuditLog = {
  id: number
  traceId?: string
  serviceName: string
  moduleName?: string
  actionType: string
  operationName: string
  requestMethod?: string
  requestUri?: string
  requestParams?: string
  requestBody?: string
  responseStatus?: number
  success: boolean
  errorMessage?: string
  riskLevel: string
  handleStatus: string
  handleRemark?: string
  operatorId?: number
  operatorName?: string
  operatorIp?: string
  userAgent?: string
  costMs?: number
  handledBy?: number
  handledAt?: string
  createdAt?: string
}
type Overview = {
  totalCount: number
  successCount: number
  failedCount: number
  highRiskCount: number
  todayCount: number
  openFailedCount: number
  serviceDistribution: MetricItem[]
  actionDistribution: MetricItem[]
  riskDistribution: MetricItem[]
  statusDistribution: MetricItem[]
}

const logs = ref<AuditLog[]>([])
const selected = ref<AuditLog | null>(null)
const overview = ref<Overview | null>(null)
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const handleRemark = ref('')

const query = ref({
  serviceName: '',
  actionType: '',
  riskLevel: '',
  handleStatus: '',
  success: '',
  operatorId: '',
  keyword: '',
  limit: 100
})

const form = ref({
  traceId: '',
  serviceName: 'vspicy-admin',
  moduleName: '后台管理',
  actionType: 'OTHER',
  operationName: '',
  requestMethod: 'POST',
  requestUri: '',
  requestParams: '',
  requestBody: '',
  responseStatus: '200',
  success: 'true',
  errorMessage: '',
  riskLevel: 'LOW',
  operatorId: '',
  operatorName: '',
  operatorIp: '',
  userAgent: '',
  costMs: ''
})

const cleanupForm = ref({
  beforeDays: 30,
  onlyHandled: true,
  preview: null as null | { beforeDays: number; onlyHandled: boolean; beforeDate: string; matchedCount: number }
})

const actionTypes = [
  { value: 'CREATE', label: '创建' },
  { value: 'UPDATE', label: '更新' },
  { value: 'DELETE', label: '删除' },
  { value: 'STATUS', label: '状态变更' },
  { value: 'HANDLE', label: '处理' },
  { value: 'LOGIN', label: '登录' },
  { value: 'EXPORT', label: '导出' },
  { value: 'IMPORT', label: '导入' },
  { value: 'OTHER', label: '其他' }
]

const riskLevels = [
  { value: 'LOW', label: '低' },
  { value: 'MEDIUM', label: '中' },
  { value: 'HIGH', label: '高' },
  { value: 'CRITICAL', label: '严重' }
]

const handleStatuses = [
  { value: 'OPEN', label: '未处理' },
  { value: 'REVIEWED', label: '已复核' },
  { value: 'IGNORED', label: '已忽略' }
]

const cards = computed(() => {
  const data = overview.value
  if (!data) return []
  return [
    { label: '审计总数', value: data.totalCount, hint: 'sys_operation_audit_log 总记录' },
    { label: '成功操作', value: data.successCount, hint: 'HTTP 成功且无异常' },
    { label: '失败操作', value: data.failedCount, hint: '失败或异常操作' },
    { label: '高风险', value: data.highRiskCount, hint: 'HIGH / CRITICAL' },
    { label: '今日新增', value: data.todayCount, hint: '当天写入审计' },
    { label: '未处理失败', value: data.openFailedCount, hint: '失败且 OPEN' }
  ]
})

function params() {
  const result: any = { limit: query.value.limit }
  if (query.value.serviceName) result.serviceName = query.value.serviceName
  if (query.value.actionType) result.actionType = query.value.actionType
  if (query.value.riskLevel) result.riskLevel = query.value.riskLevel
  if (query.value.handleStatus) result.handleStatus = query.value.handleStatus
  if (query.value.success !== '') result.success = query.value.success === 'true'
  if (query.value.operatorId) result.operatorId = Number(query.value.operatorId)
  if (query.value.keyword) result.keyword = query.value.keyword
  return result
}

function labelOf(list: Array<{ value: string; label: string }>, value?: string) {
  return list.find((item) => item.value === value)?.label || value || '-'
}

function riskClass(value?: string) {
  const risk = (value || '').toUpperCase()
  if (risk === 'CRITICAL') return 'tag danger strong'
  if (risk === 'HIGH') return 'tag danger'
  if (risk === 'MEDIUM') return 'tag warning'
  return 'tag info'
}

function statusClass(value?: string) {
  const status = (value || '').toUpperCase()
  if (status === 'OPEN') return 'tag warning'
  if (status === 'REVIEWED') return 'tag success'
  if (status === 'IGNORED') return 'tag muted'
  return 'tag'
}

function successClass(value?: boolean) {
  return value ? 'tag success' : 'tag danger'
}

function payload() {
  return {
    traceId: form.value.traceId || undefined,
    serviceName: form.value.serviceName || undefined,
    moduleName: form.value.moduleName || undefined,
    actionType: form.value.actionType,
    operationName: form.value.operationName,
    requestMethod: form.value.requestMethod || undefined,
    requestUri: form.value.requestUri || undefined,
    requestParams: form.value.requestParams || undefined,
    requestBody: form.value.requestBody || undefined,
    responseStatus: form.value.responseStatus ? Number(form.value.responseStatus) : undefined,
    success: form.value.success === 'true',
    errorMessage: form.value.errorMessage || undefined,
    riskLevel: form.value.riskLevel,
    operatorId: form.value.operatorId ? Number(form.value.operatorId) : undefined,
    operatorName: form.value.operatorName || undefined,
    operatorIp: form.value.operatorIp || undefined,
    userAgent: form.value.userAgent || undefined,
    costMs: form.value.costMs ? Number(form.value.costMs) : undefined
  }
}

async function load() {
  loading.value = true
  message.value = ''
  try {
    const [overviewRes, listRes] = await Promise.all([
      getOperationAuditOverview(),
      listOperationAuditLogs(params())
    ])
    overview.value = overviewRes.data?.data || overviewRes.data
    logs.value = listRes.data?.data || listRes.data || []
    if (selected.value) {
      const current = logs.value.find((item) => item.id === selected.value?.id)
      if (!current) selected.value = null
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function selectLog(item: AuditLog) {
  try {
    const res = await getOperationAuditLog(item.id)
    selected.value = res.data?.data || res.data
    handleRemark.value = selected.value?.handleRemark || ''
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '详情加载失败'
  }
}

async function createManual() {
  if (!form.value.operationName.trim()) {
    message.value = '请填写操作名称'
    return
  }
  saving.value = true
  try {
    await createOperationAuditLog(payload())
    message.value = '审计记录已创建'
    form.value.operationName = ''
    form.value.requestUri = ''
    form.value.requestParams = ''
    form.value.requestBody = ''
    form.value.errorMessage = ''
    await load()
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '创建失败'
  } finally {
    saving.value = false
  }
}

async function reviewSelected() {
  if (!selected.value) return
  await reviewOperationAuditLog(selected.value.id, handleRemark.value)
  message.value = '已标记复核'
  await load()
  await selectLog(selected.value)
}

async function ignoreSelected() {
  if (!selected.value) return
  await ignoreOperationAuditLog(selected.value.id, handleRemark.value)
  message.value = '已忽略'
  await load()
  await selectLog(selected.value)
}

async function reopenSelected() {
  if (!selected.value) return
  await reopenOperationAuditLog(selected.value.id)
  message.value = '已重新打开'
  await load()
  await selectLog(selected.value)
}

async function deleteSelected() {
  if (!selected.value) return
  if (!window.confirm(`确认删除审计日志 #${selected.value.id}？`)) return
  await deleteOperationAuditLog(selected.value.id)
  selected.value = null
  message.value = '已删除'
  await load()
}

async function previewCleanup() {
  const res = await previewOperationAuditCleanup({
    beforeDays: cleanupForm.value.beforeDays,
    onlyHandled: cleanupForm.value.onlyHandled
  })
  cleanupForm.value.preview = res.data?.data || res.data
}

async function runCleanup() {
  if (!cleanupForm.value.preview) {
    await previewCleanup()
  }
  const count = cleanupForm.value.preview?.matchedCount || 0
  if (!window.confirm(`确认清理 ${count} 条审计日志？`)) return
  const res = await cleanupOperationAuditLogs({
    beforeDays: cleanupForm.value.beforeDays,
    onlyHandled: cleanupForm.value.onlyHandled
  })
  message.value = `已清理 ${res.data?.data ?? res.data ?? 0} 条审计日志`
  cleanupForm.value.preview = null
  selected.value = null
  await load()
}

onMounted(load)
</script>

<template>
  <section class="page">
    <header class="hero">
      <div>
        <p class="eyebrow">System Audit</p>
        <h1>系统操作审计中心</h1>
        <p class="subtitle">集中查看后台敏感操作、失败操作、高风险动作和处理状态。</p>
      </div>
      <button class="primary" :disabled="loading" @click="load">{{ loading ? '加载中...' : '刷新' }}</button>
    </header>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="cards">
      <article v-for="card in cards" :key="card.label" class="card">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
        <small>{{ card.hint }}</small>
      </article>
    </div>

    <section class="panel">
      <h2>查询条件</h2>
      <div class="filters">
        <input v-model="query.serviceName" placeholder="服务名，如 vspicy-admin" />
        <select v-model="query.actionType">
          <option value="">全部动作</option>
          <option v-for="item in actionTypes" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <select v-model="query.riskLevel">
          <option value="">全部风险</option>
          <option v-for="item in riskLevels" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <select v-model="query.handleStatus">
          <option value="">全部状态</option>
          <option v-for="item in handleStatuses" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <select v-model="query.success">
          <option value="">全部结果</option>
          <option value="true">成功</option>
          <option value="false">失败</option>
        </select>
        <input v-model="query.operatorId" placeholder="操作人ID" />
        <input v-model="query.keyword" placeholder="traceId / URI / 操作人 / IP / 错误" />
        <input v-model.number="query.limit" type="number" min="1" max="1000" placeholder="限制条数" />
        <button @click="load">查询</button>
      </div>
    </section>

    <section class="grid">
      <div class="panel list-panel">
        <h2>审计列表</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>时间</th>
                <th>服务</th>
                <th>模块</th>
                <th>动作</th>
                <th>结果</th>
                <th>风险</th>
                <th>状态</th>
                <th>操作人</th>
                <th>URI</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in logs" :key="item.id" :class="{ active: selected?.id === item.id }" @click="selectLog(item)">
                <td>#{{ item.id }}</td>
                <td>{{ item.createdAt || '-' }}</td>
                <td>{{ item.serviceName }}</td>
                <td>{{ item.moduleName || '-' }}</td>
                <td>{{ labelOf(actionTypes, item.actionType) }}</td>
                <td><span :class="successClass(item.success)">{{ item.success ? '成功' : '失败' }}</span></td>
                <td><span :class="riskClass(item.riskLevel)">{{ labelOf(riskLevels, item.riskLevel) }}</span></td>
                <td><span :class="statusClass(item.handleStatus)">{{ labelOf(handleStatuses, item.handleStatus) }}</span></td>
                <td>{{ item.operatorName || item.operatorId || '-' }}</td>
                <td class="uri">{{ item.requestMethod }} {{ item.requestUri }}</td>
              </tr>
              <tr v-if="!logs.length">
                <td colspan="10" class="empty">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <aside class="panel detail">
        <h2>审计详情</h2>
        <template v-if="selected">
          <div class="kv"><span>TraceId</span><strong>{{ selected.traceId || '-' }}</strong></div>
          <div class="kv"><span>操作</span><strong>{{ selected.operationName }}</strong></div>
          <div class="kv"><span>请求</span><strong>{{ selected.requestMethod }} {{ selected.requestUri }}</strong></div>
          <div class="kv"><span>响应</span><strong>{{ selected.responseStatus || '-' }} / {{ selected.costMs || 0 }}ms</strong></div>
          <div class="kv"><span>操作人</span><strong>{{ selected.operatorName || '-' }} / {{ selected.operatorIp || '-' }}</strong></div>
          <div class="kv"><span>User-Agent</span><strong>{{ selected.userAgent || '-' }}</strong></div>
          <label>请求参数</label>
          <pre>{{ selected.requestParams || '-' }}</pre>
          <label>请求体摘要</label>
          <pre>{{ selected.requestBody || '-' }}</pre>
          <label>错误信息</label>
          <pre>{{ selected.errorMessage || '-' }}</pre>
          <label>处理备注</label>
          <textarea v-model="handleRemark" placeholder="填写复核 / 忽略原因"></textarea>
          <div class="actions">
            <button @click="reviewSelected">标记复核</button>
            <button @click="ignoreSelected">忽略</button>
            <button @click="reopenSelected">重新打开</button>
            <button class="danger" @click="deleteSelected">删除</button>
          </div>
        </template>
        <p v-else class="empty">选择一条审计记录查看详情。</p>
      </aside>
    </section>

    <section class="grid bottom-grid">
      <div class="panel">
        <h2>手动补录</h2>
        <div class="form-grid">
          <input v-model="form.operationName" placeholder="操作名称 *" />
          <input v-model="form.serviceName" placeholder="服务名" />
          <input v-model="form.moduleName" placeholder="模块名" />
          <select v-model="form.actionType">
            <option v-for="item in actionTypes" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
          <select v-model="form.riskLevel">
            <option v-for="item in riskLevels" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
          <select v-model="form.success">
            <option value="true">成功</option>
            <option value="false">失败</option>
          </select>
          <input v-model="form.requestMethod" placeholder="请求方法" />
          <input v-model="form.requestUri" placeholder="请求URI" />
          <input v-model="form.responseStatus" placeholder="响应码" />
          <input v-model="form.operatorId" placeholder="操作人ID" />
          <input v-model="form.operatorName" placeholder="操作人名称" />
          <input v-model="form.operatorIp" placeholder="操作IP" />
          <textarea v-model="form.requestParams" placeholder="请求参数"></textarea>
          <textarea v-model="form.errorMessage" placeholder="错误信息"></textarea>
        </div>
        <button class="primary" :disabled="saving" @click="createManual">{{ saving ? '保存中...' : '新增审计记录' }}</button>
      </div>

      <div class="panel">
        <h2>清理审计日志</h2>
        <div class="filters cleanup">
          <input v-model.number="cleanupForm.beforeDays" type="number" min="7" placeholder="保留天数" />
          <label class="checkbox"><input v-model="cleanupForm.onlyHandled" type="checkbox" /> 仅清理已处理</label>
          <button @click="previewCleanup">清理预检</button>
          <button class="danger" @click="runCleanup">正式清理</button>
        </div>
        <p v-if="cleanupForm.preview" class="message muted">
          将清理 {{ cleanupForm.preview.beforeDate }} 前{{ cleanupForm.preview.onlyHandled ? '已处理' : '全部' }}审计日志：{{ cleanupForm.preview.matchedCount }} 条。
        </p>
        <div class="distribution">
          <div>
            <h3>风险分布</h3>
            <p v-for="item in overview?.riskDistribution || []" :key="item.name">{{ labelOf(riskLevels, item.name) }}：{{ item.value }}</p>
          </div>
          <div>
            <h3>动作分布</h3>
            <p v-for="item in overview?.actionDistribution || []" :key="item.name">{{ labelOf(actionTypes, item.name) }}：{{ item.value }}</p>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; color: #172033; }
.hero { display: flex; align-items: center; justify-content: space-between; padding: 22px; border-radius: 20px; background: linear-gradient(135deg, #172033, #334155); color: white; }
.eyebrow { margin: 0 0 6px; text-transform: uppercase; letter-spacing: .12em; opacity: .76; font-size: 12px; }
h1 { margin: 0; font-size: 28px; }
h2 { margin: 0 0 14px; font-size: 18px; }
h3 { margin: 10px 0; font-size: 15px; }
.subtitle { margin: 8px 0 0; opacity: .82; }
.message { padding: 10px 12px; border-radius: 12px; background: #ecfeff; color: #155e75; }
.message.muted { background: #f8fafc; color: #475569; }
.cards { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
.card, .panel { border: 1px solid #e2e8f0; border-radius: 18px; background: white; box-shadow: 0 8px 24px rgba(15, 23, 42, .06); }
.card { padding: 16px; display: flex; flex-direction: column; gap: 5px; }
.card span { color: #64748b; font-size: 13px; }
.card strong { font-size: 25px; }
.card small { color: #94a3b8; }
.panel { padding: 18px; }
.filters, .form-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.form-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
input, select, textarea { border: 1px solid #cbd5e1; border-radius: 10px; padding: 9px 10px; font: inherit; background: white; }
textarea { min-height: 86px; resize: vertical; }
button { border: 0; border-radius: 10px; padding: 10px 14px; background: #e2e8f0; color: #0f172a; cursor: pointer; font-weight: 600; }
button:hover { filter: brightness(.98); }
button.primary { background: #2563eb; color: white; }
button.danger { background: #fee2e2; color: #991b1b; }
button:disabled { opacity: .6; cursor: not-allowed; }
.grid { display: grid; grid-template-columns: 1fr 420px; gap: 16px; align-items: start; }
.bottom-grid { grid-template-columns: 1fr 1fr; }
.table-wrap { overflow: auto; max-height: 620px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { text-align: left; border-bottom: 1px solid #e2e8f0; padding: 10px; vertical-align: top; }
th { color: #475569; background: #f8fafc; position: sticky; top: 0; }
tr { cursor: pointer; }
tr.active, tbody tr:hover { background: #eff6ff; }
.uri { max-width: 280px; word-break: break-all; color: #475569; }
.tag { display: inline-flex; align-items: center; border-radius: 999px; padding: 3px 8px; background: #e2e8f0; color: #334155; font-size: 12px; }
.tag.success { background: #dcfce7; color: #166534; }
.tag.danger { background: #fee2e2; color: #991b1b; }
.tag.warning { background: #fef3c7; color: #92400e; }
.tag.info { background: #dbeafe; color: #1e40af; }
.tag.muted { background: #f1f5f9; color: #64748b; }
.tag.strong { font-weight: 800; }
.detail { position: sticky; top: 12px; }
.kv { display: grid; grid-template-columns: 96px 1fr; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
.kv span, label { color: #64748b; font-size: 13px; }
.kv strong { word-break: break-all; }
pre { white-space: pre-wrap; word-break: break-all; background: #0f172a; color: #e2e8f0; border-radius: 12px; padding: 12px; max-height: 180px; overflow: auto; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.empty { text-align: center; color: #94a3b8; padding: 20px; }
.cleanup { grid-template-columns: 130px 180px 120px 120px; align-items: center; }
.checkbox { display: flex; align-items: center; gap: 8px; color: #475569; }
.distribution { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
.distribution p { margin: 6px 0; color: #475569; }
@media (max-width: 1200px) {
  .cards { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .grid, .bottom-grid { grid-template-columns: 1fr; }
  .detail { position: static; }
}
@media (max-width: 760px) {
  .hero { flex-direction: column; align-items: flex-start; gap: 14px; }
  .cards, .filters, .form-grid { grid-template-columns: 1fr; }
}
</style>
