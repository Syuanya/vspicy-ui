<script setup lang="ts">
import { computed, ref } from 'vue'

type Level = 'success' | 'info' | 'warning' | 'danger'
type ServiceCategory = 'gateway' | 'business' | 'ops' | 'frontend'
type OperationType = 'build' | 'restart' | 'health' | 'logs' | 'stop' | 'frontend'

type ServiceItem = {
  id: string
  name: string
  module: string
  port: number
  category: ServiceCategory
  route: string
  healthPath: string
  dependencies: string[]
  description: string
}

type CommandBlock = {
  id: string
  title: string
  level: Level
  description: string
  commands: string[]
}

const workspace = ref('D:\\workspace\\vspicy')
const keyword = ref('')
const selectedOperation = ref<OperationType>('health')
const selectedServiceIds = ref<string[]>(['vspicy-gateway', 'vspicy-auth', 'vspicy-admin', 'vspicy-member', 'vspicy-notification'])
const copiedId = ref('')

const services: ServiceItem[] = [
  { id: 'vspicy-gateway', name: '网关服务', module: 'vspicy-gateway', port: 18080, category: 'gateway', route: '/api/**', healthPath: '/actuator/health', dependencies: ['Auth', '所有业务服务'], description: '统一入口、路由转发、JWT 解析和权限网关。' },
  { id: 'vspicy-auth', name: '认证服务', module: 'vspicy-auth', port: 18081, category: 'business', route: '/api/auth/**', healthPath: '/api/auth/health', dependencies: ['MySQL', 'Redis'], description: '登录、JWT、当前用户和权限视图基础能力。' },
  { id: 'vspicy-user', name: '用户服务', module: 'vspicy-user', port: 18082, category: 'business', route: '/api/users/**', healthPath: '/api/users/health', dependencies: ['MySQL'], description: '用户资料、账号基础信息和用户查询。' },
  { id: 'vspicy-file', name: '文件服务', module: 'vspicy-file', port: 18083, category: 'business', route: '/api/files/**', healthPath: '/api/files/health', dependencies: ['MinIO'], description: '文件上传、对象存储和文件元数据。' },
  { id: 'vspicy-video', name: '视频服务', module: 'vspicy-video', port: 18084, category: 'business', route: '/api/videos/**', healthPath: '/api/videos/health', dependencies: ['MySQL', 'MinIO', 'FFmpeg', 'RocketMQ'], description: '视频上传、转码、播放、HLS 和存储运维。' },
  { id: 'vspicy-content', name: '内容服务', module: 'vspicy-content', port: 18085, category: 'business', route: '/api/articles/**', healthPath: '/api/articles/health', dependencies: ['MySQL'], description: '文章、内容管理和内容审核基础接口。' },
  { id: 'vspicy-interaction', name: '互动服务', module: 'vspicy-interaction', port: 18086, category: 'business', route: '/api/interactions/**', healthPath: '/api/interactions/health', dependencies: ['MySQL', 'Redis'], description: '点赞、收藏、评论和互动计数。' },
  { id: 'vspicy-recommend', name: '推荐服务', module: 'vspicy-recommend', port: 18087, category: 'business', route: '/api/recommend/**', healthPath: '/api/recommend/health', dependencies: ['MySQL', 'Redis'], description: '推荐流、热门内容和个性化推荐。' },
  { id: 'vspicy-profile', name: '资料服务', module: 'vspicy-profile', port: 18088, category: 'business', route: '/api/profiles/**', healthPath: '/api/profiles/health', dependencies: ['MySQL'], description: '用户资料、头像、简介和资料审核。' },
  { id: 'vspicy-dashboard', name: '看板服务', module: 'vspicy-dashboard', port: 18089, category: 'ops', route: '/api/dashboard/**', healthPath: '/api/dashboard/health', dependencies: ['MySQL'], description: '数据看板、统计指标和运营聚合。' },
  { id: 'vspicy-admin', name: '后台服务', module: 'vspicy-admin', port: 18090, category: 'ops', route: '/api/admin/**', healthPath: '/api/admin/health', dependencies: ['MySQL', 'Redis'], description: '后台管理、权限、菜单、字典、配置和系统运维。' },
  { id: 'vspicy-notification', name: '通知服务', module: 'vspicy-notification', port: 18091, category: 'business', route: '/api/notifications/**', healthPath: '/api/notifications/health', dependencies: ['MySQL', 'Redis', 'RocketMQ'], description: '站内信、公告、模板、事件投递和未读数。' },
  { id: 'vspicy-member', name: '会员服务', module: 'vspicy-member', port: 18092, category: 'business', route: '/api/members/**', healthPath: '/api/members/health', dependencies: ['MySQL'], description: '会员套餐、权益、个人中心会员信息和上传/播放权益校验。' }
]

const operations = [
  { value: 'health', label: '健康探测', level: 'success' as Level, description: '生成 Gateway 和直连服务健康接口 curl。' },
  { value: 'build', label: '后端编译', level: 'info' as Level, description: '生成 Maven -pl 精确模块编译命令。' },
  { value: 'restart', label: '后端重启', level: 'warning' as Level, description: '生成本地 jar 启动/重启参考命令。' },
  { value: 'logs', label: '端口和日志', level: 'warning' as Level, description: '生成端口占用、进程排查和运行日志定位命令。' },
  { value: 'stop', label: '停止端口进程', level: 'danger' as Level, description: '按端口生成 PowerShell 停止命令，执行前需确认进程。' },
  { value: 'frontend', label: '前端开发服务', level: 'info' as Level, description: '生成 vspicy-ui 安装、构建、启动和缓存清理命令。' }
]

const filteredServices = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return services
  return services.filter((item) => [
    item.id,
    item.name,
    item.module,
    item.route,
    item.port,
    item.dependencies.join(','),
    item.description
  ].join(' ').toLowerCase().includes(q))
})

const selectedServices = computed(() => services.filter((item) => selectedServiceIds.value.includes(item.id)))

const operationMeta = computed(() => operations.find((item) => item.value === selectedOperation.value) || operations[0])

const summary = computed(() => {
  const selected = selectedServices.value
  const ports = selected.map((item) => item.port)
  const deps = Array.from(new Set(selected.flatMap((item) => item.dependencies)))
  return [
    { label: '选中服务', value: String(selected.length), level: selected.length ? 'success' : 'danger' as Level },
    { label: '端口范围', value: ports.length ? ports.join(' / ') : '未选择', level: ports.length ? 'info' : 'warning' as Level },
    { label: '依赖组件', value: deps.length ? deps.join('、') : '无', level: 'warning' as Level },
    { label: '操作类型', value: operationMeta.value.label, level: operationMeta.value.level }
  ]
})

const commandBlocks = computed<CommandBlock[]>(() => {
  const selected = selectedServices.value
  const root = workspace.value.trim() || 'D:\\workspace\\vspicy'
  const cloud = `${root}\\vspicy-cloud`
  const ui = `${root}\\vspicy-ui`
  if (selectedOperation.value === 'frontend') {
    return [
      {
        id: 'frontend-dev',
        title: '前端安装与启动',
        level: 'info',
        description: '适用于只改 Vue 页面、路由、菜单、样式、API 封装的场景。',
        commands: [
          `cd ${ui}`,
          'npm install',
          'npm run dev'
        ]
      },
      {
        id: 'frontend-build',
        title: '前端构建验证',
        level: 'success',
        description: '用于覆盖文件后检查 TypeScript、路由引用和生产构建。',
        commands: [
          `cd ${ui}`,
          'npm run build'
        ]
      },
      {
        id: 'frontend-cache',
        title: '浏览器缓存清理',
        level: 'warning',
        description: '适用于 token、权限缓存、菜单缓存或 401/403 状态异常时。',
        commands: [
          "localStorage.removeItem('vspicy_access_token')",
          "localStorage.removeItem('vspicy_refresh_token')",
          "localStorage.removeItem('vspicy_user_id')",
          "localStorage.removeItem('vspicy_permission_view')",
          'location.reload()'
        ]
      }
    ]
  }

  if (!selected.length) {
    return [{ id: 'empty', title: '未选择服务', level: 'danger', description: '请至少选择一个服务后生成命令。', commands: ['# 未选择服务'] }]
  }

  const modules = selected.map((item) => item.module).join(',')
  if (selectedOperation.value === 'build') {
    return [{
      id: 'maven-build',
      title: 'Maven 精确模块编译',
      level: 'info',
      description: '-am 会同时编译被选模块依赖的公共模块，适合本地增量验证。',
      commands: [
        `cd ${cloud}`,
        `mvn -pl ${modules} -am clean package -DskipTests`
      ]
    }]
  }

  if (selectedOperation.value === 'health') {
    return [
      {
        id: 'gateway-health',
        title: '经 Gateway 探测',
        level: 'success',
        description: '优先用 18080 验证路由、代理和鉴权链路。',
        commands: selected.map((item) => `curl http://localhost:18080${item.healthPath}`)
      },
      {
        id: 'direct-health',
        title: '直连服务探测',
        level: 'info',
        description: '用于区分服务本身异常还是 Gateway 路由异常。',
        commands: selected.map((item) => `curl http://localhost:${item.port}${item.healthPath}`)
      }
    ]
  }

  if (selectedOperation.value === 'restart') {
    return selected.map((item) => ({
      id: `restart-${item.id}`,
      title: `启动 ${item.name}`,
      level: 'warning',
      description: `本地 jar 启动参考；如果使用 IDEA Run Configuration，重启 ${item.module} 即可。`,
      commands: [
        `cd ${cloud}`,
        `$env:SPRING_PROFILES_ACTIVE = 'local'`,
        `java -jar .\\${item.module}\\target\\${item.module}-*.jar`
      ]
    }))
  }

  if (selectedOperation.value === 'logs') {
    return selected.map((item) => ({
      id: `logs-${item.id}`,
      title: `${item.name} 端口与日志排查`,
      level: 'warning',
      description: `用于确认 ${item.port} 端口是否被占用，以及请求是否真正打到该服务。`,
      commands: [
        `netstat -ano | findstr :${item.port}`,
        `curl http://localhost:${item.port}${item.healthPath}`,
        `# IDEA 控制台搜索关键字：${item.module} / ERROR / WARN / traceId`
      ]
    }))
  }

  return selected.map((item) => ({
    id: `stop-${item.id}`,
    title: `停止 ${item.name} 端口进程`,
    level: 'danger',
    description: `会终止占用 ${item.port} 的进程。执行前必须确认 PID 属于 ${item.module}。`,
    commands: [
      `$pid = (Get-NetTCPConnection -LocalPort ${item.port} -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1`,
      'if ($pid) { Get-Process -Id $pid }',
      'if ($pid) { Stop-Process -Id $pid -Force }'
    ]
  }))
})

const exportPayload = computed(() => ({
  generatedAt: new Date().toISOString(),
  workspace: workspace.value,
  operation: selectedOperation.value,
  selectedServices: selectedServices.value.map((item) => ({
    id: item.id,
    module: item.module,
    port: item.port,
    route: item.route,
    healthPath: item.healthPath
  })),
  commands: commandBlocks.value
}))

function toggleAllVisible(checked: boolean) {
  const visible = filteredServices.value.map((item) => item.id)
  if (checked) {
    selectedServiceIds.value = Array.from(new Set([...selectedServiceIds.value, ...visible]))
  } else {
    selectedServiceIds.value = selectedServiceIds.value.filter((id) => !visible.includes(id))
  }
}

function selectPreset(type: 'core' | 'user-center' | 'video' | 'all') {
  if (type === 'core') selectedServiceIds.value = ['vspicy-gateway', 'vspicy-auth', 'vspicy-admin']
  if (type === 'user-center') selectedServiceIds.value = ['vspicy-gateway', 'vspicy-auth', 'vspicy-member', 'vspicy-notification', 'vspicy-video']
  if (type === 'video') selectedServiceIds.value = ['vspicy-gateway', 'vspicy-video', 'vspicy-file', 'vspicy-member', 'vspicy-notification']
  if (type === 'all') selectedServiceIds.value = services.map((item) => item.id)
}

async function copyBlock(block: CommandBlock) {
  copiedId.value = block.id
  await copyText(block.commands.join('\n'))
  window.setTimeout(() => {
    if (copiedId.value === block.id) copiedId.value = ''
  }, 1200)
}

async function copyAll() {
  copiedId.value = 'all'
  const text = commandBlocks.value
    .map((block) => [`# ${block.title}`, ...block.commands].join('\n'))
    .join('\n\n')
  await copyText(text)
  window.setTimeout(() => {
    if (copiedId.value === 'all') copiedId.value = ''
  }, 1200)
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(exportPayload.value, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vspicy-ops-commands-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}
</script>

<template>
  <section class="ops-command-page">
    <div class="page-hero">
      <div>
        <p class="eyebrow">Diagnostics · Commands</p>
        <h1>运维命令中心</h1>
        <p>统一生成 vspicy 本地开发、编译、健康探测、端口排查和服务重启命令，减少手工拼错服务名、端口和路径。</p>
      </div>
      <div class="hero-actions">
        <button class="primary-btn" @click="copyAll">{{ copiedId === 'all' ? '已复制' : '复制全部命令' }}</button>
        <button class="ghost-btn" @click="downloadJson">导出 JSON</button>
      </div>
    </div>

    <div class="summary-grid">
      <article v-for="item in summary" :key="item.label" class="summary-card" :class="`level-${item.level}`">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </div>

    <div class="content-grid">
      <section class="panel">
        <div class="panel-title">
          <div>
            <h2>命令条件</h2>
            <p>选择操作类型、服务范围和本地工作目录。</p>
          </div>
        </div>

        <label class="field-block">
          <span>本地项目目录</span>
          <input v-model="workspace" placeholder="D:\workspace\vspicy" />
        </label>

        <label class="field-block">
          <span>操作类型</span>
          <select v-model="selectedOperation">
            <option v-for="item in operations" :key="item.value" :value="item.value">{{ item.label }} - {{ item.description }}</option>
          </select>
        </label>

        <div class="preset-row">
          <button @click="selectPreset('core')">核心链路</button>
          <button @click="selectPreset('user-center')">个人中心</button>
          <button @click="selectPreset('video')">视频上传</button>
          <button @click="selectPreset('all')">全部服务</button>
        </div>

        <label class="field-block">
          <span>服务搜索</span>
          <input v-model="keyword" placeholder="服务名 / 端口 / 路由 / 依赖" />
        </label>

        <div class="service-toolbar">
          <button @click="toggleAllVisible(true)">选中可见</button>
          <button @click="toggleAllVisible(false)">取消可见</button>
        </div>

        <div class="service-list">
          <label v-for="service in filteredServices" :key="service.id" class="service-card">
            <input v-model="selectedServiceIds" type="checkbox" :value="service.id" />
            <span>
              <strong>{{ service.name }}</strong>
              <small>{{ service.module }} · {{ service.port }} · {{ service.route }}</small>
              <em>{{ service.description }}</em>
            </span>
          </label>
        </div>
      </section>

      <section class="panel command-panel">
        <div class="panel-title">
          <div>
            <h2>生成命令</h2>
            <p>{{ operationMeta.description }}</p>
          </div>
          <span class="status-pill" :class="`level-${operationMeta.level}`">{{ operationMeta.label }}</span>
        </div>

        <article v-for="block in commandBlocks" :key="block.id" class="command-block" :class="`level-${block.level}`">
          <div class="command-title">
            <div>
              <h3>{{ block.title }}</h3>
              <p>{{ block.description }}</p>
            </div>
            <button class="ghost-btn" @click="copyBlock(block)">{{ copiedId === block.id ? '已复制' : '复制' }}</button>
          </div>
          <pre><code>{{ block.commands.join('\n') }}</code></pre>
        </article>
      </section>
    </div>

    <section class="panel tips-panel">
      <div class="panel-title">
        <div>
          <h2>使用规则</h2>
          <p>避免继续出现接口路径、网关端口、服务端口、重启范围不一致的问题。</p>
        </div>
      </div>
      <div class="tips-grid">
        <div>
          <strong>只改前端页面</strong>
          <span>重启 vspicy-ui，执行 npm run build 验证即可。</span>
        </div>
        <div>
          <strong>改 Auth / Gateway</strong>
          <span>必须清理旧 token，并重启 vspicy-auth、vspicy-gateway。</span>
        </div>
        <div>
          <strong>改 common 模块</strong>
          <span>所有依赖 common 的服务都需要重新编译，至少重启受影响服务。</span>
        </div>
        <div>
          <strong>接口 401 / 403</strong>
          <span>先探测 Gateway，再直连服务，区分鉴权问题和服务问题。</span>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.ops-command-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-hero,
.panel,
.summary-card {
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
}

.page-hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1 {
  color: #0f172a;
  font-size: 30px;
}

h2 {
  color: #0f172a;
  font-size: 20px;
}

h3 {
  color: #0f172a;
  font-size: 16px;
}

.page-hero p,
.panel-title p,
.command-title p,
.tips-grid span,
.service-card small,
.service-card em {
  color: #64748b;
  line-height: 1.7;
}

.hero-actions,
.preset-row,
.service-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

button {
  cursor: pointer;
  border: 0;
  border-radius: 999px;
  padding: 10px 16px;
  font-weight: 900;
}

.primary-btn {
  background: #2563eb;
  color: #fff;
}

.ghost-btn,
.preset-row button,
.service-toolbar button {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  border-left-width: 5px;
}

.summary-card span {
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.summary-card strong {
  color: #0f172a;
  font-size: 18px;
}

.content-grid {
  display: grid;
  grid-template-columns: 420px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.panel {
  padding: 22px;
}

.panel-title,
.command-title {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.field-block span {
  color: #334155;
  font-size: 13px;
  font-weight: 900;
}

input,
select {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 11px 12px;
  background: #fff;
  color: #0f172a;
  outline: none;
}

.service-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 520px;
  overflow: auto;
  padding-right: 4px;
}

.service-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: flex-start;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 12px;
  background: #fff;
}

.service-card span {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.service-card strong {
  color: #0f172a;
}

.service-card em {
  font-style: normal;
  font-size: 12px;
}

.command-panel {
  min-width: 0;
}

.status-pill {
  display: inline-flex;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 900;
}

.command-block {
  border: 1px solid #e2e8f0;
  border-left-width: 5px;
  border-radius: 18px;
  padding: 16px;
  background: #fff;
}

.command-block + .command-block {
  margin-top: 14px;
}

pre {
  overflow: auto;
  margin: 0;
  padding: 16px;
  border-radius: 14px;
  background: #0f172a;
  color: #dbeafe;
  line-height: 1.7;
  font-size: 13px;
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.tips-grid div {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 14px;
  background: #fff;
}

.tips-grid strong {
  color: #0f172a;
}

.level-success {
  border-left-color: #16a34a;
}

.level-info {
  border-left-color: #2563eb;
}

.level-warning {
  border-left-color: #f59e0b;
}

.level-danger {
  border-left-color: #dc2626;
}

.status-pill.level-success {
  background: #dcfce7;
  color: #166534;
}

.status-pill.level-info {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-pill.level-warning {
  background: #fef3c7;
  color: #92400e;
}

.status-pill.level-danger {
  background: #fee2e2;
  color: #991b1b;
}

@media (max-width: 1180px) {
  .content-grid,
  .summary-grid,
  .tips-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 760px) {
  .page-hero,
  .panel-title,
  .command-title {
    flex-direction: column;
  }

  .content-grid,
  .summary-grid,
  .tips-grid {
    grid-template-columns: 1fr;
  }
}
</style>
