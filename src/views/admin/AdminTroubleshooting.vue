<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { clearTokens, getAccessToken, getCurrentUserId, http, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_ID_KEY } from '../../api/http'
import { adminOpsMenuItems } from '../../config/adminOpsMenu'
import { getCachedPermissionView, loadPermissionView, type PermissionView } from '../../utils/permission'

type SnapshotLevel = 'OK' | 'WARN' | 'ERROR'
type ProbeStatus = 'PENDING' | 'RUNNING' | 'PASS' | 'WARN' | 'FAIL'

type SnapshotItem = {
  key: string
  title: string
  level: SnapshotLevel
  value: string
  detail: string
}

type ProbeTarget = {
  key: string
  title: string
  service: string
  path: string
  expected: string
}

type ProbeResult = {
  key: string
  status: ProbeStatus
  httpStatus: number | null
  code: number | string | null
  durationMillis: number | null
  message: string
  checkedAt: string | null
}

type JwtPayload = {
  userId?: number | string
  username?: string
  roles?: string[]
  permissions?: string[]
  tokenType?: string
  exp?: number
  iat?: number
  [key: string]: unknown
}

const router = useRouter()
const keyword = ref('')
const running = ref(false)
const copied = ref(false)
const lastGeneratedAt = ref('')
const snapshotNonce = ref(0)
const permissionView = ref<PermissionView | null>(getCachedPermissionView())
const probeResults = ref<Record<string, ProbeResult>>({})

const probeTargets: ProbeTarget[] = [
  {
    key: 'auth-me',
    title: '认证身份',
    service: 'vspicy-auth',
    path: '/auth/me',
    expected: '登录 token 可被 auth 服务解析。'
  },
  {
    key: 'permission-view',
    title: '权限视图',
    service: 'vspicy-admin',
    path: `/admin/users/${getCurrentUserId() || 1}/permission-view`,
    expected: '当前用户权限视图可读取，后台菜单不会误判。'
  },
  {
    key: 'member-me',
    title: '会员自助',
    service: 'vspicy-member',
    path: `/members/me?userId=${getCurrentUserId() || 1}`,
    expected: '个人中心会员卡片可加载。'
  },
  {
    key: 'notification-unread',
    title: '未读通知',
    service: 'vspicy-notification',
    path: '/notifications/unread-count',
    expected: '顶部未读数和个人中心通知入口可加载。'
  },
  {
    key: 'admin-health',
    title: '后台健康',
    service: 'vspicy-admin',
    path: '/admin/health',
    expected: '后台基础接口、gateway 转发和鉴权链路可用。'
  }
]

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.')
    if (!payload) {
      return null
    }
    return JSON.parse(decodeBase64Url(payload)) as JwtPayload
  } catch (error) {
    return null
  }
}

function formatDateBySecond(value?: number) {
  if (!value) {
    return '-'
  }
  return new Date(value * 1000).toLocaleString()
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function readStorageSize(key: string) {
  return localStorage.getItem(key)?.length || 0
}

function readPermissionCodes(view: PermissionView | null) {
  if (!view) {
    return [] as string[]
  }
  const raw = view as any
  if (Array.isArray(raw.permissionCodes)) {
    return raw.permissionCodes.filter(Boolean).map((item: unknown) => String(item))
  }
  if (Array.isArray(raw.permissions)) {
    return raw.permissions.filter(Boolean).map((item: unknown) => String(item))
  }
  return [] as string[]
}

function readRoleCodes(view: PermissionView | null) {
  if (!view) {
    return [] as string[]
  }
  const raw = view as any
  const roles = Array.isArray(raw.roles) ? raw.roles : []
  return roles
    .map((role: any) => typeof role === 'string' ? role : role?.roleCode || role?.code || role?.roleName || role?.name)
    .filter(Boolean)
    .map((item: unknown) => String(item))
}

function readPermissionUsername(view: PermissionView | null) {
  const raw = view as any
  return raw?.username || raw?.nickname || raw?.account || null
}

const token = computed(() => {
  snapshotNonce.value
  return getAccessToken()
})
const jwtPayload = computed(() => token.value ? decodeJwt(token.value) : null)
const routePaths = computed(() => new Set(router.getRoutes().map((item) => item.path)))
const menuPaths = computed(() => new Set(adminOpsMenuItems.map((item) => item.path)))
const routeMenuMisses = computed(() => adminOpsMenuItems.filter((item) => !routePaths.value.has(item.path)))
const adminRouteMisses = computed(() => router.getRoutes()
  .filter((item) => item.path.startsWith('/admin/') && !item.path.includes(':'))
  .filter((item) => !menuPaths.value.has(item.path) && !['/admin/dictionaries'].includes(item.path)))

const snapshotItems = computed<SnapshotItem[]>(() => {
  snapshotNonce.value
  const now = Math.floor(Date.now() / 1000)
  const payload = jwtPayload.value
  const userId = getCurrentUserId()
  const accessSize = readStorageSize(ACCESS_TOKEN_KEY)
  const refreshSize = readStorageSize(REFRESH_TOKEN_KEY)
  const permissionSize = readStorageSize('vspicy_permission_view')
  const view = permissionView.value
  const permissionCodes = readPermissionCodes(view)
  const roleCodes = readRoleCodes(view)
  const connection = (navigator as any).connection
  const items: SnapshotItem[] = []

  items.push({
    key: 'token-exists',
    title: '登录 token',
    level: token.value ? 'OK' : 'ERROR',
    value: token.value ? '已存在' : '缺失',
    detail: token.value ? `accessToken 长度 ${formatBytes(accessSize)}，refreshToken 长度 ${formatBytes(refreshSize)}。` : '未登录或本地登录态已被清理。'
  })

  items.push({
    key: 'token-size',
    title: '请求头风险',
    level: accessSize > 12000 ? 'ERROR' : accessSize > 6000 ? 'WARN' : 'OK',
    value: formatBytes(accessSize),
    detail: accessSize > 12000 ? 'accessToken 偏大，仍可能触发 Request header is too large。' : accessSize > 6000 ? 'token 偏大，建议确认 JWT 未写入完整 permissions。' : 'token 体积正常。'
  })

  items.push({
    key: 'jwt-payload',
    title: 'JWT 解析',
    level: !token.value ? 'WARN' : payload ? 'OK' : 'ERROR',
    value: payload ? String(payload.username || payload.userId || '已解析') : '无法解析',
    detail: payload ? `tokenType=${payload.tokenType || '-'}，roles=${Array.isArray(payload.roles) ? payload.roles.join(', ') || '-' : '-'}，过期时间=${formatDateBySecond(payload.exp)}。` : 'JWT payload 解析失败，可能不是标准 JWT。'
  })

  items.push({
    key: 'token-expired',
    title: '过期状态',
    level: !payload?.exp ? 'WARN' : payload.exp <= now ? 'ERROR' : payload.exp - now < 1800 ? 'WARN' : 'OK',
    value: payload?.exp ? formatDateBySecond(payload.exp) : '-',
    detail: !payload?.exp ? 'JWT 未包含 exp 字段。' : payload.exp <= now ? 'token 已过期，需要重新登录。' : payload.exp - now < 1800 ? 'token 将在 30 分钟内过期。' : 'token 尚未过期。'
  })

  items.push({
    key: 'user-id',
    title: '用户 ID 一致性',
    level: !userId ? 'WARN' : payload?.userId && Number(payload.userId) !== Number(userId) ? 'ERROR' : 'OK',
    value: userId ? String(userId) : '缺失',
    detail: !userId ? 'localStorage 未写入 userId，部分旧接口会缺少 userId 参数。' : payload?.userId && Number(payload.userId) !== Number(userId) ? `JWT userId=${payload.userId}，本地 userId=${userId}，需要清理后重新登录。` : '本地 userId 与 JWT 保持一致。'
  })

  items.push({
    key: 'permission-cache',
    title: '权限缓存',
    level: view ? 'OK' : 'WARN',
    value: view ? `${permissionCodes.length} 个权限码` : '缺失',
    detail: view ? `角色 ${roleCodes.join(', ') || '-'}，缓存体积 ${formatBytes(permissionSize)}。` : '未读取到权限视图缓存，后台菜单可能需要重新加载。'
  })

  items.push({
    key: 'route-menu',
    title: '菜单路由一致性',
    level: routeMenuMisses.value.length || adminRouteMisses.value.length ? 'WARN' : 'OK',
    value: `${routeMenuMisses.value.length} 个菜单死链 / ${adminRouteMisses.value.length} 个路由无菜单`,
    detail: routeMenuMisses.value.length || adminRouteMisses.value.length ? '存在菜单和路由不一致，建议进入路由诊断页面查看明细。' : '管理端菜单与路由基本一致。'
  })

  items.push({
    key: 'browser',
    title: '浏览器环境',
    level: 'OK',
    value: `${window.innerWidth}x${window.innerHeight}`,
    detail: `语言=${navigator.language}，在线=${navigator.onLine ? '是' : '否'}，网络=${connection?.effectiveType || '-'}。`
  })

  return items
})

const filteredSnapshotItems = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) {
    return snapshotItems.value
  }
  return snapshotItems.value.filter((item) => [item.title, item.value, item.detail]
    .some((field) => field.toLowerCase().includes(text)))
})

const overview = computed(() => {
  const error = snapshotItems.value.filter((item) => item.level === 'ERROR').length
  const warn = snapshotItems.value.filter((item) => item.level === 'WARN').length
  const ok = snapshotItems.value.filter((item) => item.level === 'OK').length
  const probeFail = Object.values(probeResults.value).filter((item) => item.status === 'FAIL').length
  const probeWarn = Object.values(probeResults.value).filter((item) => item.status === 'WARN').length
  return { total: snapshotItems.value.length, ok, warn, error, probeFail, probeWarn }
})

const filteredProbeTargets = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  return probeTargets.filter((item) => !text || [item.title, item.service, item.path, item.expected]
    .some((field) => field.toLowerCase().includes(text)))
})

const reportText = computed(() => {
  snapshotNonce.value
  return JSON.stringify(buildReport(), null, 2)
})

function createPendingResult(key: string): ProbeResult {
  return {
    key,
    status: 'PENDING',
    httpStatus: null,
    code: null,
    durationMillis: null,
    message: '未探测',
    checkedAt: null
  }
}

async function runProbe(target: ProbeTarget) {
  const start = performance.now()
  probeResults.value[target.key] = {
    ...createPendingResult(target.key),
    status: 'RUNNING',
    message: '探测中...'
  }

  try {
    const response: any = await http.get(target.path)
    const cost = Math.round(performance.now() - start)
    const businessCode = response?.code ?? null
    const ok = businessCode === 0 || businessCode === '0' || response?.success === true || businessCode === null
    probeResults.value[target.key] = {
      key: target.key,
      status: ok ? 'PASS' : 'WARN',
      httpStatus: 200,
      code: businessCode,
      durationMillis: cost,
      message: ok ? '接口可用。' : `接口返回业务码 ${businessCode}。`,
      checkedAt: new Date().toLocaleString()
    }
  } catch (error: any) {
    const cost = Math.round(performance.now() - start)
    const status = error?.response?.status ?? null
    const data = error?.response?.data
    const message = status === 401
      ? '401 未登录或 token 过期。'
      : status === 403
        ? '403 权限不足或网关鉴权规则不匹配。'
        : status
          ? `${status} ${data?.message || error.message || '接口异常'}。`
          : '请求没有响应，检查 gateway、Vite 代理或服务端口。'

    probeResults.value[target.key] = {
      key: target.key,
      status: 'FAIL',
      httpStatus: status,
      code: data?.code ?? null,
      durationMillis: cost,
      message,
      checkedAt: new Date().toLocaleString()
    }
  }
}

async function runAllProbes() {
  running.value = true
  try {
    for (const target of probeTargets) {
      await runProbe(target)
    }
    lastGeneratedAt.value = new Date().toLocaleString()
  } finally {
    running.value = false
  }
}

async function refreshPermissionView() {
  permissionView.value = await loadPermissionView(true)
  snapshotNonce.value += 1
  lastGeneratedAt.value = new Date().toLocaleString()
}

function resetLocalAuth() {
  clearTokens()
  permissionView.value = null
  snapshotNonce.value += 1
  lastGeneratedAt.value = new Date().toLocaleString()
}

function buildReport() {
  const payload = jwtPayload.value
  return {
    generatedAt: new Date().toISOString(),
    location: window.location.href,
    browser: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      online: navigator.onLine,
      viewport: `${window.innerWidth}x${window.innerHeight}`
    },
    auth: {
      hasAccessToken: Boolean(token.value),
      accessTokenLength: readStorageSize(ACCESS_TOKEN_KEY),
      refreshTokenLength: readStorageSize(REFRESH_TOKEN_KEY),
      localUserId: getCurrentUserId() || null,
      jwt: payload ? {
        userId: payload.userId ?? null,
        username: payload.username ?? null,
        roles: payload.roles ?? [],
        tokenType: payload.tokenType ?? null,
        issuedAt: formatDateBySecond(payload.iat),
        expiresAt: formatDateBySecond(payload.exp)
      } : null
    },
    permissionView: permissionView.value ? {
      userId: permissionView.value.userId,
      username: readPermissionUsername(permissionView.value),
      roles: readRoleCodes(permissionView.value),
      permissionCount: readPermissionCodes(permissionView.value).length
    } : null,
    routeMenu: {
      routeCount: router.getRoutes().length,
      menuCount: adminOpsMenuItems.length,
      menuDeadLinks: routeMenuMisses.value.map((item) => item.path),
      adminRoutesWithoutMenu: adminRouteMisses.value.map((item) => item.path)
    },
    snapshot: snapshotItems.value,
    probes: probeTargets.map((target) => ({
      ...target,
      result: probeResults.value[target.key] || createPendingResult(target.key)
    }))
  }
}

async function copyReport() {
  copied.value = false
  await navigator.clipboard.writeText(reportText.value)
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 1800)
}

function downloadReport() {
  const blob = new Blob([reportText.value], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `vspicy-troubleshooting-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function levelClass(level: SnapshotLevel) {
  return {
    OK: 'ok',
    WARN: 'warn',
    ERROR: 'error'
  }[level]
}

function probeClass(status: ProbeStatus) {
  return {
    PENDING: 'pending',
    RUNNING: 'running',
    PASS: 'ok',
    WARN: 'warn',
    FAIL: 'error'
  }[status]
}

onMounted(() => {
  snapshotNonce.value += 1
  lastGeneratedAt.value = new Date().toLocaleString()
})
</script>

<template>
  <section class="troubleshooting-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Troubleshooting</p>
        <h1>故障快照中心</h1>
        <p>生成可脱敏的前端运行快照，快速定位登录态、JWT、权限缓存、菜单路由和核心接口问题。</p>
      </div>
      <div class="header-actions">
        <button class="ghost-button" type="button" @click="refreshPermissionView">刷新权限视图</button>
        <button class="ghost-button danger" type="button" @click="resetLocalAuth">清理登录态</button>
        <button class="primary-button" type="button" :disabled="running" @click="runAllProbes">
          {{ running ? '探测中...' : '一键探测' }}
        </button>
      </div>
    </div>

    <div class="summary-grid">
      <article class="summary-card ok">
        <span>正常项</span>
        <strong>{{ overview.ok }}</strong>
      </article>
      <article class="summary-card warn">
        <span>风险项</span>
        <strong>{{ overview.warn }}</strong>
      </article>
      <article class="summary-card error">
        <span>错误项</span>
        <strong>{{ overview.error }}</strong>
      </article>
      <article class="summary-card">
        <span>接口失败</span>
        <strong>{{ overview.probeFail }}</strong>
      </article>
    </div>

    <div class="toolbar-panel">
      <input v-model="keyword" placeholder="按标题、服务、路径、说明筛选" />
      <span>最后生成：{{ lastGeneratedAt || '-' }}</span>
      <span>检查项：{{ overview.total }}</span>
    </div>

    <div class="content-grid">
      <section class="panel snapshot-panel">
        <div class="panel-title">
          <div>
            <h2>本地运行快照</h2>
            <p>只展示长度、角色、用户 ID、过期时间等排障字段，不展示 token 原文。</p>
          </div>
        </div>
        <div class="snapshot-list">
          <article v-for="item in filteredSnapshotItems" :key="item.key" class="snapshot-row">
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.detail }}</p>
            </div>
            <div class="snapshot-value">
              <span class="status-pill" :class="levelClass(item.level)">{{ item.level }}</span>
              <small>{{ item.value }}</small>
            </div>
          </article>
        </div>
      </section>

      <aside class="panel actions-panel">
        <h2>建议动作</h2>
        <ul>
          <li v-if="overview.error > 0">存在 ERROR：优先清理登录态并重新登录，再执行一键探测。</li>
          <li v-if="overview.warn > 0">存在 WARN：进入权限诊断或路由诊断查看明细。</li>
          <li v-if="overview.probeFail > 0">接口失败：确认 gateway、目标服务和权限规则。</li>
          <li v-if="overview.error === 0 && overview.warn === 0 && overview.probeFail === 0">当前快照没有明显阻断项。</li>
        </ul>
        <div class="action-stack">
          <button class="ghost-button" type="button" @click="copyReport">{{ copied ? '已复制' : '复制快照 JSON' }}</button>
          <button class="ghost-button" type="button" @click="downloadReport">导出快照 JSON</button>
        </div>
      </aside>
    </div>

    <section class="panel probe-panel">
      <div class="panel-title">
        <div>
          <h2>核心链路探测</h2>
          <p>用于复现 401、403、网关转发异常和服务未启动问题。</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>接口</th>
              <th>服务</th>
              <th>状态</th>
              <th>耗时</th>
              <th>说明</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="target in filteredProbeTargets" :key="target.key">
              <td>
                <strong>{{ target.title }}</strong>
                <code>{{ target.path }}</code>
              </td>
              <td>{{ target.service }}</td>
              <td>
                <span class="status-pill" :class="probeClass((probeResults[target.key] || createPendingResult(target.key)).status)">
                  {{ (probeResults[target.key] || createPendingResult(target.key)).status }}
                </span>
              </td>
              <td>{{ (probeResults[target.key] || createPendingResult(target.key)).durationMillis ?? '-' }} ms</td>
              <td>
                <p>{{ (probeResults[target.key] || createPendingResult(target.key)).message }}</p>
                <small>{{ target.expected }}</small>
              </td>
              <td>
                <button class="mini-button" type="button" :disabled="running" @click="runProbe(target)">重试</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel report-panel">
      <div class="panel-title">
        <div>
          <h2>快照 JSON</h2>
          <p>提交问题时可附带该内容。报告不包含 accessToken 原文。</p>
        </div>
      </div>
      <pre>{{ reportText }}</pre>
    </section>
  </section>
</template>

<style scoped>
.troubleshooting-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-header,
.panel,
.toolbar-panel,
.summary-card {
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.07);
  border-radius: 22px;
}

.page-header {
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
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: 28px;
  color: #0f172a;
}

h2 {
  font-size: 18px;
  color: #0f172a;
}

.page-header p,
.panel-title p,
.snapshot-row p,
.actions-panel li,
.probe-panel small {
  color: #64748b;
  line-height: 1.7;
}

.header-actions,
.action-stack {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.primary-button,
.ghost-button,
.mini-button {
  border: 0;
  border-radius: 999px;
  padding: 10px 16px;
  font-weight: 800;
  cursor: pointer;
}

.primary-button {
  background: #2563eb;
  color: #fff;
}

.ghost-button,
.mini-button {
  background: #eef2ff;
  color: #1e40af;
}

.ghost-button.danger {
  background: #fee2e2;
  color: #b91c1c;
}

.primary-button:disabled,
.mini-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  padding: 18px;
}

.summary-card span {
  color: #64748b;
  font-size: 13px;
}

.summary-card strong {
  display: block;
  margin-top: 8px;
  font-size: 30px;
  color: #0f172a;
}

.summary-card.ok strong {
  color: #047857;
}

.summary-card.warn strong {
  color: #b45309;
}

.summary-card.error strong {
  color: #b91c1c;
}

.toolbar-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
}

.toolbar-panel input {
  flex: 1;
  min-width: 260px;
  border: 1px solid #dbe3ef;
  border-radius: 14px;
  padding: 11px 14px;
}

.toolbar-panel span {
  color: #64748b;
  font-size: 13px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
}

.panel {
  padding: 20px;
}

.panel-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 14px;
}

.snapshot-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.snapshot-row {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #f8fafc;
}

.snapshot-row strong {
  color: #0f172a;
}

.snapshot-value {
  min-width: 150px;
  text-align: right;
}

.snapshot-value small {
  display: block;
  margin-top: 8px;
  color: #64748b;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 900;
}

.status-pill.ok {
  background: #dcfce7;
  color: #047857;
}

.status-pill.warn {
  background: #fef3c7;
  color: #92400e;
}

.status-pill.error {
  background: #fee2e2;
  color: #b91c1c;
}

.status-pill.pending,
.status-pill.running {
  background: #e0f2fe;
  color: #0369a1;
}

.actions-panel ul {
  padding-left: 18px;
}

.table-wrap {
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 13px 12px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  vertical-align: top;
}

th {
  color: #475569;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

code {
  display: block;
  margin-top: 6px;
  color: #2563eb;
  word-break: break-all;
}

.report-panel pre {
  max-height: 360px;
  overflow: auto;
  margin: 0;
  padding: 16px;
  border-radius: 16px;
  background: #0f172a;
  color: #dbeafe;
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 1100px) {
  .page-header,
  .content-grid,
  .toolbar-panel {
    display: block;
  }

  .header-actions,
  .action-stack {
    margin-top: 14px;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .actions-panel {
    margin-top: 18px;
  }
}

@media (max-width: 720px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .snapshot-row {
    flex-direction: column;
  }

  .snapshot-value {
    text-align: left;
  }
}
</style>
