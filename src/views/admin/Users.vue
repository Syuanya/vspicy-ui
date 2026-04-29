<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getUserPermissionView } from '../../api/admin'
import { listUsers, updateUserStatus, updateUserType } from '../../api/user'

const users = ref<any[]>([])
const selectedPermissionView = ref<any>(null)
const keyword = ref('')
const status = ref('')
const userType = ref('')
const loading = ref(false)
const operatingId = ref<number | null>(null)
const message = ref('')

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

function statusLabel(value: number) {
  return statusOptions.find((item) => item.value === value)?.label || `状态 ${value}`
}

function typeLabel(value: number) {
  return typeOptions.find((item) => item.value === value)?.label || `类型 ${value}`
}

async function load() {
  loading.value = true
  message.value = ''
  try {
    const params: any = { limit: 100 }
    if (keyword.value) params.keyword = keyword.value
    if (status.value) params.status = Number(status.value)
    if (userType.value) params.userType = Number(userType.value)
    const res: any = await listUsers(params)
    if (res.code === 0) {
      users.value = res.data || []
    } else {
      message.value = res.message || '用户列表加载失败'
    }
  } catch (error: any) {
    message.value = error?.message || '用户列表加载失败'
  } finally {
    loading.value = false
  }
}

async function inspectPermissions(userId: number) {
  const res: any = await getUserPermissionView(userId)
  if (res.code === 0) {
    selectedPermissionView.value = res.data
  }
}

async function changeStatus(userId: number, nextStatus: number) {
  operatingId.value = userId
  message.value = ''
  try {
    const res: any = await updateUserStatus(userId, nextStatus)
    if (res.code !== 0) {
      message.value = res.message || '用户状态更新失败'
      return
    }
    await load()
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
  try {
    const res: any = await updateUserType(userId, Number(nextType))
    if (res.code !== 0) {
      message.value = res.message || '用户类型更新失败'
      return
    }
    await load()
  } catch (error: any) {
    message.value = error?.message || '用户类型更新失败'
  } finally {
    operatingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <section class="card">
    <div class="page-head">
      <div>
        <h2>用户管理</h2>
        <p>查询用户资料、状态、类型，并联动查看 RBAC 权限视图。</p>
      </div>
      <button class="button" :disabled="loading" @click="load">{{ loading ? '加载中' : '刷新' }}</button>
    </div>

    <div class="filters">
      <input v-model="keyword" class="input" placeholder="用户名 / 昵称 / 邮箱 / 手机" />
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
    </div>

    <p v-if="message" class="error">{{ message }}</p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>昵称</th>
            <th>邮箱</th>
            <th>状态</th>
            <th>类型</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.username }}</td>
            <td>{{ user.nickname || '-' }}</td>
            <td>{{ user.email || '-' }}</td>
            <td>
              <span class="status-pill">{{ statusLabel(user.status) }}</span>
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
            <td>
              <div class="actions">
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
                  class="text-button danger"
                  :disabled="operatingId === user.id"
                  @click="changeStatus(user.id, 2)"
                >
                  禁用
                </button>
                <button
                  v-if="user.status !== 3"
                  class="text-button danger"
                  :disabled="operatingId === user.id"
                  @click="changeStatus(user.id, 3)"
                >
                  注销
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="selectedPermissionView" class="panel">
      <h3>用户 {{ selectedPermissionView.userId }} 的权限视图</h3>
      <p>角色：{{ (selectedPermissionView.roles || []).map((x: any) => x.roleName || x.roleCode).join('、') || '-' }}</p>
      <p>权限：{{ (selectedPermissionView.permissionCodes || []).join('、') || '-' }}</p>
    </div>
  </section>
</template>

<style scoped>
.page-head,
.filters {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.page-head {
  justify-content: space-between;
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

.panel {
  margin-top: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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

.danger {
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

.inline-select {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 6px 8px;
  background: #fff;
}

.error {
  color: #dc2626;
}
</style>
