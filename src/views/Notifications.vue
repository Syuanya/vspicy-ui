<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ACCESS_TOKEN_KEY } from '../api/http'
import {
  deleteNotification,
  listAnnouncements,
  listNotificationEventLogs,
  listNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  publishAsyncAuditEvent,
  publishAsyncInteractionEvent,
  publishAsyncTranscodeEvent,
  publishAuditEvent,
  publishInteractionEvent,
  publishSecurityEvent,
  publishSystemNotification,
  publishTranscodeEvent,
  retryNotificationEvent,
  saveNotificationPreferences,
  unreadNotificationCount
} from '../api/notification'

const inbox = ref<any[]>([])
const announcements = ref<any[]>([])
const eventLogs = ref<any[]>([])
const preferences = ref<any[]>([])
const unread = ref(0)
const loading = ref(false)
const message = ref('')
const readStatus = ref<string>('')
const eventStatus = ref<string>('')
const realtimeStatus = ref('未连接')
let eventSource: EventSource | null = null

const form = ref({
  title: '系统测试通知',
  content: '这是一条来自 VSpicy 消息中心的测试通知。',
  priority: 'NORMAL',
  receiverUserIds: '1'
})

async function load() {
  loading.value = true
  message.value = ''
  try {
    const params: any = { limit: 100 }
    if (readStatus.value !== '') params.readStatus = Number(readStatus.value)

    const eventLogParams: any = { limit: 50 }
    if (eventStatus.value) eventLogParams.status = eventStatus.value

    const [inboxRes, countRes, announcementRes, eventLogRes, preferenceRes]: any[] = await Promise.all([
      listNotifications(params),
      unreadNotificationCount(),
      listAnnouncements(10),
      listNotificationEventLogs(eventLogParams),
      listNotificationPreferences()
    ])

    if (inboxRes.code === 0) inbox.value = inboxRes.data || []
    if (countRes.code === 0) unread.value = countRes.data.unreadCount || 0
    if (announcementRes.code === 0) announcements.value = announcementRes.data || []
    if (eventLogRes.code === 0) eventLogs.value = eventLogRes.data || []
    if (preferenceRes.code === 0) preferences.value = preferenceRes.data || []
  } finally {
    loading.value = false
  }
}

function connectSse() {
  closeSse()

  const userId = localStorage.getItem('vspicy_user_id') || '1'
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  const params = new URLSearchParams({ userId })
  if (token) params.set('access_token', token)

  eventSource = new EventSource(`/api/notifications/stream?${params.toString()}`)

  eventSource.addEventListener('connected', () => {
    realtimeStatus.value = '已连接'
  })

  eventSource.addEventListener('notification', async (event: MessageEvent) => {
    const data = JSON.parse(event.data)
    message.value = `收到实时通知：${data.title}`
    await load()
  })

  eventSource.onerror = () => {
    realtimeStatus.value = '连接异常，浏览器会自动重试'
  }
}

function closeSse() {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
}

function receiverIds() {
  return form.value.receiverUserIds
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
}

async function savePreferences() {
  const res: any = await saveNotificationPreferences({
    preferences: preferences.value
  })
  message.value = res.code === 0 ? '通知偏好已保存' : (res.message || '保存失败')
  if (res.code === 0) {
    preferences.value = res.data || []
  }
}

async function publishTest() {
  const res: any = await publishSystemNotification({
    title: form.value.title,
    content: form.value.content,
    notificationType: 'SYSTEM',
    bizType: 'TEST',
    bizId: Date.now(),
    priority: form.value.priority,
    receiverUserIds: receiverIds()
  })

  message.value = res.code === 0 ? `通知已发布，messageId=${res.data}` : (res.message || '发布失败')
  await load()
}

async function simulateTranscode() {
  const res: any = await publishTranscodeEvent({
    receiverUserId: 1,
    bizId: 2,
    title: 'VSpicy 测试视频',
    result: 'SUCCESS',
    reason: 'HLS 切片已完成'
  })
  message.value = res.code === 0 ? `转码事件通知已发布，messageId=${res.data}` : (res.message || '发布失败')
  await load()
}

async function simulateAuditReject() {
  const res: any = await publishAuditEvent({
    receiverUserId: 1,
    bizId: 10,
    title: '测试文章',
    result: 'REJECTED',
    reason: '命中敏感词或低质内容'
  })
  message.value = res.code === 0 ? `审核事件通知已发布，messageId=${res.data}` : (res.message || '发布失败')
  await load()
}

async function simulateInteraction() {
  const res: any = await publishInteractionEvent({
    receiverUserId: 1,
    bizId: 100,
    title: '你的评论收到点赞',
    actorName: '用户A',
    content: '用户A 点赞了你的评论'
  })
  message.value = res.code === 0 ? `互动事件通知已发布，messageId=${res.data}` : (res.message || '发布失败')
  await load()
}

async function simulateSecurity() {
  const res: any = await publishSecurityEvent({
    receiverUserId: 1,
    bizId: Date.now(),
    title: '安全提醒',
    content: '检测到一次新的登录行为，请确认是否为本人操作。'
  })
  message.value = res.code === 0 ? `安全事件通知已发布，messageId=${res.data}` : (res.message || '发布失败')
  await load()
}

async function simulateMqTranscode() {
  const res: any = await publishAsyncTranscodeEvent({
    receiverUserId: 1,
    bizId: 2,
    title: 'VSpicy MQ 测试视频',
    result: 'SUCCESS',
    reason: 'HLS 切片已完成'
  })
  message.value = res.code === 0 ? res.data : (res.message || 'MQ 发布失败')
  await load()
}

async function simulateMqAudit() {
  const res: any = await publishAsyncAuditEvent({
    receiverUserId: 1,
    bizId: 10,
    title: 'MQ 测试文章',
    result: 'REJECTED',
    reason: '命中敏感词'
  })
  message.value = res.code === 0 ? res.data : (res.message || 'MQ 发布失败')
  await load()
}

async function simulateMqInteraction() {
  const res: any = await publishAsyncInteractionEvent({
    receiverUserId: 1,
    bizId: 100,
    title: 'MQ 互动通知',
    actorName: '用户B',
    content: '用户B 回复了你的评论'
  })
  message.value = res.code === 0 ? res.data : (res.message || 'MQ 发布失败')
  await load()
}

async function retryEvent(item: any) {
  const res: any = await retryNotificationEvent(item.eventId)
  message.value = res.code === 0 ? res.data : (res.message || '重试失败')
  await load()
}

async function markRead(item: any) {
  const res: any = await markNotificationRead(item.inboxId)
  if (res.code === 0) await load()
}

async function markAllRead() {
  const res: any = await markAllNotificationsRead()
  if (res.code === 0) await load()
}

async function remove(item: any) {
  if (!confirm('确认删除这条通知？')) return
  const res: any = await deleteNotification(item.inboxId)
  if (res.code === 0) await load()
}

function typeClass(type: string) {
  if (type === 'AUDIT') return 'tag audit'
  if (type === 'TRANSCODE') return 'tag transcode'
  if (type === 'INTERACTION') return 'tag interaction'
  if (type === 'SECURITY') return 'tag security'
  return 'tag system'
}

function priorityClass(priority: string) {
  return priority === 'HIGH' || priority === 'URGENT' ? 'priority high' : 'priority'
}

function statusClass(status: string) {
  if (status === 'SUCCESS') return 'status success'
  if (status === 'FAILED') return 'status failed'
  if (status === 'SENT') return 'status sent'
  if (status === 'DEAD') return 'status dead'
  return 'status'
}

onMounted(async () => {
  await load()
  connectSse()
})

onBeforeUnmount(() => {
  closeSse()
})
</script>

<template>
  <section class="card">
    <div class="top">
      <div>
        <h2>消息中心</h2>
        <p>
          未读消息：<strong>{{ unread }}</strong>
          <span class="realtime">实时连接：{{ realtimeStatus }}</span>
        </p>
      </div>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button class="button" :disabled="loading" @click="load">{{ loading ? '加载中...' : '刷新' }}</button>
        <button class="button" style="background: #2563eb;" @click="markAllRead">全部已读</button>
        <button class="button" style="background: #7c3aed;" @click="connectSse">重连实时通知</button>
      </div>
    </div>

    <p v-if="message" style="color: #ef4444;">{{ message }}</p>

    <div class="panel">
      <h3>通知偏好设置</h3>
      <p>关闭某类通知后，新通知不会进入收件箱，也不会触发实时推送。安全通知强制开启。</p>
      <div class="preference-grid">
        <label v-for="item in preferences" :key="item.notificationType" class="preference-item">
          <input
            type="checkbox"
            v-model="item.enabled"
            :disabled="item.forced"
          />
          <strong>{{ item.notificationName }}</strong>
          <span>{{ item.notificationType }}</span>
          <small v-if="item.forced">强制开启</small>
        </label>
      </div>
      <button class="button" @click="savePreferences">保存通知偏好</button>
    </div>

    <div class="panel">
      <h3>业务事件模拟：同步 HTTP</h3>
      <div class="event-actions">
        <button class="button" @click="simulateTranscode">模拟转码完成</button>
        <button class="button" style="background: #b45309;" @click="simulateAuditReject">模拟审核拒绝</button>
        <button class="button" style="background: #db2777;" @click="simulateInteraction">模拟评论点赞</button>
        <button class="button" style="background: #991b1b;" @click="simulateSecurity">模拟安全提醒</button>
      </div>
    </div>

    <div class="panel">
      <h3>业务事件模拟：RocketMQ 异步</h3>
      <p>默认 mq.enabled=false 时会 fallback 同步投递；开启 MQ 后会先发送 RocketMQ。</p>
      <div class="event-actions">
        <button class="button" @click="simulateMqTranscode">MQ 转码完成</button>
        <button class="button" style="background: #b45309;" @click="simulateMqAudit">MQ 审核拒绝</button>
        <button class="button" style="background: #db2777;" @click="simulateMqInteraction">MQ 评论回复</button>
      </div>
    </div>

    <div class="panel">
      <h3>通知事件日志</h3>
      <div class="filter">
        <select v-model="eventStatus" class="input" style="max-width: 160px; margin: 0;" @change="load">
          <option value="">全部状态</option>
          <option value="PENDING">PENDING</option>
          <option value="SENT">SENT</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILED">FAILED</option>
          <option value="SKIPPED">SKIPPED</option>
          <option value="DEAD">DEAD</option>
        </select>
      </div>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th>ID</th>
              <th>eventId</th>
              <th>类型</th>
              <th>状态</th>
              <th>接收人</th>
              <th>bizId</th>
              <th>messageId</th>
              <th>重试</th>
              <th>错误</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in eventLogs" :key="item.id">
              <td>{{ item.id }}</td>
              <td class="mono">{{ item.eventId }}</td>
              <td>{{ item.eventType }}</td>
              <td><span :class="statusClass(item.status)">{{ item.status }}</span></td>
              <td>{{ item.receiverUserId }}</td>
              <td>{{ item.bizId || '-' }}</td>
              <td>{{ item.messageId || '-' }}</td>
              <td>{{ item.retryCount }}</td>
              <td>{{ item.errorMessage || '-' }}</td>
              <td>{{ item.createdAt }}</td>
              <td><button class="plain" @click="retryEvent(item)">重试</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <h3>发布测试通知</h3>
      <div class="form-grid">
        <input v-model="form.title" class="input" placeholder="标题" />
        <select v-model="form.priority" class="input">
          <option value="LOW">LOW</option>
          <option value="NORMAL">NORMAL</option>
          <option value="HIGH">HIGH</option>
          <option value="URGENT">URGENT</option>
        </select>
        <input v-model="form.receiverUserIds" class="input" placeholder="接收用户ID，逗号分隔；留空表示全体" />
      </div>
      <textarea v-model="form.content" class="input" style="min-height: 90px;" placeholder="内容"></textarea>
      <button class="button" @click="publishTest">发布测试通知</button>
    </div>

    <div class="panel">
      <h3>系统公告</h3>
      <div v-if="announcements.length === 0">暂无公告</div>
      <div v-for="item in announcements" :key="item.messageId" class="notice">
        <strong>{{ item.title }}</strong>
        <p>{{ item.content }}</p>
        <small>{{ item.createdAt }}</small>
      </div>
    </div>

    <div class="panel">
      <h3>我的收件箱</h3>
      <div class="filter">
        <select v-model="readStatus" class="input" style="max-width: 160px; margin: 0;" @change="load">
          <option value="">全部</option>
          <option value="0">未读</option>
          <option value="1">已读</option>
        </select>
      </div>

      <div v-if="inbox.length === 0">暂无通知</div>

      <div v-for="item in inbox" :key="item.inboxId" class="inbox-item" :class="{ unread: item.readStatus === 0 }">
        <div class="inbox-head">
          <div>
            <span :class="typeClass(item.notificationType)">{{ item.notificationType }}</span>
            <span :class="priorityClass(item.priority)">{{ item.priority }}</span>
            <strong>{{ item.title }}</strong>
          </div>
          <div class="actions">
            <button v-if="item.readStatus === 0" class="plain" @click="markRead(item)">标记已读</button>
            <button class="plain danger" @click="remove(item)">删除</button>
          </div>
        </div>
        <p>{{ item.content }}</p>
        <small>
          inboxId={{ item.inboxId }} /
          biz={{ item.bizType || '-' }}#{{ item.bizId || '-' }} /
          {{ item.createdAt }}
        </small>
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

.realtime {
  margin-left: 16px;
  color: #2563eb;
}

.panel {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}

.preference-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin: 14px 0;
}

.preference-item {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 12px;
  background: #f9fafb;
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 4px 8px;
  align-items: center;
}

.preference-item span,
.preference-item small {
  grid-column: 2;
  color: #6b7280;
}

.event-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 160px 260px;
  gap: 12px;
}

.filter {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.notice {
  border-top: 1px solid #e5e7eb;
  padding: 12px 0;
}

.inbox-item {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 14px;
  margin-top: 12px;
  background: #fff;
}

.inbox-item.unread {
  border-color: #2563eb;
  background: #eff6ff;
}

.inbox-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.actions {
  display: flex;
  gap: 8px;
}

.tag,
.priority,
.status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  margin-right: 8px;
  background: #f3f4f6;
  color: #374151;
}

.system {
  background: #eef2ff;
  color: #3730a3;
}

.audit {
  background: #fef3c7;
  color: #92400e;
}

.transcode {
  background: #dcfce7;
  color: #166534;
}

.interaction {
  background: #fce7f3;
  color: #9d174d;
}

.security {
  background: #fee2e2;
  color: #991b1b;
}

.priority.high,
.status.failed {
  background: #fee2e2;
  color: #991b1b;
}

.status.success {
  background: #dcfce7;
  color: #166534;
}

.status.sent {
  background: #dbeafe;
  color: #1d4ed8;
}

.status.dead {
  background: #111827;
  color: #fff;
}

.plain {
  border: none;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
}

.plain.danger {
  color: #991b1b;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}

th, td {
  border-bottom: 1px solid #e5e7eb;
  padding: 8px;
  text-align: left;
  font-size: 13px;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
