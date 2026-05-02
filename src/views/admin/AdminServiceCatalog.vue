<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getAccessToken, getCurrentUserId, USER_ID_KEY } from '../../api/http'

type ServiceStatus = 'PASS' | 'WARN' | 'FAIL' | 'INFO' | 'RUNNING' | 'PENDING'
type ServiceLevel = 'CORE' | 'BUSINESS' | 'OPS' | 'INFRA'

type ServiceRow = {
  key: string
  name: string
  port: number
  level: ServiceLevel
  routePrefixes: string[]
  healthPath: string
  directHealthUrl: string
  description: string
  dependencies: string[]
  restartCommand: string
}

type GatewayRouteRow = {
  id: string
  service: string
  uri: string
  predicate: string
  permissionModel: string
  note: string
}

type ApiModuleRow = {
  file: string
  module: string
  service: string
  prefixes: string[]
  risk: string
}

type ProbeResult = {
  key: string
  status: ServiceStatus
  httpStatus: number | null
  durationMillis: number | null
  contentType: string
  businessCode: number | string | null
  message: string
  checkedAt: string
}

type ProbeTarget = {
  key: string
  service: string
  title: string
  path: string
  authRequired: boolean
  expectedStatuses: number[]
  note: string
}

const keyword = ref('')
const levelFilter = ref<'ALL' | ServiceLevel>('ALL')
const statusFilter = ref<'ALL' | ServiceStatus>('ALL')
const running = ref(false)
const currentProbe = ref('')
const lastRunAt = ref('')
const copied = ref(false)
const probeResults = ref<Record<string, ProbeResult>>({})

const services: ServiceRow[] = [
  {
    key: 'gateway',
    name: 'vspicy-gateway',
    port: 18080,
    level: 'CORE',
    routePrefixes: ['/api/auth/**', '/api/users/**', '/api/files/**', '/api/videos/**', '/api/articles/**', '/api/audit/**', '/api/admin/**', '/api/notifications/**', '/api/members/**'],
    healthPath: '-',
    directHealthUrl: 'http://localhost:18080',
    description: '统一入口，负责 /api 路由转发、JWT 校验和权限规则匹配。',
    dependencies: ['auth', 'admin', 'member', 'notification', 'video', 'content'],
    restartCommand: 'mvn -pl vspicy-gateway -am clean package -DskipTests'
  },
  {
    key: 'auth',
    name: 'vspicy-auth',
    port: 18081,
    level: 'CORE',
    routePrefixes: ['/api/auth/**', '/auth/**'],
    healthPath: '/api/auth/health',
    directHealthUrl: 'http://localhost:18081/api/auth/health',
    description: '登录、当前用户、JWT 签发和认证兼容路径。',
    dependencies: ['MySQL'],
    restartCommand: 'mvn -pl vspicy-auth -am clean package -DskipTests'
  },
  {
    key: 'user',
    name: 'vspicy-user',
    port: 18082,
    level: 'BUSINESS',
    routePrefixes: ['/api/users/**'],
    healthPath: '/api/users/health',
    directHealthUrl: 'http://localhost:18082/api/users/health',
    description: '用户基础资料、账号状态和用户详情。',
    dependencies: ['MySQL'],
    restartCommand: 'mvn -pl vspicy-user -am clean package -DskipTests'
  },
  {
    key: 'file',
    name: 'vspicy-file',
    port: 18083,
    level: 'BUSINESS',
    routePrefixes: ['/api/files/**'],
    healthPath: '/api/files/health',
    directHealthUrl: 'http://localhost:18083/api/files/health',
    description: '文件上传、文件元数据和对象存储入口。',
    dependencies: ['MySQL', 'MinIO'],
    restartCommand: 'mvn -pl vspicy-file -am clean package -DskipTests'
  },
  {
    key: 'video',
    name: 'vspicy-video',
    port: 18084,
    level: 'BUSINESS',
    routePrefixes: ['/api/videos/**'],
    healthPath: '/api/videos/upload/health',
    directHealthUrl: 'http://localhost:18084/api/videos/upload/health',
    description: '视频上传、转码、播放、HLS、存储运维和清理治理。',
    dependencies: ['MySQL', 'MinIO', 'RocketMQ', 'FFmpeg'],
    restartCommand: 'mvn -pl vspicy-video -am clean package -DskipTests'
  },
  {
    key: 'content',
    name: 'vspicy-content',
    port: 18085,
    level: 'BUSINESS',
    routePrefixes: ['/api/articles/**', '/api/audit/**'],
    healthPath: '/api/articles/health',
    directHealthUrl: 'http://localhost:18085/api/articles/health',
    description: '文章内容、审核任务、敏感词和内容安全。',
    dependencies: ['MySQL'],
    restartCommand: 'mvn -pl vspicy-content -am clean package -DskipTests'
  },
  {
    key: 'interaction',
    name: 'vspicy-interaction',
    port: 18086,
    level: 'BUSINESS',
    routePrefixes: ['/api/interactions/**'],
    healthPath: '/api/interactions/health',
    directHealthUrl: 'http://localhost:18086/api/interactions/health',
    description: '点赞、收藏、评论等互动能力。',
    dependencies: ['MySQL'],
    restartCommand: 'mvn -pl vspicy-interaction -am clean package -DskipTests'
  },
  {
    key: 'recommend',
    name: 'vspicy-recommend',
    port: 18087,
    level: 'BUSINESS',
    routePrefixes: ['/api/recommend/**'],
    healthPath: '/api/recommend/health',
    directHealthUrl: 'http://localhost:18087/api/recommend/health',
    description: '推荐流、推荐调试和用户推荐解释。',
    dependencies: ['MySQL'],
    restartCommand: 'mvn -pl vspicy-recommend -am clean package -DskipTests'
  },
  {
    key: 'profile',
    name: 'vspicy-profile',
    port: 18088,
    level: 'BUSINESS',
    routePrefixes: ['/api/profiles/**'],
    healthPath: '/api/profiles/health',
    directHealthUrl: 'http://localhost:18088/api/profiles/health',
    description: '用户资料、兴趣画像和资料审核。',
    dependencies: ['MySQL'],
    restartCommand: 'mvn -pl vspicy-profile -am clean package -DskipTests'
  },
  {
    key: 'dashboard',
    name: 'vspicy-dashboard',
    port: 18089,
    level: 'OPS',
    routePrefixes: ['/api/dashboard/**'],
    healthPath: '/api/dashboard/health',
    directHealthUrl: 'http://localhost:18089/api/dashboard/health',
    description: '平台指标、数据总览和运营看板。',
    dependencies: ['MySQL'],
    restartCommand: 'mvn -pl vspicy-dashboard -am clean package -DskipTests'
  },
  {
    key: 'admin',
    name: 'vspicy-admin',
    port: 18090,
    level: 'OPS',
    routePrefixes: ['/api/admin/**'],
    healthPath: '/api/admin/health',
    directHealthUrl: 'http://localhost:18090/api/admin/health',
    description: '后台 RBAC、系统配置、菜单、组织、审计、发布和诊断类接口。',
    dependencies: ['MySQL'],
    restartCommand: 'mvn -pl vspicy-admin -am clean package -DskipTests'
  },
  {
    key: 'notification',
    name: 'vspicy-notification',
    port: 18091,
    level: 'BUSINESS',
    routePrefixes: ['/api/notifications/**'],
    healthPath: '/api/notifications/health',
    directHealthUrl: 'http://localhost:18091/api/notifications/health',
    description: '站内通知、公告、模板、事件日志和未读计数。',
    dependencies: ['MySQL'],
    restartCommand: 'mvn -pl vspicy-notification -am clean package -DskipTests'
  },
  {
    key: 'member',
    name: 'vspicy-member',
    port: 18092,
    level: 'BUSINESS',
    routePrefixes: ['/api/members/**'],
    healthPath: '/api/members/health',
    directHealthUrl: 'http://localhost:18092/api/members/health',
    description: '会员套餐、权益、个人会员状态和订阅操作。',
    dependencies: ['MySQL'],
    restartCommand: 'mvn -pl vspicy-member -am clean package -DskipTests'
  }
]

const gatewayRoutes: GatewayRouteRow[] = [
  { id: 'vspicy-auth', service: 'vspicy-auth', uri: 'http://localhost:18081', predicate: '/api/auth/**', permissionModel: '白名单 + 登录接口', note: '登录必须走这个前缀，兼容 /auth/**。' },
  { id: 'vspicy-user', service: 'vspicy-user', uri: 'http://localhost:18082', predicate: '/api/users/**', permissionModel: 'user:view / user:manage', note: '用户管理和用户详情。' },
  { id: 'vspicy-file', service: 'vspicy-file', uri: 'http://localhost:18083', predicate: '/api/files/**', permissionModel: '按具体接口控制', note: '文件相关入口。' },
  { id: 'vspicy-video', service: 'vspicy-video', uri: 'http://localhost:18084', predicate: '/api/videos/**', permissionModel: 'content / video:*', note: '上传、转码、存储和播放链路。' },
  { id: 'vspicy-content-article', service: 'vspicy-content', uri: 'http://localhost:18085', predicate: '/api/articles/**', permissionModel: '白名单读 + 内容权限', note: '文章接口。' },
  { id: 'vspicy-content-audit', service: 'vspicy-content', uri: 'http://localhost:18085', predicate: '/api/audit/**', permissionModel: 'content:audit:* / content:sensitive:*', note: '审核与敏感词。' },
  { id: 'vspicy-interaction', service: 'vspicy-interaction', uri: 'http://localhost:18086', predicate: '/api/interactions/**', permissionModel: '白名单读 + 互动权限', note: '互动行为。' },
  { id: 'vspicy-recommend', service: 'vspicy-recommend', uri: 'http://localhost:18087', predicate: '/api/recommend/**', permissionModel: '白名单读 + recommend:view', note: '推荐服务。' },
  { id: 'vspicy-profile', service: 'vspicy-profile', uri: 'http://localhost:18088', predicate: '/api/profiles/**', permissionModel: '白名单读 + profile:view', note: '资料服务。' },
  { id: 'vspicy-dashboard', service: 'vspicy-dashboard', uri: 'http://localhost:18089', predicate: '/api/dashboard/**', permissionModel: '白名单读 + dashboard:view', note: '数据看板。' },
  { id: 'vspicy-admin', service: 'vspicy-admin', uri: 'http://localhost:18090', predicate: '/api/admin/**', permissionModel: '后台权限码', note: '后台管理接口，fallback 为 permission:view。' },
  { id: 'vspicy-notification', service: 'vspicy-notification', uri: 'http://localhost:18091', predicate: '/api/notifications/**', permissionModel: 'AUTHENTICATED + notification:*', note: '未读数和 inbox 为登录即可访问。' },
  { id: 'vspicy-member', service: 'vspicy-member', uri: 'http://localhost:18092', predicate: '/api/members/**', permissionModel: 'AUTHENTICATED + member:*', note: 'me/benefits/check 为登录即可访问。' }
]

const apiModules: ApiModuleRow[] = [
  { file: 'auth.ts', module: '认证', service: 'vspicy-auth', prefixes: ['/auth/login', '/auth/me'], risk: '登录失败优先检查 gateway、auth 和 token 响应结构。' },
  { file: 'admin.ts / adminMenu.ts', module: 'RBAC / 菜单', service: 'vspicy-admin', prefixes: ['/admin/users', '/admin/roles', '/admin/permissions', '/admin/menus'], risk: '403 多数是角色权限视图或网关权限规则问题。' },
  { file: 'member.ts', module: '会员', service: 'vspicy-member', prefixes: ['/members/me', '/members/plans'], risk: '个人中心 403 优先检查 AUTHENTICATED 规则和 roles token。' },
  { file: 'notification.ts', module: '通知', service: 'vspicy-notification', prefixes: ['/notifications/unread-count', '/notifications/inbox', '/notifications/templates'], risk: '未读数属于登录即可访问，不应依赖 notification:view。' },
  { file: 'video.ts / transcode*.ts / storage*.ts', module: '视频与存储', service: 'vspicy-video', prefixes: ['/videos', '/videos/upload', '/videos/transcode', '/videos/upload/storage'], risk: '上传、转码、MinIO、RocketMQ 问题通常落在此服务。' },
  { file: 'article.ts / audit.ts / safety.ts', module: '内容与审核', service: 'vspicy-content', prefixes: ['/articles', '/audit'], risk: '审核和敏感词路径都走 content 服务。' },
  { file: 'profile.ts', module: '资料', service: 'vspicy-profile', prefixes: ['/profiles'], risk: '资料页 404/403 检查 profile 路由和白名单。' },
  { file: 'recommend.ts', module: '推荐', service: 'vspicy-recommend', prefixes: ['/recommend'], risk: '推荐接口当前通过 gateway 白名单读取。' },
  { file: 'dashboard.ts', module: '数据看板', service: 'vspicy-dashboard', prefixes: ['/dashboard'], risk: '后台首页指标依赖此服务。' },
  { file: 'serviceDiagnostics.ts / systemMonitor.ts', module: '系统诊断', service: 'vspicy-admin', prefixes: ['/admin/service-diagnostics', '/admin/system-monitor'], risk: '诊断工具自身依赖 admin 服务和 system:diagnostics:view。' }
]

const probeTargets: ProbeTarget[] = services
  .filter((service) => service.healthPath !== '-')
  .map((service) => ({
    key: service.key,
    service: service.name,
    title: `${service.name} 健康接口`,
    path: service.healthPath,
    authRequired: false,
    expectedStatuses: [200],
    note: '经 Gateway /api/**/health 白名单探测。'
  }))

const userId = computed(() => getCurrentUserId() || Number(localStorage.getItem(USER_ID_KEY) || 1) || 1)
const baseInfo = computed(() => ({
  browserOrigin: window.location.origin,
  apiBase: '/api',
  tokenPresent: Boolean(getAccessToken()),
  currentUserId: userId.value
}))

const filteredServices = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  return services.filter((service) => {
    const result = probeResults.value[service.key]
    const status = result?.status || 'PENDING'
    const matchLevel = levelFilter.value === 'ALL' || service.level === levelFilter.value
    const matchStatus = statusFilter.value === 'ALL' || status === statusFilter.value
    const matchKeyword = !text || [
      service.name,
      service.port,
      service.level,
      service.routePrefixes.join(' '),
      service.healthPath,
      service.directHealthUrl,
      service.description,
      service.dependencies.join(' '),
      service.restartCommand,
      result?.message || ''
    ].some((field) => String(field).toLowerCase().includes(text))
    return matchLevel && matchStatus && matchKeyword
  })
})

const filteredApiModules = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return apiModules
  return apiModules.filter((item) => [item.file, item.module, item.service, item.prefixes.join(' '), item.risk]
    .some((field) => field.toLowerCase().includes(text)))
})

const overview = computed(() => {
  const results = Object.values(probeResults.value)
  return {
    services: services.length,
    gatewayRoutes: gatewayRoutes.length,
    apiModules: apiModules.length,
    pass: results.filter((item) => item.status === 'PASS').length,
    warn: results.filter((item) => item.status === 'WARN').length,
    fail: results.filter((item) => item.status === 'FAIL').length,
    pending: services.length - results.length
  }
})

function serviceResult(key: string) {
  return probeResults.value[key]
}

function statusText(status?: ServiceStatus) {
  const value = status || 'PENDING'
  const map: Record<ServiceStatus, string> = {
    PASS: '正常',
    WARN: '需确认',
    FAIL: '失败',
    INFO: '信息',
    RUNNING: '探测中',
    PENDING: '未探测'
  }
  return map[value]
}

function statusClass(status?: ServiceStatus) {
  return `status-pill status-${(status || 'PENDING').toLowerCase()}`
}

function levelText(level: ServiceLevel) {
  const map: Record<ServiceLevel, string> = {
    CORE: '核心链路',
    BUSINESS: '业务服务',
    OPS: '后台运维',
    INFRA: '基础设施'
  }
  return map[level]
}

function resetFilters() {
  keyword.value = ''
  levelFilter.value = 'ALL'
  statusFilter.value = 'ALL'
}

function authHeaders() {
  const headers: Record<string, string> = { Accept: 'application/json, text/plain, */*' }
  const token = getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (userId.value) headers['X-User-Id'] = String(userId.value)
  return headers
}

async function probe(target: ProbeTarget) {
  const start = performance.now()
  probeResults.value = {
    ...probeResults.value,
    [target.key]: {
      key: target.key,
      status: 'RUNNING',
      httpStatus: null,
      durationMillis: null,
      contentType: '',
      businessCode: null,
      message: '正在探测...',
      checkedAt: new Date().toLocaleString()
    }
  }

  try {
    const response = await fetch(target.path, {
      method: 'GET',
      headers: authHeaders(),
      cache: 'no-store'
    })
    const durationMillis = Math.round(performance.now() - start)
    const contentType = response.headers.get('content-type') || ''
    const text = await response.text()
    const json = parseJson(text)
    const businessCode = json && typeof json === 'object' ? (json.code ?? null) : null
    const expected = target.expectedStatuses.includes(response.status)
    const html = contentType.includes('text/html') || text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html')
    const status: ServiceStatus = html ? 'FAIL' : expected && response.ok ? 'PASS' : expected ? 'WARN' : 'FAIL'
    const message = html
      ? '返回 HTML，说明请求可能没有正确进入 Gateway 或被前端 fallback 接管。'
      : response.ok
        ? (json?.message || '接口可达。')
        : response.status === 401
          ? '401：未登录或 token 已失效。'
          : response.status === 403
            ? '403：网关权限规则或角色权限不足。'
            : `HTTP ${response.status}：${json?.message || text.slice(0, 120) || '无响应内容'}`

    probeResults.value = {
      ...probeResults.value,
      [target.key]: {
        key: target.key,
        status,
        httpStatus: response.status,
        durationMillis,
        contentType: contentType || '-',
        businessCode,
        message,
        checkedAt: new Date().toLocaleString()
      }
    }
  } catch (error: any) {
    probeResults.value = {
      ...probeResults.value,
      [target.key]: {
        key: target.key,
        status: 'FAIL',
        httpStatus: null,
        durationMillis: Math.round(performance.now() - start),
        contentType: '-',
        businessCode: null,
        message: error?.message || '网络异常，可能是 Vite 代理、Gateway 或目标服务未启动。',
        checkedAt: new Date().toLocaleString()
      }
    }
  }
}

async function runAll() {
  running.value = true
  try {
    for (const target of probeTargets) {
      currentProbe.value = target.service
      await probe(target)
    }
    lastRunAt.value = new Date().toLocaleString()
  } finally {
    currentProbe.value = ''
    running.value = false
  }
}

function parseJson(text: string) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function buildSnapshot() {
  return {
    generatedAt: new Date().toISOString(),
    baseInfo: baseInfo.value,
    overview: overview.value,
    services,
    gatewayRoutes,
    apiModules,
    probeResults: probeResults.value
  }
}

async function copySnapshot() {
  const text = JSON.stringify(buildSnapshot(), null, 2)
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 1600)
  } catch {
    exportSnapshot()
  }
}

function exportSnapshot() {
  const blob = new Blob([JSON.stringify(buildSnapshot(), null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `vspicy-service-catalog-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function makeCurl(path: string) {
  return `curl http://localhost:18080${path}`
}

function probeService(key: string) {
  const target = probeTargets.find((item) => item.key === key)
  if (target) {
    void probe(target)
  }
}

onMounted(() => {
  void runAll()
})
</script>

<template>
  <section class="admin-page service-catalog-page">
    <div class="page-head">
      <div>
        <p class="eyebrow">System Operations</p>
        <h1>服务端口与接口目录</h1>
        <p>统一查看微服务端口、Gateway 路由、健康接口和前端 API 模块映射，用于定位 401、403、404、代理错误和服务未启动问题。</p>
      </div>
      <div class="head-actions">
        <button class="secondary" type="button" @click="copySnapshot">{{ copied ? '已复制' : '复制快照' }}</button>
        <button class="secondary" type="button" @click="exportSnapshot">导出 JSON</button>
        <button type="button" :disabled="running" @click="runAll">{{ running ? `探测中：${currentProbe}` : '一键探测' }}</button>
      </div>
    </div>

    <div class="metric-grid">
      <article class="metric-card">
        <span>服务数量</span>
        <strong>{{ overview.services }}</strong>
        <small>18080 - 18092</small>
      </article>
      <article class="metric-card info">
        <span>Gateway 路由</span>
        <strong>{{ overview.gatewayRoutes }}</strong>
        <small>application.yml</small>
      </article>
      <article class="metric-card success">
        <span>健康正常</span>
        <strong>{{ overview.pass }}</strong>
        <small>HTTP 200 且非 HTML</small>
      </article>
      <article class="metric-card warning">
        <span>需确认</span>
        <strong>{{ overview.warn }}</strong>
        <small>401/403 或非 200 预期响应</small>
      </article>
      <article class="metric-card danger">
        <span>失败</span>
        <strong>{{ overview.fail }}</strong>
        <small>代理、服务或响应结构异常</small>
      </article>
      <article class="metric-card">
        <span>前端 API 模块</span>
        <strong>{{ overview.apiModules }}</strong>
        <small>{{ lastRunAt || '等待探测' }}</small>
      </article>
    </div>

    <div class="panel context-panel">
      <div>
        <strong>当前前端</strong>
        <code>{{ baseInfo.browserOrigin }}</code>
      </div>
      <div>
        <strong>API 基础路径</strong>
        <code>{{ baseInfo.apiBase }}</code>
      </div>
      <div>
        <strong>当前 userId</strong>
        <code>{{ baseInfo.currentUserId }}</code>
      </div>
      <div>
        <strong>登录态</strong>
        <code>{{ baseInfo.tokenPresent ? '已检测到 accessToken' : '未检测到 accessToken' }}</code>
      </div>
    </div>

    <div class="panel toolbar">
      <input v-model.trim="keyword" placeholder="搜索服务 / 端口 / 路由 / 前端 API 模块" />
      <select v-model="levelFilter">
        <option value="ALL">全部类型</option>
        <option value="CORE">核心链路</option>
        <option value="BUSINESS">业务服务</option>
        <option value="OPS">后台运维</option>
        <option value="INFRA">基础设施</option>
      </select>
      <select v-model="statusFilter">
        <option value="ALL">全部状态</option>
        <option value="PASS">正常</option>
        <option value="WARN">需确认</option>
        <option value="FAIL">失败</option>
        <option value="RUNNING">探测中</option>
        <option value="PENDING">未探测</option>
      </select>
      <button class="secondary" type="button" @click="resetFilters">重置筛选</button>
    </div>

    <div class="panel">
      <div class="panel-title">
        <div>
          <h2>服务目录</h2>
          <p>端口、路由前缀、健康接口、依赖和重启命令统一维护在页面内，便于开发联调时快速定位。</p>
        </div>
        <span>{{ filteredServices.length }} / {{ services.length }}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>状态</th>
              <th>服务</th>
              <th>端口</th>
              <th>Gateway 路由</th>
              <th>健康接口</th>
              <th>依赖</th>
              <th>探测结果</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="service in filteredServices" :key="service.key">
              <td><span :class="statusClass(serviceResult(service.key)?.status)">{{ statusText(serviceResult(service.key)?.status) }}</span></td>
              <td>
                <strong>{{ service.name }}</strong>
                <small>{{ levelText(service.level) }} · {{ service.description }}</small>
              </td>
              <td><code>{{ service.port }}</code></td>
              <td>
                <div class="chip-list">
                  <span v-for="prefix in service.routePrefixes" :key="prefix" class="code-chip">{{ prefix }}</span>
                </div>
              </td>
              <td>
                <code>{{ service.healthPath }}</code>
                <small v-if="service.healthPath !== '-'">{{ makeCurl(service.healthPath) }}</small>
              </td>
              <td>
                <div class="chip-list compact-list">
                  <span v-for="dep in service.dependencies" :key="dep" class="soft-chip">{{ dep }}</span>
                </div>
              </td>
              <td>
                <template v-if="serviceResult(service.key)">
                  <strong>{{ serviceResult(service.key)?.httpStatus || '-' }}</strong>
                  <small>{{ serviceResult(service.key)?.message }}</small>
                  <small>{{ serviceResult(service.key)?.durationMillis ?? '-' }} ms · {{ serviceResult(service.key)?.contentType }}</small>
                </template>
                <span v-else class="muted">未探测</span>
              </td>
              <td>
                <button class="secondary compact" type="button" :disabled="service.healthPath === '-' || serviceResult(service.key)?.status === 'RUNNING'" @click="probeService(service.key)">重试</button>
              </td>
            </tr>
            <tr v-if="filteredServices.length === 0">
              <td colspan="8" class="empty-cell">没有匹配的服务。</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">
        <div>
          <h2>Gateway 路由表</h2>
          <p>来自当前项目 application.yml 的固定路由，用于确认前端 /api 请求最终会进入哪个微服务。</p>
        </div>
        <span>{{ gatewayRoutes.length }} 条</span>
      </div>
      <div class="route-grid">
        <article v-for="route in gatewayRoutes" :key="route.id" class="route-card">
          <div>
            <strong>{{ route.id }}</strong>
            <small>{{ route.service }}</small>
          </div>
          <code>{{ route.predicate }}</code>
          <p>{{ route.permissionModel }}</p>
          <small>{{ route.uri }} · {{ route.note }}</small>
        </article>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">
        <div>
          <h2>前端 API 模块映射</h2>
          <p>把 src/api/*.ts 入口和后端服务建立对应关系，减少调接口时找错服务。</p>
        </div>
        <span>{{ filteredApiModules.length }} / {{ apiModules.length }}</span>
      </div>
      <div class="api-grid">
        <article v-for="item in filteredApiModules" :key="item.file" class="api-card">
          <strong>{{ item.module }}</strong>
          <small>{{ item.file }} → {{ item.service }}</small>
          <div class="chip-list">
            <span v-for="prefix in item.prefixes" :key="prefix" class="code-chip">{{ prefix }}</span>
          </div>
          <p>{{ item.risk }}</p>
        </article>
      </div>
    </div>

    <div class="panel command-panel">
      <div class="panel-title">
        <div>
          <h2>常用验证命令</h2>
          <p>从网关验证时使用 18080；直接验证单服务时使用对应服务端口。</p>
        </div>
      </div>
      <div class="command-grid">
        <code>curl http://localhost:18080/api/auth/health</code>
        <code>curl http://localhost:18080/api/members/health</code>
        <code>curl http://localhost:18080/api/admin/health</code>
        <code>mvn -pl vspicy-gateway,vspicy-auth,vspicy-member -am clean package -DskipTests</code>
      </div>
    </div>
  </section>
</template>

<style scoped>
.service-catalog-page {
  display: grid;
  gap: 18px;
}

.context-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.context-panel > div {
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #f8fafc;
}

.context-panel strong {
  color: #334155;
  font-size: 13px;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.compact-list {
  min-width: 120px;
}

.code-chip,
.soft-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 7px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.code-chip {
  background: #eef2ff;
  color: #3730a3;
}

.soft-chip {
  background: #f1f5f9;
  color: #475569;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.status-pass {
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

.status-info {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-running {
  background: #ede9fe;
  color: #5b21b6;
}

.status-pending {
  background: #f1f5f9;
  color: #475569;
}

.route-grid,
.api-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.route-card,
.api-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #fff;
}

.route-card strong,
.route-card small,
.api-card strong,
.api-card small {
  display: block;
}

.route-card small,
.api-card small,
.muted {
  color: #64748b;
}

.route-card p,
.api-card p {
  margin: 0;
  color: #475569;
  font-size: 13px;
  line-height: 1.5;
}

.command-grid {
  display: grid;
  gap: 10px;
}

.command-grid code {
  display: block;
  padding: 12px;
  border-radius: 12px;
  background: #0f172a;
  color: #dbeafe;
  white-space: pre-wrap;
  word-break: break-all;
}

.compact {
  padding: 6px 10px;
  border-radius: 10px;
  white-space: nowrap;
}

@media (max-width: 920px) {
  .table-wrap {
    overflow-x: auto;
  }
}
</style>
