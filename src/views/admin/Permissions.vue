<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  assignRolePermissions,
  assignUserRoles,
  createPermission,
  createRole,
  disablePermission,
  disableRole,
  enablePermission,
  enableRole,
  getPermissionOverview,
  getRolePermissions,
  getUserPermissionView,
  getUserRoles,
  listPermissions,
  listRoles,
  updatePermission,
  updateRole
} from '../../api/admin'
import { listUsers } from '../../api/user'

type StatusFilter = '' | '1' | '0'

interface RoleItem {
  id: number
  roleCode: string
  roleName: string
  description?: string
  status?: number
}

interface PermissionItem {
  id: number
  parentId?: number
  permissionCode: string
  permissionName: string
  permissionType: string
  path?: string
  component?: string
  icon?: string
  sortNo?: number
  status?: number
}

interface UserItem {
  id: number
  username: string
  nickname?: string
}

interface Overview {
  roleTotal: number
  enabledRoleTotal: number
  disabledRoleTotal: number
  permissionTotal: number
  enabledPermissionTotal: number
  disabledPermissionTotal: number
  menuPermissionTotal: number
  buttonPermissionTotal: number
  apiPermissionTotal: number
  userRoleBindingTotal: number
  rolePermissionBindingTotal: number
}

const roles = ref<RoleItem[]>([])
const permissions = ref<PermissionItem[]>([])
const users = ref<UserItem[]>([])
const selectedRoleId = ref<number | null>(null)
const rolePermissionIds = ref<number[]>([])
const selectedUserId = ref<number | null>(1)
const userRoleIds = ref<number[]>([])
const userPermissionView = ref<any>(null)
const overview = ref<Overview | null>(null)
const permissionTypeFilter = ref('')
const roleKeyword = ref('')
const permissionKeyword = ref('')
const roleStatusFilter = ref<StatusFilter>('')
const permissionStatusFilter = ref<StatusFilter>('')
const loading = ref(false)
const saving = ref(false)
const message = ref('')

const editingRoleId = ref<number | null>(null)
const editingPermissionId = ref<number | null>(null)

const roleForm = ref({ roleCode: '', roleName: '', description: '', status: 1 })
const permissionForm = ref({
  parentId: 0,
  permissionCode: '',
  permissionName: '',
  permissionType: 'MENU',
  path: '',
  component: '',
  icon: '',
  sortNo: 0,
  status: 1
})

const selectedRole = computed(() => roles.value.find((role) => role.id === selectedRoleId.value))
const selectedUser = computed(() => users.value.find((user) => user.id === selectedUserId.value))
const enabledRoles = computed(() => roles.value.filter((role) => role.status !== 0))
const enabledPermissions = computed(() => permissions.value.filter((permission) => permission.status !== 0))

function statusParam(value: StatusFilter): number | undefined {
  if (value === '') return undefined
  return Number(value)
}

function resetRoleForm() {
  editingRoleId.value = null
  roleForm.value = { roleCode: '', roleName: '', description: '', status: 1 }
}

function resetPermissionForm() {
  editingPermissionId.value = null
  permissionForm.value = {
    parentId: 0,
    permissionCode: '',
    permissionName: '',
    permissionType: 'MENU',
    path: '',
    component: '',
    icon: '',
    sortNo: 0,
    status: 1
  }
}

async function loadOverview() {
  const res: any = await getPermissionOverview()
  if (res.code === 0) overview.value = res.data
}

async function loadRolesOnly() {
  const res: any = await listRoles({ keyword: roleKeyword.value || undefined, status: statusParam(roleStatusFilter.value) })
  if (res.code === 0) roles.value = res.data || []
}

async function loadPermissionsOnly() {
  const res: any = await listPermissions(permissionTypeFilter.value || undefined, {
    keyword: permissionKeyword.value || undefined,
    status: statusParam(permissionStatusFilter.value)
  })
  if (res.code === 0) permissions.value = res.data || []
}

async function load() {
  loading.value = true
  message.value = ''
  try {
    const [userRes]: any[] = await Promise.all([
      listUsers({ limit: 100 }),
      loadOverview(),
      loadRolesOnly(),
      loadPermissionsOnly()
    ])
    if (userRes.code === 0) users.value = userRes.data || []
    if (!selectedRoleId.value && roles.value.length > 0) await loadRolePermissions(roles.value[0].id)
    if (selectedUserId.value) await loadUserRoles()
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '权限数据加载失败'
  } finally {
    loading.value = false
  }
}

async function saveRole() {
  if (!roleForm.value.roleCode || !roleForm.value.roleName) {
    message.value = '角色编码和名称不能为空'
    return
  }
  saving.value = true
  try {
    const payload = { ...roleForm.value, roleCode: roleForm.value.roleCode.trim().toUpperCase() }
    const res: any = editingRoleId.value ? await updateRole(editingRoleId.value, payload) : await createRole(payload)
    if (res.code === 0) {
      message.value = editingRoleId.value ? '角色已更新' : '角色已创建'
      resetRoleForm()
      await Promise.all([loadOverview(), loadRolesOnly()])
    } else {
      message.value = res.message || '保存角色失败'
    }
  } finally {
    saving.value = false
  }
}

function editRole(role: RoleItem) {
  editingRoleId.value = role.id
  roleForm.value = {
    roleCode: role.roleCode,
    roleName: role.roleName,
    description: role.description || '',
    status: role.status === 0 ? 0 : 1
  }
}

async function changeRoleStatus(role: RoleItem) {
  saving.value = true
  try {
    const res: any = role.status === 0 ? await enableRole(role.id) : await disableRole(role.id)
    message.value = res.code === 0 ? '角色状态已更新' : (res.message || '角色状态更新失败')
    await Promise.all([loadOverview(), loadRolesOnly()])
  } finally {
    saving.value = false
  }
}

async function savePermission() {
  if (!permissionForm.value.permissionCode || !permissionForm.value.permissionName) {
    message.value = '权限编码和名称不能为空'
    return
  }
  saving.value = true
  try {
    const payload = {
      ...permissionForm.value,
      permissionCode: permissionForm.value.permissionCode.trim().toLowerCase(),
      parentId: Number(permissionForm.value.parentId || 0),
      sortNo: Number(permissionForm.value.sortNo || 0)
    }
    const res: any = editingPermissionId.value
      ? await updatePermission(editingPermissionId.value, payload)
      : await createPermission(payload)
    if (res.code === 0) {
      message.value = editingPermissionId.value ? '权限已更新' : '权限已创建'
      resetPermissionForm()
      await Promise.all([loadOverview(), loadPermissionsOnly()])
    } else {
      message.value = res.message || '保存权限失败'
    }
  } finally {
    saving.value = false
  }
}

function editPermission(permission: PermissionItem) {
  editingPermissionId.value = permission.id
  permissionForm.value = {
    parentId: permission.parentId || 0,
    permissionCode: permission.permissionCode,
    permissionName: permission.permissionName,
    permissionType: permission.permissionType || 'MENU',
    path: permission.path || '',
    component: permission.component || '',
    icon: permission.icon || '',
    sortNo: permission.sortNo || 0,
    status: permission.status === 0 ? 0 : 1
  }
}

async function changePermissionStatus(permission: PermissionItem) {
  saving.value = true
  try {
    const res: any = permission.status === 0 ? await enablePermission(permission.id) : await disablePermission(permission.id)
    message.value = res.code === 0 ? '权限状态已更新' : (res.message || '权限状态更新失败')
    await Promise.all([loadOverview(), loadPermissionsOnly()])
  } finally {
    saving.value = false
  }
}

async function loadRolePermissions(roleId: number) {
  selectedRoleId.value = roleId
  const res: any = await getRolePermissions(roleId)
  if (res.code === 0) rolePermissionIds.value = (res.data || []).map((item: PermissionItem) => item.id)
}

async function saveRolePermissions() {
  if (!selectedRoleId.value) {
    message.value = '请先选择角色'
    return
  }
  saving.value = true
  try {
    const res: any = await assignRolePermissions(selectedRoleId.value, rolePermissionIds.value)
    message.value = res.code === 0 ? '角色权限已保存' : (res.message || '保存角色权限失败')
    if (selectedUserId.value) await loadUserPermissionView()
    await loadOverview()
  } finally {
    saving.value = false
  }
}

async function loadUserRoles() {
  if (!selectedUserId.value) return
  const res: any = await getUserRoles(Number(selectedUserId.value))
  if (res.code === 0) userRoleIds.value = (res.data || []).map((item: RoleItem) => item.id)
  await loadUserPermissionView()
}

async function saveUserRoles() {
  if (!selectedUserId.value) {
    message.value = '请先选择用户'
    return
  }
  saving.value = true
  try {
    const res: any = await assignUserRoles(Number(selectedUserId.value), userRoleIds.value)
    if (res.code === 0) {
      message.value = '用户角色已保存'
      await Promise.all([loadUserPermissionView(), loadOverview()])
    } else {
      message.value = res.message || '保存用户角色失败'
    }
  } finally {
    saving.value = false
  }
}

async function loadUserPermissionView() {
  if (!selectedUserId.value) return
  const res: any = await getUserPermissionView(Number(selectedUserId.value))
  if (res.code === 0) userPermissionView.value = res.data
}

function toggleRolePermission(id: number) {
  rolePermissionIds.value = rolePermissionIds.value.includes(id)
    ? rolePermissionIds.value.filter((item) => item !== id)
    : [...rolePermissionIds.value, id]
}

function toggleUserRole(id: number) {
  userRoleIds.value = userRoleIds.value.includes(id)
    ? userRoleIds.value.filter((item) => item !== id)
    : [...userRoleIds.value, id]
}

function selectAllVisiblePermissions() {
  const ids = enabledPermissions.value.map((item) => item.id)
  rolePermissionIds.value = Array.from(new Set([...rolePermissionIds.value, ...ids]))
}

function clearVisiblePermissions() {
  const ids = new Set(permissions.value.map((item) => item.id))
  rolePermissionIds.value = rolePermissionIds.value.filter((id) => !ids.has(id))
}

onMounted(load)
</script>

<template>
  <section class="card permission-page">
    <div class="page-head">
      <div>
        <h2>权限管理</h2>
        <p>管理角色、权限、用户角色关系和角色权限关系，并实时查看用户最终权限。</p>
      </div>
      <button class="button" :disabled="loading" @click="load">{{ loading ? '加载中...' : '刷新' }}</button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div v-if="overview" class="metric-grid">
      <div class="metric"><span>角色</span><strong>{{ overview.roleTotal }}</strong><small>启用 {{ overview.enabledRoleTotal }} / 停用 {{ overview.disabledRoleTotal }}</small></div>
      <div class="metric"><span>权限</span><strong>{{ overview.permissionTotal }}</strong><small>启用 {{ overview.enabledPermissionTotal }} / 停用 {{ overview.disabledPermissionTotal }}</small></div>
      <div class="metric"><span>类型</span><strong>{{ overview.menuPermissionTotal }}/{{ overview.buttonPermissionTotal }}/{{ overview.apiPermissionTotal }}</strong><small>菜单 / 按钮 / API</small></div>
      <div class="metric"><span>绑定</span><strong>{{ overview.userRoleBindingTotal }}/{{ overview.rolePermissionBindingTotal }}</strong><small>用户角色 / 角色权限</small></div>
    </div>

    <div class="grid">
      <div class="panel">
        <div class="panel-head">
          <h3>{{ editingRoleId ? '编辑角色' : '新增角色' }}</h3>
          <button v-if="editingRoleId" class="ghost" @click="resetRoleForm">取消编辑</button>
        </div>
        <input v-model="roleForm.roleCode" class="input" placeholder="角色编码，例如 REVIEWER" />
        <input v-model="roleForm.roleName" class="input" placeholder="角色名称，例如 审核员" />
        <input v-model="roleForm.description" class="input" placeholder="描述" />
        <select v-model.number="roleForm.status" class="input">
          <option :value="1">启用</option>
          <option :value="0">停用</option>
        </select>
        <button class="button" :disabled="saving" @click="saveRole">{{ editingRoleId ? '保存角色' : '创建角色' }}</button>
      </div>

      <div class="panel">
        <div class="panel-head">
          <h3>{{ editingPermissionId ? '编辑权限' : '新增权限' }}</h3>
          <button v-if="editingPermissionId" class="ghost" @click="resetPermissionForm">取消编辑</button>
        </div>
        <input v-model="permissionForm.permissionCode" class="input" placeholder="权限编码，例如 video:transcode:view" />
        <input v-model="permissionForm.permissionName" class="input" placeholder="权限名称" />
        <select v-model="permissionForm.permissionType" class="input">
          <option value="MENU">菜单</option>
          <option value="BUTTON">按钮</option>
          <option value="API">接口</option>
        </select>
        <input v-model.number="permissionForm.parentId" class="input" type="number" placeholder="父权限 ID，默认为 0" />
        <input v-model="permissionForm.path" class="input" placeholder="菜单路径，可选" />
        <input v-model="permissionForm.component" class="input" placeholder="组件名称，可选" />
        <input v-model="permissionForm.icon" class="input" placeholder="图标，可选" />
        <input v-model.number="permissionForm.sortNo" class="input" type="number" placeholder="排序" />
        <select v-model.number="permissionForm.status" class="input">
          <option :value="1">启用</option>
          <option :value="0">停用</option>
        </select>
        <button class="button" :disabled="saving" @click="savePermission">{{ editingPermissionId ? '保存权限' : '创建权限' }}</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>角色列表</h3>
          <p>支持检索、编辑和启停。SUPER_ADMIN 禁止停用。</p>
        </div>
        <div class="filters">
          <input v-model="roleKeyword" class="input compact" placeholder="搜索角色" @keyup.enter="loadRolesOnly" />
          <select v-model="roleStatusFilter" class="input compact" @change="loadRolesOnly">
            <option value="">全部状态</option>
            <option value="1">启用</option>
            <option value="0">停用</option>
          </select>
          <button class="button small" @click="loadRolesOnly">查询</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>编码</th><th>名称</th><th>状态</th><th>描述</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="role in roles" :key="role.id" :class="{ muted: role.status === 0 }">
              <td>{{ role.id }}</td>
              <td><code>{{ role.roleCode }}</code></td>
              <td>{{ role.roleName }}</td>
              <td><span :class="['tag', role.status === 0 ? 'off' : 'on']">{{ role.status === 0 ? '停用' : '启用' }}</span></td>
              <td>{{ role.description || '-' }}</td>
              <td class="actions">
                <button class="ghost" @click="editRole(role)">编辑</button>
                <button class="ghost" @click="loadRolePermissions(role.id)">分配权限</button>
                <button class="ghost danger" :disabled="role.roleCode === 'SUPER_ADMIN'" @click="changeRoleStatus(role)">{{ role.status === 0 ? '启用' : '停用' }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>权限列表</h3>
          <p>支持按类型、状态和关键词检索，停用权限不会出现在最终用户权限视图中。</p>
        </div>
        <div class="filters">
          <input v-model="permissionKeyword" class="input compact" placeholder="搜索权限" @keyup.enter="loadPermissionsOnly" />
          <select v-model="permissionTypeFilter" class="input compact" @change="loadPermissionsOnly">
            <option value="">全部类型</option>
            <option value="MENU">菜单</option>
            <option value="BUTTON">按钮</option>
            <option value="API">接口</option>
          </select>
          <select v-model="permissionStatusFilter" class="input compact" @change="loadPermissionsOnly">
            <option value="">全部状态</option>
            <option value="1">启用</option>
            <option value="0">停用</option>
          </select>
          <button class="button small" @click="loadPermissionsOnly">查询</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>权限码</th><th>名称</th><th>类型</th><th>状态</th><th>路径</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="permission in permissions" :key="permission.id" :class="{ muted: permission.status === 0 }">
              <td>{{ permission.id }}</td>
              <td><code>{{ permission.permissionCode }}</code></td>
              <td>{{ permission.permissionName }}</td>
              <td>{{ permission.permissionType }}</td>
              <td><span :class="['tag', permission.status === 0 ? 'off' : 'on']">{{ permission.status === 0 ? '停用' : '启用' }}</span></td>
              <td>{{ permission.path || '-' }}</td>
              <td class="actions">
                <button class="ghost" @click="editPermission(permission)">编辑</button>
                <button class="ghost danger" :disabled="permission.permissionCode === '*'" @click="changePermissionStatus(permission)">{{ permission.status === 0 ? '启用' : '停用' }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>角色权限分配</h3>
          <p v-if="selectedRole">当前角色：{{ selectedRole.roleName }} / {{ selectedRole.roleCode }}</p>
        </div>
        <div class="actions">
          <button class="ghost" @click="selectAllVisiblePermissions">全选当前权限</button>
          <button class="ghost" @click="clearVisiblePermissions">清空当前权限</button>
        </div>
      </div>
      <div class="role-tabs">
        <button v-for="role in enabledRoles" :key="role.id" :class="{ active: selectedRoleId === role.id }" @click="loadRolePermissions(role.id)">{{ role.roleName }}</button>
      </div>
      <div v-if="selectedRoleId" class="check-grid">
        <label v-for="permission in enabledPermissions" :key="permission.id" class="check-item">
          <input type="checkbox" :checked="rolePermissionIds.includes(permission.id)" @change="toggleRolePermission(permission.id)" />
          <span>{{ permission.permissionName }}</span>
          <small>{{ permission.permissionType }} / {{ permission.permissionCode }}</small>
        </label>
      </div>
      <button class="button" :disabled="!selectedRoleId || saving" @click="saveRolePermissions">保存角色权限</button>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>用户角色分配</h3>
          <p v-if="selectedUser">当前用户：{{ selectedUser.nickname || selectedUser.username }} / ID {{ selectedUser.id }}</p>
        </div>
        <select v-model.number="selectedUserId" class="input user-select" @change="loadUserRoles">
          <option v-for="user in users" :key="user.id" :value="user.id">{{ user.nickname || user.username }} / {{ user.username }} / ID {{ user.id }}</option>
        </select>
      </div>
      <div class="check-grid">
        <label v-for="role in enabledRoles" :key="role.id" class="check-item">
          <input type="checkbox" :checked="userRoleIds.includes(role.id)" @change="toggleUserRole(role.id)" />
          <span>{{ role.roleName }}</span>
          <small>{{ role.roleCode }}</small>
        </label>
      </div>
      <button class="button" :disabled="!selectedUserId || saving" @click="saveUserRoles">保存用户角色</button>
    </div>

    <div v-if="userPermissionView" class="panel">
      <h3>用户权限视图：userId={{ userPermissionView.userId }}</h3>
      <p><strong>角色：</strong>{{ userPermissionView.roles.map((item: any) => item.roleName).join('、') || '-' }}</p>
      <p><strong>菜单：</strong>{{ userPermissionView.menus.map((item: any) => item.permissionName).join('、') || '-' }}</p>
      <p><strong>权限码：</strong></p>
      <div class="code-list"><span v-for="code in userPermissionView.permissionCodes" :key="code">{{ code }}</span></div>
    </div>
  </section>
</template>

<style scoped>
.permission-page { display: grid; gap: 16px; }
.page-head, .panel-head { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center; }
.metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.metric { border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; background: #fff; display: grid; gap: 4px; }
.metric span, .metric small { color: #6b7280; }
.metric strong { font-size: 24px; color: #111827; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
.panel { border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; background: #fff; }
.filters, .actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.compact { width: 160px; margin: 0; }
.user-select { max-width: 420px; margin: 0; }
.small { padding: 8px 12px; }
.ghost { border: 1px solid #d1d5db; border-radius: 8px; padding: 7px 10px; background: #fff; cursor: pointer; }
.ghost.danger { color: #b91c1c; border-color: #fecaca; }
.ghost:disabled { opacity: .5; cursor: not-allowed; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { border-bottom: 1px solid #e5e7eb; padding: 10px; text-align: left; vertical-align: top; }
code { background: #f3f4f6; padding: 2px 6px; border-radius: 6px; }
.tag { border-radius: 999px; padding: 3px 8px; font-size: 12px; }
.tag.on { background: #dcfce7; color: #166534; }
.tag.off { background: #fee2e2; color: #991b1b; }
.muted { color: #9ca3af; background: #f9fafb; }
.role-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin: 14px 0; }
.role-tabs button { border: 1px solid #d1d5db; border-radius: 8px; background: #fff; padding: 8px 10px; cursor: pointer; }
.role-tabs button.active { background: #111827; color: #fff; border-color: #111827; }
.check-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; margin: 16px 0; }
.check-item { display: grid; grid-template-columns: auto 1fr; column-gap: 8px; row-gap: 2px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; background: #f9fafb; font-size: 14px; }
.check-item small { grid-column: 2; color: #6b7280; }
.code-list { display: flex; flex-wrap: wrap; gap: 8px; }
.code-list span { background: #eef2ff; color: #3730a3; padding: 4px 8px; border-radius: 999px; font-size: 13px; }
.message { color: #ef4444; }
@media (max-width: 720px) { .compact, .user-select { width: 100%; max-width: none; } }
</style>
