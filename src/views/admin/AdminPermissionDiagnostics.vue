<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_ID_KEY, clearTokens, getAccessToken } from '../../api/http'
import { adminOpsMenuItems } from '../../config/adminOpsMenu'
import { getCachedPermissionView, hasPermission, loadPermissionView, type PermissionView } from '../../utils/permission'

type IssueLevel = 'BLOCKER' | 'HIGH' | 'WARN' | 'INFO'
type AccessState = 'PASS' | 'DENY' | 'WARN'

type JwtPayload = {
  sub?: string
  userId?: number | string
  username?: string
  roles?: string[]
  tokenType?: string
  exp?: number
  iat?: number
  [key: string]: any
}

type RuntimeIssue = {
  level: IssueLevel
  type: string
  target: string
  message: string
}

type MenuPermissionRow = {
  title: string
  group: string
  path: string
  permission: string
  routePermission: string
  granted: boolean
  status: AccessState
  reason: string
}

const router = useRouter()
const keyword = ref('')
const statusFilter = ref<'ALL' | AccessState>('ALL')
const refreshing = ref(false)
const permissionView = ref<PermissionView | null>(getCachedPermissionView())
const lastRefreshAt = ref('')

const accessToken = computed(() => getAccessToken())
const refreshTokenLength = computed(() => localStorage.getItem(REFRESH_TOKEN_KEY)?.length || 0)
const localUserId = computed(() => localStorage.getItem(USER_ID_KEY) || '-')

const jwtPayload = computed<JwtPayload | null>(() => decodeJwtPayload(accessToken.value))
const jwtRoles = computed<string[]>(() => normalizeRoles(jwtPayload.value?.roles))
const cachedRoles = computed<string[]>(() => normalizeRoles(permissionView.value?.roles?.map((item: any) => item.roleCode || item.code || item.name)))
const permissionCodes = computed<string[]>(() => permissionView.value?.permissionCodes || [])

const routePermissionByPath = computed(() => {
  const map = new Map<string, string>()
  for (const route of router.getRoutes()) {
    if (route.path.startsWith('/admin/') && !route.path.includes(':pathMatch')) {
      map.set(route.path, String(route.meta.permissionCode || ''))
    }
  }
  return map
})

const menuRows = computed<MenuPermissionRow[]>(() => {
  return adminOpsMenuItems.map((item) => {
    const routePermission = routePermissionByPath.value.get(item.path) || ''
    const granted = permissionView.value ? hasPermission(item.permission, permissionView.value) : false
    let status: AccessState = granted ? 'PASS' : 'DENY'
    let reason = granted ? '当前权限视图允许访问' : '当前权限视图不包含该权限码'

    if (!routePermission) {
      status = 'WARN'
      reason = '路由缺少 permissionCode，前端守卫无法稳定校验'
    } else if (routePermission !== item.permission) {
      status = 'WARN'
      reason = `菜单权限与路由权限不一致：route=${routePermission}`
    }

    return {
      title: item.title,
      group: item.group,
      path: item.path,
      permission: item.permission,
      routePermission,
      granted,
      status,
      reason
    }
  }).sort((a, b) => statusRank(a.status) - statusRank(b.status) || a.group.localeCompare(b.group) || a.path.localeCompare(b.path))
})

const issues = computed<RuntimeIssue[]>(() => {
  const rows: RuntimeIssue[] = []
  const token = accessToken.value
  const payload = jwtPayload.value
  const view = permissionView.value

  if (!token) {
    rows.push({ level: 'BLOCKER', type: 'TOKEN_MISSING', target: ACCESS_TOKEN_KEY, message: '本地没有有效 accessToken，后台接口会返回 401。' })
  } else if (token.length > 12000) {
    rows.push({ level: 'HIGH', type: 'TOKEN_TOO_LARGE', target: `${token.length} bytes`, message: 'accessToken 偏大，可能再次触发 Request header is too large。' })
  } else if (token.length > 6000) {
    rows.push({ level: 'WARN', type: 'TOKEN_SIZE_WARNING', target: `${token.length} bytes`, message: 'accessToken 已偏大，建议确认 JWT 未写入完整 permissions。' })
  }

  if (token && !payload) {
    rows.push({ level: 'HIGH', type: 'JWT_PARSE_FAILED', target: ACCESS_TOKEN_KEY, message: 'accessToken 不是标准 JWT，网关可能无法解析身份。' })
  }

  if (payload?.exp) {
    const expiresAt = payload.exp * 1000
    if (expiresAt <= Date.now()) {
      rows.push({ level: 'BLOCKER', type: 'TOKEN_EXPIRED', target: formatDate(expiresAt), message: 'accessToken 已过期，需要重新登录。' })
    } else if (expiresAt - Date.now() < 10 * 60 * 1000) {
      rows.push({ level: 'WARN', type: 'TOKEN_EXPIRING', target: formatDate(expiresAt), message: 'accessToken 将在 10 分钟内过期。' })
    }
  }

  if (!view) {
    rows.push({ level: 'HIGH', type: 'PERMISSION_VIEW_MISSING', target: 'vspicy_permission_view', message: '本地没有权限视图，页面守卫会临时放行，但接口仍可能被网关拒绝。' })
  } else {
    if (!view.userId) {
      rows.push({ level: 'WARN', type: 'PERMISSION_USER_MISSING', target: 'userId', message: '权限视图缺少 userId，建议刷新权限视图。' })
    }
    if (!cachedRoles.value.length) {
      rows.push({ level: 'WARN', type: 'ROLE_MISSING', target: 'roles', message: '权限视图没有角色，管理员页面大概率无法通过网关鉴权。' })
    }
    if (!permissionCodes.value.length && !cachedRoles.value.includes('SUPER_ADMIN')) {
      rows.push({ level: 'HIGH', type: 'PERMISSION_CODE_MISSING', target: 'permissionCodes', message: '非 SUPER_ADMIN 用户没有任何权限码，后台菜单会被大量拒绝。' })
    }
  }

  if (payload?.userId && localUserId.value !== '-' && String(payload.userId) !== String(localUserId.value)) {
    rows.push({ level: 'HIGH', type: 'USER_ID_MISMATCH', target: `${payload.userId} != ${localUserId.value}`, message: 'JWT userId 与本地 userId 不一致，可能访问到错误用户的权限视图。' })
  }

  const deniedCount = menuRows.value.filter((item) => item.status === 'DENY').length
  if (deniedCount > 0) {
    rows.push({ level: 'INFO', type: 'MENU_DENIED', target: `${deniedCount} items`, message: '当前用户没有部分后台菜单权限；如果是管理员账号，需要检查角色授权。' })
  }

  return rows.sort((a, b) => issueRank(a.level) - issueRank(b.level) || a.type.localeCompare(b.type))
})

const filteredMenuRows = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  return menuRows.value.filter((item) => {
    const matchStatus = statusFilter.value === 'ALL' || item.status === statusFilter.value
    const matchKeyword = !text || [item.title, item.group, item.path, item.permission, item.routePermission, item.reason]
      .some((field) => field.toLowerCase().includes(text))
    return matchStatus && matchKeyword
  })
})

const overview = computed(() => ({
  tokenLength: accessToken.value.length,
  refreshTokenLength: refreshTokenLength.value,
  roleCount: new Set([...jwtRoles.value, ...cachedRoles.value]).size,
  permissionCount: permissionCodes.value.length,
  passMenus: menuRows.value.filter((item) => item.status === 'PASS').length,
  deniedMenus: menuRows.value.filter((item) => item.status === 'DENY').length,
  warnMenus: menuRows.value.filter((item) => item.status === 'WARN').length,
  issueCount: issues.value.length,
  blockerCount: issues.value.filter((item) => item.level === 'BLOCKER').length
}))

const tokenMeta = computed(() => {
  const payload = jwtPayload.value
  if (!payload) {
    return [
      { label: 'accessToken 长度', value: `${overview.value.tokenLength} bytes` },
      { label: 'refreshToken 长度', value: `${overview.value.refreshTokenLength} bytes` },
      { label: '本地 userId', value: localUserId.value },
      { label: 'JWT 状态', value: accessToken.value ? '无法解析' : '未登录' }
    ]
  }

  return [
    { label: 'accessToken 长度', value: `${overview.value.tokenLength} bytes` },
    { label: 'refreshToken 长度', value: `${overview.value.refreshTokenLength} bytes` },
    { label: '本地 userId', value: localUserId.value },
    { label: 'JWT userId', value: String(payload.userId || '-') },
    { label: 'JWT username', value: String(payload.username || payload.sub || '-') },
    { label: 'JWT roles', value: jwtRoles.value.join(', ') || '-' },
    { label: 'tokenType', value: String(payload.tokenType || '-') },
    { label: '签发时间', value: payload.iat ? formatDate(payload.iat * 1000) : '-' },
    { label: '过期时间', value: payload.exp ? formatDate(payload.exp * 1000) : '-' }
  ]
})

onMounted(() => {
  lastRefreshAt.value = formatDate(Date.now())
})

async function refreshPermissionView() {
  refreshing.value = true
  try {
    permissionView.value = await loadPermissionView(true)
    lastRefreshAt.value = formatDate(Date.now())
  } finally {
    refreshing.value = false
  }
}

function clearLocalState() {
  clearTokens()
  permissionView.value = null
  lastRefreshAt.value = formatDate(Date.now())
}

function openPath(path: string) {
  router.push(path)
}

function exportReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    overview: overview.value,
    issues: issues.value,
    tokenMeta: tokenMeta.value,
    jwtPayload: safePayload(jwtPayload.value),
    permissionView: permissionView.value,
    menuRows: menuRows.value
  }
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `vspicy-permission-diagnostics-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function decodeJwtPayload(token: string): JwtPayload | null {
  if (!token || token.split('.').length < 2) {
    return null
  }

  try {
    const segment = token.split('.')[1]
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const json = decodeURIComponent(Array.from(atob(padded))
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join(''))
    return JSON.parse(json)
  } catch {
    return null
  }
}

function normalizeRoles(value: any): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map((item) => typeof item === 'string' ? item : item?.roleCode || item?.code || item?.name)
    .filter(Boolean)
    .map(String)
}

function safePayload(payload: JwtPayload | null) {
  if (!payload) return null
  const clone = { ...payload }
  delete clone.permissions
  return clone
}

function formatDate(value: number) {
  return new Date(value).toLocaleString()
}

function issueRank(level: IssueLevel) {
  return ({ BLOCKER: 1, HIGH: 2, WARN: 3, INFO: 4 })[level]
}

function statusRank(status: AccessState) {
  return ({ DENY: 1, WARN: 2, PASS: 3 })[status]
}

function issueClass(level: IssueLevel) {
  return `severity severity-${level.toLowerCase()}`
}

function statusClass(status: AccessState) {
  return {
    PASS: 'status status-ok',
    WARN: 'status status-warn',
    DENY: 'status status-danger'
  }[status]
}
</script>

<template>
  <section class="admin-page permission-diagnostics-page">
    <div class="page-head">
      <div>
        <p class="eyebrow">Permission Diagnostics</p>
        <h1>权限诊断中心</h1>
        <p>检查登录态、JWT、权限视图、菜单权限与路由权限，定位 401、403、菜单不可见和权限缓存异常。</p>
      </div>
      <div class="head-actions">
        <button class="secondary" :disabled="refreshing" @click="refreshPermissionView">
          {{ refreshing ? '刷新中...' : '刷新权限视图' }}
        </button>
        <button class="secondary danger-btn" @click="clearLocalState">清理本地登录态</button>
        <button @click="exportReport">导出诊断 JSON</button>
      </div>
    </div>

    <div class="metric-grid">
      <article class="metric-card" :class="overview.tokenLength ? 'success' : 'danger'">
        <span>Token 长度</span>
        <strong>{{ overview.tokenLength }}</strong>
        <small>accessToken bytes</small>
      </article>
      <article class="metric-card info">
        <span>角色数量</span>
        <strong>{{ overview.roleCount }}</strong>
        <small>JWT + 权限视图</small>
      </article>
      <article class="metric-card success">
        <span>权限码</span>
        <strong>{{ overview.permissionCount }}</strong>
        <small>permissionCodes</small>
      </article>
      <article class="metric-card danger">
        <span>拒绝菜单</span>
        <strong>{{ overview.deniedMenus }}</strong>
        <small>当前用户不可访问</small>
      </article>
      <article class="metric-card warning">
        <span>异常项</span>
        <strong>{{ overview.issueCount }}</strong>
        <small>BLOCKER {{ overview.blockerCount }}</small>
      </article>
    </div>

    <div class="panel">
      <div class="panel-title">
        <h2>运行时问题</h2>
        <span>最后刷新：{{ lastRefreshAt || '-' }}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>等级</th>
              <th>类型</th>
              <th>目标</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in issues" :key="item.type + item.target">
              <td><span :class="issueClass(item.level)">{{ item.level }}</span></td>
              <td class="mono">{{ item.type }}</td>
              <td class="mono">{{ item.target }}</td>
              <td>{{ item.message }}</td>
            </tr>
            <tr v-if="!issues.length">
              <td colspan="4" class="empty">没有发现登录态和权限视图异常。</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel auth-panel">
      <div class="panel-title">
        <h2>身份与 Token</h2>
        <span>本地缓存 + JWT 载荷摘要</span>
      </div>
      <div class="meta-grid">
        <div v-for="item in tokenMeta" :key="item.label" class="meta-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>
    </div>

    <div class="toolbar panel">
      <input v-model.trim="keyword" placeholder="搜索菜单 / 路由 / 权限码 / 原因" />
      <select v-model="statusFilter">
        <option value="ALL">全部状态</option>
        <option value="PASS">允许访问</option>
        <option value="DENY">无权限</option>
        <option value="WARN">配置警告</option>
      </select>
      <button class="secondary" @click="keyword = ''; statusFilter = 'ALL'">重置筛选</button>
    </div>

    <div class="panel">
      <div class="panel-title">
        <h2>菜单权限覆盖</h2>
        <span>{{ filteredMenuRows.length }} / {{ menuRows.length }}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>状态</th>
              <th>菜单</th>
              <th>分组</th>
              <th>路由</th>
              <th>菜单权限</th>
              <th>路由权限</th>
              <th>原因</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredMenuRows" :key="item.path">
              <td><span :class="statusClass(item.status)">{{ item.status }}</span></td>
              <td>{{ item.title }}</td>
              <td>{{ item.group }}</td>
              <td class="mono">{{ item.path }}</td>
              <td class="mono">{{ item.permission }}</td>
              <td class="mono">{{ item.routePermission || '-' }}</td>
              <td>{{ item.reason }}</td>
              <td><button class="small" :disabled="item.status === 'DENY'" @click="openPath(item.path)">打开</button></td>
            </tr>
            <tr v-if="!filteredMenuRows.length">
              <td colspan="8" class="empty">没有匹配的菜单权限记录。</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.permission-diagnostics-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-head,
.panel,
.metric-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 22px;
  box-shadow: 0 20px 55px rgba(15, 23, 42, 0.08);
}

.page-head {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
}

.page-head h1 {
  margin: 4px 0 8px;
  font-size: 26px;
}

.page-head p {
  margin: 0;
  color: #64748b;
}

.eyebrow {
  color: #2563eb !important;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 12px;
  font-weight: 800;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 14px;
}

.metric-card {
  padding: 18px;
}

.metric-card span {
  color: #64748b;
  font-size: 13px;
}

.metric-card strong {
  display: block;
  margin: 8px 0 4px;
  font-size: 28px;
  color: #0f172a;
}

.metric-card small {
  color: #94a3b8;
}

.metric-card.success strong { color: #16a34a; }
.metric-card.info strong { color: #2563eb; }
.metric-card.warning strong { color: #d97706; }
.metric-card.danger strong { color: #dc2626; }

.panel {
  padding: 18px;
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-title h2 {
  margin: 0;
  font-size: 18px;
}

.panel-title span {
  color: #64748b;
  font-size: 13px;
}

.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.toolbar input,
.toolbar select {
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 10px 12px;
  min-width: 220px;
  background: #fff;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.meta-item {
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 16px;
  padding: 12px;
  background: #f8fafc;
}

.meta-item span {
  display: block;
  margin-bottom: 6px;
  color: #64748b;
  font-size: 12px;
}

.meta-item strong {
  display: block;
  color: #0f172a;
  font-size: 14px;
  word-break: break-all;
}

.table-wrap {
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}

th,
td {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  font-size: 13px;
}

th {
  color: #475569;
  background: #f8fafc;
  font-weight: 800;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
}

.empty {
  text-align: center;
  color: #94a3b8;
  padding: 28px !important;
}

.status,
.severity {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 9px;
  font-weight: 800;
  font-size: 12px;
}

.status-ok,
.severity-info {
  background: #dcfce7;
  color: #166534;
}

.status-warn,
.severity-warn {
  background: #fef3c7;
  color: #92400e;
}

.status-danger,
.severity-high,
.severity-blocker {
  background: #fee2e2;
  color: #991b1b;
}

button {
  border: none;
  border-radius: 12px;
  padding: 10px 14px;
  background: #2563eb;
  color: white;
  font-weight: 800;
  cursor: pointer;
}

button.secondary {
  background: #e2e8f0;
  color: #0f172a;
}

button.danger-btn {
  background: #fee2e2;
  color: #991b1b;
}

button.small {
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 12px;
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 960px) {
  .page-head {
    flex-direction: column;
  }
}
</style>
