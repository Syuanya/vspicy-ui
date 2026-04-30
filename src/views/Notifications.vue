<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ACCESS_TOKEN_KEY, getCurrentUserId } from '../api/http'
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
import { formatApiError } from '../api/apiError'

interface NotificationItem {
  inboxId: number
  messageId: number
  title: string
  content: string
  notificationType: string
  bizType?: string
  bizId?: number
  priority: string
  readStatus: number
  createdAt?: string
}

interface PreferenceItem {
  notificationType: string
  notificationName?: string
  enabled: boolean
  forced?: boolean
}

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
}

const inbox = ref<NotificationItem[]>([])
const announcements = ref<NotificationItem[]>([])
const eventLogs = ref<EventLogItem[]>([])
const preferences = ref<PreferenceItem[]>([])
const unread = ref(0)
const loading = ref(false)
const message = ref('')
const readStatus = ref('')
const eventStatus = ref('')
const realtimeStatus = ref<'disconnected' | 'connected' | 'error'>('disconnected')
const currentUserId = computed(() => getCurrentUserId() || 1)
let eventSource: EventSource | null = null

const form = ref({
  title: '系统测试通知',
  content: '这是一条来自 VSpicy 消息中心的测试通知。',
  priority: 'NORMAL',
  receiverUserIds: String(currentUserId.value)
})

const preferenceNameMap: Record<string, string> = {
  SYSTEM: '系统通知',
  AUDIT: '审核通知',
  TRANSCODE: '转码通知',
  INTERACTION: '互动通知',
  SECURITY: '安全通知'
}

const unreadText = computed(() => unread.value > 99 ? '99+' : String(unread.value))

async function load() {
  loading.value = true
  message.value = ''
  try {
    const inboxParams: any = { limit: 100 }
    if (readStatus.value !== '') inboxParams.readStatus = Number(readStatus.value)

    const eventLogParams: any = { limit: 50 }
    if (eventStatus.value) eventLogParams.status = eventStatus.value

    const [inboxRes, countRes, announcementRes, eventLogRes, preferenceRes]: any[] = await Promise.all([
      listNotifications(inboxParams),
      unreadNotificationCount(),
      listAnnouncements(10),
      listNotificationEventLogs(eventLogParams),
      listNotificationPreferences()
    ])

    if (inboxRes.code === 0) inbox.value = inboxRes.data || []
    if (countRes.code === 0) unread.value = countRes.data?.unreadCount || 0
    if (announcementRes.code === 0) announcements.value = announcementRes.data || []
    if (eventLogRes.code === 0) eventLogs.value = eventLogRes.data || []
    if (preferenceRes.code === 0) preferences.value = preferenceRes.data || []
  } catch (error) {
    message.value = formatApiError(error, '通知数据加载失败')
  } finally {
    loading.value = false
  }
}

function connectSse() {
  closeSse()

  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  const params = new URLSearchParams({ userId: String(currentUserId.value) })
  if (token) params.set('access_token', token)

  eventSource = new EventSource(`/api/notifications/stream?${params.toString()}`)

  eventSource.addEventListener('connected', () => {
    realtimeStatus.value = 'connected'
  })

  eventSource.addEventListener('notification', async (event: MessageEvent) => {
    const data = JSON.parse(event.data)
    message.value = `收到实时通知：${data.title}`
    await load()
  })

  eventSource.onerror = () => {
    realtimeStatus.value = 'error'
  }
}

function closeSse() {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
  realtimeStatus.value = 'disconnected'
}

function receiverIds() {
  return form.value.receiverUserIds
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x))
}

function displayPreferenceName(item: PreferenceItem) {
  return preferenceNameMap[item.notificationType] || item.notificationName || item.notificationType
}

async function runAction(action: () => Promise<any>, successText: string) {
  try {
    const res: any = await action()
    message.value = res?.code === 0 ? successText : (res?.message || '操作失败')
    await load()
  } catch (error) {
    message.value = formatApiError(error)
  }
}

async function savePreferences() {
  await runAction(
    () => saveNotificationPreferences({ preferences: preferences.value }),
    '通知偏好已保存'
  )
}

async function publishTest() {
  await runAction(
    () => publishSystemNotification({
      title: form.value.title,
      content: form.value.content,
      notificationType: 'SYSTEM',
      bizType: 'TEST',
      bizId: Date.now(),
      priority: form.value.priority,
      receiverUserIds: receiverIds()
    }),
    '测试通知已发布'
  )
}

async function simulateTranscode(asyncMode = false) {
  const payload = {
    receiverUserId: currentUserId.value,
    bizId: 2,
    title: 'VSpicy 测试视频',
    result: 'SUCCESS',
    reason: 'HLS 切片已完成'
  }
  await runAction(
    () => asyncMode ? publishAsyncTranscodeEvent(payload) : publishTranscodeEvent(payload),
    asyncMode ? '已投递异步转码事件' : '已发布转码事件通知'
  )
}

async function simulateAuditReject(asyncMode = false) {
  const payload = {
    receiverUserId: currentUserId.value,
    bizId: 10,
    title: '测试文章',
    result: 'REJECTED',
    reason: '命中敏感词或内容质量较低'
  }
  await runAction(
    () => asyncMode ? publishAsyncAuditEvent(payload) : publishAuditEvent(payload),
    asyncMode ? '已投递异步审核事件' : '已发布审核事件通知'
  )
}

async function simulateInteraction(asyncMode = false) {
  const payload = {
    receiverUserId: currentUserId.value,
    bizId: 100,
    title: asyncMode ? 'MQ 互动通知' : '你的评论收到点赞',
    actorName: asyncMode ? '用户B' : '用户A',
    content: asyncMode ? '用户B 回复了你的评论' : '用户A 点赞了你的评论'
  }
  await runAction(
    () => asyncMode ? publishAsyncInteractionEvent(payload) : publishInteractionEvent(payload),
    asyncMode ? '已投递异步互动事件' : '已发布互动事件通知'
  )
}

async function simulateSecurity() {
  await runAction(
    () => publishSecurityEvent({
      receiverUserId: currentUserId.value,
      bizId: Date.now(),
      title: '安全提醒',
      content: '检测到一次新的登录行为，请确认是否为本人操作。'
    }),
    '已发布安全事件通知'
  )
}

async function retryEvent(item: EventLogItem) {
  await runAction(() => retryNotificationEvent(item.eventId), '事件已提交重试')
}

async function markRead(item: NotificationItem) {
  await runAction(() => markNotificationRead(item.inboxId), '已标记为已读')
}

async function markAllRead() {
  await runAction(() => markAllNotificationsRead(), '全部通知已标记为已读')
}

async function remove(item: NotificationItem) {
  if (!confirm('确认删除这条通知？')) return
  await runAction(() => deleteNotification(item.inboxId), '通知已删除')
}

function typeClass(type: string) {
  return ['tag', type.toLowerCase()].join(' ')
}

function priorityClass(priority: string) {
  return priority === 'HIGH' || priority === 'URGENT' ? 'priority high' : 'priority'
}

function statusClass(status: string) {
  return ['status', status.toLowerCase()].join(' ')
}

onMounted(async () => {
  await load()
  connectSse()
})

onBeforeUnmount(closeSse)
</script>

<template>
  <section class="notification-page">
    <div class="hero">
      <div>
        <span class="eyebrow">消息中心</span>
        <h1>通知、公告和事件投递</h1>
        <p>统一查看个人收件箱、管理通知偏好，并验证业务事件通知链路。</p>
      </div>
      <div class="status-board">
        <div>
          <span>未读</span>
          <strong>{{ unreadText }}</strong>
        </div>
        <div>
          <span>实时连接</span>
          <strong>{{ realtimeStatus === 'connected' ? '已连接' : realtimeStatus === 'error' ? '异常' : '未连接' }}</strong>
        </div>
      </div>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="toolbar">
      <button class="button" :disabled="loading" @click="load">{{ loading ? '加载中...' : '刷新' }}</button>
      <button class="button secondary" @click="markAllRead">全部已读</button>
      <button class="button neutral" @click="connectSse">重连实时通知</button>
    </div>

    <div class="grid two">
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>通知偏好</h2>
            <p>关闭后，新通知不进入收件箱，也不会触发实时推送；安全通知强制开启。</p>
          </div>
          <button class="button" @click="savePreferences">保存偏好</button>
        </div>
        <div class="preference-grid">
          <label v-for="item in preferences" :key="item.notificationType" class="preference-item">
            <input v-model="item.enabled" type="checkbox" :disabled="item.forced" />
            <span>
              <strong>{{ displayPreferenceName(item) }}</strong>
              <small>{{ item.notificationType }}{{ item.forced ? ' / 强制开启' : '' }}</small>
            </span>
          </label>
        </div>
      </section>

      <section class="panel">
        <h2>发布测试通知</h2>
        <div class="form-grid">
          <input v-model="form.title" class="input" placeholder="标题" />
          <select v-model="form.priority" class="input">
            <option value="LOW">LOW</option>
            <option value="NORMAL">NORMAL</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
        </div>
        <input v-model="form.receiverUserIds" class="input" placeholder="接收用户 ID，多个用英文逗号分隔" />
        <textarea v-model="form.content" class="input textarea" placeholder="通知内容"></textarea>
        <button class="button" @click="publishTest">发布测试通知</button>
      </section>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>业务事件模拟</h2>
          <p>可用于验证转码、审核、互动、安全提醒等事件通知是否能进入当前用户收件箱。</p>
        </div>
      </div>
      <div class="event-actions">
        <button class="button" @click="simulateTranscode(false)">转码完成</button>
        <button class="button warning" @click="simulateAuditReject(false)">审核拒绝</button>
        <button class="button accent" @click="simulateInteraction(false)">互动点赞</button>
        <button class="button danger" @click="simulateSecurity">安全提醒</button>
        <button class="button neutral" @click="simulateTranscode(true)">MQ 转码</button>
        <button class="button neutral" @click="simulateAuditReject(true)">MQ 审核</button>
        <button class="button neutral" @click="simulateInteraction(true)">MQ 互动</button>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>我的收件箱</h2>
          <p>当前用户：{{ currentUserId }}</p>
        </div>
        <select v-model="readStatus" class="input compact" @change="load">
          <option value="">全部</option>
          <option value="0">未读</option>
          <option value="1">已读</option>
        </select>
      </div>
      <div v-if="inbox.length === 0" class="empty">暂无通知</div>
      <article v-for="item in inbox" :key="item.inboxId" class="inbox-item" :class="{ unread: item.readStatus === 0 }">
        <div class="inbox-head">
          <div>
            <span :class="typeClass(item.notificationType)">{{ item.notificationType }}</span>
            <span :class="priorityClass(item.priority)">{{ item.priority }}</span>
            <strong>{{ item.title }}</strong>
          </div>
          <div class="actions">
            <button v-if="item.readStatus === 0" class="plain" @click="markRead(item)">标记已读</button>
            <button class="plain danger-text" @click="remove(item)">删除</button>
          </div>
        </div>
        <p>{{ item.content }}</p>
        <small>inboxId={{ item.inboxId }} / biz={{ item.bizType || '-' }}#{{ item.bizId || '-' }} / {{ item.createdAt }}</small>
      </article>
    </section>

    <div class="grid two">
      <section class="panel">
        <h2>系统公告</h2>
        <div v-if="announcements.length === 0" class="empty">暂无公告</div>
        <article v-for="item in announcements" :key="item.messageId" class="notice">
          <strong>{{ item.title }}</strong>
          <p>{{ item.content }}</p>
          <small>{{ item.createdAt }}</small>
        </article>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>事件日志</h2>
          <select v-model="eventStatus" class="input compact" @change="load">
            <option value="">全部状态</option>
            <option value="PENDING">PENDING</option>
            <option value="SENT">SENT</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="SKIPPED">SKIPPED</option>
            <option value="DEAD">DEAD</option>
          </select>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>类型</th>
                <th>状态</th>
                <th>接收人</th>
                <th>重试</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in eventLogs" :key="item.id">
                <td>{{ item.id }}</td>
                <td>{{ item.eventType }}</td>
                <td><span :class="statusClass(item.status)">{{ item.status }}</span></td>
                <td>{{ item.receiverUserId }}</td>
                <td>{{ item.retryCount }}</td>
                <td><button class="plain" @click="retryEvent(item)">重试</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.notification-page {
  display: grid;
  gap: 16px;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
  border-radius: 8px;
  background: #111827;
  color: #fff;
}

.hero h1 {
  margin: 8px 0;
  font-size: 30px;
}

.hero p,
.panel p {
  color: #6b7280;
}

.hero p {
  color: #d1d5db;
}

.eyebrow {
  color: #fca5a5;
  font-weight: 700;
}

.status-board {
  display: grid;
  grid-template-columns: repeat(2, 120px);
  gap: 10px;
}

.status-board div {
  padding: 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
}

.status-board span {
  display: block;
  color: #d1d5db;
  font-size: 13px;
}

.status-board strong {
  display: block;
  margin-top: 6px;
  font-size: 22px;
}

.toolbar,
.event-actions,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.grid.two {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}

.panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 18px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.panel h2 {
  margin: 0 0 6px;
  font-size: 18px;
}

.preference-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.preference-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.preference-item small {
  display: block;
  margin-top: 2px;
  color: #6b7280;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: 10px;
}

.input.compact {
  width: 150px;
  margin: 0;
}

.textarea {
  min-height: 88px;
  padding-top: 10px;
}

.button.secondary {
  background: #2563eb;
}

.button.neutral {
  background: #4b5563;
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

.message {
  margin: 0;
  color: #b91c1c;
  font-weight: 700;
}

.empty {
  padding: 20px;
  border-radius: 8px;
  background: #f9fafb;
  color: #6b7280;
}

.inbox-item,
.notice {
  border-top: 1px solid #e5e7eb;
  padding: 14px 0;
}

.inbox-item.unread {
  border-top-color: #2563eb;
  background: #eff6ff;
  margin: 10px -10px 0;
  padding: 14px 10px;
  border-radius: 8px;
}

.inbox-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.tag,
.priority,
.status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  margin-right: 8px;
  font-size: 12px;
  background: #f3f4f6;
  color: #374151;
}

.system {
  background: #eef2ff;
  color: #3730a3;
}

.audit,
.warning {
  background: #fef3c7;
  color: #92400e;
}

.transcode,
.success {
  background: #dcfce7;
  color: #166534;
}

.interaction {
  background: #fce7f3;
  color: #9d174d;
}

.security,
.failed,
.dead,
.priority.high {
  background: #fee2e2;
  color: #991b1b;
}

.sent {
  background: #dbeafe;
  color: #1d4ed8;
}

.plain {
  border: 0;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
}

.danger-text {
  color: #991b1b;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border-bottom: 1px solid #e5e7eb;
  padding: 8px;
  text-align: left;
  font-size: 13px;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .hero,
  .panel-head,
  .inbox-head {
    flex-direction: column;
  }

  .grid.two,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .status-board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .input.compact {
    width: 100%;
  }
}
</style>
