<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminOpsMenuItems, type AdminOpsMenuItem } from '../../config/adminOpsMenu'

type FeatureStatus = 'OK' | 'WARN' | 'ERROR' | 'INFO'
type FunctionGroupCode = string

type AdminRouteRow = {
  path: string
  permissionCode: string
  hasMenu: boolean
}

type FunctionMapRow = AdminOpsMenuItem & {
  groupName: string
  routePermission: string
  hasRoute: boolean
  status: FeatureStatus
  statusText: string
  riskText: string
}

type GroupSummary = {
  code: FunctionGroupCode
  name: string
  description: string
  menuCount: number
  routeCount: number
  permissionCount: number
  errorCount: number
  warnCount: number
  okCount: number
}

const router = useRouter()
const keyword = ref('')
const statusFilter = ref<'ALL' | FeatureStatus>('ALL')
const groupFilter = ref('ALL')
const copied = ref(false)

const groupMeta: Record<string, { name: string; description: string; order: number }> = {
  overview: { name: '运维概览', description: '总览入口与核心工作台', order: 10 },
  admin: { name: '运营管理', description: '用户、内容、会员、通知与工单处理', order: 20 },
  system: { name: '系统治理', description: '权限、菜单、组织、配置、字典、任务与发布', order: 30 },
  security: { name: '安全治理', description: '敏感词、登录安全和风险入口', order: 40 },
  health: { name: '服务健康', description: '基础设施、依赖组件与健康检查', order: 50 },
  diagnostics: { name: '诊断工具', description: '预检、API、路由、权限与前后端联调诊断', order: 60 },
  transcode: { name: '转码播放', description: '转码任务、播放就绪与媒体链路', order: 70 },
  playback: { name: '播放治理', description: '播放地址、HLS 状态与就绪修复', order: 80 },
  repair: { name: '修复任务', description: 'HLS 修复与一致性处理', order: 90 },
  storage: { name: '存储运维', description: '对象存储、容量、文件一致性和告警', order: 100 },
  cleanup: { name: '清理治理', description: '孤儿对象、清理审批与执行', order: 110 },
  audit: { name: '审计治理', description: '操作审计、后台日志与权限追踪', order: 120 }
}

const adminRoutes = computed<AdminRouteRow[]>(() => {
  const menuPathSet = new Set(adminOpsMenuItems.map((item) => item.path))
  return router.getRoutes()
    .filter((route) => route.path.startsWith('/admin/'))
    .filter((route) => !route.path.includes(':pathMatch'))
    .map((route) => ({
      path: route.path,
      permissionCode: String(route.meta.permissionCode || ''),
      hasMenu: menuPathSet.has(route.path)
    }))
    .sort((a, b) => a.path.localeCompare(b.path))
})

const routePermissionByPath = computed(() => {
  const map = new Map<string, string>()
  adminRoutes.value.forEach((route) => map.set(route.path, route.permissionCode))
  return map
})

const functionRows = computed<FunctionMapRow[]>(() => {
  return adminOpsMenuItems.map((item) => {
    const routePermission = routePermissionByPath.value.get(item.path) || ''
    const hasRoute = routePermissionByPath.value.has(item.path)
    const groupName = groupMeta[item.group]?.name || item.group || '未分组'
    const status = resolveStatus(item, hasRoute, routePermission)
    return {
      ...item,
      groupName,
      routePermission: routePermission || '-',
      hasRoute,
      status,
      statusText: statusText(status),
      riskText: riskText(item, hasRoute, routePermission)
    }
  }).sort((a, b) => groupOrder(a.group) - groupOrder(b.group) || a.title.localeCompare(b.title))
})

const orphanRoutes = computed(() => adminRoutes.value.filter((route) => !route.hasMenu))

const groupOptions = computed(() => {
  const codes = Array.from(new Set(functionRows.value.map((item) => item.group || 'other')))
  return codes
    .map((code) => ({ code, name: groupMeta[code]?.name || code, order: groupOrder(code) }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
})

const filteredRows = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  return functionRows.value.filter((item) => {
    const matchStatus = statusFilter.value === 'ALL' || item.status === statusFilter.value
    const matchGroup = groupFilter.value === 'ALL' || item.group === groupFilter.value
    const matchKeyword = !text || [
      item.title,
      item.description,
      item.path,
      item.permission,
      item.routePermission,
      item.groupName,
      item.statusText,
      item.riskText
    ].some((field) => String(field || '').toLowerCase().includes(text))
    return matchStatus && matchGroup && matchKeyword
  })
})

const groupSummaries = computed<GroupSummary[]>(() => {
  return groupOptions.value.map(({ code, name }) => {
    const rows = functionRows.value.filter((item) => item.group === code)
    const routeCount = rows.filter((item) => item.hasRoute).length
    const permissionCount = new Set(rows.map((item) => item.permission).filter(Boolean)).size
    return {
      code,
      name,
      description: groupMeta[code]?.description || '后台功能分组',
      menuCount: rows.length,
      routeCount,
      permissionCount,
      errorCount: rows.filter((item) => item.status === 'ERROR').length,
      warnCount: rows.filter((item) => item.status === 'WARN').length,
      okCount: rows.filter((item) => item.status === 'OK').length
    }
  })
})

const overview = computed(() => {
  const ok = functionRows.value.filter((item) => item.status === 'OK').length
  const warn = functionRows.value.filter((item) => item.status === 'WARN').length
  const error = functionRows.value.filter((item) => item.status === 'ERROR').length
  const permissions = new Set(functionRows.value.map((item) => item.permission).filter(Boolean)).size
  return {
    menus: functionRows.value.length,
    routes: adminRoutes.value.length,
    groups: groupOptions.value.length,
    permissions,
    ok,
    warn,
    error,
    orphanRoutes: orphanRoutes.value.length
  }
})

function resolveStatus(item: AdminOpsMenuItem, hasRoute: boolean, routePermission: string): FeatureStatus {
  if (!hasRoute) return 'ERROR'
  if (!item.permission || !routePermission) return 'ERROR'
  if (item.permission !== routePermission) return 'WARN'
  return 'OK'
}

function statusText(status: FeatureStatus) {
  const map: Record<FeatureStatus, string> = {
    OK: '正常',
    WARN: '需确认',
    ERROR: '异常',
    INFO: '信息'
  }
  return map[status]
}

function riskText(item: AdminOpsMenuItem, hasRoute: boolean, routePermission: string) {
  if (!hasRoute) return '菜单没有对应路由，点击会进入 404。'
  if (!item.permission) return '菜单缺少权限码，无法判断授权边界。'
  if (!routePermission) return '路由缺少 permissionCode，可能绕过后台权限判断。'
  if (item.permission !== routePermission) return `菜单权限 ${item.permission} 与路由权限 ${routePermission} 不一致。`
  return '菜单、路由和权限码一致。'
}

function groupOrder(code: string) {
  return groupMeta[code]?.order || 999
}

function statusClass(status: FeatureStatus) {
  return `status-pill status-${status.toLowerCase()}`
}

function resetFilters() {
  keyword.value = ''
  statusFilter.value = 'ALL'
  groupFilter.value = 'ALL'
}

function openPath(path: string) {
  router.push(path)
}

function buildSnapshot() {
  return {
    generatedAt: new Date().toISOString(),
    overview: overview.value,
    groups: groupSummaries.value,
    features: functionRows.value,
    orphanRoutes: orphanRoutes.value
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
  link.download = `vspicy-function-map-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section class="admin-page function-map-page">
    <div class="page-head">
      <div>
        <p class="eyebrow">System Governance</p>
        <h1>系统功能地图</h1>
        <p>按后台功能分组总览菜单、路由和权限码关系，用于开发前确认功能边界，避免重复建设、死链和权限错配。</p>
      </div>
      <div class="head-actions">
        <button class="secondary" type="button" @click="copySnapshot">{{ copied ? '已复制' : '复制快照' }}</button>
        <button type="button" @click="exportSnapshot">导出 JSON</button>
      </div>
    </div>

    <div class="metric-grid">
      <article class="metric-card">
        <span>菜单功能</span>
        <strong>{{ overview.menus }}</strong>
        <small>adminOpsMenuItems</small>
      </article>
      <article class="metric-card success">
        <span>正常功能</span>
        <strong>{{ overview.ok }}</strong>
        <small>菜单、路由、权限一致</small>
      </article>
      <article class="metric-card warning">
        <span>需确认</span>
        <strong>{{ overview.warn }}</strong>
        <small>权限码不一致或边界复用</small>
      </article>
      <article class="metric-card danger">
        <span>异常功能</span>
        <strong>{{ overview.error }}</strong>
        <small>缺路由或缺权限</small>
      </article>
      <article class="metric-card info">
        <span>后台路由</span>
        <strong>{{ overview.routes }}</strong>
        <small>未入菜单 {{ overview.orphanRoutes }}</small>
      </article>
      <article class="metric-card">
        <span>权限码</span>
        <strong>{{ overview.permissions }}</strong>
        <small>菜单侧唯一权限码</small>
      </article>
    </div>

    <div class="panel toolbar">
      <input v-model.trim="keyword" placeholder="搜索功能 / 路径 / 权限码 / 分组" />
      <select v-model="groupFilter">
        <option value="ALL">全部分组</option>
        <option v-for="group in groupOptions" :key="group.code" :value="group.code">{{ group.name }}</option>
      </select>
      <select v-model="statusFilter">
        <option value="ALL">全部状态</option>
        <option value="OK">正常</option>
        <option value="WARN">需确认</option>
        <option value="ERROR">异常</option>
      </select>
      <button class="secondary" type="button" @click="resetFilters">重置筛选</button>
    </div>

    <div class="panel">
      <div class="panel-title">
        <div>
          <h2>功能分组概览</h2>
          <p>用于判断系统模块覆盖度和功能聚合边界。</p>
        </div>
        <span>{{ groupSummaries.length }} 个分组</span>
      </div>
      <div class="group-grid">
        <article v-for="group in groupSummaries" :key="group.code" class="group-card">
          <div>
            <strong>{{ group.name }}</strong>
            <small>{{ group.description }}</small>
          </div>
          <dl>
            <div><dt>菜单</dt><dd>{{ group.menuCount }}</dd></div>
            <div><dt>路由</dt><dd>{{ group.routeCount }}</dd></div>
            <div><dt>权限</dt><dd>{{ group.permissionCount }}</dd></div>
          </dl>
          <p :class="group.errorCount ? 'risk danger-text' : group.warnCount ? 'risk warning-text' : 'risk success-text'">
            {{ group.errorCount ? `${group.errorCount} 个异常` : group.warnCount ? `${group.warnCount} 个需确认` : '分组正常' }}
          </p>
        </article>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">
        <div>
          <h2>功能清单</h2>
          <p>逐项比对菜单路径、路由权限和菜单权限。</p>
        </div>
        <span>{{ filteredRows.length }} / {{ functionRows.length }}</span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>状态</th>
              <th>功能</th>
              <th>分组</th>
              <th>路径</th>
              <th>菜单权限</th>
              <th>路由权限</th>
              <th>说明</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredRows" :key="item.path">
              <td><span :class="statusClass(item.status)">{{ item.statusText }}</span></td>
              <td>
                <strong>{{ item.title }}</strong>
                <small>{{ item.description }}</small>
              </td>
              <td>{{ item.groupName }}</td>
              <td><code>{{ item.path }}</code></td>
              <td><code>{{ item.permission }}</code></td>
              <td><code>{{ item.routePermission }}</code></td>
              <td>{{ item.riskText }}</td>
              <td><button class="secondary compact" type="button" :disabled="!item.hasRoute" @click="openPath(item.path)">打开</button></td>
            </tr>
            <tr v-if="filteredRows.length === 0">
              <td colspan="8" class="empty-cell">没有匹配的功能。</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel" v-if="orphanRoutes.length">
      <div class="panel-title">
        <div>
          <h2>未入菜单路由</h2>
          <p>这些后台路由已注册，但没有出现在管理端菜单中。内部页可以保留，普通业务页建议补菜单。</p>
        </div>
        <span>{{ orphanRoutes.length }}</span>
      </div>
      <div class="orphan-list">
        <button v-for="route in orphanRoutes" :key="route.path" class="orphan-item" type="button" @click="openPath(route.path)">
          <strong>{{ route.path }}</strong>
          <small>{{ route.permissionCode || '未配置 permissionCode' }}</small>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.function-map-page {
  display: grid;
  gap: 18px;
}

.group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.group-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #fff;
}

.group-card strong,
.group-card small {
  display: block;
}

.group-card small {
  margin-top: 4px;
  min-height: 34px;
  color: #64748b;
  line-height: 1.5;
}

.group-card dl {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 0;
}

.group-card dl div {
  padding: 8px;
  border-radius: 12px;
  background: #f8fafc;
}

.group-card dt {
  color: #64748b;
  font-size: 12px;
}

.group-card dd {
  margin: 2px 0 0;
  color: #111827;
  font-size: 18px;
  font-weight: 800;
}

.risk {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
}

.success-text {
  color: #15803d;
}

.warning-text {
  color: #b45309;
}

.danger-text {
  color: #b91c1c;
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

.status-ok {
  background: #dcfce7;
  color: #166534;
}

.status-warn {
  background: #fef3c7;
  color: #92400e;
}

.status-error {
  background: #fee2e2;
  color: #991b1b;
}

.status-info {
  background: #dbeafe;
  color: #1d4ed8;
}

.compact {
  padding: 6px 10px;
  border-radius: 10px;
  white-space: nowrap;
}

.orphan-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
}

.orphan-item {
  display: grid;
  gap: 4px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #f8fafc;
  text-align: left;
  cursor: pointer;
}

.orphan-item:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

.orphan-item small {
  color: #64748b;
}

.empty-cell {
  padding: 28px;
  color: #64748b;
  text-align: center;
}

@media (max-width: 760px) {
  .group-card dl {
    grid-template-columns: 1fr;
  }
}
</style>
