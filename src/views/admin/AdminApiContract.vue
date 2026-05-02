<script setup lang="ts">
import axios, { type AxiosResponse } from 'axios'
import { computed, onMounted, ref } from 'vue'
import { ACCESS_TOKEN_KEY, USER_ID_KEY, getAccessToken } from '../../api/http'

type ProbeMethod = 'GET' | 'POST'
type ContractLevel = 'PASS' | 'WARN' | 'DANGER' | 'INFO'
type ContractGroup = 'public' | 'auth' | 'member' | 'notification' | 'admin' | 'content'

type ProbeItem = {
  id: string
  title: string
  group: ContractGroup
  method: ProbeMethod
  path: string
  authRequired: boolean
  expected: string
  description: string
}

type ProbeResult = {
  id: string
  status: ContractLevel
  statusText: string
  httpStatus?: number
  contentType: string
  durationMs?: number
  message: string
  sample: string
  checkedAt: string
}

type ContractSnapshot = {
  checkedAt: string
  baseURL: string
  userId: string
  accessTokenPresent: boolean
  rows: Array<ProbeItem & { result?: ProbeResult }>
}

const probes: ProbeItem[] = [
  {
    id: 'member-plans',
    title: '会员套餐列表',
    group: 'public',
    method: 'GET',
    path: '/api/members/plans',
    authRequired: false,
    expected: 'Result<List<MemberPlanView>>',
    description: '公共接口，应该不依赖登录态；常用于验证 Gateway 到 member 服务链路。'
  },
  {
    id: 'auth-me',
    title: '当前登录用户',
    group: 'auth',
    method: 'GET',
    path: '/api/auth/me',
    authRequired: true,
    expected: 'Result<UserSessionView>',
    description: '验证 accessToken 是否可被 auth 服务识别。'
  },
  {
    id: 'permission-view',
    title: '后台权限视图',
    group: 'admin',
    method: 'GET',
    path: '/api/admin/users/{userId}/permission-view',
    authRequired: true,
    expected: 'Result<UserPermissionView>',
    description: '验证后台 RBAC 权限缓存、用户角色和菜单权限是否正常。'
  },
  {
    id: 'member-me',
    title: '我的会员信息',
    group: 'member',
    method: 'GET',
    path: '/api/members/me?userId={userId}',
    authRequired: true,
    expected: 'Result<MemberAccountView>',
    description: '个人中心依赖接口，曾出现 401/403/HTML 响应时优先检查此项。'
  },
  {
    id: 'notification-unread',
    title: '未读通知数',
    group: 'notification',
    method: 'GET',
    path: '/api/notifications/unread-count',
    authRequired: true,
    expected: 'Result<{ unreadCount: number }>',
    description: '个人中心和顶部导航依赖接口，要求登录即可访问。'
  },
  {
    id: 'video-list',
    title: '视频列表',
    group: 'content',
    method: 'GET',
    path: '/api/videos?userId={userId}&limit=8',
    authRequired: true,
    expected: 'Result<List<VideoView>>',
    description: '个人中心作品区依赖接口，用于检测 content/video 路由响应契约。'
  },
  {
    id: 'admin-health',
    title: '后台健康检查',
    group: 'admin',
    method: 'GET',
    path: '/api/admin/health',
    authRequired: true,
    expected: 'Result<String>',
    description: '验证 Gateway 到 admin 服务基础链路。'
  }
]

const groupLabels: Record<ContractGroup, string> = {
  public: '公共接口',
  auth: '认证接口',
  member: '会员接口',
  notification: '通知接口',
  admin: '后台接口',
  content: '内容接口'
}

const statusLabels: Record<ContractLevel, string> = {
  PASS: '通过',
  WARN: '需关注',
  DANGER: '异常',
  INFO: '未检测'
}

const results = ref<Record<string, ProbeResult>>({})
const runningIds = ref<string[]>([])
const keyword = ref('')
const groupFilter = ref<'ALL' | ContractGroup>('ALL')
const statusFilter = ref<'ALL' | ContractLevel>('ALL')
const lastCheckedAt = ref('')
const copied = ref(false)

const baseURL = computed(() => {
  const value = import.meta.env.VITE_API_BASE_URL
  return typeof value === 'string' && value.trim() ? value.trim() : '/api'
})

const currentUserId = computed(() => localStorage.getItem(USER_ID_KEY) || '')
const accessToken = computed(() => getAccessToken())

const rows = computed(() => probes.map((probe) => ({ ...probe, result: results.value[probe.id] })))

const filteredRows = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return rows.value.filter((row) => {
    const status = row.result?.status || 'INFO'
    const matchGroup = groupFilter.value === 'ALL' || row.group === groupFilter.value
    const matchStatus = statusFilter.value === 'ALL' || status === statusFilter.value
    const matchKeyword = !q || [row.title, row.path, row.expected, row.description, row.result?.message || '']
      .join(' ')
      .toLowerCase()
      .includes(q)
    return matchGroup && matchStatus && matchKeyword
  })
})

const stats = computed(() => {
  const values = rows.value.map((row) => row.result?.status || 'INFO')
  return {
    total: values.length,
    pass: values.filter((item) => item === 'PASS').length,
    warn: values.filter((item) => item === 'WARN').length,
    danger: values.filter((item) => item === 'DANGER').length,
    pending: values.filter((item) => item === 'INFO').length
  }
})

function isRunning(id: string) {
  return runningIds.value.includes(id)
}

function nowText() {
  return new Date().toLocaleString()
}

function resolvePath(path: string) {
  const userId = currentUserId.value
  if (path.includes('{userId}') && !userId) {
    return ''
  }
  return path.replace(/\{userId\}/g, encodeURIComponent(userId))
}

function compactSample(value: unknown) {
  try {
    const text = typeof value === 'string' ? value : JSON.stringify(value)
    return (text || '').length > 600 ? `${(text || '').slice(0, 600)}...` : text || ''
  } catch (error) {
    return '[无法序列化响应]'
  }
}

function hasResultEnvelope(data: unknown) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  return Object.prototype.hasOwnProperty.call(data, 'code') && Object.prototype.hasOwnProperty.call(data, 'data')
}

function analyzeResponse(response: AxiosResponse, durationMs: number): Omit<ProbeResult, 'id' | 'checkedAt'> {
  const httpStatus = response.status
  const contentType = String(response.headers?.['content-type'] || '')
  const data = response.data
  const sample = compactSample(data)

  if (contentType.includes('text/html')) {
    return {
      status: 'DANGER',
      statusText: '返回 HTML',
      httpStatus,
      contentType,
      durationMs,
      message: '接口返回 HTML，通常表示请求被 Vite fallback、网关 404 页面或静态资源处理器接管。',
      sample
    }
  }

  if (httpStatus === 401) {
    return {
      status: 'WARN',
      statusText: '未登录',
      httpStatus,
      contentType,
      durationMs,
      message: '后端返回 401。检查 accessToken 是否存在、是否过期，以及请求头 Authorization 是否正常。',
      sample
    }
  }

  if (httpStatus === 403) {
    return {
      status: 'DANGER',
      statusText: '无权限',
      httpStatus,
      contentType,
      durationMs,
      message: '后端返回 403。检查 Gateway 权限规则、JWT roles、用户权限视图和菜单授权。',
      sample
    }
  }

  if (httpStatus >= 500) {
    return {
      status: 'DANGER',
      statusText: '服务异常',
      httpStatus,
      contentType,
      durationMs,
      message: '后端返回 5xx。检查对应微服务日志、数据库连接和中间件状态。',
      sample
    }
  }

  if (httpStatus >= 400) {
    return {
      status: 'WARN',
      statusText: '请求异常',
      httpStatus,
      contentType,
      durationMs,
      message: '后端返回 4xx。检查参数、网关路径和接口方法是否匹配。',
      sample
    }
  }

  if (!contentType.includes('application/json') && !contentType.includes('+json')) {
    return {
      status: 'WARN',
      statusText: 'Content-Type 异常',
      httpStatus,
      contentType,
      durationMs,
      message: '响应不是 JSON Content-Type，建议统一返回 application/json。',
      sample
    }
  }

  if (!hasResultEnvelope(data)) {
    return {
      status: 'WARN',
      statusText: '非统一 Result',
      httpStatus,
      contentType,
      durationMs,
      message: '响应不是统一 Result{code,message,data} 结构，前端全局拦截器可能无法稳定处理。',
      sample
    }
  }

  const code = Number((data as { code?: unknown }).code)
  if (code !== 0) {
    return {
      status: 'WARN',
      statusText: `业务码 ${Number.isNaN(code) ? '未知' : code}`,
      httpStatus,
      contentType,
      durationMs,
      message: 'HTTP 状态正常，但业务 code 不是 0。检查接口业务校验、权限或参数。',
      sample
    }
  }

  return {
    status: 'PASS',
    statusText: '契约通过',
    httpStatus,
    contentType,
    durationMs,
    message: 'HTTP 状态、Content-Type 和 Result 响应结构均符合预期。',
    sample
  }
}

function buildHeaders(authRequired: boolean) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Cache-Control': 'no-cache'
  }
  if (authRequired && accessToken.value) {
    headers.Authorization = `Bearer ${accessToken.value}`
  }
  if (currentUserId.value) {
    headers['X-User-Id'] = currentUserId.value
  }
  return headers
}

async function runProbe(probe: ProbeItem) {
  const resolvedPath = resolvePath(probe.path)
  if (!resolvedPath) {
    results.value[probe.id] = {
      id: probe.id,
      status: 'WARN',
      statusText: '缺少 userId',
      contentType: '-',
      message: '该接口路径需要 userId，但本地缓存中没有 vspicy_user_id。请重新登录后再检测。',
      sample: '',
      checkedAt: nowText()
    }
    return
  }

  if (probe.authRequired && !accessToken.value) {
    results.value[probe.id] = {
      id: probe.id,
      status: 'WARN',
      statusText: '缺少 token',
      contentType: '-',
      message: '该接口需要登录态，但本地没有可用 accessToken。',
      sample: '',
      checkedAt: nowText()
    }
    return
  }

  runningIds.value = [...new Set([...runningIds.value, probe.id])]
  const startedAt = performance.now()
  try {
    const response = await axios.request({
      method: probe.method,
      url: resolvedPath,
      headers: buildHeaders(probe.authRequired),
      validateStatus: () => true,
      timeout: 15000
    })
    const durationMs = Math.round(performance.now() - startedAt)
    results.value[probe.id] = {
      id: probe.id,
      checkedAt: nowText(),
      ...analyzeResponse(response, durationMs)
    }
  } catch (error: any) {
    results.value[probe.id] = {
      id: probe.id,
      status: 'DANGER',
      statusText: '请求失败',
      contentType: '-',
      durationMs: Math.round(performance.now() - startedAt),
      message: error?.message || '网络请求失败。检查 Vite 代理、Gateway 是否启动、服务端口是否正确。',
      sample: '',
      checkedAt: nowText()
    }
  } finally {
    runningIds.value = runningIds.value.filter((id) => id !== probe.id)
  }
}

async function runAll() {
  for (const probe of probes) {
    await runProbe(probe)
  }
  lastCheckedAt.value = nowText()
}

function snapshot(): ContractSnapshot {
  return {
    checkedAt: nowText(),
    baseURL: baseURL.value,
    userId: currentUserId.value,
    accessTokenPresent: Boolean(localStorage.getItem(ACCESS_TOKEN_KEY)),
    rows: rows.value
  }
}

async function copySnapshot() {
  copied.value = false
  const text = JSON.stringify(snapshot(), null, 2)
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 1800)
  } catch (error) {
    copied.value = false
  }
}

function exportSnapshot() {
  const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `vspicy-api-contract-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  runAll()
})
</script>

<template>
  <section class="page admin-api-contract">
    <div class="page-hero">
      <div>
        <p class="eyebrow">API CONTRACT</p>
        <h1>接口响应契约中心</h1>
        <p>统一检查核心接口的 HTTP 状态、Content-Type 和 Result 响应结构，定位 HTML fallback、401、403、业务码异常和响应契约漂移。</p>
      </div>
      <div class="hero-actions">
        <button class="primary" :disabled="runningIds.length > 0" @click="runAll">
          {{ runningIds.length > 0 ? '检测中...' : '一键检测' }}
        </button>
        <button @click="copySnapshot">{{ copied ? '已复制' : '复制快照' }}</button>
        <button @click="exportSnapshot">导出 JSON</button>
      </div>
    </div>

    <div class="summary-grid">
      <article class="summary-card">
        <span>接口总数</span>
        <strong>{{ stats.total }}</strong>
        <small>当前契约样本</small>
      </article>
      <article class="summary-card success">
        <span>通过</span>
        <strong>{{ stats.pass }}</strong>
        <small>Result 契约正常</small>
      </article>
      <article class="summary-card warning">
        <span>需关注</span>
        <strong>{{ stats.warn }}</strong>
        <small>401 / 4xx / 非统一结构</small>
      </article>
      <article class="summary-card danger">
        <span>异常</span>
        <strong>{{ stats.danger }}</strong>
        <small>403 / 5xx / HTML 响应</small>
      </article>
    </div>

    <div class="contract-panel">
      <div class="panel-title">
        <div>
          <h2>统一响应契约</h2>
          <p>前端全局拦截器默认按统一 Result 结构读取数据，接口漂移会导致页面状态不可控。</p>
        </div>
        <span>最近检测：{{ lastCheckedAt || '未检测' }}</span>
      </div>
      <div class="contract-rules">
        <div>
          <strong>HTTP</strong>
          <p>业务成功接口返回 2xx；登录失效用 401；权限不足用 403；后端异常用 5xx。</p>
        </div>
        <div>
          <strong>Content-Type</strong>
          <p>接口响应必须是 application/json，不能返回 text/html 或前端 fallback 页面。</p>
        </div>
        <div>
          <strong>Body</strong>
          <p>统一返回 Result&lt;T&gt;：code、message、data。业务成功时 code = 0。</p>
        </div>
        <div>
          <strong>鉴权</strong>
          <p>需要登录的接口必须能识别 Authorization: Bearer accessToken 和 X-User-Id。</p>
        </div>
      </div>
    </div>

    <div class="filters">
      <input v-model="keyword" placeholder="搜索接口、路径、预期结构或诊断信息" />
      <select v-model="groupFilter">
        <option value="ALL">全部分组</option>
        <option v-for="(label, value) in groupLabels" :key="value" :value="value">{{ label }}</option>
      </select>
      <select v-model="statusFilter">
        <option value="ALL">全部状态</option>
        <option value="PASS">通过</option>
        <option value="WARN">需关注</option>
        <option value="DANGER">异常</option>
        <option value="INFO">未检测</option>
      </select>
    </div>

    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>接口</th>
            <th>路径</th>
            <th>契约</th>
            <th>状态</th>
            <th>耗时</th>
            <th>说明</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredRows" :key="row.id">
            <td>
              <strong>{{ row.title }}</strong>
              <span>{{ groupLabels[row.group] }} · {{ row.method }} · {{ row.authRequired ? '需登录' : '公共' }}</span>
            </td>
            <td>
              <code>{{ resolvePath(row.path) || row.path }}</code>
            </td>
            <td>
              <code>{{ row.expected }}</code>
            </td>
            <td>
              <span class="status" :class="(row.result?.status || 'INFO').toLowerCase()">
                {{ row.result?.statusText || statusLabels.INFO }}
              </span>
              <small v-if="row.result?.httpStatus">HTTP {{ row.result.httpStatus }}</small>
              <small v-if="row.result?.contentType">{{ row.result.contentType }}</small>
            </td>
            <td>{{ row.result?.durationMs ? `${row.result.durationMs}ms` : '-' }}</td>
            <td>
              <p>{{ row.result?.message || row.description }}</p>
              <details v-if="row.result?.sample">
                <summary>响应样本</summary>
                <pre>{{ row.result.sample }}</pre>
              </details>
            </td>
            <td>
              <button :disabled="isRunning(row.id)" @click="runProbe(row)">
                {{ isRunning(row.id) ? '检测中' : '重试' }}
              </button>
            </td>
          </tr>
          <tr v-if="filteredRows.length === 0">
            <td colspan="7" class="empty">没有匹配的接口契约项。</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.admin-api-contract {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-hero,
.contract-panel,
.table-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 22px;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
}

.page-hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  color: #0f172a;
  font-size: 28px;
}

.page-hero p,
.panel-title p,
.contract-rules p,
td p,
.summary-card small,
td span,
td small {
  color: #64748b;
}

.hero-actions {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}

button,
select,
input {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: 12px;
  background: #fff;
  color: #0f172a;
  font-size: 14px;
}

button {
  cursor: pointer;
  padding: 10px 14px;
  font-weight: 700;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

button.primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  padding: 18px;
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: #fff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.summary-card span,
.summary-card small {
  display: block;
}

.summary-card strong {
  display: block;
  margin: 8px 0;
  color: #0f172a;
  font-size: 30px;
}

.summary-card.success strong {
  color: #059669;
}

.summary-card.warning strong {
  color: #d97706;
}

.summary-card.danger strong {
  color: #dc2626;
}

.contract-panel {
  padding: 22px;
}

.panel-title {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.panel-title span {
  color: #64748b;
  font-size: 13px;
  white-space: nowrap;
}

.contract-rules {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.contract-rules div {
  padding: 14px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.contract-rules strong {
  display: block;
  margin-bottom: 6px;
  color: #0f172a;
}

.filters {
  display: grid;
  grid-template-columns: 1fr 180px 180px;
  gap: 12px;
}

input,
select {
  padding: 11px 12px;
}

.table-card {
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  text-align: left;
  vertical-align: top;
}

th {
  background: #f8fafc;
  color: #334155;
  font-size: 13px;
}

td strong,
td span,
td small {
  display: block;
}

td strong {
  margin-bottom: 4px;
  color: #0f172a;
}

code {
  color: #1e293b;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  word-break: break-all;
}

.status {
  display: inline-flex;
  width: fit-content;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.status.pass {
  background: #dcfce7;
  color: #15803d;
}

.status.warn {
  background: #fef3c7;
  color: #b45309;
}

.status.danger {
  background: #fee2e2;
  color: #b91c1c;
}

.status.info {
  background: #e2e8f0;
  color: #475569;
}

details {
  margin-top: 8px;
}

summary {
  color: #2563eb;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

pre {
  max-width: 520px;
  max-height: 220px;
  overflow: auto;
  padding: 10px;
  border-radius: 12px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
  white-space: pre-wrap;
}

.empty {
  color: #64748b;
  text-align: center;
}

@media (max-width: 1100px) {
  .page-hero,
  .panel-title {
    flex-direction: column;
  }

  .summary-grid,
  .contract-rules {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filters {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .summary-grid,
  .contract-rules {
    grid-template-columns: 1fr;
  }

  .table-card {
    overflow-x: auto;
  }
}
</style>
