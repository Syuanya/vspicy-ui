<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { http, getAccessToken, getCurrentUserId } from '../../api/http'
import { adminOpsMenuItems } from '../../config/adminOpsMenu'
import { getCachedPermissionView, hasPermission, loadPermissionView, type PermissionView } from '../../utils/permission'

type CheckLevel = 'BLOCKER' | 'HIGH' | 'WARN' | 'INFO'
type CheckStatus = 'PENDING' | 'RUNNING' | 'PASS' | 'WARN' | 'FAIL' | 'SKIP'
type CheckGroup = 'gateway' | 'auth' | 'member' | 'notification' | 'admin' | 'frontend' | 'permission'

type EndpointCheck = {
  key: string
  title: string
  group: CheckGroup
  path: string
  level: CheckLevel
  authRequired: boolean
  permission?: string
  description: string
}

type EndpointResult = {
  key: string
  status: CheckStatus
  httpStatus: number | null
  businessCode: number | string | null
  durationMillis: number | null
  message: string
  checkedAt: string | null
}

type StaticCheck = {
  key: string
  title: string
  group: CheckGroup
  level: CheckLevel
  status: CheckStatus
  message: string
  target: string
}

type CommandItem = {
  title: string
  service: string
  command: string
  reason: string
}

type PreflightRow = {
  key: string
  title: string
  group: CheckGroup
  level: CheckLevel
  status: CheckStatus
  target: string
  message: string
  httpStatus: number | null
  durationMillis: number | null
  checkedAt: string | null
  type: 'API' | 'STATIC'
}

const router = useRouter()
const running = ref(false)
const currentKey = ref('')
const keyword = ref('')
const statusFilter = ref<'ALL' | CheckStatus>('ALL')
const groupFilter = ref<'ALL' | CheckGroup>('ALL')
const lastRunAt = ref('')
const permissionView = ref<PermissionView | null>(getCachedPermissionView())
const results = ref<Record<string, EndpointResult>>({})

const endpointChecks: EndpointCheck[] = [
  {
    key: 'auth-me',
    title: '认证身份',
    group: 'auth',
    path: '/auth/me',
    level: 'BLOCKER',
    authRequired: true,
    description: '验证登录 token、网关认证过滤器和 Auth 服务身份解析。'
  },
  {
    key: 'permission-view',
    title: '权限视图',
    group: 'permission',
    path: `/admin/users/${getCurrentUserId() || 1}/permission-view`,
    level: 'BLOCKER',
    authRequired: true,
    permission: 'user:view',
    description: '验证后台读取当前用户最终权限视图，定位菜单不显示和 403。'
  },
  {
    key: 'member-me',
    title: '我的会员',
    group: 'member',
    path: `/members/me?userId=${getCurrentUserId() || 1}`,
    level: 'HIGH',
    authRequired: true,
    description: '验证个人中心会员接口，防止登录后 /me 页面局部失败。'
  },
  {
    key: 'member-plans',
    title: '会员套餐',
    group: 'member',
    path: '/members/plans',
    level: 'WARN',
    authRequired: false,
    description: '验证会员套餐公共接口和 member 服务网关路由。'
  },
  {
    key: 'notification-unread',
    title: '未读通知',
    group: 'notification',
    path: '/notifications/unread-count',
    level: 'HIGH',
    authRequired: true,
    description: '验证登录后站内信未读数接口，避免顶部导航和个人中心报 401/403。'
  },
  {
    key: 'admin-health',
    title: '后台健康',
    group: 'admin',
    path: '/admin/health',
    level: 'HIGH',
    authRequired: true,
    permission: 'permission:view',
    description: '验证 admin 服务、gateway 路由和后台基础接口。'
  },
  {
    key: 'system-monitor',
    title: '系统监控',
    group: 'admin',
    path: '/admin/system-monitor/overview',
    level: 'WARN',
    authRequired: true,
    permission: 'system:monitor:view',
    description: '验证系统监控模块，辅助判断运行环境接口是否正常。'
  },
  {
    key: 'service-diagnostics',
    title: '服务诊断',
    group: 'admin',
    path: '/admin/service-diagnostics/overview',
    level: 'WARN',
    authRequired: true,
    permission: 'system:diagnostics:view',
    description: '验证服务诊断模块，用于排查端口、中间件和服务状态。'
  }
]

const commands: CommandItem[] = [
  {
    title: '构建认证与网关',
    service: 'vspicy-auth / vspicy-gateway',
    command: 'cd D:\\workspace\\vspicy\\vspicy-cloud && mvn -pl vspicy-auth,vspicy-gateway -am clean package -DskipTests',
    reason: '登录、JWT、网关鉴权或 401/403 修改后必须执行。'
  },
  {
    title: '构建会员与通知',
    service: 'vspicy-member / vspicy-notification',
    command: 'cd D:\\workspace\\vspicy\\vspicy-cloud && mvn -pl vspicy-member,vspicy-notification -am clean package -DskipTests',
    reason: '个人中心会员信息、未读通知、站内信接口异常时执行。'
  },
  {
    title: '构建后台服务',
    service: 'vspicy-admin',
    command: 'cd D:\\workspace\\vspicy\\vspicy-cloud && mvn -pl vspicy-admin -am clean package -DskipTests',
    reason: '后台管理接口、权限、系统配置、诊断页面接口修改后执行。'
  },
  {
    title: '构建前端',
    service: 'vspicy-ui',
    command: 'cd D:\\workspace\\vspicy\\vspicy-ui && npm install && npm run build',
    reason: '新增页面、路由、菜单、API 封装或样式修改后执行。'
  }
]

const groups = computed(() => Array.from(new Set(endpointChecks.map((item) => item.group))).sort())

const staticChecks = computed<StaticCheck[]>(() => {
  const rows: StaticCheck[] = []
  const token = getAccessToken()
  const userId = getCurrentUserId()
  const view = permissionView.value
  const routePaths = new Set(router.getRoutes().map((item) => item.path))

  rows.push({
    key: 'access-token',
    title: 'accessToken',
    group: 'frontend',
    level: 'BLOCKER',
    status: token ? 'PASS' : 'FAIL',
    target: 'localStorage.vspicy_access_token',
    message: token ? `已存在，长度 ${token.length} bytes。` : '本地没有有效 accessToken，所有登录态接口都会失败。'
  })

  rows.push({
    key: 'token-size',
    title: '请求头体积',
    group: 'frontend',
    level: token.length > 12000 ? 'HIGH' : 'WARN',
    status: !token ? 'SKIP' : token.length > 12000 ? 'FAIL' : token.length > 6000 ? 'WARN' : 'PASS',
    target: `${token.length} bytes`,
    message: !token ? '未登录，跳过 token 体积检查。' : token.length > 12000 ? 'token 过大，仍有触发 Request header is too large 的风险。' : token.length > 6000 ? 'token 偏大，建议确认 JWT 没有写入完整 permissions。' : 'token 体积正常。'
  })

  rows.push({
    key: 'user-id',
    title: '本地用户 ID',
    group: 'frontend',
    level: 'HIGH',
    status: userId ? 'PASS' : 'WARN',
    target: 'localStorage.vspicy_user_id',
    message: userId ? `当前 userId=${userId}` : '未写入 userId，部分旧接口会缺少 userId 参数。'
  })

  rows.push({
    key: 'permission-view',
    title: '权限缓存',
    group: 'permission',
    level: 'HIGH',
    status: view ? 'PASS' : 'WARN',
    target: 'localStorage.vspicy_permission_view',
    message: view ? `已缓存 ${view.permissionCodes?.length || 0} 个权限码。` : '权限视图未缓存，路由守卫会临时加载，接口仍可能被网关拒绝。'
  })

  const missingRouteCount = adminOpsMenuItems.filter((item) => !routePaths.has(item.path)).length
  rows.push({
    key: 'menu-route',
    title: '菜单路由一致性',
    group: 'permission',
    level: 'HIGH',
    status: missingRouteCount ? 'FAIL' : 'PASS',
    target: `${adminOpsMenuItems.length} menu items`,
    message: missingRouteCount ? `发现 ${missingRouteCount} 个菜单路径没有对应路由。` : '菜单路径与前端路由一致。'
  })

  const deniedDiagnostics = ['system:diagnostics:view', 'permission:view'].filter((code) => view && !hasPermission(code, view))
  rows.push({
    key: 'diagnostic-permission',
    title: '诊断入口权限',
    group: 'permission',
    level: 'WARN',
    status: !view ? 'SKIP' : deniedDiagnostics.length ? 'WARN' : 'PASS',
    target: deniedDiagnostics.join(', ') || 'diagnostic permissions',
    message: !view ? '没有权限视图，跳过诊断入口权限检查。' : deniedDiagnostics.length ? '当前用户缺少部分诊断入口权限，可能看不到完整排障页面。' : '当前用户具备诊断入口权限。'
  })

  return rows
})

const allRows = computed<PreflightRow[]>(() => {
  const endpointRows = endpointChecks.map((item) => {
    const result = results.value[item.key]
    return {
      key: item.key,
      title: item.title,
      group: item.group,
      level: item.level,
      status: result?.status || 'PENDING',
      target: item.path,
      message: result?.message || item.description,
      httpStatus: result?.httpStatus ?? null,
      durationMillis: result?.durationMillis ?? null,
      checkedAt: result?.checkedAt ?? null,
      type: 'API' as const
    }
  })

  const staticRows = staticChecks.value.map((item) => ({
    ...item,
    httpStatus: null,
    durationMillis: null,
    checkedAt: lastRunAt.value || null,
    type: 'STATIC' as const
  }))

  return [...staticRows, ...endpointRows].sort((a, b) => statusRank(a.status) - statusRank(b.status) || levelRank(a.level) - levelRank(b.level) || a.group.localeCompare(b.group))
})

const filteredRows = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  return allRows.value.filter((item) => {
    const matchStatus = statusFilter.value === 'ALL' || item.status === statusFilter.value
    const matchGroup = groupFilter.value === 'ALL' || item.group === groupFilter.value
    const matchText = !text || [item.title, item.group, item.level, item.status, item.target, item.message, item.type]
      .some((field) => String(field || '').toLowerCase().includes(text))
    return matchStatus && matchGroup && matchText
  })
})

const overview = computed(() => {
  const rows = allRows.value
  return {
    total: rows.length,
    pass: rows.filter((item) => item.status === 'PASS').length,
    warn: rows.filter((item) => item.status === 'WARN').length,
    fail: rows.filter((item) => item.status === 'FAIL').length,
    pending: rows.filter((item) => item.status === 'PENDING').length,
    blocker: rows.filter((item) => item.level === 'BLOCKER' && item.status === 'FAIL').length,
    avgDuration: average(endpointChecks.map((item) => results.value[item.key]?.durationMillis).filter((item): item is number => typeof item === 'number'))
  }
})

const releaseConclusion = computed(() => {
  if (overview.value.blocker > 0 || overview.value.fail > 0) {
    return {
      status: 'FAIL',
      title: '不建议发布或继续联调',
      message: '存在失败项。优先处理登录态、网关、权限或核心接口。'
    }
  }
  if (overview.value.warn > 0 || overview.value.pending > 0) {
    return {
      status: 'WARN',
      title: '可继续联调，但不建议上线',
      message: '仍有警告或未检查项。上线前应完成一次全量预检。'
    }
  }
  return {
    status: 'PASS',
    title: '预检通过',
    message: '核心登录态、权限、会员、通知和后台基础链路未发现阻断项。'
  }
})

onMounted(() => {
  lastRunAt.value = formatDate(Date.now())
})

async function runAll() {
  running.value = true
  lastRunAt.value = formatDate(Date.now())
  try {
    try {
      permissionView.value = await loadPermissionView(true)
    } catch {
      // 权限视图失败本身会被静态检查体现，不中断 API 预检。
    }

    for (const check of endpointChecks) {
      await runOne(check)
    }
  } finally {
    currentKey.value = ''
    running.value = false
    lastRunAt.value = formatDate(Date.now())
  }
}

async function runOne(check: EndpointCheck) {
  currentKey.value = check.key
  const start = performance.now()
  results.value = {
    ...results.value,
    [check.key]: {
      key: check.key,
      status: 'RUNNING',
      httpStatus: null,
      businessCode: null,
      durationMillis: null,
      message: '检查中...',
      checkedAt: null
    }
  }

  if (check.authRequired && !getAccessToken()) {
    setResult(check.key, {
      status: 'SKIP',
      httpStatus: null,
      businessCode: null,
      durationMillis: Math.round(performance.now() - start),
      message: '未登录，跳过需要认证的接口。',
      checkedAt: formatDate(Date.now())
    })
    return
  }

  try {
    const response: any = await http.get(check.path)
    const durationMillis = Math.round(performance.now() - start)
    const code = response?.code
    const isEnvelope = response && typeof response === 'object' && 'code' in response
    const ok = isEnvelope ? code === 0 || code === 200 : Boolean(response)
    setResult(check.key, {
      status: ok ? 'PASS' : 'WARN',
      httpStatus: 200,
      businessCode: isEnvelope ? code : null,
      durationMillis,
      message: ok ? '接口正常。' : `接口返回业务异常：${response?.message || '响应结构不符合统一 Result 包装。'}`,
      checkedAt: formatDate(Date.now())
    })
  } catch (error: any) {
    const durationMillis = Math.round(performance.now() - start)
    const status = error?.response?.status || null
    const data = error?.response?.data
    setResult(check.key, {
      status: status === 401 || status === 403 || status >= 500 ? 'FAIL' : 'WARN',
      httpStatus: status,
      businessCode: data?.code ?? null,
      durationMillis,
      message: formatErrorMessage(status, data, error),
      checkedAt: formatDate(Date.now())
    })
  }
}

function setResult(key: string, partial: Omit<EndpointResult, 'key'>) {
  results.value = {
    ...results.value,
    [key]: {
      key,
      ...partial
    }
  }
}

function retryByKey(key: string) {
  const check = endpointChecks.find((item) => item.key === key)
  if (check) {
    runOne(check)
  }
}

function resetResults() {
  results.value = {}
  lastRunAt.value = formatDate(Date.now())
}

function exportReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    conclusion: releaseConclusion.value,
    overview: overview.value,
    rows: allRows.value,
    endpointChecks,
    permissionView: permissionView.value,
    commands
  }
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `vspicy-preflight-check-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function copyCommand(command: string) {
  navigator.clipboard?.writeText(command)
}

function openRoute(path: string) {
  router.push(path)
}

function formatErrorMessage(status: number | null, data: any, error: any) {
  if (status === 401) return '401 未登录或 token 过期。请清理本地登录态后重新登录。'
  if (status === 403) return '403 无权限。请检查 JWT roles、网关规则和角色授权。'
  if (status === 404) return '404 路由不存在。请检查 gateway Path 规则和后端 Controller 路径。'
  if (status && status >= 500) return `服务端 ${status}。请查看对应微服务日志和 traceId。`
  if (data?.message) return data.message
  return error?.message || '请求失败。'
}

function formatDate(value: number) {
  return new Date(value).toLocaleString()
}

function average(values: number[]) {
  if (!values.length) return null
  return Math.round(values.reduce((sum, item) => sum + item, 0) / values.length)
}

function statusRank(status: CheckStatus) {
  return ({ FAIL: 1, WARN: 2, RUNNING: 3, PENDING: 4, SKIP: 5, PASS: 6 })[status]
}

function levelRank(level: CheckLevel) {
  return ({ BLOCKER: 1, HIGH: 2, WARN: 3, INFO: 4 })[level]
}

function statusClass(status: CheckStatus) {
  return {
    PENDING: 'status status-pending',
    RUNNING: 'status status-running',
    PASS: 'status status-ok',
    WARN: 'status status-warn',
    FAIL: 'status status-danger',
    SKIP: 'status status-muted'
  }[status]
}

function levelClass(level: CheckLevel) {
  return `severity severity-${level.toLowerCase()}`
}
</script>

<template>
  <section class="admin-page preflight-page">
    <div class="page-head">
      <div>
        <p class="eyebrow">Preflight Check</p>
        <h1>上线预检中心</h1>
        <p>统一检查登录态、权限缓存、网关路由、会员、通知和后台基础接口，避免每次开发后靠报错逐个定位。</p>
      </div>
      <div class="head-actions">
        <button class="secondary" :disabled="running" @click="resetResults">重置</button>
        <button class="secondary" @click="exportReport">导出报告</button>
        <button :disabled="running" @click="runAll">{{ running ? '预检中...' : '一键预检' }}</button>
      </div>
    </div>

    <div class="conclusion-card" :class="releaseConclusion.status.toLowerCase()">
      <div>
        <span>当前结论</span>
        <strong>{{ releaseConclusion.title }}</strong>
        <p>{{ releaseConclusion.message }}</p>
      </div>
      <div class="conclusion-meta">
        <span>最后检查</span>
        <b>{{ lastRunAt || '-' }}</b>
      </div>
    </div>

    <div class="metric-grid">
      <article class="metric-card success">
        <span>通过</span>
        <strong>{{ overview.pass }}</strong>
        <small>PASS</small>
      </article>
      <article class="metric-card warning">
        <span>警告</span>
        <strong>{{ overview.warn }}</strong>
        <small>WARN</small>
      </article>
      <article class="metric-card danger">
        <span>失败</span>
        <strong>{{ overview.fail }}</strong>
        <small>FAIL</small>
      </article>
      <article class="metric-card info">
        <span>待检查</span>
        <strong>{{ overview.pending }}</strong>
        <small>PENDING</small>
      </article>
      <article class="metric-card">
        <span>平均耗时</span>
        <strong>{{ overview.avgDuration ?? '-' }}</strong>
        <small>ms</small>
      </article>
    </div>

    <div class="toolbar panel">
      <input v-model.trim="keyword" placeholder="搜索检查项 / 路径 / 原因" />
      <select v-model="groupFilter">
        <option value="ALL">全部分组</option>
        <option v-for="group in groups" :key="group" :value="group">{{ group }}</option>
      </select>
      <select v-model="statusFilter">
        <option value="ALL">全部状态</option>
        <option value="FAIL">失败</option>
        <option value="WARN">警告</option>
        <option value="PASS">通过</option>
        <option value="PENDING">待检查</option>
        <option value="SKIP">跳过</option>
      </select>
      <button class="secondary" @click="keyword = ''; groupFilter = 'ALL'; statusFilter = 'ALL'">清空筛选</button>
    </div>

    <div class="panel">
      <div class="panel-title">
        <h2>预检明细</h2>
        <span>{{ filteredRows.length }} / {{ allRows.length }}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>状态</th>
              <th>级别</th>
              <th>类型</th>
              <th>检查项</th>
              <th>分组</th>
              <th>目标</th>
              <th>HTTP</th>
              <th>耗时</th>
              <th>说明</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredRows" :key="item.type + item.key">
              <td><span :class="statusClass(item.status)">{{ item.status }}</span></td>
              <td><span :class="levelClass(item.level)">{{ item.level }}</span></td>
              <td>{{ item.type }}</td>
              <td>{{ item.title }}</td>
              <td>{{ item.group }}</td>
              <td class="mono">{{ item.target }}</td>
              <td>{{ item.httpStatus ?? '-' }}</td>
              <td>{{ item.durationMillis == null ? '-' : item.durationMillis + 'ms' }}</td>
              <td>{{ item.message }}</td>
              <td>
                <button
                  v-if="item.type === 'API'"
                  class="small"
                  :disabled="running || currentKey === item.key"
                  @click="retryByKey(item.key)"
                >重试</button>
                <button
                  v-else-if="item.key === 'menu-route'"
                  class="small"
                  @click="openRoute('/admin/route-diagnostics')"
                >查看</button>
                <span v-else class="muted">-</span>
              </td>
            </tr>
            <tr v-if="!filteredRows.length">
              <td colspan="10" class="empty">没有匹配的预检项。</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">
        <h2>推荐构建命令</h2>
        <span>直接复制到本地执行</span>
      </div>
      <div class="command-grid">
        <article v-for="item in commands" :key="item.title" class="command-card">
          <div>
            <span>{{ item.service }}</span>
            <h3>{{ item.title }}</h3>
            <p>{{ item.reason }}</p>
          </div>
          <pre>{{ item.command }}</pre>
          <button class="secondary small" @click="copyCommand(item.command)">复制命令</button>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.preflight-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-head,
.panel,
.metric-card,
.conclusion-card,
.command-card {
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

.conclusion-card {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 22px;
  border-left: 6px solid #94a3b8;
}

.conclusion-card.pass { border-left-color: #16a34a; }
.conclusion-card.warn { border-left-color: #d97706; }
.conclusion-card.fail { border-left-color: #dc2626; }

.conclusion-card span,
.conclusion-card p,
.conclusion-meta span {
  color: #64748b;
}

.conclusion-card strong {
  display: block;
  margin: 6px 0;
  font-size: 22px;
  color: #0f172a;
}

.conclusion-card p {
  margin: 0;
}

.conclusion-meta {
  min-width: 180px;
  text-align: right;
}

.conclusion-meta b {
  display: block;
  margin-top: 6px;
  color: #0f172a;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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

.panel-title span,
.muted {
  color: #94a3b8;
  font-size: 13px;
}

.toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

input,
select {
  height: 38px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 0 12px;
  background: white;
  color: #0f172a;
}

input {
  min-width: 280px;
  flex: 1;
}

button {
  border: none;
  border-radius: 12px;
  background: #2563eb;
  color: #fff;
  padding: 0 14px;
  height: 38px;
  font-weight: 700;
  cursor: pointer;
}

button.secondary {
  color: #1e293b;
  background: #e2e8f0;
}

button.small {
  height: 30px;
  padding: 0 10px;
  border-radius: 10px;
  font-size: 12px;
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th,
td {
  border-bottom: 1px solid #e2e8f0;
  padding: 11px 10px;
  text-align: left;
  vertical-align: top;
}

th {
  color: #64748b;
  font-weight: 800;
  white-space: nowrap;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  word-break: break-all;
}

.status,
.severity {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.status-ok { color: #166534; background: #dcfce7; }
.status-warn { color: #92400e; background: #fef3c7; }
.status-danger { color: #991b1b; background: #fee2e2; }
.status-pending { color: #475569; background: #f1f5f9; }
.status-running { color: #1d4ed8; background: #dbeafe; }
.status-muted { color: #64748b; background: #e2e8f0; }

.severity-blocker { color: #991b1b; background: #fee2e2; }
.severity-high { color: #9a3412; background: #ffedd5; }
.severity-warn { color: #92400e; background: #fef3c7; }
.severity-info { color: #1d4ed8; background: #dbeafe; }

.empty {
  text-align: center;
  color: #94a3b8;
  padding: 26px;
}

.command-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
}

.command-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.command-card span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
}

.command-card h3 {
  margin: 4px 0 6px;
  font-size: 16px;
}

.command-card p {
  margin: 0;
  color: #64748b;
}

.command-card pre {
  margin: 0;
  padding: 12px;
  border-radius: 14px;
  overflow-x: auto;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
}

@media (max-width: 900px) {
  .page-head,
  .conclusion-card {
    flex-direction: column;
  }

  .conclusion-meta {
    text-align: left;
  }
}
</style>
