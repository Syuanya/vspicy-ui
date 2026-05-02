<script setup lang="ts">
import { computed, ref } from 'vue'
import { adminOpsMenuItems } from '../../config/adminOpsMenu'

type Level = 'success' | 'info' | 'warning' | 'danger'
type ServiceKind = 'frontend' | 'backend' | 'gateway' | 'common' | 'middleware'
type ImpactType = 'service' | 'permission' | 'sql' | 'config' | 'route' | 'cache'

type ServiceItem = {
  id: string
  title: string
  module: string
  kind: ServiceKind
  port?: number
  routePrefix?: string
  restartName: string
  buildCommand: string
  description: string
}

type Rule = {
  id: string
  title: string
  pattern: RegExp
  level: Level
  type: ImpactType
  services: string[]
  reason: string
  actions: string[]
}

type ImpactRow = {
  id: string
  title: string
  level: Level
  type: ImpactType
  services: string[]
  reason: string
  actions: string[]
  matchedFiles: string[]
}

type Preset = {
  id: string
  title: string
  files: string[]
}

const services: ServiceItem[] = [
  { id: 'ui', title: '前端应用', module: 'vspicy-ui', kind: 'frontend', port: 5173, routePrefix: '/', restartName: 'vspicy-ui', buildCommand: 'cd D:\\workspace\\vspicy\\vspicy-ui && npm install && npm run build', description: 'Vue 页面、路由、菜单、API 封装、样式与前端缓存。' },
  { id: 'gateway', title: '网关服务', module: 'vspicy-gateway', kind: 'gateway', port: 18080, routePrefix: '/api/**', restartName: 'vspicy-gateway', buildCommand: 'mvn -pl vspicy-gateway -am clean package -DskipTests', description: '路由转发、鉴权、白名单、跨服务入口。' },
  { id: 'auth', title: '认证服务', module: 'vspicy-auth', kind: 'backend', port: 18081, routePrefix: '/api/auth/**', restartName: 'vspicy-auth', buildCommand: 'mvn -pl vspicy-auth -am clean package -DskipTests', description: '登录、当前用户、JWT 签发和刷新。' },
  { id: 'admin', title: '后台管理服务', module: 'vspicy-admin', kind: 'backend', port: 18090, routePrefix: '/api/admin/**', restartName: 'vspicy-admin', buildCommand: 'mvn -pl vspicy-admin -am clean package -DskipTests', description: '后台权限、菜单、系统配置、字典、审计和诊断接口。' },
  { id: 'member', title: '会员服务', module: 'vspicy-member', kind: 'backend', port: 18092, routePrefix: '/api/members/**', restartName: 'vspicy-member', buildCommand: 'mvn -pl vspicy-member -am clean package -DskipTests', description: '会员套餐、用户会员、权益和额度。' },
  { id: 'notification', title: '通知服务', module: 'vspicy-notification', kind: 'backend', port: 18093, routePrefix: '/api/notifications/**', restartName: 'vspicy-notification', buildCommand: 'mvn -pl vspicy-notification -am clean package -DskipTests', description: '公告、站内信、未读数、模板和通知事件。' },
  { id: 'video', title: '视频服务', module: 'vspicy-video', kind: 'backend', port: 18084, routePrefix: '/api/videos/**', restartName: 'vspicy-video', buildCommand: 'mvn -pl vspicy-video -am clean package -DskipTests', description: '视频、上传、转码、HLS、播放和存储治理。' },
  { id: 'file', title: '文件服务', module: 'vspicy-file', kind: 'backend', port: 18083, routePrefix: '/api/files/**', restartName: 'vspicy-file', buildCommand: 'mvn -pl vspicy-file -am clean package -DskipTests', description: '文件上传、对象存储、预签名和文件元数据。' },
  { id: 'content', title: '内容服务', module: 'vspicy-content', kind: 'backend', port: 18085, routePrefix: '/api/articles/**', restartName: 'vspicy-content', buildCommand: 'mvn -pl vspicy-content -am clean package -DskipTests', description: '文章、内容审核、敏感词相关业务接口。' },
  { id: 'profile', title: '资料服务', module: 'vspicy-profile', kind: 'backend', port: 18086, routePrefix: '/api/profiles/**', restartName: 'vspicy-profile', buildCommand: 'mvn -pl vspicy-profile -am clean package -DskipTests', description: '用户资料、头像、资料审核。' },
  { id: 'interaction', title: '互动服务', module: 'vspicy-interaction', kind: 'backend', port: 18087, routePrefix: '/api/interactions/**', restartName: 'vspicy-interaction', buildCommand: 'mvn -pl vspicy-interaction -am clean package -DskipTests', description: '点赞、收藏、评论和互动统计。' },
  { id: 'recommend', title: '推荐服务', module: 'vspicy-recommend', kind: 'backend', port: 18088, routePrefix: '/api/recommend/**', restartName: 'vspicy-recommend', buildCommand: 'mvn -pl vspicy-recommend -am clean package -DskipTests', description: '推荐、热门内容和推荐特征。' },
  { id: 'dashboard', title: '看板服务', module: 'vspicy-dashboard', kind: 'backend', port: 18089, routePrefix: '/api/dashboard/**', restartName: 'vspicy-dashboard', buildCommand: 'mvn -pl vspicy-dashboard -am clean package -DskipTests', description: '统计看板、运营指标和趋势数据。' },
  { id: 'common', title: '公共模块', module: 'vspicy-common', kind: 'common', restartName: '所有依赖 common 的服务', buildCommand: 'mvn -pl vspicy-common -am clean package -DskipTests', description: '统一 Result、异常处理、公共 DTO、工具类和通用 Web 配置。' }
]

const rules: Rule[] = [
  { id: 'ui-view', title: '前端页面变更', pattern: /vspicy-ui[\\/]src[\\/]views[\\/].+\.vue$/i, level: 'info', type: 'service', services: ['ui'], reason: 'Vue 页面变更只影响前端运行包。', actions: ['重启 vspicy-ui', '执行 npm run build', '刷新浏览器缓存'] },
  { id: 'ui-router', title: '前端路由变更', pattern: /vspicy-ui[\\/]src[\\/]router[\\/]index\.ts$/i, level: 'warning', type: 'route', services: ['ui'], reason: '路由变更可能导致 404、权限守卫或重定向异常。', actions: ['重启 vspicy-ui', '访问 /admin/function-map 检查菜单和路由一致性', '验证 403/404 跳转'] },
  { id: 'ui-menu', title: '后台菜单变更', pattern: /vspicy-ui[\\/]src[\\/]config[\\/]adminOpsMenu\.ts$/i, level: 'warning', type: 'permission', services: ['ui', 'admin'], reason: '菜单变更通常需要和路由权限码、后台权限数据保持一致。', actions: ['重启 vspicy-ui', '检查权限码是否已入库', '重新登录刷新权限视图'] },
  { id: 'ui-api', title: '前端 API 封装变更', pattern: /vspicy-ui[\\/]src[\\/]api[\\/].+\.ts$/i, level: 'warning', type: 'route', services: ['ui', 'gateway'], reason: 'API 路径或拦截器变更会影响网关路由、登录态和统一响应处理。', actions: ['重启 vspicy-ui', '访问 /admin/request-trace 验证路径', '访问 /admin/api-contract 检查响应契约'] },
  { id: 'ui-permission-cache', title: '前端权限工具变更', pattern: /vspicy-ui[\\/]src[\\/]utils[\\/]permission\.ts$/i, level: 'danger', type: 'permission', services: ['ui', 'admin', 'gateway'], reason: '权限视图读取、缓存和 hasPermission 逻辑会影响后台所有受控页面。', actions: ['清理 vspicy_permission_view', '重新登录', '访问 /admin/permission-diagnostics'] },
  { id: 'gateway-main', title: '网关代码变更', pattern: /vspicy-cloud[\\/]vspicy-gateway[\\/]src[\\/]main[\\/].+/i, level: 'danger', type: 'route', services: ['gateway'], reason: '网关变更会影响所有 /api/** 请求链路和 401/403/404 行为。', actions: ['重启 vspicy-gateway', '清理旧 token 后重新登录', '访问 /admin/request-trace'] },
  { id: 'auth-main', title: '认证服务变更', pattern: /vspicy-cloud[\\/]vspicy-auth[\\/]src[\\/]main[\\/].+/i, level: 'danger', type: 'cache', services: ['auth', 'gateway', 'ui'], reason: '登录响应、JWT 字段或当前用户接口变更会影响登录态和网关鉴权。', actions: ['重启 vspicy-auth', '必要时重启 vspicy-gateway', '清理 accessToken/refreshToken 后重新登录'] },
  { id: 'admin-main', title: '后台管理服务变更', pattern: /vspicy-cloud[\\/]vspicy-admin[\\/]src[\\/]main[\\/].+/i, level: 'warning', type: 'permission', services: ['admin', 'gateway', 'ui'], reason: '后台接口通常涉及菜单、权限、配置、字典、诊断和审计能力。', actions: ['重启 vspicy-admin', '检查 /api/admin/health', '重新加载权限视图'] },
  { id: 'common-main', title: '公共模块变更', pattern: /vspicy-cloud[\\/]vspicy-common[\\/]src[\\/]main[\\/].+/i, level: 'danger', type: 'service', services: ['common', 'auth', 'admin', 'member', 'notification', 'video', 'file', 'content'], reason: '公共异常、Result、拦截器或工具类变更会影响多个微服务。', actions: ['重新编译所有受影响服务', '至少重启实际依赖 common 的服务', '重点验证统一响应和异常处理'] },
  { id: 'member-main', title: '会员服务变更', pattern: /vspicy-cloud[\\/]vspicy-member[\\/]src[\\/]main[\\/].+/i, level: 'warning', type: 'service', services: ['member', 'gateway', 'ui'], reason: '会员变更会影响个人中心、套餐、权益校验和上传额度链路。', actions: ['重启 vspicy-member', '验证 /api/members/plans', '验证 /api/members/me?userId=...'] },
  { id: 'notification-main', title: '通知服务变更', pattern: /vspicy-cloud[\\/]vspicy-notification[\\/]src[\\/]main[\\/].+/i, level: 'warning', type: 'service', services: ['notification', 'gateway', 'ui'], reason: '通知变更会影响未读数、公告、站内信和后台通知看板。', actions: ['重启 vspicy-notification', '验证 /api/notifications/unread-count', '确认 Redis/RocketMQ 状态'] },
  { id: 'video-main', title: '视频服务变更', pattern: /vspicy-cloud[\\/]vspicy-video[\\/]src[\\/]main[\\/].+/i, level: 'danger', type: 'service', services: ['video', 'gateway', 'ui'], reason: '视频服务涉及上传、转码、HLS、播放和存储治理，联动范围大。', actions: ['重启 vspicy-video', '验证上传、列表、播放链路', '确认 MinIO/FFmpeg/RocketMQ 可用'] },
  { id: 'file-main', title: '文件服务变更', pattern: /vspicy-cloud[\\/]vspicy-file[\\/]src[\\/]main[\\/].+/i, level: 'warning', type: 'service', services: ['file', 'gateway', 'ui'], reason: '文件服务变更会影响上传、对象存储和预签名 URL。', actions: ['重启 vspicy-file', '验证 /api/files/health', '确认 MinIO 配置'] },
  { id: 'content-main', title: '内容服务变更', pattern: /vspicy-cloud[\\/]vspicy-content[\\/]src[\\/]main[\\/].+/i, level: 'warning', type: 'service', services: ['content', 'gateway', 'ui'], reason: '内容服务变更会影响文章、审核和敏感词链路。', actions: ['重启 vspicy-content', '验证文章列表和详情', '验证后台内容管理页面'] },
  { id: 'config-yml', title: '服务配置变更', pattern: /vspicy-cloud[\\/].+[\\/]src[\\/]main[\\/]resources[\\/]application.*\.ya?ml$/i, level: 'danger', type: 'config', services: ['gateway'], reason: '端口、路径、请求头限制、数据源、中间件或路由配置变更必须重启对应服务。', actions: ['重启配置文件所属服务', '检查端口和健康接口', '查看启动日志是否读取到新配置'] },
  { id: 'sql-change', title: '数据库脚本变更', pattern: /vspicy-cloud[\\/]scripts[\\/]sql[\\/].+\.sql$/i, level: 'danger', type: 'sql', services: ['admin'], reason: 'SQL 变更可能涉及表结构、权限初始化、菜单和业务数据。', actions: ['确认 SQL 是否可重复执行', '先备份数据库', '执行后重启相关服务或重新登录刷新权限'] },
  { id: 'pom-change', title: 'Maven 构建配置变更', pattern: /vspicy-cloud[\\/].*pom\.xml$/i, level: 'warning', type: 'service', services: ['common'], reason: '依赖、插件或模块关系变化会影响后端编译和运行时依赖。', actions: ['执行 mvn clean package -DskipTests', '确认依赖冲突', '重启受影响后端服务'] },
  { id: 'package-change', title: '前端依赖变更', pattern: /vspicy-ui[\\/](package\.json|package-lock\.json|pnpm-lock\.yaml|vite\.config\.ts)$/i, level: 'warning', type: 'config', services: ['ui'], reason: '前端依赖、构建配置或 Vite 代理变化会影响本地开发和接口转发。', actions: ['重新 npm install', '重启 vspicy-ui', '验证 /api 代理是否指向 Gateway'] }
]

const presets: Preset[] = [
  { id: 'frontend-diagnostic', title: '新增后台诊断页面', files: ['vspicy-ui/src/views/admin/AdminExample.vue', 'vspicy-ui/src/router/index.ts', 'vspicy-ui/src/config/adminOpsMenu.ts'] },
  { id: 'login-token', title: '调整登录/JWT/token', files: ['vspicy-cloud/vspicy-auth/src/main/java/com/vspicy/auth/service/AuthJwtTokenService.java', 'vspicy-cloud/vspicy-gateway/src/main/java/com/vspicy/gateway/security/GatewayAuthFilter.java', 'vspicy-ui/src/api/http.ts', 'vspicy-ui/src/api/auth.ts'] },
  { id: 'member-center', title: '修改会员与个人中心', files: ['vspicy-cloud/vspicy-member/src/main/java/com/vspicy/member/controller/MemberController.java', 'vspicy-ui/src/views/UserCenter.vue', 'vspicy-ui/src/api/member.ts'] },
  { id: 'notification', title: '修改通知/公告/未读数', files: ['vspicy-cloud/vspicy-notification/src/main/java/com/vspicy/notification/controller/NotificationController.java', 'vspicy-ui/src/api/notification.ts', 'vspicy-ui/src/views/admin/NotificationOverview.vue'] },
  { id: 'sql-permission', title: '新增后台权限 SQL', files: ['vspicy-cloud/scripts/sql/20260502_new_permission.sql', 'vspicy-ui/src/config/adminOpsMenu.ts'] },
  { id: 'common-exception', title: '调整公共异常处理', files: ['vspicy-cloud/vspicy-common/src/main/java/com/vspicy/common/web/GlobalExceptionHandler.java'] }
]

const changedFilesText = ref('vspicy-ui/src/views/admin/AdminChangeImpact.vue\nvspicy-ui/src/router/index.ts\nvspicy-ui/src/config/adminOpsMenu.ts')
const keyword = ref('')
const typeFilter = ref<'all' | ImpactType>('all')
const levelFilter = ref<'all' | Level>('all')
const copied = ref(false)

const changedFiles = computed(() => normalizeFiles(changedFilesText.value))

const impacts = computed<ImpactRow[]>(() => {
  return rules
    .map((rule) => {
      const matchedFiles = changedFiles.value.filter((file) => rule.pattern.test(file))
      if (!matchedFiles.length) return null
      return {
        id: rule.id,
        title: rule.title,
        level: rule.level,
        type: rule.type,
        services: rule.services,
        reason: rule.reason,
        actions: rule.actions,
        matchedFiles
      }
    })
    .filter((item): item is ImpactRow => Boolean(item))
})

const unmatchedFiles = computed(() => changedFiles.value.filter((file) => !rules.some((rule) => rule.pattern.test(file))))

const visibleImpacts = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return impacts.value.filter((item) => {
    const matchLevel = levelFilter.value === 'all' || item.level === levelFilter.value
    const matchType = typeFilter.value === 'all' || item.type === typeFilter.value
    const haystack = [item.title, item.reason, item.type, item.services.join(' '), item.actions.join(' '), item.matchedFiles.join(' ')].join(' ').toLowerCase()
    const matchKeyword = !q || haystack.includes(q)
    return matchLevel && matchType && matchKeyword
  })
})

const affectedServiceIds = computed(() => unique(impacts.value.flatMap((item) => item.services)))
const affectedServices = computed(() => services.filter((service) => affectedServiceIds.value.includes(service.id)))
const backendModules = computed(() => affectedServices.value.filter((service) => service.kind === 'backend' || service.kind === 'gateway').map((service) => service.module))
const restartList = computed(() => affectedServices.value.map((service) => service.restartName))

const summary = computed(() => {
  const levels = impacts.value.map((item) => item.level)
  const danger = levels.filter((level) => level === 'danger').length
  const warning = levels.filter((level) => level === 'warning').length
  const info = levels.filter((level) => level === 'info').length
  const success = levels.filter((level) => level === 'success').length
  const topLevel: Level = danger ? 'danger' : warning ? 'warning' : info ? 'info' : 'success'
  return {
    topLevel,
    text: danger ? '高风险：包含网关、认证、公共模块、SQL、视频链路或服务配置变更。' : warning ? '中风险：涉及 API、权限、服务重启或配置同步。' : impacts.value.length ? '低风险：主要影响前端页面或局部功能。' : '未命中规则：需要人工确认影响范围。',
    danger,
    warning,
    info,
    success
  }
})

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
  if (affectedServiceIds.value.includes('common')) {
    commands.push('cd D:\\workspace\\vspicy\\vspicy-cloud')
    commands.push('mvn clean package -DskipTests')
  }
  return unique(commands)
})

const releaseChecklist = computed(() => {
  const rows = [
    { title: '备份当前工作目录', level: 'warning' as Level, detail: '覆盖 zip 前先备份 src、application.yml 和 scripts/sql。' },
    { title: '处理旧文件残留', level: 'danger' as Level, detail: 'Windows 解压覆盖不会删除旧文件，删除类/页面时必须额外执行删除脚本。' },
    { title: '执行构建', level: buildCommands.value.length ? 'warning' as Level : 'info' as Level, detail: buildCommands.value.join(' && ') || '当前规则没有生成构建命令。' },
    { title: '执行 SQL', level: impacts.value.some((item) => item.type === 'sql' || item.type === 'permission') ? 'danger' as Level : 'success' as Level, detail: impacts.value.some((item) => item.type === 'sql') ? '先确认 SQL 可重复执行，再按文件顺序执行。' : '本次未直接命中 SQL 文件。' },
    { title: '重启服务', level: restartList.value.length ? 'warning' as Level : 'info' as Level, detail: restartList.value.join('；') || '当前未识别出需要重启的服务。' },
    { title: '清理客户端缓存', level: impacts.value.some((item) => item.type === 'cache' || item.type === 'permission') ? 'danger' as Level : 'info' as Level, detail: '涉及登录、权限、网关时清理 accessToken、refreshToken、permission_view 后重新登录。' },
    { title: '执行诊断页面验证', level: 'warning' as Level, detail: '建议依次访问 /admin/request-trace、/admin/api-contract、/admin/preflight-check。' }
  ]
  return rows
})

const relatedMenuItems = computed(() => {
  const q = changedFiles.value.join(' ').toLowerCase()
  return adminOpsMenuItems.filter((item) => {
    const text = [item.title, item.description, item.path, item.permission, item.group].join(' ').toLowerCase()
    return q.includes(item.path.replace('/admin/', '').toLowerCase()) || text.includes(keyword.value.trim().toLowerCase())
  }).slice(0, 10)
})

function normalizeFiles(text: string) {
  return text
    .split(/\r?\n|,|;/)
    .map((item) => item.trim().replace(/^['"]|['"]$/g, '').replace(/\\/g, '/'))
    .filter(Boolean)
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items))
}

function applyPreset(preset: Preset) {
  changedFilesText.value = preset.files.join('\n')
}

function addCurrentFeatureExample() {
  const existing = new Set(changedFiles.value)
  const next = ['vspicy-ui/src/views/admin/AdminChangeImpact.vue', 'vspicy-ui/src/router/index.ts', 'vspicy-ui/src/config/adminOpsMenu.ts']
  changedFilesText.value = unique([...Array.from(existing), ...next]).join('\n')
}

function clearFiles() {
  changedFilesText.value = ''
}

function statusClass(level: Level) {
  return `status ${level === 'success' ? 'ok' : level === 'warning' ? 'warn' : level === 'danger' ? 'danger' : ''}`
}

function typeLabel(type: ImpactType) {
  const labels: Record<ImpactType, string> = {
    service: '服务',
    permission: '权限',
    sql: 'SQL',
    config: '配置',
    route: '路由',
    cache: '缓存'
  }
  return labels[type]
}

function serviceLabel(id: string) {
  return services.find((service) => service.id === id)?.title || id
}

function exportSnapshot() {
  const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `vspicy-change-impact-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

async function copySnapshot() {
  await navigator.clipboard.writeText(JSON.stringify(snapshot(), null, 2))
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 1500)
}

function snapshot() {
  return {
    checkedAt: new Date().toISOString(),
    changedFiles: changedFiles.value,
    summary: summary.value,
    impacts: impacts.value,
    unmatchedFiles: unmatchedFiles.value,
    affectedServices: affectedServices.value,
    buildCommands: buildCommands.value,
    restartList: restartList.value,
    checklist: releaseChecklist.value
  }
}
</script>

<template>
  <section class="change-impact-page">
    <div class="page-hero">
      <div>
        <p class="eyebrow">System Governance</p>
        <h1>变更影响分析中心</h1>
        <p>输入本次改动文件，自动判断影响服务、构建命令、重启范围、SQL 风险和上线验证步骤。</p>
      </div>
      <div class="hero-actions">
        <button type="button" @click="addCurrentFeatureExample">填入当前功能文件</button>
        <button type="button" @click="copySnapshot">{{ copied ? '已复制' : '复制快照' }}</button>
        <button type="button" @click="exportSnapshot">导出 JSON</button>
      </div>
    </div>

    <div class="metric-grid">
      <div class="metric-card" :class="summary.topLevel">
        <span>风险等级</span>
        <strong>{{ summary.topLevel.toUpperCase() }}</strong>
        <small>{{ summary.text }}</small>
      </div>
      <div class="metric-card warning">
        <span>命中规则</span>
        <strong>{{ impacts.length }}</strong>
        <small>高危 {{ summary.danger }} / 警告 {{ summary.warning }}</small>
      </div>
      <div class="metric-card success">
        <span>影响服务</span>
        <strong>{{ affectedServices.length }}</strong>
        <small>{{ restartList.length ? restartList.join('、') : '暂无' }}</small>
      </div>
      <div class="metric-card info">
        <span>未匹配文件</span>
        <strong>{{ unmatchedFiles.length }}</strong>
        <small>未命中规则的文件需要人工确认</small>
      </div>
    </div>

    <div class="panel input-panel">
      <div class="panel-title">
        <div>
          <h2>变更文件</h2>
          <p>支持一行一个路径，也支持逗号或分号分隔。路径可以使用 Windows 反斜杠。</p>
        </div>
        <button type="button" class="secondary" @click="clearFiles">清空</button>
      </div>
      <textarea v-model="changedFilesText" spellcheck="false" placeholder="例如：vspicy-ui/src/views/admin/AdminExample.vue" />
      <div class="preset-row">
        <button v-for="preset in presets" :key="preset.id" type="button" @click="applyPreset(preset)">{{ preset.title }}</button>
      </div>
    </div>

    <div class="toolbar">
      <input v-model="keyword" placeholder="搜索规则、服务、路径、动作" />
      <select v-model="levelFilter">
        <option value="all">全部风险</option>
        <option value="danger">高风险</option>
        <option value="warning">中风险</option>
        <option value="info">低风险</option>
        <option value="success">通过</option>
      </select>
      <select v-model="typeFilter">
        <option value="all">全部类型</option>
        <option value="service">服务</option>
        <option value="permission">权限</option>
        <option value="sql">SQL</option>
        <option value="config">配置</option>
        <option value="route">路由</option>
        <option value="cache">缓存</option>
      </select>
    </div>

    <div class="content-grid">
      <div class="panel">
        <div class="panel-title">
          <div>
            <h2>影响规则</h2>
            <p>按文件路径匹配规则，生成具体处理动作。</p>
          </div>
        </div>
        <div v-if="!visibleImpacts.length" class="empty">没有命中规则。请检查路径是否包含 vspicy-ui 或 vspicy-cloud。</div>
        <div v-else class="impact-list">
          <article v-for="item in visibleImpacts" :key="item.id" class="impact-card">
            <header>
              <div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.reason }}</p>
              </div>
              <div class="tag-stack">
                <span :class="statusClass(item.level)">{{ item.level }}</span>
                <span class="pill">{{ typeLabel(item.type) }}</span>
              </div>
            </header>
            <div class="file-list">
              <code v-for="file in item.matchedFiles" :key="file">{{ file }}</code>
            </div>
            <div class="service-tags">
              <span v-for="service in item.services" :key="service">{{ serviceLabel(service) }}</span>
            </div>
            <ul>
              <li v-for="action in item.actions" :key="action">{{ action }}</li>
            </ul>
          </article>
        </div>
      </div>

      <aside class="side-stack">
        <div class="panel">
          <h2>构建命令</h2>
          <div v-if="!buildCommands.length" class="empty compact">暂无构建命令。</div>
          <pre v-else>{{ buildCommands.join('\n') }}</pre>
        </div>

        <div class="panel">
          <h2>重启服务</h2>
          <div v-if="!restartList.length" class="empty compact">暂无需要重启的服务。</div>
          <div v-else class="restart-list">
            <span v-for="item in restartList" :key="item">{{ item }}</span>
          </div>
        </div>

        <div class="panel">
          <h2>上线检查</h2>
          <ul class="check-list">
            <li v-for="item in releaseChecklist" :key="item.title">
              <span :class="statusClass(item.level)">{{ item.level }}</span>
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.detail }}</p>
              </div>
            </li>
          </ul>
        </div>
      </aside>
    </div>

    <div class="panel">
      <div class="panel-title">
        <div>
          <h2>影响服务详情</h2>
          <p>用于确认端口、路由前缀、模块名和编译范围。</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>服务</th>
              <th>模块</th>
              <th>端口</th>
              <th>路由</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="service in affectedServices" :key="service.id">
              <td>{{ service.title }}</td>
              <td><code>{{ service.module }}</code></td>
              <td>{{ service.port || '-' }}</td>
              <td><code>{{ service.routePrefix || '-' }}</code></td>
              <td>{{ service.description }}</td>
            </tr>
            <tr v-if="!affectedServices.length">
              <td colspan="5" class="empty">暂无影响服务。</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="unmatchedFiles.length" class="panel warning-panel">
      <h2>未匹配文件</h2>
      <p>这些文件没有命中内置规则，建议人工确认是否影响构建、重启或 SQL。</p>
      <div class="file-list">
        <code v-for="file in unmatchedFiles" :key="file">{{ file }}</code>
      </div>
    </div>

    <div v-if="relatedMenuItems.length" class="panel">
      <h2>相关后台菜单</h2>
      <div class="menu-grid">
        <div v-for="item in relatedMenuItems" :key="item.path" class="menu-card">
          <strong>{{ item.title }}</strong>
          <span>{{ item.path }}</span>
          <code>{{ item.permission }}</code>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.change-impact-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-hero,
.panel,
.metric-card {
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
}

.page-hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
  background: linear-gradient(135deg, #eff6ff 0%, #ffffff 52%, #f8fafc 100%);
}

.page-hero h1 {
  margin: 4px 0 8px;
  font-size: 28px;
}

.page-hero p {
  margin: 0;
  color: #64748b;
}

.eyebrow {
  color: #2563eb !important;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.hero-actions,
.preset-row,
.service-tags,
.restart-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

button,
select,
input,
textarea {
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #fff;
  color: #0f172a;
  font: inherit;
}

button {
  cursor: pointer;
  padding: 10px 14px;
  font-weight: 800;
}

button:hover {
  border-color: #2563eb;
  color: #1d4ed8;
}

button.secondary {
  background: #f8fafc;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  padding: 18px;
}

.metric-card span,
.metric-card small {
  color: #64748b;
}

.metric-card strong {
  display: block;
  margin: 10px 0;
  font-size: 28px;
}

.metric-card.danger strong { color: #dc2626; }
.metric-card.warning strong { color: #d97706; }
.metric-card.success strong { color: #16a34a; }
.metric-card.info strong { color: #2563eb; }

.panel {
  padding: 18px;
}

.panel h2,
.panel h3 {
  margin: 0;
}

.panel-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.panel-title p,
.impact-card p,
.check-list p,
.warning-panel p {
  margin: 6px 0 0;
  color: #64748b;
}

textarea {
  width: 100%;
  min-height: 140px;
  padding: 14px;
  line-height: 1.6;
  resize: vertical;
  box-sizing: border-box;
}

.preset-row {
  margin-top: 12px;
}

.toolbar {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 180px 180px;
  gap: 12px;
}

.toolbar input,
.toolbar select {
  padding: 11px 12px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 18px;
  align-items: start;
}

.side-stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.impact-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.impact-card {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
  background: #f8fafc;
}

.impact-card header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.tag-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
}

code,
pre {
  border-radius: 10px;
  background: #0f172a;
  color: #e2e8f0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

code {
  padding: 4px 8px;
  word-break: break-all;
}

pre {
  overflow: auto;
  padding: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.service-tags span,
.restart-list span {
  border-radius: 999px;
  background: #e0f2fe;
  color: #0369a1;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 900;
}

.check-list,
.impact-card ul {
  margin: 12px 0 0;
  padding-left: 18px;
}

.check-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
  list-style: none;
}

.check-list li {
  display: grid;
  grid-template-columns: 74px 1fr;
  gap: 10px;
  align-items: start;
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
  border-bottom: 1px solid #e2e8f0;
  padding: 12px;
  text-align: left;
  vertical-align: top;
}

th {
  color: #475569;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .06em;
}

.empty {
  color: #64748b;
  padding: 18px;
  text-align: center;
}

.empty.compact {
  padding: 8px 0;
  text-align: left;
}

.warning-panel {
  border-color: #facc15;
  background: #fffbeb;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.menu-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 14px;
  background: #f8fafc;
}

.menu-card span {
  color: #64748b;
}

@media (max-width: 1100px) {
  .metric-grid,
  .content-grid,
  .toolbar {
    grid-template-columns: 1fr;
  }

  .page-hero {
    flex-direction: column;
  }
}
</style>
