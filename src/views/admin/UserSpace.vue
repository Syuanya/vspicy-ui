<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  listUserSpaceRecords,
  listUserSpaces,
  reconcileUserSpace
} from '../../api/userSpace'

const users = ref<any[]>([])
const records = ref<any[]>([])
const selectedUser = ref<any>(null)
const keyword = ref('')
const loading = ref(false)
const recordLoading = ref(false)
const message = ref('')

async function loadUsers() {
  loading.value = true
  message.value = ''
  try {
    const res: any = await listUserSpaces({
      keyword: keyword.value || undefined,
      limit: 200
    })
    if (res.code === 0) {
      users.value = res.data || []
    } else {
      message.value = res.message || '加载用户空间失败'
    }
  } finally {
    loading.value = false
  }
}

async function selectUser(user: any) {
  selectedUser.value = user
  recordLoading.value = true
  message.value = ''
  try {
    const res: any = await listUserSpaceRecords(user.userId, 200)
    if (res.code === 0) {
      records.value = res.data || []
    } else {
      message.value = res.message || '加载上传记录失败'
    }
  } finally {
    recordLoading.value = false
  }
}

async function reconcile(user: any) {
  if (!confirm(`确认校准 userId=${user.userId} 的上传配额？`)) return

  const res: any = await reconcileUserSpace(user.userId)
  if (res.code === 0) {
    message.value = `用户 ${user.userId} 配额校准完成`
    await loadUsers()
    if (selectedUser.value?.userId === user.userId) {
      const updated = users.value.find((item) => item.userId === user.userId)
      selectedUser.value = updated || selectedUser.value
      await selectUser(selectedUser.value)
    }
  } else {
    message.value = res.message || '校准失败'
  }
}

function statusClass(status: string) {
  if (status === 'CONFIRMED') return 'status confirmed'
  if (status === 'RELEASED') return 'status released'
  if (status === 'DELETED') return 'status deleted'
  return 'status'
}

function consistencyText(user: any) {
  return user.consistent ? '一致' : '不一致'
}

function consistencyClass(user: any) {
  return user.consistent ? 'consistency ok' : 'consistency bad'
}

onMounted(loadUsers)
</script>

<template>
  <section class="card">
    <div class="top">
      <div>
        <h2>用户空间</h2>
        <p>查看用户上传空间占用、上传记录和配额一致性。</p>
      </div>
      <button class="button" :disabled="loading" @click="loadUsers">
        {{ loading ? '加载中...' : '刷新' }}
      </button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="panel">
      <h3>用户空间列表</h3>
      <div class="toolbar">
        <input
          v-model="keyword"
          class="input"
          placeholder="搜索 userId / username / nickname"
          @keyup.enter="loadUsers"
        />
        <button class="button" @click="loadUsers">搜索</button>
      </div>

      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>userId</th>
              <th>用户名</th>
              <th>昵称</th>
              <th>会员</th>
              <th>今日</th>
              <th>本月</th>
              <th>总空间</th>
              <th>CONFIRMED</th>
              <th>RELEASED</th>
              <th>总记录</th>
              <th>一致性</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.userId" :class="{ active: selectedUser?.userId === user.userId }">
              <td>{{ user.userId }}</td>
              <td>{{ user.username || '-' }}</td>
              <td>{{ user.nickname || '-' }}</td>
              <td>{{ user.planCode || 'FREE' }}</td>
              <td>{{ user.dailyUsedMb }}MB</td>
              <td>{{ user.monthlyUsedMb }}MB</td>
              <td><strong>{{ user.totalUsedMb }}MB</strong></td>
              <td>{{ user.confirmedRecordCount }}</td>
              <td>{{ user.releasedRecordCount }}</td>
              <td>{{ user.totalRecordCount }}</td>
              <td><span :class="consistencyClass(user)">{{ consistencyText(user) }}</span></td>
              <td>
                <button class="plain" @click="selectUser(user)">记录</button>
                <button class="plain warning" @click="reconcile(user)">校准</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="users.length === 0" class="empty">暂无用户空间数据</div>
    </div>

    <div class="panel">
      <h3>上传记录</h3>
      <p v-if="selectedUser">
        当前用户：userId={{ selectedUser.userId }}，
        username={{ selectedUser.username || '-' }}，
        totalUsed={{ selectedUser.totalUsedMb }}MB
      </p>
      <p v-else>请先在用户空间列表中选择一个用户。</p>

      <div v-if="recordLoading">记录加载中...</div>

      <div style="overflow-x: auto;">
        <table v-if="records.length > 0">
          <thead>
            <tr>
              <th>ID</th>
              <th>videoId</th>
              <th>文件名</th>
              <th>大小</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>释放时间</th>
              <th>释放原因</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in records" :key="item.id">
              <td>{{ item.id }}</td>
              <td>{{ item.videoId || '-' }}</td>
              <td>{{ item.fileName || '-' }}</td>
              <td>{{ item.sizeMb }}MB</td>
              <td><span :class="statusClass(item.status)">{{ item.status }}</span></td>
              <td>{{ item.createdAt }}</td>
              <td>{{ item.releasedAt || '-' }}</td>
              <td>{{ item.releaseReason || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="selectedUser && !recordLoading && records.length === 0" class="empty">该用户暂无上传记录</div>
    </div>
  </section>
</template>

<style scoped>
.top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.message {
  color: #ef4444;
}

.panel {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.toolbar .input {
  max-width: 320px;
  margin: 0;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  border-bottom: 1px solid #e5e7eb;
  padding: 9px;
  text-align: left;
  white-space: nowrap;
  font-size: 13px;
}

tr.active {
  background: #eff6ff;
}

.status,
.consistency {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #374151;
  font-size: 12px;
}

.status.confirmed,
.consistency.ok {
  background: #dcfce7;
  color: #166534;
}

.status.released {
  background: #dbeafe;
  color: #1d4ed8;
}

.status.deleted,
.consistency.bad {
  background: #fee2e2;
  color: #991b1b;
}

.plain {
  border: none;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  margin-right: 8px;
}

.plain.warning {
  color: #b45309;
}

.empty {
  margin-top: 14px;
  color: #6b7280;
}
</style>
