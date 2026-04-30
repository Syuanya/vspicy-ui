<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ACCESS_TOKEN_KEY, getCurrentUserId } from '../api/http'
import {
  clearReadNotifications,
  deleteNotification,
  deleteNotifications,
  listAnnouncements,
  listNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationsRead,
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

const inbox = ref<NotificationItem[]>([])
const announcements = ref<NotificationItem[]>([])
const preferences = ref<PreferenceItem[]>([])
const unread = ref(0)
const loading = ref(false)
const message = ref('')
const readStatus = ref('')
const realtimeStatus = ref<'disconnected' | 'connected' | 'error'>('disconnected')
const selectedIds = ref<number[]>([])
const currentUserId = computed(() => getCurrentUserId())
let eventSource: EventSource | null = null

const preferenceNameMap: Record<string, string> = {
  SYSTEM: '系统通知',
  AUDIT: '审核通知',
  TRANSCODE: '转码通知',
  INTERACTION: '互动通知',
  SECURITY: '安全通知'
}

const unreadText = computed(() => unread.value > 99 ? '99+' : String(unread.value))
const visibleIds = computed(() => inbox.value.map((item) => item.inboxId))
const selectedCount = computed(() => selectedIds.value.length)
const allSelected = computed(() => visibleIds.value.length > 0 && visibleIds.value.every((id) => selectedIds.value.includes(id)))

async function load() {
  loading.value = true
  message.value = ''
  try {
    const inboxParams: any = { limit: 100 }
    if (readStatus.value !== '') inboxParams.readStatus = Number(readStatus.value)

    const [inboxRes, countRes, announcementRes, preferenceRes]: any[] = await Promise.all([
      listNotifications(inboxParams),
      unreadNotificationCount(),
      listAnnouncements(10),
      listNotificationPreferences()
    ])

    if (inboxRes.code === 0) inbox.value = inboxRes.data || []
    if (countRes.code === 0) unread.value = countRes.data?.unreadCount || 0
    if (announcementRes.code === 0) announcements.value = announcementRes.data || []
    if (preferenceRes.code === 0) preferences.value = preferenceRes.data || []
    selectedIds.value = selectedIds.value.filter((id) => visibleIds.value.includes(id))
  } catch (error) {
    message.value = formatApiError(error, '通知数据加载失败')
  } finally {
    loading.value = false
  }
}

function connectSse() {
  closeSse()

  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  const params = new URLSearchParams()
  if (token) params.set('access_token', token)
  const url = params.toString() ? `/api/notifications/stream?${params.toString()}` : '/api/notifications/stream'

  eventSource = new EventSource(url)

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

function displayPreferenceName(item: PreferenceItem) {
  return preferenceNameMap[item.notificationType] || item.notificationName || item.notificationType
}

function toggleSelect(id: number, checked: boolean) {
  if (checked) {
    if (!selectedIds.value.includes(id)) selectedIds.value.push(id)
    return
  }
  selectedIds.value = selectedIds.value.filter((item) => item !== id)
}

function toggleSelectAll() {
  selectedIds.value = allSelected.value ? [] : visibleIds.value.slice()
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

async function markRead(item: NotificationItem) {
  await runAction(() => markNotificationRead(item.inboxId), '已标记为已读')
}

async function markSelectedRead() {
  if (selectedIds.value.length === 0) return
  await runAction(() => markNotificationsRead(selectedIds.value), `已标记 ${selectedIds.value.length} 条通知为已读`)
}

async function markAllRead() {
  await runAction(() => markAllNotificationsRead(), '全部通知已标记为已读')
}

async function remove(item: NotificationItem) {
  if (!confirm('确认删除这条通知？')) return
  await runAction(() => deleteNotification(item.inboxId), '通知已删除')
}

async function removeSelected() {
  if (selectedIds.value.length === 0) return
  if (!confirm(`确认删除选中的 ${selectedIds.value.length} 条通知？`)) return
  await runAction(() => deleteNotifications(selectedIds.value), `已删除 ${selectedIds.value.length} 条通知`)
}

async function clearRead() {
  if (!confirm('确认清理全部已读通知？未读通知不会被删除。')) return
  await runAction(() => clearReadNotifications(), '已读通知已清理')
}

function typeClass(type: string) {
  return ['tag', type.toLowerCase()].join(' ')
}

function priorityClass(priority: string) {
  return priority === 'HIGH' || priority === 'URGENT' ? 'priority high' : 'priority'
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
        <h1>我的通知与系统公告</h1>
        <p>查看收件箱、管理通知偏好，并通过 SSE 实时接收审核、转码、互动和安全提醒。</p>
      </div>
      <div class="status-board">
        <div>
          <span>当前用户</span>
          <strong>{{ currentUserId || '-' }}</strong>
        </div>
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
      <button class="button warning" @click="clearRead">清理已读</button>
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
        <h2>系统公告</h2>
        <div v-if="announcements.length === 0" class="empty">暂无公告</div>
        <article v-for="item in announcements" :key="item.messageId" class="notice">
          <strong>{{ item.title }}</strong>
          <p>{{ item.content }}</p>
          <small>{{ item.createdAt }}</small>
        </article>
      </section>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>我的收件箱</h2>
          <p>普通用户只能查看自己的通知；管理员事件投递与模板发布已移入后台。</p>
        </div>
        <div class="filters">
          <select v-model="readStatus" class="input compact" @change="load">
            <option value="">全部</option>
            <option value="0">未读</option>
            <option value="1">已读</option>
          </select>
        </div>
      </div>

      <div class="batch-bar">
        <label class="select-all">
          <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" />
          <span>全选当前列表</span>
        </label>
        <span class="selected-count">已选 {{ selectedCount }} 条</span>
        <button class="plain" :disabled="selectedCount === 0" @click="markSelectedRead">批量已读</button>
        <button class="plain danger-text" :disabled="selectedCount === 0" @click="removeSelected">批量删除</button>
      </div>

      <div v-if="inbox.length === 0" class="empty">暂无通知</div>
      <article v-for="item in inbox" :key="item.inboxId" class="inbox-item" :class="{ unread: item.readStatus === 0 }">
        <div class="inbox-head">
          <div class="inbox-title">
            <input
              type="checkbox"
              :checked="selectedIds.includes(item.inboxId)"
              @change="toggleSelect(item.inboxId, ($event.target as HTMLInputElement).checked)"
            />
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
  grid-template-columns: repeat(3, 120px);
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
.actions,
.filters,
.batch-bar,
.inbox-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.grid.two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.panel {
  padding: 20px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.button,
.plain {
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}

.button {
  padding: 10px 14px;
  background: #111827;
  color: #fff;
}

.button.secondary {
  background: #2563eb;
}

.button.warning {
  background: #d97706;
}

.button.neutral {
  background: #4b5563;
}

.button:disabled,
.plain:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.plain {
  padding: 6px 8px;
  background: #f3f4f6;
  color: #2563eb;
}

.danger-text {
  color: #dc2626;
}

.input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}

.input.compact {
  width: 140px;
}

.preference-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.preference-item,
.select-all {
  display: flex;
  gap: 10px;
  align-items: center;
}

.preference-item small,
.notice small,
.inbox-item small {
  display: block;
  color: #9ca3af;
}

.batch-bar {
  margin: 14px 0;
  padding: 12px;
  border-radius: 8px;
  background: #f9fafb;
}

.selected-count {
  color: #6b7280;
}

.inbox-item,
.notice {
  margin-top: 12px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
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

.tag,
.priority {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #374151;
  font-size: 12px;
}

.tag.system {
  background: #eff6ff;
  color: #1d4ed8;
}

.tag.audit {
  background: #fef2f2;
  color: #b91c1c;
}

.tag.transcode {
  background: #ecfdf5;
  color: #047857;
}

.tag.interaction {
  background: #f5f3ff;
  color: #6d28d9;
}

.tag.security {
  background: #fff7ed;
  color: #c2410c;
}

.priority.high {
  background: #fee2e2;
  color: #991b1b;
}

.empty {
  padding: 24px;
  color: #9ca3af;
  text-align: center;
}

.message {
  padding: 12px;
  border-radius: 8px;
  background: #fff7ed;
  color: #c2410c;
}

@media (max-width: 900px) {
  .hero,
  .panel-head,
  .inbox-head {
    flex-direction: column;
  }

  .grid.two,
  .status-board {
    grid-template-columns: 1fr;
  }
}
</style>
