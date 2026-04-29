<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listNotificationEventLogs, retryNotificationEvent } from '../../api/notification'

const logs = ref<any[]>([])
const status = ref('')
const eventType = ref('')
const message = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  message.value = ''
  try {
    const params: any = { limit: 100 }
    if (status.value) params.status = status.value
    if (eventType.value) params.eventType = eventType.value
    const res: any = await listNotificationEventLogs(params)
    if (res.code === 0) logs.value = res.data || []
  } catch (error: any) {
    message.value = error?.message || '通知事件加载失败'
  } finally {
    loading.value = false
  }
}

async function retry(eventId: string) {
  const res: any = await retryNotificationEvent(eventId)
  message.value = res.code === 0 ? '已提交重试' : (res.message || '重试失败')
  await load()
}

onMounted(load)
</script>

<template>
  <section class="card">
    <div class="page-head">
      <div>
        <h2>通知事件</h2>
        <p>查看异步通知事件投递日志，支持失败事件人工重试。</p>
      </div>
      <button class="button" :disabled="loading" @click="load">{{ loading ? '加载中' : '刷新' }}</button>
    </div>

    <div class="filters">
      <select v-model="status" class="input">
        <option value="">全部状态</option>
        <option value="PENDING">PENDING</option>
        <option value="SUCCESS">SUCCESS</option>
        <option value="FAILED">FAILED</option>
      </select>
      <input v-model="eventType" class="input" placeholder="事件类型" />
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>事件ID</th>
            <th>类型</th>
            <th>状态</th>
            <th>接收人</th>
            <th>重试</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in logs" :key="item.eventId">
            <td>{{ item.eventId }}</td>
            <td>{{ item.eventType }}</td>
            <td>{{ item.status }}</td>
            <td>{{ item.receiverUserId || '-' }}</td>
            <td>{{ item.retryCount || 0 }}</td>
            <td>
              <button class="text-button" :disabled="item.status === 'SUCCESS'" @click="retry(item.eventId)">重试</button>
            </td>
          </tr>
        </tbody>
      </table>
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
  max-width: 220px;
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
}

.text-button {
  border: 0;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
}

.message {
  color: #dc2626;
}
</style>
