<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  assignRolePermissions,
  assignUserRoles,
  createPermission,
  createRole,
  getRolePermissions,
  getUserPermissionView,
  getUserRoles,
  listPermissions,
  listRoles
} from '../../api/admin'
import { listUsers } from '../../api/user'

const roles = ref<any[]>([])
const permissions = ref<any[]>([])
const users = ref<any[]>([])
const selectedRoleId = ref<number | null>(null)
const rolePermissionIds = ref<number[]>([])
const selectedUserId = ref<number | null>(1)
const userRoleIds = ref<number[]>([])
const userPermissionView = ref<any>(null)
const permissionTypeFilter = ref('')
const loading = ref(false)
const saving = ref(false)
const message = ref('')

const roleForm = ref({ roleCode: '', roleName: '', description: '' })
const permissionForm = ref({
  permissionCode: '',
  permissionName: '',
  permissionType: 'MENU',
  path: '',
  component: '',
  icon: '',
  sortNo: 0
})

const selectedRole = computed(() => roles.value.find((role) => role.id === selectedRoleId.value))
const selectedUser = computed(() => users.value.find((user) => user.id === selectedUserId.value))

async function load() {
  loading.value = true
  message.value = ''
  try {
    const [roleRes, permissionRes, userRes]: any[] = await Promise.all([
      listRoles(),
      listPermissions(permissionTypeFilter.value || undefined),
      listUsers({ limit: 100 })
    ])
    if (roleRes.code === 0) roles.value = roleRes.data || []
    if (permissionRes.code === 0) permissions.value = permissionRes.data || []
    if (userRes.code === 0) users.value = userRes.data || []
    if (!selectedRoleId.value && roles.value.length > 0) {
      await loadRolePermissions(roles.value[0].id)
    }
    if (selectedUserId.value) {
      await loadUserRoles()
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '权限数据加载失败'
  } finally {
    loading.value = false
  }
}

async function addRole() {
  if (!roleForm.value.roleCode || !roleForm.value.roleName) {
    message.value = '角色编码和名称不能为空'
    return
  }
  saving.value = true
  try {
    const res: any = await createRole(roleForm.value)
    if (res.code === 0) {
      message.value = '角色已创建'
      roleForm.value = { roleCode: '', roleName: '', description: '' }
      await load()
    } else {
      message.value = res.message || '创建角色失败'
    }
  } finally {
    saving.value = false
  }
}

async function addPermission() {
  if (!permissionForm.value.permissionCode || !permissionForm.value.permissionName) {
    message.value = '权限编码和名称不能为空'
    return
  }
  saving.value = true
  try {
    const res: any = await createPermission(permissionForm.value)
    if (res.code === 0) {
      message.value = '权限已创建'
      permissionForm.value = {
        permissionCode: '',
        permissionName: '',
        permissionType: 'MENU',
        path: '',
        component: '',
        icon: '',
        sortNo: 0
      }
      await load()
    } else {
      message.value = res.message || '创建权限失败'
    }
  } finally {
    saving.value = false
  }
}

async function loadRolePermissions(roleId: number) {
  selectedRoleId.value = roleId
  const res: any = await getRolePermissions(roleId)
  if (res.code === 0) {
    rolePermissionIds.value = (res.data || []).map((item: any) => item.id)
  }
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
  } finally {
    saving.value = false
  }
}

async function loadUserRoles() {
  if (!selectedUserId.value) return
  const res: any = await getUserRoles(Number(selectedUserId.value))
  if (res.code === 0) {
    userRoleIds.value = (res.data || []).map((item: any) => item.id)
  }
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
      await loadUserPermissionView()
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
  if (res.code === 0) {
    userPermissionView.value = res.data
  }
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

onMounted(load)
</script>

<template>
  <section class="card">
    <div class="page-head">
      <div>
        <h2>权限管理</h2>
        <p>管理角色、权限、用户角色关系和角色权限关系，并实时查看用户最终权限。</p>
      </div>
      <button class="button" :disabled="loading" @click="load">{{ loading ? '加载中...' : '刷新' }}</button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="grid">
      <div class="panel">
        <h3>新增角色</h3>
        <input v-model="roleForm.roleCode" class="input" placeholder="角色编码，例如 REVIEWER" />
        <input v-model="roleForm.roleName" class="input" placeholder="角色名称，例如 审核员" />
        <input v-model="roleForm.description" class="input" placeholder="描述" />
        <button class="button" :disabled="saving" @click="addRole">创建角色</button>
      </div>

      <div class="panel">
        <h3>新增权限</h3>
        <input v-model="permissionForm.permissionCode" class="input" placeholder="权限编码，例如 article:delete" />
        <input v-model="permissionForm.permissionName" class="input" placeholder="权限名称" />
        <select v-model="permissionForm.permissionType" class="input">
          <option value="MENU">菜单</option>
          <option value="BUTTON">按钮</option>
          <option value="API">接口</option>
        </select>
        <input v-model="permissionForm.path" class="input" placeholder="菜单路径，可选" />
        <input v-model="permissionForm.component" class="input" placeholder="组件名称，可选" />
        <input v-model.number="permissionForm.sortNo" class="input" type="number" placeholder="排序" />
        <button class="button" :disabled="saving" @click="addPermission">创建权限</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>角色权限分配</h3>
          <p v-if="selectedRole">当前角色：{{ selectedRole.roleName }} / {{ selectedRole.roleCode }}</p>
        </div>
        <select v-model="permissionTypeFilter" class="input compact" @change="load">
          <option value="">全部权限</option>
          <option value="MENU">菜单</option>
          <option value="BUTTON">按钮</option>
          <option value="API">接口</option>
        </select>
      </div>

      <div class="role-tabs">
        <button
          v-for="role in roles"
          :key="role.id"
          :class="{ active: selectedRoleId === role.id }"
          @click="loadRolePermissions(role.id)"
        >
          {{ role.roleName }}
        </button>
      </div>

      <div v-if="selectedRoleId" class="check-grid">
        <label v-for="permission in permissions" :key="permission.id" class="check-item">
          <input
            type="checkbox"
            :checked="rolePermissionIds.includes(permission.id)"
            @change="toggleRolePermission(permission.id)"
          />
          <span>{{ permission.permissionName }}</span>
          <small>{{ permission.permissionCode }}</small>
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
          <option v-for="user in users" :key="user.id" :value="user.id">
            {{ user.nickname || user.username }} / {{ user.username }} / ID {{ user.id }}
          </option>
        </select>
      </div>

      <div class="check-grid">
        <label v-for="role in roles" :key="role.id" class="check-item">
          <input
            type="checkbox"
            :checked="userRoleIds.includes(role.id)"
            @change="toggleUserRole(role.id)"
          />
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
      <div class="code-list">
        <span v-for="code in userPermissionView.permissionCodes" :key="code">{{ code }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page-head,
.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}

.compact {
  width: 150px;
  margin: 0;
}

.user-select {
  max-width: 360px;
  margin: 0;
}

.role-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 14px 0;
}

.role-tabs button {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  padding: 8px 10px;
  cursor: pointer;
}

.role-tabs button.active {
  background: #111827;
  color: #fff;
  border-color: #111827;
}

.check-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 8px;
  margin: 16px 0;
}

.check-item {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 8px;
  row-gap: 2px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
  background: #f9fafb;
  font-size: 14px;
}

.check-item small {
  grid-column: 2;
  color: #6b7280;
}

.code-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.code-list span {
  background: #eef2ff;
  color: #3730a3;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 13px;
}

.message {
  color: #ef4444;
}
</style>
