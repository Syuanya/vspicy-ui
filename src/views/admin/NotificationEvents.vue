<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  listNotificationEventLogs,
  publishAsyncAuditEvent,
  publishAsyncInteractionEvent,
  publishAsyncTranscodeEvent,
  publishAuditEvent,
  publishInteractionEvent,
  publishSecurityEvent,
  publishSystemNotification,
  publishTranscodeEvent,
  retryNotificationEvent
} from '../../api/notification'
import { formatApiError } from '../../api/apiError'

interface EventLogItem {
  id: number
  eventId: string
  eventType: string
  receiverUserId: number
  bizId?: number
  messageId?: number
  status: string
  retryCount: number
  errorMessage?: string
  createdAt?: string
  updatedAt?: string
}

const logs = ref<EventLogItem[]>([])
const status = ref('')
const eventType = ref('')
const receiverUserId = ref('')
const message = ref('')
const loading = ref(false)
const submitting = ref(false)

const publishForm = ref({
  title: '系统测试通知',
  content: '这是一条来自 VSpicy 管理后台的系统通知。',
  priority: 'NORMAL',
  receiverUserIds: ''
})

const eventForm = ref({
  receiverUserId: '1',
  bizId: '100',
  title: 'VSpicy 业务事件测试',
  result: 'SUCCESS',
  reason: '后台人工触发测试'
})

function parseUserIds(value: string) {
  return value
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x))
}

function numericOrUndefined(value: string) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && value !== '' ? numberValue : undefined
}

async function load() {
  loading.value = true
  message.value = ''
  try {
    const params: any = { limit: 100 }
    if (status.value) params.status = status.value
    if (eventType.value) params.eventType = eventType.value
    if (receiverUserId.value) params.receiverUserId = Number(receiverUserId.value)
    const res: any = await listNotificationEventLogs(params)
    if (res.code === 0) logs.value = res.data || []
    else message.value = res.message || '通知事件加载失败'
  } catch (error) {
    message.value = formatApiError(error, '通知事件加载失败')
  } finally {
    loading.value = false
  }
}

async function runAdminAction(action: () => Promise<any>, successText: string) {
  submitting.value = true
  try {
    const res: any = await action()
    message.value = res?.code === 0 ? successText : (res?.message || '操作失败')
    await load()
  } catch (error) {
    message.value = formatApiError(error)
  } finally {
    submitting.value = false
  }
}

async function publishSystem() {
  await runAdminAction(
    () => publishSystemNotification({
      title: publishForm.value.title,
      content: publishForm.value.content,
      notificationType: 'SYSTEM',
      bizType: 'ADMIN_NOTICE',
      bizId: Date.now(),
      priority: publishForm.value.priority,
      receiverUserIds: parseUserIds(publishForm.value.receiverUserIds)
    }),
    '系统通知已发布'
  )
}

function businessPayload() {
  return {
    receiverUserId: Number(eventForm.value.receiverUserId),
    bizId: numericOrUndefined(eventForm.value.bizId),
    title: eventForm.value.title,
    result: eventForm.value.result,
    reason: eventForm.value.reason,
    content: eventForm.value.reason,
    actorName: '系统运营'
  }
}

async function simulate(kind: 'transcode' | 'audit' | 'interaction' | 'security', asyncMode = false) {
  const payload = businessPayload()
  if (!Number.isFinite(payload.receiverUserId)) {
    message.value = '接收用户 ID 必须是数字'
    return
  }

  const action = () => {
    if (kind === 'transcode') return asyncMode ? publishAsyncTranscodeEvent(payload) : publishTranscodeEvent(payload)
    if (kind === 'audit') return asyncMode ? publishAsyncAuditEvent(payload) : publishAuditEvent(payload)
    if (kind === 'interaction') return asyncMode ? publishAsyncInteractionEvent(payload) : publishInteractionEvent(payload)
    return publishSecurityEvent(payload)
  }

  await runAdminAction(action, asyncMode ? '异步事件已投递' : '业务事件已发布')
}

async function retry(eventId: string) {
  await runAdminAction(() => retryNotificationEvent(eventId), '已提交重试')
}

function statusClass(value: string) {
  return ['status-badge', value.toLowerCase()].join(' ')
}

onMounted(load)
</script>

<template>
  <section class="notification-admin">
    <div class="page-head">
      <div>
        <h2>通知管理</h2>
        <p>管理员用于发布系统通知、模拟业务事件、查看异步事件日志和重试失败事件。</p>
      </div>
      <button class="button" :disabled="loading" @click="load">{{ loading ? '加载中' : '刷新日志' }}</button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="grid two">
      <section class="panel">
        <h3>发布系统通知</h3>
        <p>接收用户 ID 留空时发布给全部启用用户；多个用户用英文逗号分隔。</p>
        <div class="form-grid">
          <input v-model="publishForm.title" class="input" placeholder="通知标题" />
          <select v-model="publishForm.priority" class="input">
            <option value="LOW">LOW</option>
            <option value="NORMAL">NORMAL</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
        </div>
        <input v-model="publishForm.receiverUserIds" class="input" placeholder="接收用户 ID，留空为全部" />
        <textarea v-model="publishForm.content" class="input textarea" placeholder="通知内容"></textarea>
        <button class="button" :disabled="submitting" @click="publishSystem">发布通知</button>
      </section>

      <section class="panel">
        <h3>业务事件模拟</h3>
        <p>用于验证转码、审核、互动、安全事件的通知投递链路。</p>
        <div class="form-grid">
          <input v-model="eventForm.receiverUserId" class="input" placeholder="接收用户 ID" />
          <input v-model="eventForm.bizId" class="input" placeholder="业务 ID" />
        </div>
        <input v-model="eventForm.title" class="input" placeholder="事件标题" />
        <div class="form-grid">
          <select v-model="eventForm.result" class="input">
            <option value="SUCCESS">SUCCESS</option>
            <option value="REJECTED">REJECTED</option>
            <option value="FAILED">FAILED</option>
          </select>
          <input v-model="eventForm.reason" class="input" placeholder="原因/内容" />
        </div>
        <div class="event-actions">
          <button class="button" :disabled="submitting" @click="simulate('transcode', false)">转码通知</button>
          <button class="button warning" :disabled="submitting" @click="simulate('audit', false)">审核通知</button>
          <button class="button accent" :disabled="submitting" @click="simulate('interaction', false)">互动通知</button>
          <button class="button danger" :disabled="submitting" @click="simulate('security', false)">安全通知</button>
          <button class="button neutral" :disabled="submitting" @click="simulate('transcode', true)">MQ 转码</button>
          <button class="button neutral" :disabled="submitting" @click="simulate('audit', true)">MQ 审核</button>
          <button class="button neutral" :disabled="submitting" @click="simulate('interaction', true)">MQ 互动</button>
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="filters">
        <select v-model="status" class="input">
          <option value="">全部状态</option>
          <option value="PENDING">PENDING</option>
          <option value="SENT">SENT</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILED">FAILED</option>
          <option value="SKIPPED">SKIPPED</option>
          <option value="DEAD">DEAD</option>
        </select>
        <input v-model="eventType" class="input" placeholder="事件类型" />
        <input v-model="receiverUserId" class="input" placeholder="接收用户 ID" />
        <button class="button" :disabled="loading" @click="load">筛选</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>事件ID</th>
              <th>类型</th>
              <th>状态</th>
              <th>接收人</th>
              <th>业务ID</th>
              <th>消息ID</th>
              <th>重试</th>
              <th>错误</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in logs" :key="item.eventId">
              <td class="mono">{{ item.eventId }}</td>
              <td>{{ item.eventType }}</td>
              <td><span :class="statusClass(item.status)">{{ item.status }}</span></td>
              <td>{{ item.receiverUserId || '-' }}</td>
              <td>{{ item.bizId || '-' }}</td>
              <td>{{ item.messageId || '-' }}</td>
              <td>{{ item.retryCount || 0 }}</td>
              <td class="error-cell" :title="item.errorMessage || ''">{{ item.errorMessage || '-' }}</td>
              <td>
                <button class="text-button" :disabled="item.status === 'SUCCESS' || submitting" @click="retry(item.eventId)">重试</button>
              </td>
            </tr>
            <tr v-if="logs.length === 0">
              <td colspan="9" class="empty">暂无事件日志</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<style scoped>
.notification-admin {
  display: grid;
  gap: 16px;
}

.page-head,
.filters,
.event-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.page-head {
  justify-content: space-between;
}

.page-head h2,
.panel h3 {
  margin: 0 0 6px;
}

.page-head p,
.panel p {
  margin: 0 0 12px;
  color: #6b7280;
}

.grid.two {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}

.panel {
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 160px;
  gap: 10px;
}

.textarea {
  min-height: 88px;
  padding-top: 10px;
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
  white-space: nowrap;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

.error-cell {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-button {
  border: 0;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
}

.text-button:disabled {
  color: #9ca3af;
  cursor: not-allowed;
}

.message {
  color: #dc2626;
  font-weight: 700;
}

.empty {
  text-align: center;
  color: #6b7280;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #374151;
  font-size: 12px;
}

.success {
  background: #dcfce7;
  color: #166534;
}

.failed,
.dead {
  background: #fee2e2;
  color: #991b1b;
}

.sent {
  background: #dbeafe;
  color: #1d4ed8;
}

.pending {
  background: #fef3c7;
  color: #92400e;
}

.skipped {
  background: #f3f4f6;
  color: #4b5563;
}

.button.warning {
  background: #b45309;
}

.button.accent {
  background: #db2777;
}

.button.danger {
  background: #991b1b;
}

.button.neutral {
  background: #4b5563;
}

@media (max-width: 900px) {
  .grid.two,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
