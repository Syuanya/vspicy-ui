<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listRoles } from '../../api/admin'
import {
  assignRoleMenus,
  createMenu,
  deleteMenu,
  disableMenu,
  enableMenu,
  getMenuOverview,
  getRoleMenus,
  hideMenu,
  listMenus,
  showMenu,
  updateMenu,
  type MenuCommand
} from '../../api/adminMenu'

type MenuItem = {
  id: number
  parentId: number
  menuCode: string
  menuName: string
  menuType: string
  path?: string
  component?: string
  icon?: string
  permissionCode?: string
  sortNo?: number
  visible: boolean
  status: number
  editable: boolean
  remark?: string
  children?: MenuItem[]
}

type RoleItem = {
  id: number
  roleCode: string
  roleName: string
  status: number
}

type Overview = {
  totalCount: number
  directoryCount: number
  menuCount: number
  buttonCount: number
  visibleCount: number
  hiddenCount: number
  enabledCount: number
  disabledCount: number
}

const loading = ref(false)
const saving = ref(false)
const roleSaving = ref(false)
const message = ref('')
const error = ref('')
const menus = ref<MenuItem[]>([])
const roles = ref<RoleItem[]>([])
const selected = ref<MenuItem | null>(null)
const checkedMenuIds = ref<number[]>([])
const selectedRoleId = ref<number | ''>('')
const overview = ref<Overview>({
  totalCount: 0,
  directoryCount: 0,
  menuCount: 0,
  buttonCount: 0,
  visibleCount: 0,
  hiddenCount: 0,
  enabledCount: 0,
  disabledCount: 0
})

const query = ref({
  keyword: '',
  status: '',
  visible: ''
})

const form = ref<MenuCommand & { id: number }>({
  id: 0,
  parentId: 0,
  menuCode: '',
  menuName: '',
  menuType: 'MENU',
  path: '',
  component: '',
  icon: '',
  permissionCode: '',
  sortNo: 0,
  visible: true,
  status: 1,
  editable: true,
  remark: ''
})

const isEdit = computed(() => form.value.id > 0)

const flatMenus = computed(() => {
  const rows: Array<MenuItem & { level: number; label: string }> = []
  const walk = (items: MenuItem[], level: number) => {
    items.forEach((item) => {
      rows.push({ ...item, level, label: `${'　'.repeat(level)}${level > 0 ? '└ ' : ''}${item.menuName}` })
      if (item.children?.length) walk(item.children, level + 1)
    })
  }
  walk(menus.value, 0)
  return rows
})

const parentOptions = computed(() => flatMenus.value.filter((item) => item.id !== form.value.id && item.menuType !== 'BUTTON'))

const enabledRoles = computed(() => roles.value.filter((role) => role.status !== 0))

function resetMessage() {
  message.value = ''
  error.value = ''
}

function normalizeResponse(res: any) {
  if (res?.code === 0) return res.data
  throw new Error(res?.message || '接口返回异常')
}

async function load() {
  loading.value = true
  resetMessage()
  try {
    const params: any = {}
    if (query.value.keyword) params.keyword = query.value.keyword
    if (query.value.status !== '') params.status = Number(query.value.status)
    if (query.value.visible !== '') params.visible = query.value.visible === 'true'

    const [menuRes, overviewRes, roleRes]: any[] = await Promise.all([
      listMenus(params),
      getMenuOverview(),
      listRoles()
    ])
    menus.value = normalizeResponse(menuRes) || []
    overview.value = normalizeResponse(overviewRes) || overview.value
    roles.value = normalizeResponse(roleRes) || []
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '加载菜单失败'
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  query.value = { keyword: '', status: '', visible: '' }
  load()
}

function resetForm() {
  selected.value = null
  form.value = {
    id: 0,
    parentId: 0,
    menuCode: '',
    menuName: '',
    menuType: 'MENU',
    path: '',
    component: '',
    icon: '',
    permissionCode: '',
    sortNo: 0,
    visible: true,
    status: 1,
    editable: true,
    remark: ''
  }
}

function editMenu(item: MenuItem) {
  selected.value = item
  form.value = {
    id: item.id,
    parentId: item.parentId || 0,
    menuCode: item.menuCode,
    menuName: item.menuName,
    menuType: item.menuType || 'MENU',
    path: item.path || '',
    component: item.component || '',
    icon: item.icon || '',
    permissionCode: item.permissionCode || '',
    sortNo: item.sortNo || 0,
    visible: item.visible,
    status: item.status,
    editable: item.editable,
    remark: item.remark || ''
  }
}

function createChild(item: MenuItem) {
  resetForm()
  form.value.parentId = item.id
  form.value.menuType = item.menuType === 'DIR' ? 'MENU' : 'BUTTON'
}

function validateForm() {
  if (!form.value.menuCode.trim()) return '菜单编码不能为空'
  if (!/^[a-z][a-z0-9_.:-]{2,127}$/.test(form.value.menuCode.trim())) return '菜单编码格式不正确'
  if (!form.value.menuName.trim()) return '菜单名称不能为空'
  if (!['DIR', 'MENU', 'BUTTON'].includes(form.value.menuType)) return '菜单类型不正确'
  if (form.value.menuType === 'MENU' && !form.value.path?.trim()) return '菜单路由不能为空'
  return ''
}

async function submit() {
  const msg = validateForm()
  if (msg) {
    error.value = msg
    return
  }
  saving.value = true
  resetMessage()
  try {
    const payload: MenuCommand = {
      parentId: Number(form.value.parentId || 0),
      menuCode: form.value.menuCode.trim(),
      menuName: form.value.menuName.trim(),
      menuType: form.value.menuType,
      path: form.value.path || '',
      component: form.value.component || '',
      icon: form.value.icon || '',
      permissionCode: form.value.permissionCode || '',
      sortNo: Number(form.value.sortNo || 0),
      visible: Boolean(form.value.visible),
      status: Number(form.value.status || 1),
      editable: Boolean(form.value.editable),
      remark: form.value.remark || ''
    }
    const res: any = isEdit.value ? await updateMenu(form.value.id, payload) : await createMenu(payload)
    normalizeResponse(res)
    message.value = isEdit.value ? '菜单已更新' : '菜单已创建'
    resetForm()
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '保存菜单失败'
  } finally {
    saving.value = false
  }
}

async function toggleStatus(item: MenuItem) {
  resetMessage()
  try {
    const res: any = item.status === 1 ? await disableMenu(item.id) : await enableMenu(item.id)
    normalizeResponse(res)
    message.value = item.status === 1 ? '菜单已停用' : '菜单已启用'
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '状态切换失败'
  }
}

async function toggleVisible(item: MenuItem) {
  resetMessage()
  try {
    const res: any = item.visible ? await hideMenu(item.id) : await showMenu(item.id)
    normalizeResponse(res)
    message.value = item.visible ? '菜单已隐藏' : '菜单已显示'
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '显示状态切换失败'
  }
}

async function removeMenu(item: MenuItem) {
  if (!window.confirm(`确认删除菜单「${item.menuName}」？`)) return
  resetMessage()
  try {
    const res: any = await deleteMenu(item.id)
    if (res?.code !== 0) throw new Error(res?.message || '删除失败')
    message.value = '菜单已删除'
    if (form.value.id === item.id) resetForm()
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '删除菜单失败'
  }
}

function collectMenuIds(items: MenuItem[], bucket: number[] = []) {
  items.forEach((item) => {
    bucket.push(item.id)
    if (item.children?.length) collectMenuIds(item.children, bucket)
  })
  return bucket
}

async function loadRoleMenus() {
  if (!selectedRoleId.value) {
    checkedMenuIds.value = []
    return
  }
  resetMessage()
  try {
    const res: any = await getRoleMenus(Number(selectedRoleId.value))
    const data = normalizeResponse(res)
    checkedMenuIds.value = data?.menuIds || []
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '加载角色菜单失败'
  }
}

function onCheckMenu(event: Event, menuId: number) {
  const checked = Boolean((event.target as HTMLInputElement)?.checked)
  toggleMenuCheck(menuId, checked)
}

function toggleMenuCheck(menuId: number, checked: boolean) {
  const set = new Set(checkedMenuIds.value)
  if (checked) set.add(menuId)
  else set.delete(menuId)
  checkedMenuIds.value = [...set]
}

function selectAllMenus() {
  checkedMenuIds.value = collectMenuIds(menus.value)
}

function clearAllMenus() {
  checkedMenuIds.value = []
}

async function saveRoleMenus() {
  if (!selectedRoleId.value) {
    error.value = '请先选择角色'
    return
  }
  roleSaving.value = true
  resetMessage()
  try {
    const res: any = await assignRoleMenus(Number(selectedRoleId.value), checkedMenuIds.value)
    normalizeResponse(res)
    message.value = '角色菜单已保存'
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '保存角色菜单失败'
  } finally {
    roleSaving.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="menu-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">System Menu Center</p>
        <h1>系统菜单管理</h1>
        <p>维护后台菜单树、路由、权限码和角色菜单可见范围。</p>
      </div>
      <button type="button" @click="load" :disabled="loading">刷新</button>
    </header>

    <div class="tips">
      <strong>说明：</strong>
      菜单管理负责“后台入口可见性”；接口鉴权仍由 RBAC 权限码和 Gateway 规则控制。不要把菜单显示当成唯一安全边界。
    </div>

    <div class="message success" v-if="message">{{ message }}</div>
    <div class="message error" v-if="error">{{ error }}</div>

    <section class="metric-grid">
      <article><span>菜单总数</span><strong>{{ overview.totalCount }}</strong></article>
      <article><span>目录</span><strong>{{ overview.directoryCount }}</strong></article>
      <article><span>菜单</span><strong>{{ overview.menuCount }}</strong></article>
      <article><span>按钮</span><strong>{{ overview.buttonCount }}</strong></article>
      <article><span>可见</span><strong>{{ overview.visibleCount }}</strong></article>
      <article><span>停用</span><strong>{{ overview.disabledCount }}</strong></article>
    </section>

    <section class="toolbar">
      <input v-model="query.keyword" placeholder="搜索名称 / 编码 / 路径 / 权限码" @keyup.enter="load" />
      <select v-model="query.status">
        <option value="">全部状态</option>
        <option value="1">启用</option>
        <option value="0">停用</option>
      </select>
      <select v-model="query.visible">
        <option value="">全部可见性</option>
        <option value="true">显示</option>
        <option value="false">隐藏</option>
      </select>
      <button type="button" @click="load">查询</button>
      <button type="button" class="ghost" @click="resetFilter">重置</button>
    </section>

    <section class="content-grid">
      <div class="card menu-list">
        <div class="card-title">
          <h2>菜单树</h2>
          <button type="button" @click="resetForm">新增根菜单</button>
        </div>

        <div class="table-head">
          <span>菜单</span>
          <span>路由 / 权限</span>
          <span>状态</span>
          <span>操作</span>
        </div>

        <div v-if="loading" class="empty">加载中...</div>
        <div v-else-if="flatMenus.length === 0" class="empty">暂无菜单数据</div>
        <div v-else class="menu-rows">
          <div v-for="item in flatMenus" :key="item.id" class="menu-row" :style="{ '--level': item.level }">
            <div class="menu-name">
              <strong>{{ item.label }}</strong>
              <small>{{ item.menuCode }} · {{ item.menuType }} · sort {{ item.sortNo || 0 }}</small>
            </div>
            <div class="menu-path">
              <span>{{ item.path || '-' }}</span>
              <small>{{ item.permissionCode || '无权限码' }}</small>
            </div>
            <div class="badges">
              <span :class="['badge', item.status === 1 ? 'on' : 'off']">{{ item.status === 1 ? '启用' : '停用' }}</span>
              <span :class="['badge', item.visible ? 'on' : 'off']">{{ item.visible ? '显示' : '隐藏' }}</span>
              <span :class="['badge', item.editable ? 'on' : 'locked']">{{ item.editable ? '可编辑' : '内置' }}</span>
            </div>
            <div class="actions">
              <button type="button" @click="editMenu(item)">编辑</button>
              <button type="button" @click="createChild(item)">子级</button>
              <button type="button" @click="toggleVisible(item)">{{ item.visible ? '隐藏' : '显示' }}</button>
              <button type="button" @click="toggleStatus(item)">{{ item.status === 1 ? '停用' : '启用' }}</button>
              <button type="button" class="danger" :disabled="!item.editable" @click="removeMenu(item)">删除</button>
            </div>
          </div>
        </div>
      </div>

      <aside class="card editor">
        <div class="card-title">
          <h2>{{ isEdit ? '编辑菜单' : '新增菜单' }}</h2>
          <button type="button" class="ghost" @click="resetForm">清空</button>
        </div>

        <label>父级菜单</label>
        <select v-model.number="form.parentId">
          <option :value="0">根节点</option>
          <option v-for="item in parentOptions" :key="item.id" :value="item.id">{{ item.label }}</option>
        </select>

        <label>菜单编码</label>
        <input v-model="form.menuCode" placeholder="admin.system_menus" />

        <label>菜单名称</label>
        <input v-model="form.menuName" placeholder="菜单管理" />

        <label>菜单类型</label>
        <select v-model="form.menuType">
          <option value="DIR">目录</option>
          <option value="MENU">菜单</option>
          <option value="BUTTON">按钮</option>
        </select>

        <label>路由路径</label>
        <input v-model="form.path" placeholder="/admin/menus" />

        <label>组件路径</label>
        <input v-model="form.component" placeholder="views/admin/SystemMenus.vue" />

        <label>权限码</label>
        <input v-model="form.permissionCode" placeholder="system:menu:view" />

        <label>图标</label>
        <input v-model="form.icon" placeholder="menu" />

        <label>排序</label>
        <input v-model.number="form.sortNo" type="number" />

        <div class="switch-row">
          <label><input v-model="form.visible" type="checkbox" /> 显示</label>
          <label><input v-model="form.editable" type="checkbox" /> 可编辑</label>
          <label>
            状态
            <select v-model.number="form.status">
              <option :value="1">启用</option>
              <option :value="0">停用</option>
            </select>
          </label>
        </div>

        <label>备注</label>
        <textarea v-model="form.remark" rows="3" placeholder="菜单用途说明" />

        <button class="primary" type="button" :disabled="saving" @click="submit">
          {{ saving ? '保存中...' : (isEdit ? '保存修改' : '创建菜单') }}
        </button>
      </aside>
    </section>

    <section class="card role-card">
      <div class="card-title">
        <div>
          <h2>角色菜单分配</h2>
          <p>用于控制后台导航可见范围。接口权限仍需在“权限管理”中分配。</p>
        </div>
        <div class="role-actions">
          <button type="button" class="ghost" @click="selectAllMenus">全选</button>
          <button type="button" class="ghost" @click="clearAllMenus">清空</button>
          <button type="button" :disabled="roleSaving" @click="saveRoleMenus">保存角色菜单</button>
        </div>
      </div>

      <div class="role-toolbar">
        <select v-model="selectedRoleId" @change="loadRoleMenus">
          <option value="">选择角色</option>
          <option v-for="role in enabledRoles" :key="role.id" :value="role.id">{{ role.roleName }}（{{ role.roleCode }}）</option>
        </select>
        <span>已选 {{ checkedMenuIds.length }} 个菜单</span>
      </div>

      <div class="checkbox-grid">
        <label v-for="item in flatMenus" :key="item.id" :style="{ paddingLeft: `${item.level * 18 + 8}px` }">
          <input
            type="checkbox"
            :checked="checkedMenuIds.includes(item.id)"
            @change="onCheckMenu($event, item.id)"
          />
          <span>{{ item.menuName }}</span>
          <small>{{ item.permissionCode || item.menuCode }}</small>
        </label>
      </div>
    </section>
  </section>
</template>

<style scoped>
.menu-page { display: grid; gap: 16px; }
.page-header { display: flex; justify-content: space-between; gap: 16px; align-items: center; background: #fff; border-radius: 16px; padding: 18px; box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06); }
.page-header h1 { margin: 4px 0; font-size: 24px; }
.page-header p { margin: 0; color: #64748b; }
.eyebrow { color: #2563eb !important; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.tips { background: #eff6ff; color: #1e3a8a; border: 1px solid #bfdbfe; border-radius: 12px; padding: 12px 14px; }
.message { border-radius: 10px; padding: 10px 12px; }
.success { background: #ecfdf5; color: #065f46; }
.error { background: #fef2f2; color: #991b1b; }
.metric-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; }
.metric-grid article, .card { background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06); }
.metric-grid span { display: block; color: #64748b; font-size: 12px; }
.metric-grid strong { font-size: 22px; }
.toolbar { display: grid; grid-template-columns: 1fr 140px 140px auto auto; gap: 10px; background: #fff; border-radius: 16px; padding: 14px; }
input, select, textarea { width: 100%; box-sizing: border-box; border: 1px solid #d1d5db; border-radius: 10px; padding: 9px 10px; background: #fff; color: #111827; }
button { border: 0; border-radius: 10px; padding: 9px 12px; background: #2563eb; color: #fff; cursor: pointer; }
button:disabled { opacity: .55; cursor: not-allowed; }
button.ghost { background: #e5e7eb; color: #111827; }
button.danger { background: #dc2626; }
button.primary { width: 100%; margin-top: 14px; }
.content-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; align-items: start; }
.card-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.card-title h2 { margin: 0; font-size: 18px; }
.card-title p { margin: 4px 0 0; color: #64748b; }
.table-head, .menu-row { display: grid; grid-template-columns: 1.4fr 1.5fr 230px 360px; gap: 10px; align-items: center; }
.table-head { padding: 10px 12px; background: #f8fafc; color: #64748b; font-size: 12px; font-weight: 700; border-radius: 10px; }
.menu-rows { display: grid; gap: 8px; margin-top: 8px; }
.menu-row { border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 12px; background: #fff; }
.menu-name { padding-left: calc(var(--level) * 12px); }
.menu-name strong, .menu-name small, .menu-path span, .menu-path small { display: block; }
.menu-name small, .menu-path small { color: #64748b; margin-top: 3px; }
.badges { display: flex; gap: 6px; flex-wrap: wrap; }
.badge { border-radius: 999px; padding: 4px 8px; font-size: 12px; background: #e5e7eb; color: #374151; }
.badge.on { background: #dcfce7; color: #166534; }
.badge.off { background: #fee2e2; color: #991b1b; }
.badge.locked { background: #fef3c7; color: #92400e; }
.actions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.actions button { padding: 6px 8px; font-size: 12px; }
.editor { display: grid; gap: 8px; }
.editor label { font-size: 13px; font-weight: 700; color: #374151; }
.switch-row { display: grid; grid-template-columns: 1fr 1fr 1.4fr; gap: 8px; align-items: center; }
.switch-row label { font-weight: 500; }
.role-card { display: grid; gap: 12px; }
.role-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.role-toolbar { display: grid; grid-template-columns: 320px 1fr; gap: 12px; align-items: center; }
.checkbox-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.checkbox-grid label { display: grid; grid-template-columns: auto 1fr; column-gap: 8px; row-gap: 2px; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px; }
.checkbox-grid small { grid-column: 2; color: #64748b; }
.empty { padding: 18px; color: #64748b; text-align: center; }
@media (max-width: 1180px) { .content-grid { grid-template-columns: 1fr; } .metric-grid { grid-template-columns: repeat(3, 1fr); } .table-head, .menu-row { grid-template-columns: 1fr; } .actions { justify-content: flex-start; } }
@media (max-width: 760px) { .toolbar, .role-toolbar { grid-template-columns: 1fr; } .metric-grid, .checkbox-grid { grid-template-columns: 1fr; } .page-header { flex-direction: column; align-items: flex-start; } }
</style>
