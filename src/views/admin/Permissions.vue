<script setup lang="ts">
import { onMounted, ref } from 'vue'
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

const roles = ref<any[]>([])
const permissions = ref<any[]>([])
const selectedRoleId = ref<number | null>(null)
const rolePermissionIds = ref<number[]>([])
const userId = ref(1)
const userRoleIds = ref<number[]>([])
const userPermissionView = ref<any>(null)
const message = ref('')

const roleForm = ref({ roleCode: '', roleName: '', description: '' })
const permissionForm = ref({
  permissionCode: '',
  permissionName: '',
  permissionType: 'MENU',
  path: '',
  component: '',
  sortNo: 0
})

async function load() {
  const roleRes: any = await listRoles()
  const permissionRes: any = await listPermissions()
  if (roleRes.code === 0) roles.value = roleRes.data || []
  if (permissionRes.code === 0) permissions.value = permissionRes.data || []
}

async function addRole() {
  if (!roleForm.value.roleCode || !roleForm.value.roleName) {
    alert('角色编码和名称不能为空')
    return
  }
  const res: any = await createRole(roleForm.value)
  if (res.code === 0) {
    message.value = '角色已创建'
    roleForm.value = { roleCode: '', roleName: '', description: '' }
    await load()
  } else {
    message.value = res.message || '创建失败'
  }
}

async function addPermission() {
  if (!permissionForm.value.permissionCode || !permissionForm.value.permissionName) {
    alert('权限编码和名称不能为空')
    return
  }
  const res: any = await createPermission(permissionForm.value)
  if (res.code === 0) {
    message.value = '权限已创建'
    permissionForm.value = {
      permissionCode: '',
      permissionName: '',
      permissionType: 'MENU',
      path: '',
      component: '',
      sortNo: 0
    }
    await load()
  } else {
    message.value = res.message || '创建失败'
  }
}

async function loadRolePermissions(roleId: number) {
  selectedRoleId.value = roleId
  const res: any = await getRolePermissions(roleId)
  if (res.code === 0) {
    rolePermissionIds.value = (res.data || []).map((x: any) => x.id)
  }
}

async function saveRolePermissions() {
  if (!selectedRoleId.value) {
    alert('请先选择角色')
    return
  }
  const res: any = await assignRolePermissions(selectedRoleId.value, rolePermissionIds.value)
  message.value = res.code === 0 ? '角色权限已保存' : (res.message || '保存失败')
}

async function loadUserRoles() {
  const res: any = await getUserRoles(Number(userId.value))
  if (res.code === 0) {
    userRoleIds.value = (res.data || []).map((x: any) => x.id)
  }
  await loadUserPermissionView()
}

async function saveUserRoles() {
  const res: any = await assignUserRoles(Number(userId.value), userRoleIds.value)
  if (res.code === 0) {
    message.value = '用户角色已保存'
    await loadUserPermissionView()
  } else {
    message.value = res.message || '保存失败'
  }
}

async function loadUserPermissionView() {
  const res: any = await getUserPermissionView(Number(userId.value))
  if (res.code === 0) {
    userPermissionView.value = res.data
  }
}

function toggleRolePermission(id: number) {
  rolePermissionIds.value = rolePermissionIds.value.includes(id)
    ? rolePermissionIds.value.filter((x) => x !== id)
    : [...rolePermissionIds.value, id]
}

function toggleUserRole(id: number) {
  userRoleIds.value = userRoleIds.value.includes(id)
    ? userRoleIds.value.filter((x) => x !== id)
    : [...userRoleIds.value, id]
}

onMounted(async () => {
  await load()
  await loadUserRoles()
})
</script>

<template>
  <section class="card">
    <h2>权限管理</h2>
    <p>RBAC 基础版：角色、权限、用户角色、角色权限、用户权限视图。</p>

    <p v-if="message" style="color: #ef4444;">{{ message }}</p>

    <div class="grid">
      <div class="panel">
        <h3>新增角色</h3>
        <input v-model="roleForm.roleCode" class="input" placeholder="roleCode，例如 REVIEWER" />
        <input v-model="roleForm.roleName" class="input" placeholder="roleName，例如 审核员" />
        <input v-model="roleForm.description" class="input" placeholder="描述" />
        <button class="button" @click="addRole">创建角色</button>
      </div>

      <div class="panel">
        <h3>新增权限</h3>
        <input v-model="permissionForm.permissionCode" class="input" placeholder="permissionCode，例如 article:delete" />
        <input v-model="permissionForm.permissionName" class="input" placeholder="权限名称" />
        <select v-model="permissionForm.permissionType" class="input">
          <option value="MENU">MENU</option>
          <option value="BUTTON">BUTTON</option>
          <option value="API">API</option>
        </select>
        <input v-model="permissionForm.path" class="input" placeholder="菜单路径，可选" />
        <input v-model="permissionForm.component" class="input" placeholder="组件名，可选" />
        <button class="button" @click="addPermission">创建权限</button>
      </div>
    </div>

    <div class="panel">
      <h3>角色权限分配</h3>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button
          v-for="role in roles"
          :key="role.id"
          class="button"
          :style="{ background: selectedRoleId === role.id ? '#2563eb' : '#111827' }"
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
          {{ permission.permissionName }} / {{ permission.permissionCode }}
        </label>
      </div>

      <button class="button" :disabled="!selectedRoleId" @click="saveRolePermissions">保存角色权限</button>
    </div>

    <div class="panel">
      <h3>用户角色分配</h3>
      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <input v-model="userId" class="input" style="max-width: 160px; margin: 0;" placeholder="userId" />
        <button class="button" @click="loadUserRoles">查询用户角色</button>
        <button class="button" @click="saveUserRoles">保存用户角色</button>
      </div>

      <div class="check-grid">
        <label v-for="role in roles" :key="role.id" class="check-item">
          <input
            type="checkbox"
            :checked="userRoleIds.includes(role.id)"
            @change="toggleUserRole(role.id)"
          />
          {{ role.roleName }} / {{ role.roleCode }}
        </label>
      </div>
    </div>

    <div v-if="userPermissionView" class="panel">
      <h3>用户权限视图：userId={{ userPermissionView.userId }}</h3>
      <p><strong>角色：</strong>{{ userPermissionView.roles.map((x: any) => x.roleName).join('，') || '-' }}</p>
      <p><strong>菜单：</strong>{{ userPermissionView.menus.map((x: any) => x.permissionName).join('，') || '-' }}</p>
      <p><strong>权限码：</strong></p>
      <div class="code-list">
        <span v-for="code in userPermissionView.permissionCodes" :key="code">{{ code }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.panel {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}

.check-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 8px;
  margin: 16px 0;
}

.check-item {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 10px;
  background: #f9fafb;
  font-size: 14px;
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
</style>
