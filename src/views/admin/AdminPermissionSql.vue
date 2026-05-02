<script setup lang="ts">
import { computed, ref } from 'vue'
import { adminOpsMenuItems } from '../../config/adminOpsMenu'

type Level = 'success' | 'info' | 'warning' | 'danger'
type PermissionType = 'MENU' | 'BUTTON' | 'API'

type SqlCheck = {
  id: string
  title: string
  level: Level
  detail: string
}

type RoleGrant = {
  roleCode: string
  enabled: boolean
}

const form = ref({
  parentCode: 'system:diagnostics:view',
  permissionCode: 'system:example:view',
  permissionName: '示例功能',
  permissionType: 'MENU' as PermissionType,
  path: '/admin/example',
  component: 'admin/AdminExample',
  icon: 'Monitor',
  sortNo: 760,
  status: 1
})

const roles = ref<RoleGrant[]>([
  { roleCode: 'SUPER_ADMIN', enabled: true },
  { roleCode: 'ADMIN', enabled: false },
  { roleCode: 'OPS', enabled: false }
])

const keyword = ref('')
const copied = ref(false)
const showMenuPicker = ref(true)

const filteredMenuItems = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return adminOpsMenuItems
    .filter((item) => {
      if (!q) return true
      return [item.title, item.description, item.path, item.permission, item.group].join(' ').toLowerCase().includes(q)
    })
    .slice(0, 18)
})

const selectedRoleCodes = computed(() => roles.value
  .filter((item) => item.enabled)
  .map((item) => item.roleCode.trim())
  .filter(Boolean))

const checks = computed<SqlCheck[]>(() => {
  const rows: SqlCheck[] = []
  const permissionCode = form.value.permissionCode.trim()
  const path = form.value.path.trim()
  const component = form.value.component.trim()
  const parentCode = form.value.parentCode.trim()

  rows.push(permissionCode
    ? (/^[a-z][a-z0-9]*(?::[a-z][a-z0-9-]*){1,5}$/.test(permissionCode)
      ? { id: 'permission-code-ok', title: '权限码格式', level: 'success', detail: '权限码格式正常，适合写入 sys_permission.permission_code。' }
      : { id: 'permission-code-bad', title: '权限码格式', level: 'danger', detail: '建议使用 system:module:action 或 module:resource:action 这类小写冒号分隔格式。' })
    : { id: 'permission-code-empty', title: '权限码缺失', level: 'danger', detail: 'permission_code 不能为空。' })

  rows.push(form.value.permissionName.trim()
    ? { id: 'permission-name-ok', title: '权限名称', level: 'success', detail: '权限名称已填写。' }
    : { id: 'permission-name-empty', title: '权限名称缺失', level: 'danger', detail: 'permission_name 不能为空。' })

  if (form.value.permissionType === 'MENU') {
    rows.push(path.startsWith('/admin/')
      ? { id: 'path-ok', title: '后台路径', level: 'success', detail: '菜单路径使用 /admin/** 前缀，可被后台路由识别。' }
      : { id: 'path-warning', title: '后台路径', level: 'warning', detail: '后台菜单建议使用 /admin/** 路径，避免菜单跳转到用户端路由。' })
    rows.push(component.startsWith('admin/')
      ? { id: 'component-ok', title: '组件标识', level: 'success', detail: '组件标识使用 admin/**，和现有后台权限数据风格一致。' }
      : { id: 'component-warning', title: '组件标识', level: 'warning', detail: '组件字段建议使用 admin/页面名，例如 admin/AdminFeature。' })
  } else {
    rows.push(path
      ? { id: 'action-path', title: '动作路径', level: 'info', detail: '按钮/API 权限可以保留关联路径，也可以按业务需要为空。' }
      : { id: 'action-path-empty', title: '动作路径', level: 'info', detail: '按钮/API 权限未填写路径，SQL 会写入空字符串。' })
  }

  rows.push(parentCode
    ? { id: 'parent-code-ok', title: '父权限', level: 'success', detail: `将优先挂到父权限 ${parentCode} 下；如果不存在，则 parent_id 回退为 0。` }
    : { id: 'parent-code-empty', title: '父权限缺失', level: 'warning', detail: '未填写父权限码，SQL 会使用 parent_id = 0。' })

  rows.push(selectedRoleCodes.value.length
    ? { id: 'role-grant-ok', title: '角色授权', level: 'success', detail: `将自动授权给：${selectedRoleCodes.value.join('、')}。` }
    : { id: 'role-grant-empty', title: '角色授权', level: 'warning', detail: '未选择授权角色，只会插入权限，不会写入 sys_role_permission。' })

  rows.push(form.value.sortNo > 0
    ? { id: 'sort-ok', title: '排序号', level: 'success', detail: `sort_no = ${form.value.sortNo}。` }
    : { id: 'sort-warning', title: '排序号', level: 'warning', detail: '排序号建议大于 0，便于后台菜单展示和分组排序。' })

  return rows
})

const riskLevel = computed<Level>(() => {
  if (checks.value.some((item) => item.level === 'danger')) return 'danger'
  if (checks.value.some((item) => item.level === 'warning')) return 'warning'
  return 'success'
})

const generatedSql = computed(() => {
  const parentCode = sqlString(form.value.parentCode.trim())
  const permissionCode = sqlString(form.value.permissionCode.trim())
  const permissionName = sqlString(form.value.permissionName.trim())
  const permissionType = sqlString(form.value.permissionType)
  const path = sqlString(form.value.path.trim())
  const component = sqlString(form.value.component.trim())
  const icon = sqlString(form.value.icon.trim())
  const sortNo = Number.isFinite(form.value.sortNo) ? Number(form.value.sortNo) : 0
  const status = form.value.status ? 1 : 0

  const lines: string[] = []
  lines.push('-- 权限初始化脚本')
  lines.push('-- 生成页面：后台 /admin/permission-sql')
  lines.push('-- 执行前建议：备份数据库；确认 permission_code 没有和其他功能冲突。')
  lines.push('')
  lines.push('INSERT INTO sys_permission (')
  lines.push('    parent_id,')
  lines.push('    permission_code,')
  lines.push('    permission_name,')
  lines.push('    permission_type,')
  lines.push('    path,')
  lines.push('    component,')
  lines.push('    icon,')
  lines.push('    sort_no,')
  lines.push('    status,')
  lines.push('    created_at,')
  lines.push('    updated_at')
  lines.push(')')
  lines.push('SELECT')
  if (form.value.parentCode.trim()) {
    lines.push(`    COALESCE((SELECT p.id FROM sys_permission p WHERE p.permission_code = ${parentCode} LIMIT 1), 0),`)
  } else {
    lines.push('    0,')
  }
  lines.push(`    ${permissionCode},`)
  lines.push(`    ${permissionName},`)
  lines.push(`    ${permissionType},`)
  lines.push(`    ${path},`)
  lines.push(`    ${component},`)
  lines.push(`    ${icon},`)
  lines.push(`    ${sortNo},`)
  lines.push(`    ${status},`)
  lines.push('    NOW(),')
  lines.push('    NOW()')
  lines.push('WHERE NOT EXISTS (')
  lines.push(`    SELECT 1 FROM sys_permission WHERE permission_code = ${permissionCode}`)
  lines.push(');')

  if (selectedRoleCodes.value.length) {
    lines.push('')
    lines.push('-- 给指定角色授权，已做幂等保护。')
    selectedRoleCodes.value.forEach((roleCode) => {
      lines.push('INSERT INTO sys_role_permission (role_id, permission_id)')
      lines.push('SELECT r.id, p.id')
      lines.push('FROM sys_role r')
      lines.push(`JOIN sys_permission p ON p.permission_code = ${permissionCode}`)
      lines.push(`WHERE r.role_code = ${sqlString(roleCode)}`)
      lines.push('  AND NOT EXISTS (')
      lines.push('      SELECT 1')
      lines.push('      FROM sys_role_permission rp')
      lines.push('      WHERE rp.role_id = r.id AND rp.permission_id = p.id')
      lines.push('  );')
      lines.push('')
    })
  }

  lines.push('-- 执行后建议：重新登录后台，刷新权限缓存。')
  return lines.join('\n').trimEnd()
})

const deployNotes = computed(() => {
  const notes = [
    { title: '是否需要执行 SQL', value: '需要。复制上方 SQL 到 MySQL 执行。', level: 'danger' as Level },
    { title: '是否需要重启后端', value: '只新增权限数据时不需要。若同时新增 Controller 或 Service，再重启对应微服务。', level: 'info' as Level },
    { title: '是否需要重启前端', value: '如果同时新增页面、路由或菜单，需要重启 vspicy-ui。', level: 'warning' as Level },
    { title: '是否需要重新登录', value: '需要。权限视图通常在登录后缓存，执行 SQL 后重新登录最稳。', level: 'warning' as Level }
  ]
  return notes
})

function sqlString(value: string) {
  return `'${String(value || '').replace(/'/g, "''")}'`
}

function applyMenuItem(item: typeof adminOpsMenuItems[number]) {
  form.value.permissionCode = item.permission
  form.value.permissionName = item.title
  form.value.permissionType = 'MENU'
  form.value.path = item.path
  form.value.component = `admin/${componentNameFromPath(item.path)}`
  form.value.icon = iconByLevel(item.level)
  form.value.parentCode = item.group === 'diagnostics' ? 'system:diagnostics:view' : item.group === 'system' ? 'system:menu:view' : ''
  form.value.sortNo = sortByGroup(item.group)
}

function componentNameFromPath(path: string) {
  return path
    .replace(/^\/admin\//, '')
    .split('-')
    .map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1) : '')
    .join('')
    .replace(/^/, 'Admin')
}

function iconByLevel(level: Level) {
  if (level === 'danger') return 'WarningFilled'
  if (level === 'warning') return 'Warning'
  if (level === 'success') return 'CircleCheck'
  return 'Monitor'
}

function sortByGroup(group: string) {
  const sortMap: Record<string, number> = {
    overview: 100,
    admin: 200,
    system: 300,
    security: 400,
    health: 500,
    diagnostics: 760,
    transcode: 800,
    playback: 820,
    storage: 840,
    repair: 880,
    cleanup: 900,
    audit: 950
  }
  return sortMap[group] || 700
}

function addRole() {
  roles.value.push({ roleCode: '', enabled: true })
}

function removeRole(index: number) {
  roles.value.splice(index, 1)
}

async function copySql() {
  await navigator.clipboard.writeText(generatedSql.value)
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1600)
}

function downloadSql() {
  const code = form.value.permissionCode.trim() || 'permission'
  const filename = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${code.replace(/[:/]/g, '_')}.sql`
  downloadText(filename, generatedSql.value, 'text/sql')
}

function exportReport() {
  const payload = {
    generatedAt: new Date().toISOString(),
    form: form.value,
    roles: selectedRoleCodes.value,
    checks: checks.value,
    sql: generatedSql.value,
    notes: deployNotes.value
  }
  downloadText('permission-sql-report.json', JSON.stringify(payload, null, 2), 'application/json')
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section class="permission-sql-page admin-page-shell">
    <div class="page-hero">
      <div>
        <p class="eyebrow">System Governance</p>
        <h1>权限 SQL 生成器</h1>
        <p class="hero-text">按现有 RBAC 表结构生成幂等权限初始化 SQL，减少新增后台页面时权限码漏配、SQL 不可重复执行和角色未授权问题。</p>
      </div>
      <div class="hero-actions">
        <button class="ghost-btn" type="button" @click="showMenuPicker = !showMenuPicker">{{ showMenuPicker ? '收起菜单选择' : '选择已有菜单' }}</button>
        <button class="ghost-btn" type="button" @click="exportReport">导出报告</button>
        <button class="primary-btn" type="button" @click="copySql">{{ copied ? '已复制' : '复制 SQL' }}</button>
      </div>
    </div>

    <div class="summary-grid">
      <article class="summary-card" :class="`level-${riskLevel}`">
        <span class="label">当前状态</span>
        <strong>{{ riskLevel === 'danger' ? '需修正' : riskLevel === 'warning' ? '需确认' : '可执行' }}</strong>
        <p>根据权限码、路径、角色授权和排序号自动判断。</p>
      </article>
      <article class="summary-card">
        <span class="label">权限码</span>
        <strong>{{ form.permissionCode || '-' }}</strong>
        <p>{{ form.permissionType }} / {{ form.status ? '启用' : '停用' }}</p>
      </article>
      <article class="summary-card">
        <span class="label">授权角色</span>
        <strong>{{ selectedRoleCodes.length }}</strong>
        <p>{{ selectedRoleCodes.join('、') || '未选择角色' }}</p>
      </article>
      <article class="summary-card">
        <span class="label">执行策略</span>
        <strong>幂等</strong>
        <p>使用 NOT EXISTS 防止重复插入。</p>
      </article>
    </div>

    <div class="content-grid">
      <div class="panel form-panel">
        <div class="panel-title">
          <div>
            <h2>权限信息</h2>
            <p>生成 sys_permission 与 sys_role_permission 初始化脚本。</p>
          </div>
        </div>

        <div class="form-grid">
          <label>
            <span>父权限码</span>
            <input v-model="form.parentCode" placeholder="system:diagnostics:view" />
          </label>
          <label>
            <span>权限码</span>
            <input v-model="form.permissionCode" placeholder="system:example:view" />
          </label>
          <label>
            <span>权限名称</span>
            <input v-model="form.permissionName" placeholder="示例功能" />
          </label>
          <label>
            <span>权限类型</span>
            <select v-model="form.permissionType">
              <option value="MENU">MENU</option>
              <option value="BUTTON">BUTTON</option>
              <option value="API">API</option>
            </select>
          </label>
          <label>
            <span>页面路径</span>
            <input v-model="form.path" placeholder="/admin/example" />
          </label>
          <label>
            <span>组件标识</span>
            <input v-model="form.component" placeholder="admin/AdminExample" />
          </label>
          <label>
            <span>图标</span>
            <input v-model="form.icon" placeholder="Monitor" />
          </label>
          <label>
            <span>排序号</span>
            <input v-model.number="form.sortNo" type="number" min="1" />
          </label>
          <label>
            <span>状态</span>
            <select v-model.number="form.status">
              <option :value="1">启用</option>
              <option :value="0">停用</option>
            </select>
          </label>
        </div>

        <div class="role-box">
          <div class="panel-subtitle">
            <strong>授权角色</strong>
            <button class="text-btn" type="button" @click="addRole">增加角色</button>
          </div>
          <div v-for="(role, index) in roles" :key="index" class="role-row">
            <label class="check-row">
              <input v-model="role.enabled" type="checkbox" />
              <span>授权</span>
            </label>
            <input v-model="role.roleCode" placeholder="SUPER_ADMIN" />
            <button class="danger-text-btn" type="button" @click="removeRole(index)">删除</button>
          </div>
        </div>
      </div>

      <div class="panel check-panel">
        <div class="panel-title">
          <div>
            <h2>执行检查</h2>
            <p>复制 SQL 前先确认红色和黄色检查项。</p>
          </div>
        </div>
        <div class="check-list">
          <article v-for="item in checks" :key="item.id" class="check-item" :class="`level-${item.level}`">
            <strong>{{ item.title }}</strong>
            <p>{{ item.detail }}</p>
          </article>
        </div>

        <div class="note-list">
          <article v-for="item in deployNotes" :key="item.title" class="note-item" :class="`level-${item.level}`">
            <span>{{ item.title }}</span>
            <p>{{ item.value }}</p>
          </article>
        </div>
      </div>
    </div>

    <div v-if="showMenuPicker" class="panel menu-picker">
      <div class="panel-title">
        <div>
          <h2>从已有后台菜单填充</h2>
          <p>快速套用现有菜单项的 path、permission、名称和分组排序。</p>
        </div>
        <input v-model="keyword" class="search-input" placeholder="搜索菜单、权限码、路径" />
      </div>
      <div class="menu-grid">
        <button v-for="item in filteredMenuItems" :key="item.path" type="button" class="menu-card" @click="applyMenuItem(item)">
          <strong>{{ item.title }}</strong>
          <span>{{ item.path }}</span>
          <small>{{ item.permission }}</small>
        </button>
      </div>
    </div>

    <div class="panel sql-panel">
      <div class="panel-title">
        <div>
          <h2>生成 SQL</h2>
          <p>适配当前项目的 sys_permission / sys_role_permission 结构。</p>
        </div>
        <div class="panel-actions">
          <button class="ghost-btn" type="button" @click="downloadSql">下载 SQL</button>
          <button class="primary-btn" type="button" @click="copySql">{{ copied ? '已复制' : '复制 SQL' }}</button>
        </div>
      </div>
      <pre class="sql-code">{{ generatedSql }}</pre>
    </div>
  </section>
</template>

<style scoped>
.permission-sql-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-hero,
.panel,
.summary-card {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 16px 44px rgba(15, 23, 42, 0.08);
}

.page-hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 26px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: 30px;
  color: #0f172a;
}

h2 {
  font-size: 18px;
  color: #0f172a;
}

.hero-text,
.panel-title p,
.summary-card p,
.check-item p,
.note-item p {
  margin-top: 8px;
  color: #64748b;
  line-height: 1.65;
}

.hero-actions,
.panel-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.primary-btn,
.ghost-btn,
.text-btn,
.danger-text-btn,
.menu-card {
  border: 0;
  cursor: pointer;
  font-weight: 800;
}

.primary-btn,
.ghost-btn {
  height: 38px;
  padding: 0 16px;
  border-radius: 999px;
}

.primary-btn {
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
}

.ghost-btn {
  color: #334155;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  padding: 18px;
}

.summary-card .label {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.summary-card strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: 22px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.8fr);
  gap: 18px;
}

.panel {
  padding: 20px;
}

.panel-title,
.panel-subtitle {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

label span {
  display: block;
  margin-bottom: 7px;
  color: #475569;
  font-size: 13px;
  font-weight: 800;
}

input,
select {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #dbe4ee;
  border-radius: 12px;
  background: #fff;
  color: #0f172a;
  font: inherit;
  min-height: 40px;
  padding: 0 12px;
  outline: none;
}

input:focus,
select:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.role-box {
  margin-top: 20px;
  padding: 16px;
  border-radius: 16px;
  background: #f8fafc;
}

.role-row {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) 68px;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #475569;
  font-weight: 800;
}

.check-row input {
  width: 16px;
  min-height: 16px;
}

.text-btn,
.danger-text-btn {
  background: transparent;
  padding: 0;
}

.text-btn {
  color: #2563eb;
}

.danger-text-btn {
  color: #dc2626;
}

.check-list,
.note-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.note-list {
  margin-top: 16px;
}

.check-item,
.note-item {
  border: 1px solid #e2e8f0;
  border-left-width: 4px;
  border-radius: 14px;
  padding: 12px;
  background: #fff;
}

.check-item strong,
.note-item span {
  color: #0f172a;
  font-weight: 900;
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

.search-input {
  max-width: 320px;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.menu-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  text-align: left;
}

.menu-card:hover {
  border-color: #2563eb;
  box-shadow: 0 10px 30px rgba(37, 99, 235, 0.12);
}

.menu-card strong {
  color: #0f172a;
}

.menu-card span,
.menu-card small {
  color: #64748b;
}

.sql-code {
  overflow: auto;
  max-height: 560px;
  margin: 0;
  padding: 18px;
  border-radius: 16px;
  background: #0f172a;
  color: #dbeafe;
  line-height: 1.7;
  font-size: 13px;
}

@media (max-width: 1100px) {
  .summary-grid,
  .content-grid,
  .menu-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 760px) {
  .page-hero,
  .panel-title {
    flex-direction: column;
  }

  .summary-grid,
  .content-grid,
  .form-grid,
  .menu-grid {
    grid-template-columns: 1fr;
  }
}
</style>
