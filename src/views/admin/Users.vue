<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  assignUserRoles,
  getUserPermissionView,
  getUserRoles,
  listRoles
} from '../../api/admin'
import {
  getUserDetail,
  getUserOverview,
  listUsers,
  resetUserPassword,
  updateUser,
  updateUserStatus,
  updateUserType
} from '../../api/user'

type UserItem = {
  id: number
  username: string
  nickname?: string
  avatarUrl?: string
  email?: string
  phone?: string
  status: number
  userType: number
  lastLoginAt?: string
  createdAt?: string
  updatedAt?: string
}

type RoleItem = {
  id: number
  roleCode: string
  roleName: string
  status?: number
}

const users = ref<UserItem[]>([])
const roles = ref<RoleItem[]>([])
const selectedPermissionView = ref<any>(null)
const selectedUser = ref<UserItem | null>(null)
const selectedUserRoles = ref<number[]>([])
const overview = ref<any>(null)

const keyword = ref('')
const status = ref('')
const userType = ref('')
const loading = ref(false)
const operatingId = ref<number | null>(null)
const message = ref('')
const successMessage = ref('')

const editForm = reactive({
  nickname: '',
  avatarUrl: '',
  email: '',
  phone: '',
  status: 1,
  userType: 1
})

const resetForm = reactive({
  password: 'admin123456',
  confirmPassword: 'admin123456'
})

const statusOptions = [
  { value: 1, label: '正常' },
  { value: 2, label: '禁用' },
  { value: 3, label: '注销' }
]

const typeOptions = [
  { value: 1, label: '普通用户' },
  { value: 2, label: '创作者' },
  { value: 9, label: '管理员' }
]

const overviewCards = computed(() => {
  const data = overview.value || {}
  return [
    { label: '用户总数', value: data.totalUsers ?? 0 },
    { label: '正常用户', value: data.activeUsers ?? 0 },
    { label: '禁用用户', value: data.disabledUsers ?? 0 },
    { label: '今日新增', value: data.todayNewUsers ?? 0 },
    { label: '创作者', value: data.creatorUsers ?? 0 },
    { label: '管理员', value: data.adminUsers ?? 0 },
    { label: '近 7 日登录', value: data.recentLoginUsers ?? 0 }
  ]
})

function statusLabel(value: number) {
  return statusOptions.find((item) => item.value === value)?.label || `状态 ${value}`
}

function typeLabel(value: number) {
  return typeOptions.find((item) => item.value === value)?.label || `类型 ${value}`
}

function statusClass(value: number) {
  if (value === 1) return 'success'
  if (value === 2) return 'danger'
  return 'muted'
}

function formatTime(value?: string) {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 19)
}

async function loadOverview() {
  const res: any = await getUserOverview()
  if (res.code === 0) {
    overview.value = res.data
  }
}

async function loadRoles() {
  const res: any = await listRoles()
  if (res.code === 0) {
    roles.value = (res.data || []).filter((item: RoleItem) => item.status == null || item.status === 1)
  }
}

async function load() {
  loading.value = true
  message.value = ''
  successMessage.value = ''
  try {
    const params: any = { limit: 200 }
    if (keyword.value) params.keyword = keyword.value
    if (status.value) params.status = Number(status.value)
    if (userType.value) params.userType = Number(userType.value)
    const [overviewRes, userRes]: any[] = await Promise.all([getUserOverview(), listUsers(params)])
    if (overviewRes.code === 0) overview.value = overviewRes.data
    if (userRes.code === 0) {
      users.value = userRes.data || []
    } else {
      message.value = userRes.message || '用户列表加载失败'
    }
  } catch (error: any) {
    message.value = error?.message || '用户列表加载失败'
  } finally {
    loading.value = false
  }
}

async function inspectPermissions(userId: number) {
  message.value = ''
  const res: any = await getUserPermissionView(userId)
  if (res.code === 0) {
    selectedPermissionView.value = res.data
  } else {
    message.value = res.message || '权限视图加载失败'
  }
}

async function openDetail(user: UserItem) {
  message.value = ''
  successMessage.value = ''
  selectedUser.value = user
  Object.assign(editForm, {
    nickname: user.nickname || '',
    avatarUrl: user.avatarUrl || '',
    email: user.email || '',
    phone: user.phone || '',
    status: user.status,
    userType: user.userType
  })
  resetForm.password = 'admin123456'
  resetForm.confirmPassword = 'admin123456'
  try {
    const [detailRes, rolesRes, permissionRes]: any[] = await Promise.all([
      getUserDetail(user.id),
      getUserRoles(user.id),
      getUserPermissionView(user.id)
    ])
    if (detailRes.code === 0 && detailRes.data?.user) {
      selectedUser.value = detailRes.data.user
      Object.assign(editForm, {
        nickname: selectedUser.value?.nickname || '',
        avatarUrl: selectedUser.value?.avatarUrl || '',
        email: selectedUser.value?.email || '',
        phone: selectedUser.value?.phone || '',
        status: selectedUser.value?.status || 1,
        userType: selectedUser.value?.userType || 1
      })
    }
    if (rolesRes.code === 0) {
      selectedUserRoles.value = (rolesRes.data || []).map((item: RoleItem) => item.id)
    }
    if (permissionRes.code === 0) {
      selectedPermissionView.value = permissionRes.data
    }
  } catch (error: any) {
    message.value = error?.message || '用户详情加载失败'
  }
}

async function changeStatus(userId: number, nextStatus: number) {
  operatingId.value = userId
  message.value = ''
  successMessage.value = ''
  try {
    const res: any = await updateUserStatus(userId, nextStatus)
    if (res.code !== 0) {
      message.value = res.message || '用户状态更新失败'
      return
    }
    successMessage.value = '用户状态已更新'
    await load()
    if (selectedUser.value?.id === userId) await openDetail(res.data)
  } catch (error: any) {
    message.value = error?.message || '用户状态更新失败'
  } finally {
    operatingId.value = null
  }
}

async function changeType(userId: number, nextType: string) {
  if (!nextType) return
  operatingId.value = userId
  message.value = ''
  successMessage.value = ''
  try {
    const res: any = await updateUserType(userId, Number(nextType))
    if (res.code !== 0) {
      message.value = res.message || '用户类型更新失败'
      return
    }
    successMessage.value = '用户类型已更新'
    await load()
    if (selectedUser.value?.id === userId) await openDetail(res.data)
  } catch (error: any) {
    message.value = error?.message || '用户类型更新失败'
  } finally {
    operatingId.value = null
  }
}

async function saveProfile() {
  if (!selectedUser.value) return
  operatingId.value = selectedUser.value.id
  message.value = ''
  successMessage.value = ''
  try {
    const res: any = await updateUser(selectedUser.value.id, {
      nickname: editForm.nickname,
      avatarUrl: editForm.avatarUrl,
      email: editForm.email,
      phone: editForm.phone,
      status: editForm.status,
      userType: editForm.userType
    })
    if (res.code !== 0) {
      message.value = res.message || '用户资料保存失败'
      return
    }
    successMessage.value = '用户资料已保存'
    await load()
    await openDetail(res.data)
  } catch (error: any) {
    message.value = error?.message || '用户资料保存失败'
  } finally {
    operatingId.value = null
  }
}

async function saveRoles() {
  if (!selectedUser.value) return
  operatingId.value = selectedUser.value.id
  message.value = ''
  successMessage.value = ''
  try {
    const res: any = await assignUserRoles(selectedUser.value.id, selectedUserRoles.value)
    if (res.code !== 0) {
      message.value = res.message || '角色分配失败'
      return
    }
    successMessage.value = '用户角色已保存'
    await inspectPermissions(selectedUser.value.id)
  } catch (error: any) {
    message.value = error?.message || '角色分配失败'
  } finally {
    operatingId.value = null
  }
}

async function resetPassword() {
  if (!selectedUser.value) return
  if (!resetForm.password || resetForm.password.length < 6) {
    message.value = '新密码至少 6 位'
    return
  }
  if (resetForm.password !== resetForm.confirmPassword) {
    message.value = '两次输入的新密码不一致'
    return
  }
  if (!window.confirm(`确认重置用户 ${selectedUser.value.username} 的密码？`)) {
    return
  }
  operatingId.value = selectedUser.value.id
  message.value = ''
  successMessage.value = ''
  try {
    const res: any = await resetUserPassword(selectedUser.value.id, resetForm.password)
    if (res.code !== 0) {
      message.value = res.message || '密码重置失败'
      return
    }
    successMessage.value = '密码已重置，请通知用户及时修改'
  } catch (error: any) {
    message.value = error?.message || '密码重置失败'
  } finally {
    operatingId.value = null
  }
}

onMounted(async () => {
  await Promise.all([load(), loadRoles()])
  await loadOverview()
})
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h2>用户管理</h2>
        <p>集中管理用户资料、账号状态、用户类型、角色分配、密码重置与最终权限视图。</p>
      </div>
      <button class="button" :disabled="loading" @click="load">{{ loading ? '加载中' : '刷新' }}</button>
    </div>

    <div class="metrics">
      <article v-for="item in overviewCards" :key="item.label" class="metric-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </div>

    <div class="card">
      <div class="filters">
        <input v-model.trim="keyword" class="input" placeholder="用户名 / 昵称 / 邮箱 / 手机" @keyup.enter="load" />
        <select v-model="status" class="input">
          <option value="">全部状态</option>
          <option value="1">正常</option>
          <option value="2">禁用</option>
          <option value="3">注销</option>
        </select>
        <select v-model="userType" class="input">
          <option value="">全部类型</option>
          <option value="1">普通用户</option>
          <option value="2">创作者</option>
          <option value="9">管理员</option>
        </select>
        <button class="button" :disabled="loading" @click="load">查询</button>
      </div>

      <p v-if="message" class="error">{{ message }}</p>
      <p v-if="successMessage" class="success-message">{{ successMessage }}</p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>昵称</th>
              <th>联系方式</th>
              <th>状态</th>
              <th>类型</th>
              <th>创建时间</th>
              <th>最近登录</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.id }}</td>
              <td>
                <strong>{{ user.username }}</strong>
              </td>
              <td>{{ user.nickname || '-' }}</td>
              <td>
                <div>{{ user.email || '-' }}</div>
                <small>{{ user.phone || '-' }}</small>
              </td>
              <td>
                <span class="status-pill" :class="statusClass(user.status)">{{ statusLabel(user.status) }}</span>
              </td>
              <td>
                <select
                  class="inline-select"
                  :value="user.userType"
                  :disabled="operatingId === user.id"
                  @change="changeType(user.id, ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="item in typeOptions" :key="item.value" :value="item.value">
                    {{ item.label }}
                  </option>
                </select>
              </td>
              <td>{{ formatTime(user.createdAt) }}</td>
              <td>{{ formatTime(user.lastLoginAt) }}</td>
              <td>
                <div class="actions">
                  <button class="text-button" @click="openDetail(user)">详情</button>
                  <button class="text-button" @click="inspectPermissions(user.id)">权限视图</button>
                  <button
                    v-if="user.status !== 1"
                    class="text-button"
                    :disabled="operatingId === user.id"
                    @click="changeStatus(user.id, 1)"
                  >
                    启用
                  </button>
                  <button
                    v-if="user.status !== 2"
                    class="text-button danger-text"
                    :disabled="operatingId === user.id"
                    @click="changeStatus(user.id, 2)"
                  >
                    禁用
                  </button>
                  <button
                    v-if="user.status !== 3"
                    class="text-button danger-text"
                    :disabled="operatingId === user.id"
                    @click="changeStatus(user.id, 3)"
                  >
                    注销
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && users.length === 0">
              <td colspan="9" class="empty">暂无用户数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="selectedUser" class="detail-grid">
      <section class="card panel">
        <div class="panel-head">
          <h3>用户详情：{{ selectedUser.username }}</h3>
          <span class="status-pill" :class="statusClass(editForm.status)">{{ statusLabel(editForm.status) }}</span>
        </div>
        <div class="form-grid">
          <label>
            昵称
            <input v-model.trim="editForm.nickname" class="input" placeholder="用户昵称" />
          </label>
          <label>
            邮箱
            <input v-model.trim="editForm.email" class="input" placeholder="邮箱" />
          </label>
          <label>
            手机号
            <input v-model.trim="editForm.phone" class="input" placeholder="手机号" />
          </label>
          <label>
            头像 URL
            <input v-model.trim="editForm.avatarUrl" class="input" placeholder="头像 URL" />
          </label>
          <label>
            状态
            <select v-model.number="editForm.status" class="input">
              <option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
          <label>
            用户类型
            <select v-model.number="editForm.userType" class="input">
              <option v-for="item in typeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
        </div>
        <button class="button primary" :disabled="operatingId === selectedUser.id" @click="saveProfile">保存资料</button>
      </section>

      <section class="card panel">
        <h3>角色分配</h3>
        <div class="role-list">
          <label v-for="role in roles" :key="role.id" class="role-item">
            <input v-model="selectedUserRoles" type="checkbox" :value="role.id" />
            <span>
              <strong>{{ role.roleName }}</strong>
              <small>{{ role.roleCode }}</small>
            </span>
          </label>
        </div>
        <button class="button primary" :disabled="!selectedUser || operatingId === selectedUser.id" @click="saveRoles">
          保存角色
        </button>
      </section>

      <section class="card panel">
        <h3>密码重置</h3>
        <p class="hint">当前后端仍处于开发态明文密码兼容模式。正式环境需要替换为 BCrypt / Argon2id。</p>
        <div class="form-grid one">
          <label>
            新密码
            <input v-model="resetForm.password" class="input" type="password" autocomplete="new-password" />
          </label>
          <label>
            确认新密码
            <input v-model="resetForm.confirmPassword" class="input" type="password" autocomplete="new-password" />
          </label>
        </div>
        <button class="button danger" :disabled="!selectedUser || operatingId === selectedUser.id" @click="resetPassword">
          重置密码
        </button>
      </section>
    </div>

    <div v-if="selectedPermissionView" class="card panel">
      <h3>用户 {{ selectedPermissionView.userId }} 的最终权限视图</h3>
      <p>角色：{{ (selectedPermissionView.roles || []).map((x: any) => x.roleName || x.roleCode).join('、') || '-' }}</p>
      <div class="permission-list">
        <span v-for="code in selectedPermissionView.permissionCodes || []" :key="code">{{ code }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
}

.page-head,
.filters,
.panel-head {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.page-head,
.panel-head {
  justify-content: space-between;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.metric-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 14px;
  background: #fff;
}

.metric-card span {
  color: #64748b;
  font-size: 13px;
}

.metric-card strong {
  display: block;
  margin-top: 6px;
  font-size: 24px;
}

.card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 16px;
  background: #fff;
}

.filters .input {
  max-width: 240px;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
}

th,
td {
  border-bottom: 1px solid #e5e7eb;
  padding: 10px;
  text-align: left;
  vertical-align: top;
}

small,
.hint {
  color: #64748b;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(320px, 1.3fr) minmax(280px, 1fr) minmax(280px, 1fr);
  gap: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 12px 0;
}

.form-grid.one {
  grid-template-columns: 1fr;
}

.form-grid label {
  display: grid;
  gap: 6px;
  color: #475569;
  font-size: 13px;
}

.actions,
.role-list,
.permission-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.role-list {
  align-items: stretch;
  margin: 12px 0;
}

.role-item {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 8px 10px;
  min-width: 160px;
}

.role-item span {
  display: grid;
}

.permission-list span {
  border-radius: 999px;
  background: #f1f5f9;
  color: #334155;
  padding: 4px 8px;
  font-size: 12px;
}

.text-button {
  border: 0;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
}

.text-button:disabled {
  color: #94a3b8;
  cursor: wait;
}

.button {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  padding: 8px 12px;
  cursor: pointer;
}

.button.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.button.danger {
  background: #dc2626;
  border-color: #dc2626;
  color: #fff;
}

.danger-text {
  color: #dc2626;
}

.status-pill {
  display: inline-flex;
  border-radius: 999px;
  background: #eef2ff;
  color: #3730a3;
  padding: 2px 8px;
  font-size: 12px;
}

.status-pill.success {
  background: #dcfce7;
  color: #166534;
}

.status-pill.danger {
  background: #fee2e2;
  color: #991b1b;
}

.status-pill.muted {
  background: #f1f5f9;
  color: #475569;
}

.inline-select,
.input {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
}

.error {
  color: #dc2626;
}

.success-message {
  color: #15803d;
}

.empty {
  text-align: center;
  color: #64748b;
  padding: 24px;
}

@media (max-width: 1100px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
