<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  listStorageAlertNotifications,
  retryStorageAlertNotification,
  syncStorageAlertNotifications
} from '../../api/storageAlertNotification'

const loading = ref(false)
const syncing = ref(false)
const message = ref('')
const rows = ref<any[]>([])

const filter = ref({
  status: '',
  limit: 100
})

const syncForm = ref({
  limit: 100,
  level: '',
  targetUserId: 1
})

async function load() {
  loading.value = true
  message.value = ''
  try {
    const res: any = await listStorageAlertNotifications({
      status: filter.value.status || undefined,
      limit: Number(filter.value.limit)
    })

    if (res.code === 0) {
      rows.value = res.data || []
    } else {
      message.value = res.message || '加载告警通知 outbox 失败'
    }
  } finally {
    loading.value = false
  }
}

async function sync() {
  syncing.value = true
  message.value = ''
  try {
    const res: any = await syncStorageAlertNotifications({
      limit: Number(syncForm.value.limit),
      level: syncForm.value.level || undefined,
      targetUserId: Number(syncForm.value.targetUserId)
    })

    if (res.code === 0) {
      message.value = `同步完成：created=${res.data.outboxCreatedCount}, sent=${res.data.sentCount}, skipped=${res.data.skippedCount}, failed=${res.data.failedCount}`
      await load()
    } else {
      message.value = res.message || '同步失败'
    }
  } finally {
    syncing.value = false
  }
}

async function retry(item: any) {
  const res: any = await retryStorageAlertNotification(item.id)
  if (res.code === 0) {
    message.value = '已重试'
    await load()
  } else {
    message.value = res.message || '重试失败'
  }
}

function statusClass(status: string) {
  if (status === 'SENT') return 'status sent'
  if (status === 'PENDING') return 'status pending'
  if (status === 'SKIPPED') return 'status skipped'
  if (status === 'FAILED') return 'status failed'
  return 'status'
}

function levelClass(level: string) {
  if (level === 'CRITICAL') return 'level critical'
  if (level === 'HIGH') return 'level high'
  if (level === 'WARN') return 'level warn'
  return 'level info'
}

onMounted(load)
</script>

<template>
  <section class="card">
    <div class="top">
      <div>
        <h2>告警通知</h2>
        <p>将存储告警同步到通知 outbox，并尝试写入现有站内通知表。</p>
      </div>
      <button class="button" :disabled="loading" @click="load">
        {{ loading ? '加载中...' : '刷新' }}
      </button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="panel">
      <h3>同步通知</h3>
      <div class="form-grid">
        <input v-model="syncForm.limit" class="input" type="number" placeholder="limit" />
        <select v-model="syncForm.level" class="input">
          <option value="">全部级别</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="WARN">WARN</option>
          <option value="INFO">INFO</option>
        </select>
        <input v-model="syncForm.targetUserId" class="input" type="number" placeholder="targetUserId" />
      </div>
      <button class="button" :disabled="syncing" @click="sync">
        {{ syncing ? '同步中...' : '同步通知' }}
      </button>
    </div>

    <div class="panel">
      <h3>筛选</h3>
      <div class="form-grid">
        <select v-model="filter.status" class="input">
          <option value="">全部状态</option>
          <option value="PENDING">PENDING</option>
          <option value="SENT">SENT</option>
          <option value="SKIPPED">SKIPPED</option>
          <option value="FAILED">FAILED</option>
        </select>
        <input v-model="filter.limit" class="input" type="number" placeholder="limit" />
      </div>
      <button class="button" @click="load">查询</button>
    </div>

    <div class="panel">
      <h3>Outbox</h3>
      <div v-if="rows.length === 0" class="empty">暂无 outbox 记录</div>

      <div style="overflow-x:auto;">
        <table v-if="rows.length > 0">
          <thead>
            <tr>
              <th>ID</th>
              <th>状态</th>
              <th>级别</th>
              <th>用户</th>
              <th>标题</th>
              <th>类型</th>
              <th>objectKey</th>
              <th>通知表</th>
              <th>错误</th>
              <th>重试</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in rows" :key="item.id">
              <td>{{ item.id }}</td>
              <td><span :class="statusClass(item.status)">{{ item.status }}</span></td>
              <td><span :class="levelClass(item.alertLevel)">{{ item.alertLevel }}</span></td>
              <td>{{ item.targetUserId }}</td>
              <td>
                <strong>{{ item.title }}</strong>
                <p class="content">{{ item.content }}</p>
              </td>
              <td>{{ item.alertCode }}</td>
              <td class="key">{{ item.objectKey || '-' }}</td>
              <td>{{ item.notificationTable || '-' }}</td>
              <td class="error">{{ item.errorMessage || '-' }}</td>
              <td>{{ item.retryCount }}</td>
              <td>{{ item.createdAt }}</td>
              <td>
                <button
                  v-if="item.status === 'FAILED' || item.status === 'SKIPPED'"
                  class="plain"
                  @click="retry(item)"
                >
                  重试
                </button>
                <span v-else>-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
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

.key {
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content {
  max-width: 420px;
  white-space: normal;
  color: #6b7280;
  margin: 4px 0 0;
}

.error {
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #991b1b;
}

.status,
.level {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
}

.status.sent {
  background: #dcfce7;
  color: #166534;
}

.status.pending {
  background: #dbeafe;
  color: #1d4ed8;
}

.status.skipped {
  background: #f3f4f6;
  color: #374151;
}

.status.failed {
  background: #fee2e2;
  color: #991b1b;
}

.level.critical {
  background: #7f1d1d;
  color: #fff;
}

.level.high {
  background: #fee2e2;
  color: #991b1b;
}

.level.warn {
  background: #fef3c7;
  color: #92400e;
}

.level.info {
  background: #dbeafe;
  color: #1d4ed8;
}

.plain {
  border: none;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
}

.empty {
  color: #6b7280;
}
</style>
