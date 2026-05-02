<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { http, getAccessToken, getCurrentUserId } from '../../api/http'

const ACCESS_TOKEN_KEY = 'vspicy_access_token'
const REFRESH_TOKEN_KEY = 'vspicy_refresh_token'
const USER_ID_KEY = 'vspicy_user_id'
const PERMISSION_VIEW_KEY = 'vspicy_permission_view'

type CheckStatus = 'PASS' | 'WARN' | 'FAIL' | 'INFO' | 'RUNNING' | 'PENDING'
type CheckLevel = 'BLOCKER' | 'HIGH' | 'WARN' | 'INFO'
type CheckGroup = 'browser' | 'storage' | 'auth' | 'proxy' | 'service'

type LocalCheck = {
  key: string
  title: string
  group: CheckGroup
  level: CheckLevel
  status: CheckStatus
  target: string
  message: string
}

type ProbeTarget = {
  key: string
  title: string
  group: CheckGroup
  level: CheckLevel
  path: string
  authRequired: boolean
  expectedStatuses: number[]
  description: string
}

type ProbeResult = {
  key: string
  status: CheckStatus
  httpStatus: number | null
  durationMillis: number | null
  contentType: string
  businessCode: number | string | null
  message: string
  checkedAt: string
}

type ExportSnapshot = {
  generatedAt: string
  location: string
  apiBase: string
  localChecks: LocalCheck[]
  probeResults: ProbeResult[]
}

const running = ref(false)
const currentProbe = ref('')
const keyword = ref('')
const statusFilter = ref<'ALL' | CheckStatus>('ALL')
const groupFilter = ref<'ALL' | CheckGroup>('ALL')
const lastRunAt = ref('')
const probeResults = ref<Record<string, ProbeResult>>({})

const envApiBase = computed(() => String(import.meta.env.VITE_API_BASE_URL || '').trim() || '(未配置)')
const axiosBase = computed(() => String(http.defaults.baseURL || '(未配置)'))
const browserOrigin = computed(() => window.location.origin)
const isViteDevServer = computed(() => ['5173', '5174', '5175'].includes(window.location.port))

const probeTargets: ProbeTarget[] = [
  {
    key: 'member-plans',
    title: '会员套餐公共接口',
    group: 'service',
    level: 'HIGH',
    path: '/members/plans',
    authRequired: false,
    expectedStatuses: [200],
    description: '验证 Vite /api 代理、Gateway 和 member 服务公共路由。'
  },
  {
    key: 'auth-me',
    title: '当前登录身份',
    group: 'auth',
    level: 'BLOCKER',
    path: '/auth/me',
    authRequired: true,
    expectedStatuses: [200, 401],
    description: '验证 auth 服务路由。未登录返回 401 可以接受，登录后应返回 200。'
  },
  {
    key: 'member-me',
    title: '我的会员信息',
    group: 'service',
    level: 'HIGH',
    path: `/members/me?userId=${getCurrentUserId() || 1}`,
    authRequired: true,
    expectedStatuses: [200, 401, 403],
    description: '验证个人中心会员接口，用于定位 /me 页面 401/403。'
  },
  {
    key: 'notification-unread',
    title: '未读通知数',
    group: 'service',
    level: 'HIGH',
    path: '/notifications/unread-count',
    authRequired: true,
    expectedStatuses: [200, 401, 403],
    description: '验证 notification 服务与登录态接口链路。'
  },
  {
    key: 'admin-health',
    title: '后台健康接口',
    group: 'service',
    level: 'WARN',
    path: '/admin/health',
    authRequired: true,
    expectedStatuses: [200, 401, 403],
    description: '验证 admin 服务和后台网关路由。'
  }
]

function safeLocalStorageGet(key: string) {
  try {
    return localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function parseJsonSafely<T = any>(value: string): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function parseJwtPayload(token: string): any | null {
  const parts = token.split('.')
  if (parts.length < 2) return null

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return JSON.parse(decodeURIComponent(escape(atob(padded))))
  } catch {
    try {
      const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
      return JSON.parse(atob(padded))
    } catch {
      return null
    }
  }
}

function formatTimeBySecond(value?: number) {
  if (!value) return '-'
  return new Date(value * 1000).toLocaleString()
}

function localStorageSize() {
  try {
    let total = 0
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index) || ''
      const value = localStorage.getItem(key) || ''
      total += key.length + value.length
    }
    return total
  } catch {
    return 0
  }
}

const localChecks = computed<LocalCheck[]>(() => {
  const rows: LocalCheck[] = []
  const token = getAccessToken()
  const rawAccessToken = safeLocalStorageGet(ACCESS_TOKEN_KEY)
  const refreshToken = safeLocalStorageGet(REFRESH_TOKEN_KEY)
  const userId = safeLocalStorageGet(USER_ID_KEY)
  const permissionRaw = safeLocalStorageGet(PERMISSION_VIEW_KEY)
  const permissionView = parseJsonSafely<any>(permissionRaw)
  const jwtPayload = parseJwtPayload(token)
  const storageSize = localStorageSize()

  rows.push({
    key: 'browser-origin',
    title: '当前前端地址',
    group: 'browser',
    level: 'INFO',
    status: 'INFO',
    target: browserOrigin.value,
    message: isViteDevServer.value ? '当前运行在 Vite 开发服务，应通过 vite.config.ts 的 /api 代理访问 Gateway。' : '当前看起来是构建产物或非默认开发端口。'
  })

  rows.push({
    key: 'api-base',
    title: '前端 API 基础路径',
    group: 'proxy',
    level: 'BLOCKER',
    status: axiosBase.value === '/api' || axiosBase.value.endsWith('/api') ? 'PASS' : 'WARN',
    target: `axios=${axiosBase.value}，env=${envApiBase.value}`,
    message: axiosBase.value === '/api'
      ? '当前通过同源 /api 发起请求，开发环境依赖 Vite proxy，生产环境依赖 Nginx/Gateway 转发。'
      : 'API 基础路径不是标准 /api，请确认不会绕过 Gateway。'
  })

  rows.push({
    key: 'token-exists',
    title: 'accessToken 状态',
    group: 'auth',
    level: 'BLOCKER',
    status: token ? 'PASS' : rawAccessToken ? 'FAIL' : 'WARN',
    target: ACCESS_TOKEN_KEY,
    message: token ? `已读取安全 token，长度 ${formatBytes(token.length)}。` : rawAccessToken ? '本地存在 token，但被 http.ts 判定为异常并清理。' : '未登录或本地没有 token。'
  })

  rows.push({
    key: 'token-size',
    title: 'Authorization 请求头风险',
    group: 'auth',
    level: 'HIGH',
    status: !token ? 'INFO' : token.length > 12000 ? 'FAIL' : token.length > 6000 ? 'WARN' : 'PASS',
    target: `${token.length} chars`,
    message: !token ? '未登录，跳过请求头体积判断。' : token.length > 12000 ? 'token 过大，仍可能触发 Request header is too large。' : token.length > 6000 ? 'token 偏大，建议确认 JWT 没有写入完整权限码。' : 'token 体积正常。'
  })

  rows.push({
    key: 'jwt-payload',
    title: 'JWT Payload',
    group: 'auth',
    level: 'HIGH',
    status: !token ? 'INFO' : jwtPayload ? 'PASS' : 'FAIL',
    target: jwtPayload ? `userId=${jwtPayload.userId || '-'}，tokenType=${jwtPayload.tokenType || '-'}` : 'payload parse',
    message: jwtPayload ? `签发 ${formatTimeBySecond(jwtPayload.iat)}，过期 ${formatTimeBySecond(jwtPayload.exp)}，roles=${Array.isArray(jwtPayload.roles) ? jwtPayload.roles.join(', ') || '-' : '-'}` : '无法解析 JWT payload。'
  })

  rows.push({
    key: 'user-id',
    title: '本地 userId',
    group: 'storage',
    level: 'HIGH',
    status: userId ? 'PASS' : 'WARN',
    target: USER_ID_KEY,
    message: userId ? `当前 userId=${userId}` : '本地没有 userId，部分兼容接口会 fallback 到 1 或请求失败。'
  })

  rows.push({
    key: 'refresh-token',
    title: 'refreshToken 状态',
    group: 'storage',
    level: 'INFO',
    status: refreshToken ? 'PASS' : 'INFO',
    target: REFRESH_TOKEN_KEY,
    message: refreshToken ? `已存在，长度 ${formatBytes(refreshToken.length)}。` : '未写入 refreshToken；如果系统当前没有刷新机制，可以忽略。'
  })

  rows.push({
    key: 'permission-cache',
    title: '权限视图缓存',
    group: 'storage',
    level: 'HIGH',
    status: !permissionRaw ? 'WARN' : permissionView ? 'PASS' : 'FAIL',
    target: PERMISSION_VIEW_KEY,
    message: !permissionRaw ? '权限缓存不存在，进入后台时会重新拉取。' : permissionView ? `缓存可解析，权限码 ${Array.isArray(permissionView.permissionCodes) ? permissionView.permissionCodes.length : 0} 个，体积 ${formatBytes(permissionRaw.length)}。` : '权限缓存不是合法 JSON，建议清理登录态后重新登录。'
  })

  rows.push({
    key: 'storage-size',
    title: 'localStorage 体积',
    group: 'storage',
    level: 'WARN',
    status: storageSize > 1024 * 1024 ? 'WARN' : 'PASS',
    target: formatBytes(storageSize),
    message: storageSize > 1024 * 1024 ? 'localStorage 体积偏大，建议清理历史调试快照或异常缓存。' : 'localStorage 体积正常。'
  })

  return rows
})

const groups = computed(() => Array.from(new Set([...localChecks.value.map((item) => item.group), ...probeTargets.map((item) => item.group)])).sort())

const probeRows = computed(() => probeTargets.map((item) => {
  const result = probeResults.value[item.key]
  return {
    ...item,
    status: result?.status || 'PENDING',
    httpStatus: result?.httpStatus ?? null,
    durationMillis: result?.durationMillis ?? null,
    contentType: result?.contentType || '-',
    message: result?.message || item.description,
    checkedAt: result?.checkedAt || '-'
  }
}))

const allRows = computed(() => {
  const rows = [
    ...localChecks.value.map((item) => ({
      key: item.key,
      title: item.title,
      group: item.group,
      level: item.level,
      status: item.status,
      target: item.target,
      message: item.message,
      source: '本地检查',
      httpStatus: null as number | null,
      durationMillis: null as number | null,
      checkedAt: '-'
    })),
    ...probeRows.value.map((item) => ({
      key: item.key,
      title: item.title,
      group: item.group,
      level: item.level,
      status: item.status,
      target: item.path,
      message: item.message,
      source: '接口探测',
      httpStatus: item.httpStatus,
      durationMillis: item.durationMillis,
      checkedAt: item.checkedAt
    }))
  ]

  return rows.filter((item) => {
    const keywordValue = keyword.value.trim().toLowerCase()
    const matchesKeyword = !keywordValue || [item.title, item.group, item.target, item.message, item.source]
      .some((value) => String(value).toLowerCase().includes(keywordValue))
    const matchesStatus = statusFilter.value === 'ALL' || item.status === statusFilter.value
    const matchesGroup = groupFilter.value === 'ALL' || item.group === groupFilter.value
    return matchesKeyword && matchesStatus && matchesGroup
  })
})

const summary = computed(() => {
  const rows = [...localChecks.value.map((item) => item.status), ...probeRows.value.map((item) => item.status)]
  const fail = rows.filter((status) => status === 'FAIL').length
  const warn = rows.filter((status) => status === 'WARN').length
  const pass = rows.filter((status) => status === 'PASS').length
  const runningCount = rows.filter((status) => status === 'RUNNING').length
  return { total: rows.length, fail, warn, pass, running: runningCount }
})

function resolveProbeUrl(path: string) {
  return path.startsWith('/api/') ? path : `/api${path.startsWith('/') ? path : `/${path}`}`
}

function buildHeaders(authRequired: boolean) {
  const headers: Record<string, string> = {
    Accept: 'application/json'
  }
  const token = getAccessToken()
  const userId = getCurrentUserId()

  if (authRequired && token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (userId) {
    headers['X-User-Id'] = String(userId)
  }
  return headers
}

async function runProbe(target: ProbeTarget) {
  currentProbe.value = target.key
  const startedAt = performance.now()

  probeResults.value[target.key] = {
    key: target.key,
    status: 'RUNNING',
    httpStatus: null,
    durationMillis: null,
    contentType: '-',
    businessCode: null,
    message: '探测中...',
    checkedAt: new Date().toLocaleString()
  }

  try {
    const response = await fetch(resolveProbeUrl(target.path), {
      method: 'GET',
      headers: buildHeaders(target.authRequired),
      credentials: 'same-origin'
    })
    const durationMillis = Math.round(performance.now() - startedAt)
    const contentType = response.headers.get('content-type') || '-'
    const text = await response.text()
    const payload = parseJsonSafely<any>(text)
    const businessCode = payload && typeof payload === 'object' ? payload.code ?? null : null

    let status: CheckStatus = target.expectedStatuses.includes(response.status) ? 'PASS' : 'FAIL'
    let message = ''

    if (response.status === 401) {
      status = target.authRequired ? 'WARN' : 'FAIL'
      message = '接口返回 401：未登录或 token 失效。'
    } else if (response.status === 403) {
      status = 'FAIL'
      message = '接口返回 403：网关或服务端权限不足。'
    } else if (!contentType.includes('application/json')) {
      status = response.ok ? 'WARN' : 'FAIL'
      message = `响应不是 JSON，content-type=${contentType}。这通常说明请求被前端 dev server、HTML fallback 或静态资源处理器接管。`
    } else if (payload && typeof payload === 'object' && 'code' in payload) {
      status = response.ok && (payload.code === 0 || payload.code === 200) ? 'PASS' : response.ok ? 'WARN' : 'FAIL'
      message = `HTTP ${response.status}，业务 code=${payload.code}，message=${payload.message || '-'}。`
    } else {
      message = `HTTP ${response.status}，响应结构不是统一 Result 包装。`
      status = response.ok ? 'WARN' : 'FAIL'
    }

    probeResults.value[target.key] = {
      key: target.key,
      status,
      httpStatus: response.status,
      durationMillis,
      contentType,
      businessCode,
      message,
      checkedAt: new Date().toLocaleString()
    }
  } catch (error: any) {
    probeResults.value[target.key] = {
      key: target.key,
      status: 'FAIL',
      httpStatus: null,
      durationMillis: Math.round(performance.now() - startedAt),
      contentType: '-',
      businessCode: null,
      message: error?.message || '接口探测失败。',
      checkedAt: new Date().toLocaleString()
    }
  } finally {
    currentProbe.value = ''
  }
}

async function runAllProbes() {
  running.value = true
  try {
    for (const target of probeTargets) {
      await runProbe(target)
    }
    lastRunAt.value = new Date().toLocaleString()
  } finally {
    running.value = false
  }
}

function retryProbe(key: string) {
  const target = probeTargets.find((item) => item.key === key)
  if (target) {
    runProbe(target)
  }
}

function clearLocalState() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(PERMISSION_VIEW_KEY)
  probeResults.value = {}
}

function exportSnapshot() {
  const data: ExportSnapshot = {
    generatedAt: new Date().toISOString(),
    location: window.location.href,
    apiBase: axiosBase.value,
    localChecks: localChecks.value,
    probeResults: Object.values(probeResults.value)
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `vspicy-environment-check-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function statusText(status: CheckStatus) {
  const map: Record<CheckStatus, string> = {
    PASS: '通过',
    WARN: '警告',
    FAIL: '失败',
    INFO: '信息',
    RUNNING: '运行中',
    PENDING: '待检查'
  }
  return map[status]
}

function levelText(level: CheckLevel) {
  const map: Record<CheckLevel, string> = {
    BLOCKER: '阻断',
    HIGH: '高',
    WARN: '中',
    INFO: '低'
  }
  return map[level]
}

function groupText(group: CheckGroup) {
  const map: Record<CheckGroup, string> = {
    browser: '浏览器',
    storage: '本地缓存',
    auth: '认证',
    proxy: '代理配置',
    service: '服务接口'
  }
  return map[group]
}

onMounted(() => {
  runAllProbes()
})
</script>

<template>
  <section class="environment-page">
    <div class="hero-card">
      <div>
        <p class="eyebrow">Environment Check</p>
        <h1>系统环境检查中心</h1>
        <p class="hero-desc">
          检查前端运行地址、API 基础路径、本地登录态、权限缓存、Vite 代理和核心服务响应，优先定位 401、403、HTML 响应和请求头异常。
        </p>
      </div>
      <div class="hero-actions">
        <button type="button" :disabled="running" @click="runAllProbes">{{ running ? '检查中...' : '一键检查' }}</button>
        <button type="button" class="ghost" @click="exportSnapshot">导出快照</button>
        <button type="button" class="danger" @click="clearLocalState">清理登录态</button>
      </div>
    </div>

    <div class="summary-grid">
      <article class="summary-card pass">
        <span>通过</span>
        <strong>{{ summary.pass }}</strong>
      </article>
      <article class="summary-card warn">
        <span>警告</span>
        <strong>{{ summary.warn }}</strong>
      </article>
      <article class="summary-card fail">
        <span>失败</span>
        <strong>{{ summary.fail }}</strong>
      </article>
      <article class="summary-card info">
        <span>检查项</span>
        <strong>{{ summary.total }}</strong>
      </article>
    </div>

    <div class="meta-grid">
      <div class="meta-card">
        <span>当前地址</span>
        <strong>{{ browserOrigin }}</strong>
      </div>
      <div class="meta-card">
        <span>axios baseURL</span>
        <strong>{{ axiosBase }}</strong>
      </div>
      <div class="meta-card">
        <span>VITE_API_BASE_URL</span>
        <strong>{{ envApiBase }}</strong>
      </div>
      <div class="meta-card">
        <span>最后检查</span>
        <strong>{{ lastRunAt || '-' }}</strong>
      </div>
    </div>

    <div class="filter-card">
      <input v-model="keyword" type="search" placeholder="搜索检查项 / 路径 / 提示" />
      <select v-model="groupFilter">
        <option value="ALL">全部分组</option>
        <option v-for="group in groups" :key="group" :value="group">{{ groupText(group) }}</option>
      </select>
      <select v-model="statusFilter">
        <option value="ALL">全部状态</option>
        <option value="FAIL">失败</option>
        <option value="WARN">警告</option>
        <option value="PASS">通过</option>
        <option value="INFO">信息</option>
        <option value="PENDING">待检查</option>
      </select>
    </div>

    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>检查项</th>
            <th>来源</th>
            <th>分组</th>
            <th>等级</th>
            <th>状态</th>
            <th>目标</th>
            <th>结果</th>
            <th>耗时</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in allRows" :key="row.key">
            <td>
              <strong>{{ row.title }}</strong>
              <small>{{ row.key }}</small>
            </td>
            <td>{{ row.source }}</td>
            <td>{{ groupText(row.group) }}</td>
            <td><span :class="['level-tag', row.level.toLowerCase()]">{{ levelText(row.level) }}</span></td>
            <td><span :class="['status-tag', row.status.toLowerCase()]">{{ statusText(row.status) }}</span></td>
            <td class="target-cell">{{ row.target }}</td>
            <td class="message-cell">{{ row.message }}</td>
            <td>{{ row.durationMillis == null ? '-' : `${row.durationMillis}ms` }}</td>
            <td>
              <button
                v-if="row.source === '接口探测'"
                type="button"
                class="tiny"
                :disabled="running || currentProbe === row.key"
                @click="retryProbe(row.key)"
              >重试</button>
              <span v-else>-</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="allRows.length === 0" class="empty-state">没有匹配的检查项。</div>
    </div>

    <div class="tips-card">
      <h2>判定规则</h2>
      <ul>
        <li>如果响应是 <code>text/html</code>，通常是请求没有进入 Gateway，被 Vite dev server 或前端 fallback 接管。</li>
        <li>如果登录后仍是 401，优先检查 accessToken 是否写入、是否过期、Authorization 是否被清理。</li>
        <li>如果是 403，优先检查 JWT roles、网关权限规则和当前用户权限视图。</li>
        <li>如果 token 超过 12KB，仍有触发 Tomcat <code>Request header is too large</code> 的风险。</li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.environment-page {
  display: grid;
  gap: 18px;
}

.hero-card,
.table-card,
.filter-card,
.tips-card,
.meta-card,
.summary-card {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
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

.hero-desc {
  max-width: 760px;
  margin-top: 10px;
  color: #64748b;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  justify-content: flex-end;
  gap: 10px;
}

button {
  border: 0;
  border-radius: 12px;
  background: #2563eb;
  color: #fff;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

button.ghost {
  background: #e0e7ff;
  color: #3730a3;
}

button.danger {
  background: #fee2e2;
  color: #b91c1c;
}

button.tiny {
  padding: 6px 10px;
  border-radius: 9px;
  background: #eff6ff;
  color: #1d4ed8;
}

.summary-grid,
.meta-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.summary-card,
.meta-card {
  padding: 16px;
}

.summary-card span,
.meta-card span {
  display: block;
  color: #64748b;
  font-size: 13px;
}

.summary-card strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: 30px;
}

.summary-card.pass strong { color: #15803d; }
.summary-card.warn strong { color: #b45309; }
.summary-card.fail strong { color: #b91c1c; }
.summary-card.info strong { color: #1d4ed8; }

.meta-card strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  word-break: break-all;
}

.filter-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px 180px;
  gap: 12px;
  padding: 14px;
}

input,
select {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #fff;
  padding: 10px 12px;
  color: #0f172a;
  outline: none;
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
  padding: 13px 14px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  vertical-align: top;
}

th {
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
}

td strong,
td small {
  display: block;
}

td small {
  margin-top: 4px;
  color: #94a3b8;
}

.target-cell {
  max-width: 240px;
  color: #334155;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  word-break: break-all;
}

.message-cell {
  min-width: 260px;
  color: #475569;
  line-height: 1.55;
}

.status-tag,
.level-tag {
  display: inline-flex;
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 800;
}

.status-tag.pass { background: #dcfce7; color: #166534; }
.status-tag.warn { background: #fef3c7; color: #92400e; }
.status-tag.fail { background: #fee2e2; color: #991b1b; }
.status-tag.info { background: #dbeafe; color: #1e40af; }
.status-tag.running { background: #ede9fe; color: #5b21b6; }
.status-tag.pending { background: #f1f5f9; color: #475569; }

.level-tag.blocker { background: #fee2e2; color: #991b1b; }
.level-tag.high { background: #ffedd5; color: #9a3412; }
.level-tag.warn { background: #fef9c3; color: #854d0e; }
.level-tag.info { background: #e0f2fe; color: #075985; }

.empty-state {
  padding: 26px;
  color: #64748b;
  text-align: center;
}

.tips-card {
  padding: 18px;
}

.tips-card h2 {
  font-size: 18px;
  color: #0f172a;
}

.tips-card ul {
  margin: 12px 0 0;
  padding-left: 20px;
  color: #475569;
  line-height: 1.75;
}

.tips-card code {
  border-radius: 6px;
  background: #f1f5f9;
  padding: 2px 5px;
  color: #334155;
}

@media (max-width: 1100px) {
  .hero-card {
    flex-direction: column;
  }

  .hero-actions {
    justify-content: flex-start;
  }

  .summary-grid,
  .meta-grid,
  .filter-card {
    grid-template-columns: 1fr;
  }
}
</style>
