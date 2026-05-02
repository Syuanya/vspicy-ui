<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { http } from '../../api/http'

type ApiLevel = 'CORE' | 'IMPORTANT' | 'OPTIONAL'
type ApiStatus = 'PENDING' | 'RUNNING' | 'PASS' | 'WARN' | 'FAIL'

type ApiEndpoint = {
  key: string
  title: string
  group: string
  owner: string
  method: 'GET'
  path: string
  level: ApiLevel
  permission: string
  params?: Record<string, any>
  expectedShape?: 'envelope' | 'any'
  description: string
}

type ApiCheckResult = {
  key: string
  status: ApiStatus
  durationMillis: number | null
  httpStatus: number | null
  businessCode: number | string | null
  message: string
  responseShape: string
  checkedAt: string | null
}

const endpoints: ApiEndpoint[] = [
  {
    key: 'admin-health',
    title: '后台健康检查',
    group: 'system',
    owner: 'vspicy-admin',
    method: 'GET',
    path: '/admin/health',
    level: 'CORE',
    permission: 'permission:view',
    expectedShape: 'envelope',
    description: '验证 Admin 服务、网关转发和基础权限链路。'
  },
  {
    key: 'service-diagnostics',
    title: '服务诊断',
    group: 'diagnostics',
    owner: 'vspicy-admin',
    method: 'GET',
    path: '/admin/service-diagnostics/overview',
    level: 'CORE',
    permission: 'system:diagnostics:view',
    expectedShape: 'envelope',
    description: '检查微服务和中间件端口。'
  },
  {
    key: 'system-monitor',
    title: '系统监控',
    group: 'diagnostics',
    owner: 'vspicy-admin',
    method: 'GET',
    path: '/admin/system-monitor/overview',
    level: 'IMPORTANT',
    permission: 'system:monitor:view',
    expectedShape: 'envelope',
    description: '读取 JVM、线程、内存和磁盘信息。'
  },
  {
    key: 'permission-overview',
    title: '权限总览',
    group: 'system',
    owner: 'vspicy-admin',
    method: 'GET',
    path: '/admin/permissions/overview',
    level: 'CORE',
    permission: 'permission:view',
    expectedShape: 'envelope',
    description: '验证角色权限模块和 RBAC 基础表。'
  },
  {
    key: 'menu-overview',
    title: '菜单总览',
    group: 'system',
    owner: 'vspicy-admin',
    method: 'GET',
    path: '/admin/menus/overview',
    level: 'IMPORTANT',
    permission: 'system:menu:view',
    expectedShape: 'envelope',
    description: '验证后台菜单、路由和角色菜单数据。'
  },
  {
    key: 'org-overview',
    title: '组织总览',
    group: 'system',
    owner: 'vspicy-admin',
    method: 'GET',
    path: '/admin/org/overview',
    level: 'OPTIONAL',
    permission: 'system:org:view',
    expectedShape: 'envelope',
    description: '验证部门、岗位和用户组织关系。'
  },
  {
    key: 'system-config-overview',
    title: '系统配置总览',
    group: 'system',
    owner: 'vspicy-admin',
    method: 'GET',
    path: '/admin/system-configs/overview',
    level: 'IMPORTANT',
    permission: 'system:config:view',
    expectedShape: 'envelope',
    description: '验证新版系统配置接口是否正常。'
  },
  {
    key: 'system-dict-overview',
    title: '系统字典总览',
    group: 'system',
    owner: 'vspicy-admin',
    method: 'GET',
    path: '/admin/system-dicts/overview',
    level: 'IMPORTANT',
    permission: 'system:dict:view',
    expectedShape: 'envelope',
    description: '验证新版系统字典接口是否正常。'
  },
  {
    key: 'job-overview',
    title: '任务调度总览',
    group: 'system',
    owner: 'vspicy-admin',
    method: 'GET',
    path: '/admin/jobs/overview',
    level: 'OPTIONAL',
    permission: 'system:job:view',
    expectedShape: 'envelope',
    description: '验证定时任务和执行日志。'
  },
  {
    key: 'feature-governance',
    title: '功能治理总览',
    group: 'diagnostics',
    owner: 'vspicy-admin',
    method: 'GET',
    path: '/admin/feature-governance/overview',
    level: 'IMPORTANT',
    permission: 'system:feature:view',
    expectedShape: 'envelope',
    description: '验证功能注册、接口和问题治理。'
  },
  {
    key: 'release-overview',
    title: '发布版本总览',
    group: 'release',
    owner: 'vspicy-admin',
    method: 'GET',
    path: '/admin/releases/overview',
    level: 'IMPORTANT',
    permission: 'system:release:view',
    expectedShape: 'envelope',
    description: '验证版本发布、检查项和回滚状态。'
  },
  {
    key: 'login-security',
    title: '登录安全总览',
    group: 'security',
    owner: 'vspicy-admin',
    method: 'GET',
    path: '/admin/login-security/overview',
    level: 'IMPORTANT',
    permission: 'login:security:view',
    params: { days: 7 },
    expectedShape: 'envelope',
    description: '验证登录日志、在线会话和异常登录统计。'
  },
  {
    key: 'operation-logs',
    title: '审计日志总览',
    group: 'audit',
    owner: 'vspicy-admin',
    method: 'GET',
    path: '/admin/operation-logs/overview',
    level: 'IMPORTANT',
    permission: 'operation:log:view',
    params: { days: 7 },
    expectedShape: 'envelope',
    description: '验证后台操作日志和审计统计。'
  },
  {
    key: 'exception-logs',
    title: '异常日志总览',
    group: 'audit',
    owner: 'vspicy-admin',
    method: 'GET',
    path: '/admin/exception-logs/overview',
    level: 'IMPORTANT',
    permission: 'system:exception:view',
    params: { days: 7 },
    expectedShape: 'envelope',
    description: '验证系统异常日志和处理状态。'
  },
  {
    key: 'system-audit',
    title: '系统审计总览',
    group: 'audit',
    owner: 'vspicy-admin',
    method: 'GET',
    path: '/admin/operation-audit-logs/overview',
    level: 'IMPORTANT',
    permission: 'system:audit:view',
    expectedShape: 'envelope',
    description: '验证系统级操作审计、风险事件和证据链。'
  },
  {
    key: 'support-tickets',
    title: '工单总览',
    group: 'operation',
    owner: 'vspicy-admin',
    method: 'GET',
    path: '/admin/support-tickets/overview',
    level: 'OPTIONAL',
    permission: 'support:ticket:view',
    expectedShape: 'envelope',
    description: '验证用户反馈和客服工单模块。'
  },
  {
    key: 'ops-hub',
    title: '视频运维中心',
    group: 'video',
    owner: 'vspicy-video',
    method: 'GET',
    path: '/videos/admin/ops-hub/summary',
    level: 'CORE',
    permission: 'video:ops:hub:view',
    expectedShape: 'any',
    description: '验证视频服务、转码、HLS 和对象清理聚合接口。'
  },
  {
    key: 'service-health',
    title: '视频服务健康',
    group: 'video',
    owner: 'vspicy-video',
    method: 'GET',
    path: '/videos/admin/service-health/summary',
    level: 'CORE',
    permission: 'video:service:health:view',
    expectedShape: 'any',
    description: '验证视频服务依赖的 MySQL、Redis、MinIO、RocketMQ 和 FFmpeg。'
  },
  {
    key: 'playback-readiness',
    title: '播放就绪扫描',
    group: 'video',
    owner: 'vspicy-video',
    method: 'GET',
    path: '/videos/playback/readiness-batch/scan',
    level: 'IMPORTANT',
    permission: 'video:playback:readiness:view',
    params: { limit: 10, onlyProblem: true },
    expectedShape: 'any',
    description: '验证 HLS 生成后播放地址同步检查。'
  },
  {
    key: 'storage-dashboard',
    title: '存储看板',
    group: 'video',
    owner: 'vspicy-video',
    method: 'GET',
    path: '/videos/upload/storage/dashboard',
    level: 'IMPORTANT',
    permission: 'video:storage:dashboard:view',
    params: { days: 7 },
    expectedShape: 'any',
    description: '验证对象存储容量、增长趋势和异常指标。'
  },
  {
    key: 'notification-admin-overview',
    title: '通知总览',
    group: 'notification',
    owner: 'vspicy-notification',
    method: 'GET',
    path: '/notifications/admin/overview',
    level: 'IMPORTANT',
    permission: 'notification:overview:view',
    params: { days: 7 },
    expectedShape: 'any',
    description: '验证通知投递、模板、事件和在线连接统计。'
  },
  {
    key: 'announcement-overview',
    title: '公告总览',
    group: 'notification',
    owner: 'vspicy-notification',
    method: 'GET',
    path: '/notifications/admin/announcements/overview',
    level: 'OPTIONAL',
    permission: 'notification:announcement:view',
    expectedShape: 'any',
    description: '验证公告管理和发布状态统计。'
  }
]

const keyword = ref('')
const groupFilter = ref('ALL')
const levelFilter = ref('ALL')
const statusFilter = ref('ALL')
const running = ref(false)
const lastRunAt = ref('')
const results = ref<Record<string, ApiCheckResult>>({})

const groups = computed(() => Array.from(new Set(endpoints.map((item) => item.group))).sort())

const rows = computed(() => endpoints.map((endpoint) => ({
  ...endpoint,
  result: results.value[endpoint.key] || createPendingResult(endpoint.key)
})))

const filteredRows = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  return rows.value.filter((item) => {
    const matchKeyword = !text || [item.title, item.owner, item.path, item.permission, item.description]
      .some((field) => String(field || '').toLowerCase().includes(text))
    const matchGroup = groupFilter.value === 'ALL' || item.group === groupFilter.value
    const matchLevel = levelFilter.value === 'ALL' || item.level === levelFilter.value
    const matchStatus = statusFilter.value === 'ALL' || item.result.status === statusFilter.value
    return matchKeyword && matchGroup && matchLevel && matchStatus
  })
})

const overview = computed(() => {
  const checked = rows.value.filter((item) => item.result.status !== 'PENDING').length
  const pass = rows.value.filter((item) => item.result.status === 'PASS').length
  const warn = rows.value.filter((item) => item.result.status === 'WARN').length
  const fail = rows.value.filter((item) => item.result.status === 'FAIL').length
  const coreFail = rows.value.filter((item) => item.level === 'CORE' && item.result.status === 'FAIL').length
  const avgDuration = rows.value
    .map((item) => item.result.durationMillis)
    .filter((value): value is number => typeof value === 'number')
  const avg = avgDuration.length ? Math.round(avgDuration.reduce((sum, value) => sum + value, 0) / avgDuration.length) : 0
  return { total: endpoints.length, checked, pass, warn, fail, coreFail, avg }
})

const suggestions = computed(() => {
  const list: string[] = []
  const failed = rows.value.filter((item) => item.result.status === 'FAIL')
  const warned = rows.value.filter((item) => item.result.status === 'WARN')

  if (failed.some((item) => item.path.startsWith('/admin'))) {
    list.push('Admin 接口失败：优先确认 vspicy-admin、vspicy-gateway 是否启动，以及 /api/admin/** 网关路由是否转发到 18090。')
  }
  if (failed.some((item) => item.path.startsWith('/videos'))) {
    list.push('视频接口失败：优先确认 vspicy-video 是否启动，MinIO / RocketMQ / FFmpeg 缺失也会导致部分运维接口异常。')
  }
  if (failed.some((item) => item.path.startsWith('/notifications'))) {
    list.push('通知接口失败：确认 vspicy-notification 是否启动，并检查通知表结构是否已执行。')
  }
  if (failed.some((item) => item.result.httpStatus === 401)) {
    list.push('存在 401：登录态失效或 Authorization 未写入，请重新登录后台。')
  }
  if (failed.some((item) => item.result.httpStatus === 403)) {
    list.push('存在 403：当前账号缺少对应 permissionCode，可以在权限管理中补角色权限。')
  }
  if (warned.length) {
    list.push('存在 WARN：HTTP 已连通，但业务 code 非 0 或响应结构和预期不一致，需要检查接口返回封装。')
  }
  if (!list.length) {
    list.push('未发现阻断性接口问题。若页面仍异常，继续查看浏览器 Network、后端控制台首段异常和网关日志。')
  }
  return list
})

function createPendingResult(key: string): ApiCheckResult {
  return {
    key,
    status: 'PENDING',
    durationMillis: null,
    httpStatus: null,
    businessCode: null,
    message: '未检测',
    responseShape: '-',
    checkedAt: null
  }
}

function setResult(result: ApiCheckResult) {
  results.value = { ...results.value, [result.key]: result }
}

async function runAll() {
  running.value = true
  results.value = {}
  const queue = [...endpoints]
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const endpoint = queue.shift()
      if (endpoint) {
        await runOne(endpoint)
      }
    }
  })
  await Promise.all(workers)
  lastRunAt.value = new Date().toLocaleString()
  running.value = false
}

async function runOne(endpoint: ApiEndpoint) {
  setResult({ ...createPendingResult(endpoint.key), status: 'RUNNING', message: '检测中...' })
  const startedAt = performance.now()
  try {
    const response: any = await http.request({
      method: endpoint.method,
      url: endpoint.path,
      params: endpoint.params
    })
    const durationMillis = Math.round(performance.now() - startedAt)
    const normalized = normalizeResponse(response, endpoint)
    setResult({
      key: endpoint.key,
      status: normalized.status,
      durationMillis,
      httpStatus: 200,
      businessCode: normalized.businessCode,
      message: normalized.message,
      responseShape: describeShape(response),
      checkedAt: new Date().toLocaleTimeString()
    })
  } catch (error: any) {
    const durationMillis = Math.round(performance.now() - startedAt)
    const httpStatus = Number(error?.response?.status || 0) || null
    const payload = error?.response?.data
    setResult({
      key: endpoint.key,
      status: 'FAIL',
      durationMillis,
      httpStatus,
      businessCode: payload?.code ?? null,
      message: payload?.message || error?.message || '请求失败',
      responseShape: describeShape(payload),
      checkedAt: new Date().toLocaleTimeString()
    })
  }
}

function normalizeResponse(response: any, endpoint: ApiEndpoint) {
  const hasEnvelope = response && typeof response === 'object' && 'code' in response && 'message' in response && 'data' in response
  if (hasEnvelope) {
    const code = response.code
    if (Number(code) === 0) {
      return { status: 'PASS' as ApiStatus, businessCode: code, message: 'HTTP 正常，业务 code=0' }
    }
    return { status: 'WARN' as ApiStatus, businessCode: code, message: response.message || `业务 code=${code}` }
  }

  if (endpoint.expectedShape === 'envelope') {
    return { status: 'WARN' as ApiStatus, businessCode: null, message: 'HTTP 正常，但未发现统一 Result 包装结构' }
  }

  return { status: 'PASS' as ApiStatus, businessCode: null, message: 'HTTP 正常' }
}

function describeShape(value: any): string {
  if (value == null) return 'empty'
  if (Array.isArray(value)) return `array(${value.length})`
  if (typeof value !== 'object') return typeof value
  const keys = Object.keys(value)
  const prefix = keys.slice(0, 8).join(', ')
  return keys.length > 8 ? `object{${prefix}, ...}` : `object{${prefix || '-'}}`
}

function statusClass(status: ApiStatus) {
  return `status status-${status.toLowerCase()}`
}

function levelClass(level: ApiLevel) {
  return `level level-${level.toLowerCase()}`
}

function resetFilters() {
  keyword.value = ''
  groupFilter.value = 'ALL'
  levelFilter.value = 'ALL'
  statusFilter.value = 'ALL'
}

function exportReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    overview: overview.value,
    suggestions: suggestions.value,
    endpoints,
    results: rows.value.map((item) => ({
      key: item.key,
      title: item.title,
      owner: item.owner,
      method: item.method,
      path: item.path,
      permission: item.permission,
      level: item.level,
      result: item.result
    }))
  }
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `vspicy-api-diagnostics-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(runAll)
</script>

<template>
  <section class="admin-page api-diagnostics-page">
    <div class="page-head">
      <div>
        <p class="eyebrow">API Diagnostics</p>
        <h1>API 诊断中心</h1>
        <p>批量探测后台核心 GET 接口，区分网关不可达、服务未启动、权限不足、业务 code 异常和响应结构不一致。</p>
      </div>
      <div class="head-actions">
        <button class="secondary" :disabled="running" @click="exportReport">导出 JSON</button>
        <button :disabled="running" @click="runAll">{{ running ? '检测中...' : '重新检测' }}</button>
      </div>
    </div>

    <div class="metric-grid">
      <article class="metric-card">
        <span>接口总数</span>
        <strong>{{ overview.total }}</strong>
        <small>当前诊断清单</small>
      </article>
      <article class="metric-card success">
        <span>通过</span>
        <strong>{{ overview.pass }}</strong>
        <small>HTTP 与业务状态正常</small>
      </article>
      <article class="metric-card warning">
        <span>警告</span>
        <strong>{{ overview.warn }}</strong>
        <small>连通但返回结构需确认</small>
      </article>
      <article class="metric-card danger">
        <span>失败</span>
        <strong>{{ overview.fail }}</strong>
        <small>核心失败 {{ overview.coreFail }}</small>
      </article>
      <article class="metric-card info">
        <span>平均耗时</span>
        <strong>{{ overview.avg }}ms</strong>
        <small>{{ lastRunAt || '未完成检测' }}</small>
      </article>
    </div>

    <section class="panel suggestions">
      <div class="panel-title">
        <h2>处理建议</h2>
        <span>{{ overview.checked }}/{{ overview.total }} checked</span>
      </div>
      <ul>
        <li v-for="item in suggestions" :key="item">{{ item }}</li>
      </ul>
    </section>

    <div class="toolbar panel">
      <input v-model.trim="keyword" placeholder="搜索接口 / 服务 / 路径 / 权限码" />
      <select v-model="groupFilter">
        <option value="ALL">全部分组</option>
        <option v-for="item in groups" :key="item" :value="item">{{ item }}</option>
      </select>
      <select v-model="levelFilter">
        <option value="ALL">全部等级</option>
        <option value="CORE">CORE</option>
        <option value="IMPORTANT">IMPORTANT</option>
        <option value="OPTIONAL">OPTIONAL</option>
      </select>
      <select v-model="statusFilter">
        <option value="ALL">全部状态</option>
        <option value="PENDING">PENDING</option>
        <option value="RUNNING">RUNNING</option>
        <option value="PASS">PASS</option>
        <option value="WARN">WARN</option>
        <option value="FAIL">FAIL</option>
      </select>
      <button class="secondary" @click="resetFilters">重置</button>
    </div>

    <section class="panel">
      <div class="panel-title">
        <h2>接口探测结果</h2>
        <span>{{ filteredRows.length }} / {{ rows.length }}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>状态</th>
              <th>接口</th>
              <th>服务</th>
              <th>等级</th>
              <th>路径</th>
              <th>权限码</th>
              <th>耗时</th>
              <th>HTTP</th>
              <th>业务码</th>
              <th>响应结构</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredRows" :key="item.key">
              <td><span :class="statusClass(item.result.status)">{{ item.result.status }}</span></td>
              <td>
                <strong>{{ item.title }}</strong>
                <small>{{ item.description }}</small>
              </td>
              <td>{{ item.owner }}</td>
              <td><span :class="levelClass(item.level)">{{ item.level }}</span></td>
              <td class="mono">{{ item.method }} {{ item.path }}</td>
              <td class="mono">{{ item.permission }}</td>
              <td>{{ item.result.durationMillis == null ? '-' : item.result.durationMillis + 'ms' }}</td>
              <td>{{ item.result.httpStatus || '-' }}</td>
              <td>{{ item.result.businessCode ?? '-' }}</td>
              <td class="mono">{{ item.result.responseShape }}</td>
              <td><button class="small" :disabled="running" @click="runOne(item)">重试</button></td>
            </tr>
            <tr v-if="!filteredRows.length">
              <td colspan="11" class="empty">没有匹配的接口。</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel detail-panel">
      <div class="panel-title">
        <h2>失败详情</h2>
        <span>{{ rows.filter((item) => item.result.status === 'FAIL' || item.result.status === 'WARN').length }}</span>
      </div>
      <div class="issue-grid">
        <article
          v-for="item in rows.filter((row) => row.result.status === 'FAIL' || row.result.status === 'WARN')"
          :key="item.key"
          class="issue-card"
        >
          <div>
            <span :class="statusClass(item.result.status)">{{ item.result.status }}</span>
            <h3>{{ item.title }}</h3>
            <p class="mono">{{ item.method }} {{ item.path }}</p>
          </div>
          <p>{{ item.result.message }}</p>
          <small>服务：{{ item.owner }} / 权限：{{ item.permission }} / 检测时间：{{ item.result.checkedAt || '-' }}</small>
        </article>
        <p v-if="!rows.some((row) => row.result.status === 'FAIL' || row.result.status === 'WARN')" class="empty">暂无失败或警告接口。</p>
      </div>
    </section>
  </section>
</template>

<style scoped>
.api-diagnostics-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-head,
.panel,
.metric-card,
.issue-card {
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
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.head-actions,
.toolbar {
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

.metric-card span,
.metric-card small {
  display: block;
  color: #64748b;
}

.metric-card strong {
  display: block;
  margin: 8px 0 4px;
  color: #0f172a;
  font-size: 30px;
}

.metric-card.success strong { color: #166534; }
.metric-card.warning strong { color: #d97706; }
.metric-card.danger strong { color: #dc2626; }
.metric-card.info strong { color: #2563eb; }

.panel {
  padding: 18px;
}

.panel-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.panel-title h2 {
  margin: 0;
  font-size: 18px;
}

.panel-title span,
td small,
.issue-card small {
  color: #64748b;
  font-size: 12px;
}

.suggestions ul {
  margin: 0;
  padding-left: 20px;
  line-height: 1.8;
  color: #334155;
}

.toolbar input,
.toolbar select {
  min-height: 38px;
  border: 1px solid #dbe3ef;
  border-radius: 12px;
  padding: 0 12px;
  background: #fff;
}

.toolbar input {
  min-width: min(380px, 100%);
  flex: 1;
}

button {
  border: 0;
  border-radius: 12px;
  padding: 10px 14px;
  background: #2563eb;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

button.secondary {
  background: #eef2ff;
  color: #3730a3;
}

button.small {
  padding: 7px 10px;
  border-radius: 10px;
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
  border-bottom: 1px solid #e2e8f0;
  padding: 11px 10px;
  text-align: left;
  white-space: nowrap;
  vertical-align: top;
}

th {
  color: #475569;
  font-size: 12px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  background: #f8fafc;
}

td strong,
td small {
  display: block;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.status,
.level {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 800;
}

.status-pending,
.level-optional {
  background: #e2e8f0;
  color: #334155;
}

.status-running,
.level-important {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-pass,
.level-core {
  background: #dcfce7;
  color: #166534;
}

.status-warn {
  background: #fef3c7;
  color: #92400e;
}

.status-fail {
  background: #fee2e2;
  color: #991b1b;
}

.issue-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}

.issue-card {
  padding: 16px;
  box-shadow: none;
}

.issue-card h3 {
  margin: 10px 0 4px;
  font-size: 16px;
}

.issue-card p {
  margin: 8px 0;
  color: #334155;
}

.empty {
  color: #94a3b8;
  text-align: center;
}

@media (max-width: 760px) {
  .page-head {
    flex-direction: column;
  }
}
</style>
