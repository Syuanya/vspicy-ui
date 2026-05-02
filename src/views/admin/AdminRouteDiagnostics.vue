<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminOpsMenuItems } from '../../config/adminOpsMenu'

type CheckSeverity = 'BLOCKER' | 'HIGH' | 'WARN' | 'INFO'

type RouteRow = {
  path: string
  name: string
  permissionCode: string
  inMenu: boolean
  menuTitle: string
  menuGroup: string
}

type IssueRow = {
  severity: CheckSeverity
  type: string
  target: string
  message: string
}

const route = useRoute()
const router = useRouter()
const keyword = ref('')
const severityFilter = ref('ALL')

const routeRows = computed<RouteRow[]>(() => {
  const menuByPath = new Map(adminOpsMenuItems.map((item) => [item.path, item]))
  return router.getRoutes()
    .filter((item) => item.path.startsWith('/admin/'))
    .filter((item) => !item.path.includes(':pathMatch'))
    .map((item) => {
      const menu = menuByPath.get(item.path)
      return {
        path: item.path,
        name: String(item.name || '-'),
        permissionCode: String(item.meta.permissionCode || '-'),
        inMenu: Boolean(menu),
        menuTitle: menu?.title || '-',
        menuGroup: menu?.group || '-'
      }
    })
    .sort((a, b) => a.path.localeCompare(b.path))
})

const issueRows = computed<IssueRow[]>(() => {
  const issues: IssueRow[] = []
  const routesByPath = new Map(routeRows.value.map((item) => [item.path, item]))
  const routePermissions = new Map(routeRows.value.map((item) => [item.path, item.permissionCode]))
  const pathCount = countBy(routeRows.value.map((item) => item.path))
  const permissionCount = countBy(routeRows.value.map((item) => item.permissionCode).filter((item) => item !== '-'))
  const menuPathCount = countBy(adminOpsMenuItems.map((item) => item.path))
  const menuPermissionCount = countBy(adminOpsMenuItems.map((item) => item.permission).filter(Boolean))

  for (const [path, count] of pathCount) {
    if (count > 1) {
      issues.push({ severity: 'BLOCKER', type: 'DUPLICATE_ROUTE', target: path, message: '同一个后台路由被注册多次，可能导致跳转或权限判断异常。' })
    }
  }

  for (const [permission, count] of permissionCount) {
    if (count > 1) {
      issues.push({ severity: 'HIGH', type: 'DUPLICATE_ROUTE_PERMISSION', target: permission, message: '多个路由复用同一权限码，请确认是否符合权限边界设计。' })
    }
  }

  for (const [path, count] of menuPathCount) {
    if (count > 1) {
      issues.push({ severity: 'BLOCKER', type: 'DUPLICATE_MENU_PATH', target: path, message: '菜单中出现重复路径，侧边栏和运维中心可能出现重复入口。' })
    }
  }

  for (const [permission, count] of menuPermissionCount) {
    if (count > 1) {
      issues.push({ severity: 'WARN', type: 'DUPLICATE_MENU_PERMISSION', target: permission, message: '多个菜单复用同一权限码，请确认是否是父子功能或诊断入口复用。' })
    }
  }

  for (const menu of adminOpsMenuItems) {
    const routePermission = routePermissions.get(menu.path)
    if (!routesByPath.has(menu.path)) {
      issues.push({ severity: 'BLOCKER', type: 'MENU_ROUTE_MISSING', target: menu.path, message: `菜单「${menu.title}」没有对应前端路由，点击会进入 404。` })
      continue
    }
    if (!routePermission || routePermission === '-') {
      issues.push({ severity: 'HIGH', type: 'ROUTE_PERMISSION_MISSING', target: menu.path, message: `菜单「${menu.title}」对应路由缺少 permissionCode。` })
      continue
    }
    if (routePermission !== menu.permission) {
      issues.push({ severity: 'HIGH', type: 'MENU_ROUTE_PERMISSION_MISMATCH', target: menu.path, message: `菜单权限 ${menu.permission} 与路由权限 ${routePermission} 不一致。` })
    }
  }

  for (const item of routeRows.value) {
    if (!item.inMenu && item.path !== '/admin/route-diagnostics') {
      issues.push({ severity: 'INFO', type: 'ROUTE_WITHOUT_MENU', target: item.path, message: '该后台路由未暴露在运维菜单中；如果是内部页可以忽略。' })
    }
  }

  return issues.sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.type.localeCompare(b.type))
})

const filteredIssues = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  return issueRows.value.filter((item) => {
    const matchSeverity = severityFilter.value === 'ALL' || item.severity === severityFilter.value
    const matchKeyword = !text || [item.type, item.target, item.message].some((field) => field.toLowerCase().includes(text))
    return matchSeverity && matchKeyword
  })
})

const filteredRoutes = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) {
    return routeRows.value
  }
  return routeRows.value.filter((item) => [item.path, item.permissionCode, item.menuTitle, item.menuGroup]
    .some((field) => field.toLowerCase().includes(text)))
})

const overview = computed(() => ({
  totalRoutes: routeRows.value.length,
  menuItems: adminOpsMenuItems.length,
  issues: issueRows.value.length,
  blockers: issueRows.value.filter((item) => item.severity === 'BLOCKER').length,
  high: issueRows.value.filter((item) => item.severity === 'HIGH').length,
  warn: issueRows.value.filter((item) => item.severity === 'WARN').length
}))

function countBy(values: string[]) {
  const map = new Map<string, number>()
  for (const value of values.filter(Boolean)) {
    map.set(value, (map.get(value) || 0) + 1)
  }
  return map
}

function severityRank(severity: CheckSeverity) {
  return ({ BLOCKER: 1, HIGH: 2, WARN: 3, INFO: 4 })[severity]
}

function severityClass(severity: CheckSeverity) {
  return `severity severity-${severity.toLowerCase()}`
}

function routeHealthClass(row: RouteRow) {
  if (!row.inMenu) {
    return 'status status-warn'
  }
  if (!row.permissionCode || row.permissionCode === '-') {
    return 'status status-danger'
  }
  return 'status status-ok'
}

function routeHealthText(row: RouteRow) {
  if (!row.inMenu) {
    return '未入菜单'
  }
  if (!row.permissionCode || row.permissionCode === '-') {
    return '缺权限'
  }
  return '正常'
}

function go(path: string) {
  router.push(path)
}

function exportReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    currentPath: route.path,
    overview: overview.value,
    issues: issueRows.value,
    routes: routeRows.value,
    menus: adminOpsMenuItems
  }
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `vspicy-route-diagnostics-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section class="admin-page route-diagnostics-page">
    <div class="page-head">
      <div>
        <p class="eyebrow">System Diagnostics</p>
        <h1>后台路由诊断</h1>
        <p>自动校验管理端路由、运维菜单和权限码一致性，用于提前发现 404、菜单死链和权限码错配。</p>
      </div>
      <div class="head-actions">
        <button class="secondary" @click="go('/admin/feature-governance')">进入功能治理</button>
        <button @click="exportReport">导出诊断 JSON</button>
      </div>
    </div>

    <div class="metric-grid">
      <article class="metric-card">
        <span>后台路由</span>
        <strong>{{ overview.totalRoutes }}</strong>
        <small>router 已注册 /admin 页面</small>
      </article>
      <article class="metric-card">
        <span>菜单入口</span>
        <strong>{{ overview.menuItems }}</strong>
        <small>adminOpsMenuItems</small>
      </article>
      <article class="metric-card danger">
        <span>阻断问题</span>
        <strong>{{ overview.blockers }}</strong>
        <small>会导致 404 / 重复路径</small>
      </article>
      <article class="metric-card warning">
        <span>高风险</span>
        <strong>{{ overview.high }}</strong>
        <small>权限码缺失或错配</small>
      </article>
      <article class="metric-card info">
        <span>警告</span>
        <strong>{{ overview.warn }}</strong>
        <small>需要确认的复用项</small>
      </article>
    </div>

    <div class="toolbar panel">
      <input v-model.trim="keyword" placeholder="搜索路径 / 权限码 / 问题类型" />
      <select v-model="severityFilter">
        <option value="ALL">全部等级</option>
        <option value="BLOCKER">BLOCKER</option>
        <option value="HIGH">HIGH</option>
        <option value="WARN">WARN</option>
        <option value="INFO">INFO</option>
      </select>
      <button class="secondary" @click="keyword = ''; severityFilter = 'ALL'">重置筛选</button>
    </div>

    <div class="panel">
      <div class="panel-title">
        <h2>诊断问题</h2>
        <span>{{ filteredIssues.length }} / {{ issueRows.length }}</span>
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
            <tr v-for="item in filteredIssues" :key="item.type + item.target + item.message">
              <td><span :class="severityClass(item.severity)">{{ item.severity }}</span></td>
              <td>{{ item.type }}</td>
              <td class="mono">{{ item.target }}</td>
              <td>{{ item.message }}</td>
            </tr>
            <tr v-if="!filteredIssues.length">
              <td colspan="4" class="empty">没有匹配的问题。</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">
        <h2>已注册后台路由</h2>
        <span>{{ filteredRoutes.length }} / {{ routeRows.length }}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>状态</th>
              <th>路由</th>
              <th>权限码</th>
              <th>菜单名称</th>
              <th>分组</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredRoutes" :key="item.path">
              <td><span :class="routeHealthClass(item)">{{ routeHealthText(item) }}</span></td>
              <td class="mono">{{ item.path }}</td>
              <td class="mono">{{ item.permissionCode }}</td>
              <td>{{ item.menuTitle }}</td>
              <td>{{ item.menuGroup }}</td>
              <td><button class="small" @click="go(item.path)">打开</button></td>
            </tr>
            <tr v-if="!filteredRoutes.length">
              <td colspan="6" class="empty">没有匹配的路由。</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.route-diagnostics-page {
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

.metric-card.danger strong {
  color: #dc2626;
}

.metric-card.warning strong {
  color: #d97706;
}

.metric-card.info strong {
  color: #2563eb;
}

.panel {
  padding: 18px;
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.panel-title h2 {
  margin: 0;
  font-size: 18px;
}

.panel-title span {
  color: #64748b;
  font-size: 13px;
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
  min-width: min(360px, 100%);
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
}

th {
  color: #475569;
  font-size: 12px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  background: #f8fafc;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.severity,
.status {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 800;
}

.severity-blocker,
.status-danger {
  background: #fee2e2;
  color: #991b1b;
}

.severity-high {
  background: #ffedd5;
  color: #9a3412;
}

.severity-warn,
.status-warn {
  background: #fef3c7;
  color: #92400e;
}

.severity-info {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-ok {
  background: #dcfce7;
  color: #166534;
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
