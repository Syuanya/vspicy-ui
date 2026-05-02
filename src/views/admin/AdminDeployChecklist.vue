<script setup lang="ts">
import axios, { type AxiosError, type AxiosResponse } from 'axios'
import { computed, ref } from 'vue'
import { ACCESS_TOKEN_KEY, USER_ID_KEY, getAccessToken } from '../../api/http'

type Level = 'success' | 'info' | 'warning' | 'danger'
type ServiceKind = 'frontend' | 'backend' | 'gateway' | 'middleware'
type ProbeState = 'pending' | 'success' | 'warning' | 'danger'

type ServiceItem = {
  id: string
  title: string
  module: string
  kind: ServiceKind
  port?: number
  routePrefix?: string
  healthPath?: string
  restartName: string
  description: string
  dependencies: string[]
}

type ChangePreset = {
  id: string
  title: string
  description: string
  level: Level
  files: string[]
  services: string[]
  sql: string[]
  notes: string[]
}

type SqlItem = {
  id: string
  title: string
  file: string
  when: string
  repeatable: boolean
  services: string[]
}

type ProbeResult = {
  serviceId: string
  state: ProbeState
  httpStatus?: number
  durationMs?: number
  message: string
  checkedAt: string
}

const services: ServiceItem[] = [
  { id: 'ui', title: '前端应用', module: 'vspicy-ui', kind: 'frontend', port: 5173, restartName: 'vspicy-ui', routePrefix: '/', description: 'Vue 3 管理端与用户端页面、API 封装、路由和菜单。', dependencies: ['Node.js', 'Vite'] },
  { id: 'gateway', title: '网关服务', module: 'vspicy-gateway', kind: 'gateway', port: 18080, restartName: 'vspicy-gateway', routePrefix: '/api/**', healthPath: '/api/auth/health', description: '统一入口、路由转发、鉴权过滤和跨服务请求入口。', dependencies: ['auth', '各业务服务'] },
  { id: 'auth', title: '认证服务', module: 'vspicy-auth', kind: 'backend', port: 18081, restartName: 'vspicy-auth', routePrefix: '/api/auth/**', healthPath: '/api/auth/health', description: '登录、刷新 token、当前用户、JWT 签发。', dependencies: ['MySQL', 'Redis'] },
  { id: 'admin', title: '后台管理服务', module: 'vspicy-admin', kind: 'backend', port: 18090, restartName: 'vspicy-admin', routePrefix: '/api/admin/**', healthPath: '/api/admin/health', description: '后台用户、菜单、权限、配置、字典、审计与诊断接口。', dependencies: ['MySQL', 'Redis'] },
  { id: 'member', title: '会员服务', module: 'vspicy-member', kind: 'backend', port: 18092, restartName: 'vspicy-member', routePrefix: '/api/members/**', healthPath: '/api/members/plans', description: '会员套餐、我的会员、权益检查。', dependencies: ['MySQL'] },
  { id: 'notification', title: '通知服务', module: 'vspicy-notification', kind: 'backend', port: 18093, restartName: 'vspicy-notification', routePrefix: '/api/notifications/**', healthPath: '/api/notifications/announcements', description: '站内信、通知事件、公告和未读数。', dependencies: ['MySQL', 'Redis', 'RocketMQ'] },
  { id: 'video', title: '视频服务', module: 'vspicy-video', kind: 'backend', port: 18084, restartName: 'vspicy-video', routePrefix: '/api/videos/**', healthPath: '/api/videos?limit=1', description: '视频列表、上传、转码任务、播放链路和存储运维。', dependencies: ['MySQL', 'MinIO', 'FFmpeg', 'RocketMQ'] },
  { id: 'content', title: '内容服务', module: 'vspicy-content', kind: 'backend', port: 18085, restartName: 'vspicy-content', routePrefix: '/api/articles/**', healthPath: '/api/articles?limit=1', description: '文章、内容审核、敏感词相关内容接口。', dependencies: ['MySQL'] },
  { id: 'file', title: '文件服务', module: 'vspicy-file', kind: 'backend', port: 18083, restartName: 'vspicy-file', routePrefix: '/api/files/**', healthPath: '/api/files/health', description: '文件上传、对象存储、预签名和文件元数据。', dependencies: ['MinIO', 'MySQL'] },
  { id: 'user', title: '用户服务', module: 'vspicy-user', kind: 'backend', port: 18082, restartName: 'vspicy-user', routePrefix: '/api/users/**', healthPath: '/api/users/health', description: '用户基础资料和账号相关能力。', dependencies: ['MySQL', 'Redis'] },
  { id: 'profile', title: '资料服务', module: 'vspicy-profile', kind: 'backend', port: 18086, restartName: 'vspicy-profile', routePrefix: '/api/profiles/**', healthPath: '/api/profiles/health', description: '用户资料、头像、资料审核。', dependencies: ['MySQL'] },
  { id: 'interaction', title: '互动服务', module: 'vspicy-interaction', kind: 'backend', port: 18087, restartName: 'vspicy-interaction', routePrefix: '/api/interactions/**', healthPath: '/api/interactions/health', description: '点赞、收藏、评论、互动统计。', dependencies: ['MySQL', 'Redis'] },
  { id: 'recommend', title: '推荐服务', module: 'vspicy-recommend', kind: 'backend', port: 18088, restartName: 'vspicy-recommend', routePrefix: '/api/recommend/**', healthPath: '/api/recommend/health', description: '推荐列表、热门内容和推荐特征。', dependencies: ['MySQL', 'Redis'] },
  { id: 'dashboard', title: '看板服务', module: 'vspicy-dashboard', kind: 'backend', port: 18089, restartName: 'vspicy-dashboard', routePrefix: '/api/dashboard/**', healthPath: '/api/dashboard/health', description: '统计看板、运营指标、趋势数据。', dependencies: ['MySQL'] }
]

const sqlItems: SqlItem[] = [
  { id: 'apiDiagnosticsPermission', title: 'API 诊断权限', file: 'vspicy-cloud/scripts/sql/20260501_api_diagnostics_permission.sql', when: '首次启用 API 诊断中心时执行。', repeatable: true, services: ['admin', 'gateway'] },
  { id: 'featureMenus', title: '菜单/权限补齐脚本', file: '按实际新增菜单权限脚本执行', when: '新增后台菜单或权限码后执行。', repeatable: false, services: ['admin'] },
  { id: 'businessSchema', title: '业务表结构脚本', file: '按具体功能模块 SQL 执行', when: '新增表、字段、索引或初始化数据时执行。', repeatable: false, services: ['admin', 'member', 'notification', 'video', 'content'] }
]

const presets: ChangePreset[] = [
  {
    id: 'frontendPage',
    title: '只改前端页面/样式/菜单',
    description: '新增 Vue 页面、调整路由、菜单、样式和前端 API 封装。',
    level: 'info',
    files: ['vspicy-ui/src/views/**', 'vspicy-ui/src/router/index.ts', 'vspicy-ui/src/config/adminOpsMenu.ts', 'vspicy-ui/src/api/**'],
    services: ['ui'],
    sql: [],
    notes: ['不需要重启后端。', '若新增权限码但数据库没有该权限，需要额外执行权限 SQL。']
  },
  {
    id: 'gatewayAuth',
    title: '改网关路由/鉴权规则',
    description: '调整 Gateway Path、白名单、AUTHENTICATED 规则或角色解析。',
    level: 'danger',
    files: ['vspicy-cloud/vspicy-gateway/src/main/**', 'vspicy-cloud/vspicy-gateway/src/main/resources/application.yml'],
    services: ['gateway'],
    sql: [],
    notes: ['必须清理浏览器旧 token 后重新登录验证。', '重点验证 401/403/404 是否符合预期。']
  },
  {
    id: 'authToken',
    title: '改登录/JWT/token 结构',
    description: '调整登录响应、accessToken 内容、refreshToken 或当前用户接口。',
    level: 'danger',
    files: ['vspicy-cloud/vspicy-auth/src/main/**', 'vspicy-ui/src/api/auth.ts', 'vspicy-ui/src/api/http.ts'],
    services: ['auth', 'gateway', 'ui'],
    sql: [],
    notes: ['必须清理 localStorage 旧 token。', '如果 JWT roles 被移除，Gateway 可能返回 403。']
  },
  {
    id: 'adminRbac',
    title: '改后台权限/菜单/RBAC',
    description: '调整权限码、角色菜单、权限视图、系统菜单或后台管理接口。',
    level: 'warning',
    files: ['vspicy-cloud/vspicy-admin/src/main/**', 'vspicy-ui/src/views/admin/**', 'vspicy-ui/src/utils/permission.ts'],
    services: ['admin', 'gateway', 'ui'],
    sql: ['featureMenus'],
    notes: ['执行权限 SQL 后重新登录，刷新权限视图缓存。', '重点验证 /api/admin/users/{userId}/permission-view。']
  },
  {
    id: 'memberCenter',
    title: '改会员/个人中心',
    description: '调整我的会员、会员套餐、个人中心聚合加载。',
    level: 'warning',
    files: ['vspicy-cloud/vspicy-member/src/main/**', 'vspicy-ui/src/views/UserCenter.vue', 'vspicy-ui/src/api/member.ts'],
    services: ['member', 'gateway', 'ui'],
    sql: ['businessSchema'],
    notes: ['个人中心应使用 Promise.allSettled 容错，避免单接口失败导致整页崩。']
  },
  {
    id: 'notification',
    title: '改通知/公告/未读数',
    description: '调整通知事件、模板、公告、未读数和站内信。',
    level: 'warning',
    files: ['vspicy-cloud/vspicy-notification/src/main/**', 'vspicy-ui/src/api/notification.ts', 'vspicy-ui/src/views/admin/Notification*.vue'],
    services: ['notification', 'gateway', 'ui'],
    sql: ['businessSchema'],
    notes: ['通知服务可能依赖 RocketMQ 和 Redis，启动顺序要靠后。']
  },
  {
    id: 'videoStorage',
    title: '改视频/上传/存储/转码',
    description: '调整上传配额、转码、HLS、对象清理、播放地址和存储告警。',
    level: 'danger',
    files: ['vspicy-cloud/vspicy-video/src/main/**', 'vspicy-cloud/vspicy-file/src/main/**', 'vspicy-ui/src/views/admin/*Storage*.vue'],
    services: ['video', 'file', 'gateway', 'ui'],
    sql: ['businessSchema'],
    notes: ['需要确认 MinIO、FFmpeg、RocketMQ 可用。', '大文件上传接口要关注网关超时和请求体限制。']
  }
]

const selectedPresetIds = ref<string[]>(['frontendPage'])
const selectedSqlIds = ref<string[]>([])
const keyword = ref('')
const levelFilter = ref<'all' | Level>('all')
const probeResults = ref<Record<string, ProbeResult>>({})
const probing = ref(false)

function unique<T>(values: T[]) {
  return Array.from(new Set(values))
}

const selectedPresets = computed(() => presets.filter((item) => selectedPresetIds.value.includes(item.id)))

const affectedServiceIds = computed(() => unique(selectedPresets.value.flatMap((item) => item.services)))
const affectedServices = computed(() => services.filter((service) => affectedServiceIds.value.includes(service.id)))

const requiredSqlIds = computed(() => unique([...selectedPresets.value.flatMap((item) => item.sql), ...selectedSqlIds.value]))
const requiredSqlItems = computed(() => sqlItems.filter((item) => requiredSqlIds.value.includes(item.id)))

const backendModules = computed(() => affectedServices.value.filter((item) => item.kind !== 'frontend').map((item) => item.module))
const restartServices = computed(() => affectedServices.value.map((item) => item.restartName))

const buildCommands = computed(() => {
  const commands: string[] = []
  if (affectedServiceIds.value.includes('ui')) {
    commands.push('cd D:\\workspace\\vspicy\\vspicy-ui')
    commands.push('npm install')
    commands.push('npm run build')
  }
  if (backendModules.value.length) {
    commands.push('cd D:\\workspace\\vspicy\\vspicy-cloud')
    commands.push(`mvn -pl ${backendModules.value.join(',')} -am clean package -DskipTests`)
  }
  return commands
})

const restartCommands = computed(() => restartServices.value.map((name) => `重启 ${name}`))

const riskSummary = computed(() => {
  const levels = selectedPresets.value.map((item) => item.level)
  if (levels.includes('danger')) return { level: 'danger' as Level, text: '高风险：涉及网关、登录、鉴权、上传或多服务链路。' }
  if (levels.includes('warning')) return { level: 'warning' as Level, text: '中风险：涉及后端服务、权限、SQL 或跨服务接口。' }
  return { level: 'info' as Level, text: '低风险：当前主要是前端页面、菜单或样式变更。' }
})

const visiblePresets = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return presets.filter((item) => {
    const matchLevel = levelFilter.value === 'all' || item.level === levelFilter.value
    const matchKeyword = !q || [item.title, item.description, item.files.join(' '), item.notes.join(' ')].join(' ').toLowerCase().includes(q)
    return matchLevel && matchKeyword
  })
})

const checklist = computed(() => {
  const rows = [
    { title: '覆盖代码前备份当前工作目录', level: 'warning' as Level, done: false, detail: '至少备份 vspicy-ui/src、vspicy-cloud 对应模块和 application.yml。' },
    { title: '确认旧文件是否需要手动删除', level: 'danger' as Level, done: false, detail: 'Windows 解压覆盖不会删除压缩包里已经不存在的旧 Java/Vue 文件。' },
    { title: '执行构建命令', level: backendModules.value.length ? 'danger' as Level : 'warning' as Level, done: false, detail: buildCommands.value.join(' && ') || '当前没有构建命令。' },
    { title: '执行 SQL 脚本', level: requiredSqlItems.value.length ? 'danger' as Level : 'success' as Level, done: requiredSqlItems.value.length === 0, detail: requiredSqlItems.value.length ? requiredSqlItems.value.map((item) => item.file).join('；') : '本次无需 SQL。' },
    { title: '按影响服务重启', level: 'warning' as Level, done: false, detail: restartCommands.value.join('；') || '当前没有需要重启的服务。' },
    { title: '清理浏览器登录缓存并重新登录', level: selectedPresetIds.value.includes('authToken') || selectedPresetIds.value.includes('gatewayAuth') ? 'danger' as Level : 'info' as Level, done: false, detail: '涉及登录、Gateway、权限变更时必须清理 accessToken、refreshToken、permission_view。' },
    { title: '执行上线预检和接口契约检查', level: 'warning' as Level, done: false, detail: '建议访问 /admin/preflight-check、/admin/api-contract、/admin/request-trace 验证核心接口。' }
  ]
  return rows
})

function togglePreset(id: string) {
  if (selectedPresetIds.value.includes(id)) {
    selectedPresetIds.value = selectedPresetIds.value.filter((item) => item !== id)
    return
  }
  selectedPresetIds.value = [...selectedPresetIds.value, id]
}

function toggleSql(id: string) {
  if (selectedSqlIds.value.includes(id)) {
    selectedSqlIds.value = selectedSqlIds.value.filter((item) => item !== id)
    return
  }
  selectedSqlIds.value = [...selectedSqlIds.value, id]
}

function statusClass(level: Level | ProbeState) {
  return `status status-${level}`
}

function readTokenState() {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY) || ''
  const userId = localStorage.getItem(USER_ID_KEY) || ''
  return {
    hasToken: Boolean(token),
    tokenLength: token.length,
    userId,
    hasUserId: Boolean(userId)
  }
}

function snapshot() {
  return {
    generatedAt: new Date().toISOString(),
    risk: riskSummary.value,
    selectedPresets: selectedPresets.value.map((item) => ({ id: item.id, title: item.title })),
    affectedServices: affectedServices.value.map((item) => ({ id: item.id, module: item.module, restartName: item.restartName, port: item.port })),
    sql: requiredSqlItems.value.map((item) => ({ file: item.file, repeatable: item.repeatable, when: item.when })),
    buildCommands: buildCommands.value,
    restartCommands: restartCommands.value,
    checklist: checklist.value,
    tokenState: readTokenState(),
    probeResults: probeResults.value
  }
}

async function copySnapshot() {
  const text = JSON.stringify(snapshot(), null, 2)
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

function exportSnapshot() {
  const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `vspicy-deploy-checklist-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

async function probeService(service: ServiceItem) {
  if (!service.healthPath) {
    probeResults.value[service.id] = {
      serviceId: service.id,
      state: 'warning',
      message: '该服务没有配置可探测健康接口。',
      checkedAt: new Date().toLocaleString()
    }
    return
  }

  const start = performance.now()
  try {
    const response = await axios.get(service.healthPath, {
      baseURL: '',
      timeout: 8000,
      headers: getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : undefined,
      validateStatus: () => true
    }) as AxiosResponse
    const duration = Math.round(performance.now() - start)
    const contentType = String(response.headers?.['content-type'] || '')
    const isJson = contentType.includes('application/json') || typeof response.data === 'object'
    let state: ProbeState = 'success'
    let message = '接口可达。'

    if (response.status === 401) {
      state = 'warning'
      message = '接口返回 401：需要重新登录或 token 已过期。'
    } else if (response.status === 403) {
      state = 'danger'
      message = '接口返回 403：网关鉴权或权限码不满足。'
    } else if (response.status >= 500) {
      state = 'danger'
      message = '接口返回 5xx：目标服务或依赖组件异常。'
    } else if (response.status >= 400) {
      state = 'warning'
      message = '接口返回 4xx：路径、参数或鉴权策略需确认。'
    } else if (!isJson) {
      state = 'warning'
      message = '响应不是 JSON，可能没有进入预期后端接口。'
    }

    probeResults.value[service.id] = {
      serviceId: service.id,
      state,
      httpStatus: response.status,
      durationMs: duration,
      message,
      checkedAt: new Date().toLocaleString()
    }
  } catch (error) {
    const err = error as AxiosError
    probeResults.value[service.id] = {
      serviceId: service.id,
      state: 'danger',
      message: err.message || '接口探测失败。',
      checkedAt: new Date().toLocaleString()
    }
  }
}

async function probeAffectedServices() {
  probing.value = true
  try {
    for (const service of affectedServices.value.filter((item) => item.kind !== 'frontend')) {
      await probeService(service)
    }
  } finally {
    probing.value = false
  }
}
</script>

<template>
  <section class="page">
    <div class="hero panel">
      <div>
        <p class="eyebrow">Release / Deploy</p>
        <h1>部署清单中心</h1>
        <p class="muted">根据本次变更类型自动生成构建命令、SQL 清单、重启服务和上线验证步骤，减少“覆盖后忘记删旧文件、忘记重启服务、忘记执行权限 SQL”的问题。</p>
      </div>
      <div class="hero-actions">
        <button class="btn primary" :disabled="probing || affectedServices.length === 0" @click="probeAffectedServices">
          {{ probing ? '探测中...' : '探测影响服务' }}
        </button>
        <button class="btn" @click="copySnapshot">复制快照</button>
        <button class="btn" @click="exportSnapshot">导出 JSON</button>
      </div>
    </div>

    <div class="summary-grid">
      <article class="panel metric">
        <span>风险级别</span>
        <strong :class="statusClass(riskSummary.level)">{{ riskSummary.text }}</strong>
      </article>
      <article class="panel metric">
        <span>影响服务</span>
        <strong>{{ affectedServices.length }}</strong>
      </article>
      <article class="panel metric">
        <span>后端模块</span>
        <strong>{{ backendModules.length }}</strong>
      </article>
      <article class="panel metric">
        <span>SQL 脚本</span>
        <strong>{{ requiredSqlItems.length ? requiredSqlItems.length : '无需' }}</strong>
      </article>
    </div>

    <div class="layout">
      <div class="panel left">
        <div class="toolbar">
          <input v-model="keyword" class="input" placeholder="搜索变更类型、文件或说明" />
          <select v-model="levelFilter" class="input select">
            <option value="all">全部风险</option>
            <option value="info">低风险</option>
            <option value="warning">中风险</option>
            <option value="danger">高风险</option>
          </select>
        </div>

        <h2>变更类型</h2>
        <div class="preset-list">
          <button
            v-for="preset in visiblePresets"
            :key="preset.id"
            class="preset-card"
            :class="{ active: selectedPresetIds.includes(preset.id) }"
            @click="togglePreset(preset.id)"
          >
            <div class="preset-title">
              <span>{{ preset.title }}</span>
              <em :class="statusClass(preset.level)">{{ preset.level }}</em>
            </div>
            <p>{{ preset.description }}</p>
            <small>{{ preset.services.map(id => services.find(item => item.id === id)?.module || id).join(' / ') }}</small>
          </button>
        </div>

        <h2>SQL 补充选择</h2>
        <div class="sql-list">
          <label v-for="item in sqlItems" :key="item.id" class="check-row">
            <input type="checkbox" :checked="selectedSqlIds.includes(item.id)" @change="toggleSql(item.id)" />
            <span>
              <strong>{{ item.title }}</strong>
              <small>{{ item.file }} · {{ item.repeatable ? '可重复执行' : '谨慎重复执行' }}</small>
            </span>
          </label>
        </div>
      </div>

      <div class="right">
        <section class="panel">
          <h2>构建命令</h2>
          <pre class="code">{{ buildCommands.join('\n') || '当前未选择需要构建的模块' }}</pre>
        </section>

        <section class="panel">
          <h2>重启服务</h2>
          <div class="chips">
            <span v-for="item in restartServices" :key="item" class="chip">{{ item }}</span>
            <span v-if="restartServices.length === 0" class="muted">暂无</span>
          </div>
        </section>

        <section class="panel">
          <h2>SQL 清单</h2>
          <div v-if="requiredSqlItems.length" class="list">
            <article v-for="item in requiredSqlItems" :key="item.id" class="list-row">
              <strong>{{ item.file }}</strong>
              <span>{{ item.when }}</span>
              <em :class="statusClass(item.repeatable ? 'success' : 'warning')">{{ item.repeatable ? '可重复执行' : '需确认' }}</em>
            </article>
          </div>
          <p v-else class="muted">本次无需 SQL。</p>
        </section>

        <section class="panel">
          <h2>影响服务详情</h2>
          <div class="service-grid">
            <article v-for="service in affectedServices" :key="service.id" class="service-card">
              <div>
                <strong>{{ service.title }}</strong>
                <small>{{ service.module }} · {{ service.port || '-' }}</small>
              </div>
              <p>{{ service.description }}</p>
              <div class="service-footer">
                <span>{{ service.routePrefix || '/' }}</span>
                <button v-if="service.kind !== 'frontend'" class="link-btn" @click="probeService(service)">探测</button>
              </div>
              <div v-if="probeResults[service.id]" class="probe" :class="statusClass(probeResults[service.id].state)">
                {{ probeResults[service.id].httpStatus || '-' }} · {{ probeResults[service.id].durationMs || '-' }}ms · {{ probeResults[service.id].message }}
              </div>
            </article>
          </div>
        </section>

        <section class="panel">
          <h2>上线检查项</h2>
          <div class="list">
            <article v-for="item in checklist" :key="item.title" class="check-item">
              <span :class="statusClass(item.done ? 'success' : item.level)">{{ item.done ? 'PASS' : item.level }}</span>
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.detail }}</p>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
  color: #172033;
}

.panel {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.07);
  padding: 20px;
}

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 64, 175, 0.86));
  color: #fff;
}

.hero h1 {
  margin: 4px 0 8px;
  font-size: 30px;
}

.hero .muted {
  color: rgba(255, 255, 255, 0.74);
  max-width: 880px;
}

.eyebrow {
  margin: 0;
  color: rgba(191, 219, 254, 0.95);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.hero-actions,
.toolbar,
.chips,
.service-footer {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.btn,
.link-btn,
.preset-card {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.btn {
  border-radius: 12px;
  padding: 10px 14px;
  color: #0f172a;
  background: #fff;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.1);
}

.btn.primary {
  color: #fff;
  background: #2563eb;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.metric span {
  display: block;
  color: #64748b;
  font-size: 13px;
}

.metric strong {
  display: block;
  margin-top: 8px;
  font-size: 20px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(320px, 0.95fr) minmax(480px, 1.55fr);
  gap: 16px;
  align-items: start;
}

.left,
.right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

h2 {
  margin: 4px 0 12px;
  font-size: 18px;
}

.input {
  min-width: 160px;
  border: 1px solid #dbe3ef;
  border-radius: 12px;
  padding: 10px 12px;
  outline: none;
  background: #f8fafc;
}

.input:not(.select) {
  flex: 1;
}

.preset-list,
.sql-list,
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preset-card {
  width: 100%;
  text-align: left;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #f8fafc;
  padding: 14px;
}

.preset-card.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.preset-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-weight: 700;
}

.preset-card p,
.check-item p,
.service-card p {
  margin: 8px 0;
  color: #64748b;
  line-height: 1.6;
}

.preset-card small,
.service-card small,
.check-row small {
  display: block;
  color: #94a3b8;
}

.check-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  background: #f8fafc;
}

.status,
.chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
}

.status-info,
.chip {
  color: #1d4ed8;
  background: #dbeafe;
}

.status-success {
  color: #047857;
  background: #d1fae5;
}

.status-warning,
.status-pending {
  color: #b45309;
  background: #fef3c7;
}

.status-danger {
  color: #be123c;
  background: #ffe4e6;
}

.code {
  margin: 0;
  white-space: pre-wrap;
  border-radius: 14px;
  background: #0f172a;
  color: #dbeafe;
  padding: 14px;
  line-height: 1.7;
  overflow: auto;
}

.list-row,
.check-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
}

.list-row {
  justify-content: space-between;
}

.list-row span {
  flex: 1;
  color: #64748b;
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.service-card {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 14px;
  background: #f8fafc;
}

.link-btn {
  color: #2563eb;
  background: transparent;
  padding: 0;
}

.probe {
  margin-top: 10px;
  border-radius: 12px;
  padding: 8px 10px;
  line-height: 1.5;
}

.muted {
  color: #64748b;
}

@media (max-width: 1180px) {
  .layout,
  .summary-grid,
  .service-grid {
    grid-template-columns: 1fr;
  }

  .hero {
    flex-direction: column;
  }
}
</style>
