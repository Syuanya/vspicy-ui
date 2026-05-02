<script setup lang="ts">
import axios, { type AxiosError, type AxiosResponse } from 'axios'
import { computed, ref } from 'vue'
import { getAccessToken, USER_ID_KEY } from '../../api/http'

type RoutePolicy = 'PUBLIC' | 'AUTHENTICATED' | 'PERMISSION'
type RouteLevel = 'PASS' | 'WARN' | 'DANGER' | 'INFO'
type RouteMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'ANY'

type GatewayRoute = {
  id: string
  title: string
  service: string
  port: number
  prefix: string
  method: RouteMethod
  policy: RoutePolicy
  permission?: string
  publicPaths?: string[]
  description: string
  commonErrors: string[]
}

type TraceStep = {
  title: string
  status: RouteLevel
  detail: string
}

type ProbeResult = {
  status: RouteLevel
  httpStatus?: number
  contentType: string
  durationMs?: number
  message: string
  sample: string
  checkedAt: string
}

const gatewayRoutes: GatewayRoute[] = [
  {
    id: 'auth',
    title: '认证服务',
    service: 'vspicy-auth',
    port: 18081,
    prefix: '/api/auth',
    method: 'ANY',
    policy: 'PUBLIC',
    publicPaths: ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'],
    description: '登录、刷新 token、当前登录用户信息。',
    commonErrors: ['登录路径缺少 /api 前缀会被静态资源处理器接管', 'token 写入异常会导致后续接口 401']
  },
  {
    id: 'admin',
    title: '后台管理服务',
    service: 'vspicy-admin',
    port: 18090,
    prefix: '/api/admin',
    method: 'ANY',
    policy: 'PERMISSION',
    permission: '按具体后台接口权限码判定',
    description: '后台用户、菜单、权限、系统配置、系统字典、诊断与审计接口。',
    commonErrors: ['SUPER_ADMIN roles 丢失会导致 gateway 403', '权限视图为空会导致后台页面进入 403']
  },
  {
    id: 'member',
    title: '会员服务',
    service: 'vspicy-member',
    port: 18092,
    prefix: '/api/members',
    method: 'ANY',
    policy: 'AUTHENTICATED',
    publicPaths: ['/api/members/plans'],
    description: '会员套餐、会员权益、我的会员信息。',
    commonErrors: ['个人中心 /api/members/me 返回 403 时优先检查 gateway AUTHENTICATED 规则', '浏览器 favicon 日志可以忽略']
  },
  {
    id: 'notification',
    title: '通知服务',
    service: 'vspicy-notification',
    port: 18093,
    prefix: '/api/notifications',
    method: 'ANY',
    policy: 'AUTHENTICATED',
    publicPaths: ['/api/notifications/announcements'],
    description: '未读数、站内通知、公告、通知事件和模板。',
    commonErrors: ['未读数返回 403 时通常是 gateway 把自助接口按权限码拦截']
  },
  {
    id: 'video',
    title: '视频服务',
    service: 'vspicy-video',
    port: 18084,
    prefix: '/api/videos',
    method: 'ANY',
    policy: 'AUTHENTICATED',
    description: '视频列表、视频详情、上传、转码和播放相关接口。',
    commonErrors: ['分片上传缺少 chunkIndex 会返回参数错误', '上传接口不应被普通 GET 探测']
  },
  {
    id: 'content',
    title: '内容服务',
    service: 'vspicy-content',
    port: 18086,
    prefix: '/api/articles',
    method: 'ANY',
    policy: 'AUTHENTICATED',
    description: '文章列表、文章详情、文章发布和内容治理相关接口。',
    commonErrors: ['文章编辑接口需要登录态', '后台内容管理还会依赖 admin 权限接口']
  },
  {
    id: 'file',
    title: '文件服务',
    service: 'vspicy-file',
    port: 18083,
    prefix: '/api/files',
    method: 'ANY',
    policy: 'AUTHENTICATED',
    description: '通用文件上传、头像、对象存储访问相关接口。',
    commonErrors: ['文件上传失败需同时检查 MinIO 与请求体大小配置']
  },
  {
    id: 'profile',
    title: '资料服务',
    service: 'vspicy-profile',
    port: 18088,
    prefix: '/api/profiles',
    method: 'ANY',
    policy: 'AUTHENTICATED',
    description: '用户资料、头像、简介和资料审核。',
    commonErrors: ['资料接口 401 优先检查 token 是否写入 localStorage']
  },
  {
    id: 'recommend',
    title: '推荐服务',
    service: 'vspicy-recommend',
    port: 18087,
    prefix: '/api/recommend',
    method: 'ANY',
    policy: 'AUTHENTICATED',
    description: '推荐流、热门内容和个性化召回。',
    commonErrors: ['推荐接口通常依赖用户标识和内容服务数据']
  },
  {
    id: 'interaction',
    title: '互动服务',
    service: 'vspicy-interaction',
    port: 18085,
    prefix: '/api/interactions',
    method: 'ANY',
    policy: 'AUTHENTICATED',
    description: '点赞、收藏、评论等互动能力。',
    commonErrors: ['写操作需要登录态和 X-User-Id']
  },
  {
    id: 'dashboard',
    title: '看板服务',
    service: 'vspicy-dashboard',
    port: 18089,
    prefix: '/api/dashboard',
    method: 'ANY',
    policy: 'PERMISSION',
    permission: 'dashboard:view',
    description: '用户端或后台统计看板数据。',
    commonErrors: ['后台看板空数据需检查 dashboard 服务和统计 SQL']
  }
]

const policyLabels: Record<RoutePolicy, string> = {
  PUBLIC: '公共',
  AUTHENTICATED: '登录即可',
  PERMISSION: '需要权限码'
}

const statusLabels: Record<RouteLevel, string> = {
  PASS: '正常',
  WARN: '需关注',
  DANGER: '异常',
  INFO: '信息'
}

const requestPath = ref('/api/members/me?userId=1')
const method = ref<RouteMethod>('GET')
const probeResult = ref<ProbeResult | null>(null)
const probing = ref(false)
const copied = ref(false)
const keyword = ref('')
const policyFilter = ref<'ALL' | RoutePolicy>('ALL')

const normalizedPath = computed(() => normalizePath(requestPath.value))
const matchedRoute = computed(() => gatewayRoutes.find((route) => normalizedPath.value.startsWith(route.prefix)))
const currentUserId = computed(() => localStorage.getItem(USER_ID_KEY) || '')
const accessToken = computed(() => getAccessToken())

const traceSteps = computed<TraceStep[]>(() => {
  const path = normalizedPath.value
  const route = matchedRoute.value
  const steps: TraceStep[] = []

  if (!path) {
    return [{ title: '输入检查', status: 'DANGER', detail: '请求路径为空。' }]
  }

  steps.push({
    title: '前端请求路径',
    status: path.startsWith('/api/') ? 'PASS' : 'DANGER',
    detail: path.startsWith('/api/')
      ? '路径包含 /api 前缀，Vite 代理可以转发到 Gateway。'
      : '路径缺少 /api 前缀，容易被前端路由、静态资源处理器或错误服务接管。'
  })

  steps.push({
    title: 'Vite 代理',
    status: window.location.port === '5173' ? 'INFO' : 'WARN',
    detail: window.location.port === '5173'
      ? '当前运行在 Vite 5173，/api 应由 vite.config.ts 代理到 http://localhost:18080。'
      : `当前前端端口为 ${window.location.port || '默认端口'}，请确认生产环境反向代理已配置 /api。`
  })

  if (!route) {
    steps.push({
      title: 'Gateway 路由匹配',
      status: 'DANGER',
      detail: '未匹配到已登记的 Gateway 路由前缀。请求可能返回 404、HTML fallback 或静态资源异常。'
    })
    return steps
  }

  steps.push({
    title: 'Gateway 路由匹配',
    status: 'PASS',
    detail: `匹配 ${route.prefix}/**，应转发到 ${route.service}:${route.port}。`
  })

  steps.push({
    title: '鉴权策略',
    status: analyzePolicy(route, path).status,
    detail: analyzePolicy(route, path).detail
  })

  steps.push({
    title: '服务入口',
    status: 'INFO',
    detail: `目标服务为 ${route.service}，本地端口 ${route.port}。直连验证可使用 http://localhost:${route.port}${path}。`
  })

  return steps
})

const filteredRoutes = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return gatewayRoutes.filter((route) => {
    const matchPolicy = policyFilter.value === 'ALL' || route.policy === policyFilter.value
    const matchKeyword = !q || [route.title, route.service, route.prefix, route.description, route.permission || '', ...(route.publicPaths || [])]
      .join(' ')
      .toLowerCase()
      .includes(q)
    return matchPolicy && matchKeyword
  })
})

const curlCommands = computed(() => {
  const path = normalizedPath.value || '/api/members/plans'
  const tokenPart = accessToken.value ? ' ^\n  -H "Authorization: Bearer <accessToken>"' : ''
  return {
    gateway: `curl -i -X ${method.value} http://localhost:18080${path}${tokenPart}`,
    vite: `curl -i -X ${method.value} http://localhost:5173${path}${tokenPart}`,
    direct: matchedRoute.value ? `curl -i -X ${method.value} http://localhost:${matchedRoute.value.port}${path}${tokenPart}` : ''
  }
})

function normalizePath(value: string) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    if (/^https?:\/\//i.test(raw)) {
      const url = new URL(raw)
      return `${url.pathname}${url.search}`
    }
  } catch (error) {
    return raw.startsWith('/') ? raw : `/${raw}`
  }
  return raw.startsWith('/') ? raw : `/${raw}`
}

function analyzePolicy(route: GatewayRoute, path: string): { status: RouteLevel; detail: string } {
  if (route.publicPaths?.some((item) => path.startsWith(item))) {
    return { status: 'PASS', detail: '该路径属于公共接口，不应该强制要求 Authorization。' }
  }

  if (route.policy === 'PUBLIC') {
    return { status: 'PASS', detail: '公共服务接口，登录、刷新 token 等场景不依赖已有 token。' }
  }

  if (!accessToken.value) {
    return { status: 'WARN', detail: `${policyLabels[route.policy]} 接口，但当前本地没有 accessToken，实际请求大概率返回 401。` }
  }

  if (route.policy === 'AUTHENTICATED') {
    return { status: 'PASS', detail: '该接口只要求登录态。若实际返回 403，优先检查 gateway AUTHENTICATED 规则是否覆盖该路径。' }
  }

  return {
    status: 'INFO',
    detail: `该接口需要权限码：${route.permission || '按具体接口判定'}。若返回 403，检查 JWT roles、用户权限视图和后台权限配置。`
  }
}

function compactSample(value: unknown) {
  try {
    const text = typeof value === 'string' ? value : JSON.stringify(value)
    return (text || '').length > 800 ? `${(text || '').slice(0, 800)}...` : text || ''
  } catch (error) {
    return '[无法序列化响应]'
  }
}

function analyzeHttpSuccess(response: AxiosResponse, durationMs: number): ProbeResult {
  const contentType = String(response.headers?.['content-type'] || '')
  const data = response.data
  const isJson = contentType.includes('application/json') || (data && typeof data === 'object')
  const hasEnvelope = data && typeof data === 'object' && !Array.isArray(data) && 'code' in data && 'message' in data

  if (contentType.includes('text/html')) {
    return {
      status: 'DANGER',
      httpStatus: response.status,
      contentType,
      durationMs,
      message: '返回 HTML，说明请求没有进入预期业务接口，可能被 Vite fallback、网关错误页或静态资源处理器接管。',
      sample: compactSample(data),
      checkedAt: new Date().toLocaleString()
    }
  }

  if (!isJson) {
    return {
      status: 'WARN',
      httpStatus: response.status,
      contentType,
      durationMs,
      message: '响应不是 JSON，前端全局拦截器可能无法稳定处理。',
      sample: compactSample(data),
      checkedAt: new Date().toLocaleString()
    }
  }

  if (!hasEnvelope) {
    return {
      status: 'WARN',
      httpStatus: response.status,
      contentType,
      durationMs,
      message: '响应不是统一 Result{code,message,data} 结构。',
      sample: compactSample(data),
      checkedAt: new Date().toLocaleString()
    }
  }

  return {
    status: Number((data as any).code) === 0 ? 'PASS' : 'WARN',
    httpStatus: response.status,
    contentType,
    durationMs,
    message: Number((data as any).code) === 0 ? '接口可达且业务码为 0。' : `接口可达，但业务码为 ${(data as any).code}。`,
    sample: compactSample(data),
    checkedAt: new Date().toLocaleString()
  }
}

function analyzeHttpError(error: AxiosError, durationMs: number): ProbeResult {
  const response = error.response
  const status = response?.status
  const contentType = String(response?.headers?.['content-type'] || '')
  let message = error.message || '请求失败'
  let level: RouteLevel = 'DANGER'

  if (status === 401) {
    message = '401 未登录或 token 失效。检查 localStorage accessToken、Authorization 请求头和 auth 服务。'
  } else if (status === 403) {
    message = '403 无权限。检查 gateway 鉴权策略、JWT roles、权限视图和接口所需权限码。'
  } else if (status === 404) {
    message = '404 未找到。检查 /api 前缀、Gateway 路由前缀和目标服务 Controller 路径。'
  } else if (status && status >= 500) {
    message = '后端服务异常。检查目标服务控制台日志和 traceId。'
  } else if (!response) {
    message = '网络层失败。检查 Vite 代理、Gateway 18080 和目标服务是否启动。'
  }

  if (status === 401 || status === 403 || status === 404) {
    level = 'WARN'
  }

  return {
    status: level,
    httpStatus: status,
    contentType,
    durationMs,
    message,
    sample: compactSample(response?.data || error.message),
    checkedAt: new Date().toLocaleString()
  }
}

async function probe() {
  const path = normalizedPath.value
  if (!path) return
  probing.value = true
  probeResult.value = null
  const started = performance.now()
  try {
    const headers: Record<string, string> = {}
    const token = accessToken.value
    if (token) headers.Authorization = `Bearer ${token}`
    if (currentUserId.value) headers['X-User-Id'] = currentUserId.value
    const response = await axios.request({
      url: path,
      method: method.value === 'ANY' ? 'GET' : method.value,
      headers,
      timeout: 12000,
      validateStatus: () => true
    })
    const durationMs = Math.round(performance.now() - started)
    if (response.status >= 400) {
      probeResult.value = analyzeHttpError({ response, message: `HTTP ${response.status}` } as AxiosError, durationMs)
    } else {
      probeResult.value = analyzeHttpSuccess(response, durationMs)
    }
  } catch (error) {
    const durationMs = Math.round(performance.now() - started)
    probeResult.value = analyzeHttpError(error as AxiosError, durationMs)
  } finally {
    probing.value = false
  }
}

function fillPath(path: string) {
  requestPath.value = path
  probeResult.value = null
}

function buildSnapshot() {
  return {
    generatedAt: new Date().toLocaleString(),
    location: window.location.href,
    requestPath: normalizedPath.value,
    method: method.value,
    matchedRoute: matchedRoute.value,
    traceSteps: traceSteps.value,
    probeResult: probeResult.value,
    tokenPresent: Boolean(accessToken.value),
    userId: currentUserId.value
  }
}

async function copySnapshot() {
  await navigator.clipboard.writeText(JSON.stringify(buildSnapshot(), null, 2))
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1600)
}

function downloadSnapshot() {
  const blob = new Blob([JSON.stringify(buildSnapshot(), null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `vspicy-request-trace-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section class="request-trace-page">
    <div class="page-hero">
      <div>
        <p class="eyebrow">System Diagnostics</p>
        <h1>请求链路追踪</h1>
        <p>输入任意 API 路径，快速判断前端代理、Gateway 路由、目标服务、鉴权策略和常见 401/403/404 原因。</p>
      </div>
      <div class="hero-actions">
        <button @click="copySnapshot">{{ copied ? '已复制' : '复制快照' }}</button>
        <button class="primary" @click="downloadSnapshot">导出 JSON</button>
      </div>
    </div>

    <div class="trace-panel">
      <div class="form-row">
        <label>
          <span>请求方法</span>
          <select v-model="method">
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </label>
        <label class="path-input">
          <span>请求路径或完整 URL</span>
          <input v-model="requestPath" placeholder="/api/members/me?userId=1" @keyup.enter="probe" />
        </label>
        <button class="primary" :disabled="probing || !normalizedPath" @click="probe">
          {{ probing ? '探测中...' : '探测接口' }}
        </button>
      </div>

      <div class="quick-paths">
        <button @click="fillPath('/api/auth/me')">/api/auth/me</button>
        <button @click="fillPath('/api/members/me?userId=1')">/api/members/me</button>
        <button @click="fillPath('/api/notifications/unread-count')">/api/notifications/unread-count</button>
        <button @click="fillPath('/api/admin/health')">/api/admin/health</button>
        <button @click="fillPath('/auth/login')">错误示例：/auth/login</button>
      </div>
    </div>

    <div class="summary-grid">
      <article class="summary-card">
        <span>标准化路径</span>
        <strong>{{ normalizedPath || '-' }}</strong>
      </article>
      <article class="summary-card">
        <span>匹配服务</span>
        <strong>{{ matchedRoute?.service || '未匹配' }}</strong>
      </article>
      <article class="summary-card">
        <span>鉴权策略</span>
        <strong>{{ matchedRoute ? policyLabels[matchedRoute.policy] : '-' }}</strong>
      </article>
      <article class="summary-card">
        <span>登录态</span>
        <strong>{{ accessToken ? '已存在' : '缺失' }}</strong>
      </article>
    </div>

    <div class="content-grid">
      <div class="card">
        <div class="card-title">
          <h2>链路判断</h2>
          <span>{{ traceSteps.length }} 项</span>
        </div>
        <div class="steps">
          <div v-for="step in traceSteps" :key="step.title" class="step" :class="step.status.toLowerCase()">
            <div class="step-dot"></div>
            <div>
              <strong>{{ step.title }}</strong>
              <p>{{ step.detail }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          <h2>探测结果</h2>
          <span v-if="probeResult" :class="['badge', probeResult.status.toLowerCase()]">{{ statusLabels[probeResult.status] }}</span>
          <span v-else class="badge info">未探测</span>
        </div>
        <div v-if="probeResult" class="probe-result">
          <div class="result-meta">
            <span>HTTP {{ probeResult.httpStatus || '-' }}</span>
            <span>{{ probeResult.durationMs || 0 }}ms</span>
            <span>{{ probeResult.contentType || '无 Content-Type' }}</span>
          </div>
          <p>{{ probeResult.message }}</p>
          <pre>{{ probeResult.sample || '无响应样本' }}</pre>
        </div>
        <div v-else class="empty-state">点击“探测接口”后显示 HTTP 状态、Content-Type、耗时和响应样本。</div>
      </div>
    </div>

    <div class="card command-card">
      <div class="card-title">
        <h2>验证命令</h2>
        <span>复制到 Git Bash / PowerShell 执行</span>
      </div>
      <div class="commands">
        <label>经 Gateway 验证</label>
        <pre>{{ curlCommands.gateway }}</pre>
        <label>经 Vite 代理验证</label>
        <pre>{{ curlCommands.vite }}</pre>
        <template v-if="curlCommands.direct">
          <label>直连目标服务验证</label>
          <pre>{{ curlCommands.direct }}</pre>
        </template>
      </div>
    </div>

    <div class="card">
      <div class="card-title table-title">
        <div>
          <h2>Gateway 路由目录</h2>
          <p>用于快速核对路径前缀、目标服务、端口和鉴权策略。</p>
        </div>
        <div class="filters">
          <input v-model="keyword" placeholder="搜索服务、前缀、权限码" />
          <select v-model="policyFilter">
            <option value="ALL">全部策略</option>
            <option value="PUBLIC">公共</option>
            <option value="AUTHENTICATED">登录即可</option>
            <option value="PERMISSION">需要权限码</option>
          </select>
        </div>
      </div>
      <div class="route-table">
        <table>
          <thead>
            <tr>
              <th>服务</th>
              <th>Gateway 前缀</th>
              <th>端口</th>
              <th>策略</th>
              <th>说明</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="route in filteredRoutes" :key="route.id">
              <td>
                <strong>{{ route.title }}</strong>
                <small>{{ route.service }}</small>
              </td>
              <td><code>{{ route.prefix }}/**</code></td>
              <td>{{ route.port }}</td>
              <td>
                <span :class="['badge', route.policy.toLowerCase()]">{{ policyLabels[route.policy] }}</span>
                <small v-if="route.permission">{{ route.permission }}</small>
              </td>
              <td>
                <p>{{ route.description }}</p>
                <small v-if="route.publicPaths?.length">公共路径：{{ route.publicPaths.join('，') }}</small>
              </td>
              <td><button @click="fillPath(route.publicPaths?.[0] || route.prefix)">填入</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.request-trace-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 4px;
  color: #172033;
}

.page-hero,
.card,
.trace-panel,
.summary-card {
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(255, 255, 255, 0.94);
  border-radius: 22px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.07);
}

.page-hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 26px;
  background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 54%, #0f766e 100%);
  color: white;
}

.eyebrow {
  margin: 0 0 8px;
  color: rgba(255, 255, 255, 0.68);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.page-hero h1 {
  margin: 0;
  font-size: 30px;
}

.page-hero p {
  max-width: 760px;
  margin: 10px 0 0;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.7;
}

.hero-actions,
.form-row,
.quick-paths,
.filters,
.result-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

button,
select,
input {
  border: 1px solid rgba(148, 163, 184, 0.36);
  border-radius: 12px;
  background: white;
  color: #172033;
  font-size: 14px;
}

button {
  cursor: pointer;
  padding: 10px 14px;
  font-weight: 800;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

button.primary {
  border-color: transparent;
  background: #2563eb;
  color: white;
}

.hero-actions button {
  border-color: rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.12);
  color: white;
}

.hero-actions .primary {
  background: white;
  color: #1d4ed8;
}

.trace-panel {
  padding: 18px;
}

.form-row label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 140px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.form-row .path-input {
  flex: 1;
  min-width: 300px;
}

input,
select {
  min-height: 42px;
  padding: 0 12px;
}

.quick-paths {
  margin-top: 12px;
}

.quick-paths button {
  padding: 8px 10px;
  color: #475569;
  font-size: 12px;
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
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.summary-card strong {
  display: block;
  margin-top: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 20px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 18px;
}

.card {
  padding: 20px;
}

.card-title {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.card-title h2 {
  margin: 0;
  font-size: 18px;
}

.card-title p {
  margin: 6px 0 0;
  color: #64748b;
}

.card-title span {
  color: #64748b;
  font-size: 13px;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.step {
  display: grid;
  grid-template-columns: 16px 1fr;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  background: #f8fafc;
}

.step-dot {
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 999px;
  background: #94a3b8;
}

.step.pass .step-dot,
.badge.pass {
  background: #16a34a;
}

.step.warn .step-dot,
.badge.warn {
  background: #f59e0b;
}

.step.danger .step-dot,
.badge.danger {
  background: #dc2626;
}

.step.info .step-dot,
.badge.info {
  background: #64748b;
}

.step strong {
  display: block;
  margin-bottom: 4px;
}

.step p,
.probe-result p {
  margin: 0;
  color: #64748b;
  line-height: 1.65;
}

.badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 10px;
  color: white !important;
  font-size: 12px !important;
  font-weight: 800;
}

.badge.public {
  background: #0ea5e9;
}

.badge.authenticated {
  background: #16a34a;
}

.badge.permission {
  background: #9333ea;
}

.result-meta span {
  border-radius: 999px;
  background: #eef2ff;
  color: #3730a3;
  padding: 5px 9px;
  font-size: 12px;
  font-weight: 800;
}

pre {
  overflow: auto;
  margin: 12px 0 0;
  border-radius: 14px;
  background: #0f172a;
  color: #dbeafe;
  padding: 14px;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.empty-state {
  border-radius: 16px;
  background: #f8fafc;
  color: #64748b;
  padding: 30px;
  text-align: center;
}

.commands {
  display: grid;
  gap: 8px;
}

.commands label {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.table-title {
  align-items: center;
}

.route-table {
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border-bottom: 1px solid #e2e8f0;
  padding: 13px 10px;
  text-align: left;
  vertical-align: top;
}

th {
  color: #64748b;
  font-size: 12px;
  text-transform: uppercase;
}

td strong,
td small {
  display: block;
}

td small {
  margin-top: 5px;
  color: #64748b;
}

td p {
  margin: 0;
  color: #334155;
  line-height: 1.55;
}

code {
  border-radius: 8px;
  background: #f1f5f9;
  padding: 3px 6px;
  color: #0f172a;
}

@media (max-width: 980px) {
  .page-hero,
  .content-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .page-hero {
    display: block;
  }

  .hero-actions {
    margin-top: 18px;
  }
}
</style>
