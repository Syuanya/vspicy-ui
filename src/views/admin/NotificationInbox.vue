<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  getNotificationAdminInboxDetail,
  getNotificationAdminInboxSummary,
  listNotificationAdminInbox,
  type NotificationAdminInboxItem,
  type NotificationAdminInboxSummary
} from '../../api/notification'
import ApiErrorBanner from '../../components/common/ApiErrorBanner.vue'
import { normalizeApiError } from '../../api/apiError'

const filters = ref({
  userId: '',
  readStatus: '',
  deleted: '0',
  notificationType: '',
  keyword: '',
  limit: 100
})
const rows = ref<NotificationAdminInboxItem[]>([])
const selected = ref<NotificationAdminInboxItem | null>(null)
const summary = ref<NotificationAdminInboxSummary | null>(null)
const loading = ref(false)
const detailLoading = ref(false)
const error = ref<any>(null)
const message = ref('')

const summaryCards = computed(() => {
  const data = summary.value
  if (!data) return []
  return [
    { label: '累计投递', value: data.totalDeliveries },
    { label: '未读', value: data.unreadDeliveries },
    { label: '已读', value: data.readDeliveries },
    { label: '已删除', value: data.deletedDeliveries },
    { label: '高优先级', value: data.highPriorityDeliveries }
  ]
})

function buildParams() {
  const params: Record<string, any> = { limit: filters.value.limit }
  const userId = Number(filters.value.userId)
  if (userId > 0) params.userId = userId
  if (filters.value.readStatus !== '') params.readStatus = Number(filters.value.readStatus)
  if (filters.value.deleted !== '') params.deleted = Number(filters.value.deleted)
  if (filters.value.notificationType) params.notificationType = filters.value.notificationType
  if (filters.value.keyword.trim()) params.keyword = filters.value.keyword.trim()
  return params
}

async function load() {
  loading.value = true
  error.value = null
  message.value = ''
  try {
    const res: any = await listNotificationAdminInbox(buildParams())
    if (res.code === 0) {
      rows.value = res.data || []
      if (!rows.value.some(item => item.inboxId === selected.value?.inboxId)) {
        selected.value = null
      }
    } else {
      error.value = normalizeApiError(res)
    }
  } catch (err) {
    error.value = normalizeApiError(err)
  } finally {
    loading.value = false
  }
}

async function loadSummary() {
  const userId = Number(filters.value.userId)
  if (!userId || userId <= 0) {
    message.value = '请先输入用户 ID 再查询用户汇总。'
    summary.value = null
    return
  }
  error.value = null
  message.value = ''
  try {
    const res: any = await getNotificationAdminInboxSummary(userId)
    if (res.code === 0) {
      summary.value = res.data
    } else {
      error.value = normalizeApiError(res)
    }
  } catch (err) {
    error.value = normalizeApiError(err)
  }
}

async function showDetail(item: NotificationAdminInboxItem) {
  detailLoading.value = true
  error.value = null
  try {
    const res: any = await getNotificationAdminInboxDetail(item.inboxId)
    if (res.code === 0) {
      selected.value = res.data
    } else {
      error.value = normalizeApiError(res)
    }
  } catch (err) {
    error.value = normalizeApiError(err)
  } finally {
    detailLoading.value = false
  }
}

function reset() {
  filters.value = {
    userId: '',
    readStatus: '',
    deleted: '0',
    notificationType: '',
    keyword: '',
    limit: 100
  }
  summary.value = null
  selected.value = null
  load()
}

function statusText(item: NotificationAdminInboxItem) {
  if (item.deleted) return '已删除'
  return item.readStatus === 1 ? '已读' : '未读'
}

onMounted(load)
</script>

<template>
  <section class="page-card">
    <div class="page-header">
      <div>
        <h1>通知投递查询</h1>
        <p>管理员查看用户收件箱投递结果、阅读状态、删除状态和消息详情。</p>
      </div>
      <div class="actions">
        <button type="button" class="ghost" @click="reset">重置</button>
        <button type="button" :disabled="loading" @click="load">{{ loading ? '查询中...' : '查询' }}</button>
      </div>
    </div>

    <ApiErrorBanner v-if="error" :error="error" />
    <p v-if="message" class="message">{{ message }}</p>

    <div class="filters panel">
      <label>
        用户 ID
        <input v-model="filters.userId" placeholder="例如 1" inputmode="numeric" />
      </label>
      <label>
        阅读状态
        <select v-model="filters.readStatus">
          <option value="">全部</option>
          <option value="0">未读</option>
          <option value="1">已读</option>
        </select>
      </label>
      <label>
        删除状态
        <select v-model="filters.deleted">
          <option value="">全部</option>
          <option value="0">未删除</option>
          <option value="1">已删除</option>
        </select>
      </label>
      <label>
        通知类型
        <select v-model="filters.notificationType">
          <option value="">全部</option>
          <option value="SYSTEM">SYSTEM</option>
          <option value="TRANSCODE">TRANSCODE</option>
          <option value="AUDIT">AUDIT</option>
          <option value="INTERACTION">INTERACTION</option>
          <option value="SECURITY">SECURITY</option>
        </select>
      </label>
      <label>
        关键词
        <input v-model="filters.keyword" placeholder="标题 / 内容 / 用户名" />
      </label>
      <label>
        数量
        <select v-model.number="filters.limit">
          <option :value="50">50</option>
          <option :value="100">100</option>
          <option :value="200">200</option>
          <option :value="500">500</option>
        </select>
      </label>
      <button type="button" class="ghost" @click="loadSummary">用户汇总</button>
    </div>

    <div v-if="summary" class="summary panel">
      <div>
        <strong>{{ summary.nickname || summary.username || `用户 ${summary.userId}` }}</strong>
        <small>ID: {{ summary.userId }} · 最近投递：{{ summary.latestDeliveredAt || '-' }}</small>
      </div>
      <div class="summary-grid">
        <span v-for="card in summaryCards" :key="card.label">
          <b>{{ card.value }}</b>
          <em>{{ card.label }}</em>
        </span>
      </div>
    </div>

    <div class="content-grid">
      <article class="panel list-panel">
        <div class="panel-head">
          <h2>投递记录</h2>
          <span>{{ rows.length }} 条</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Inbox ID</th>
                <th>用户</th>
                <th>标题</th>
                <th>类型</th>
                <th>优先级</th>
                <th>状态</th>
                <th>投递时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in rows" :key="item.inboxId" :class="{ active: selected?.inboxId === item.inboxId }">
                <td>{{ item.inboxId }}</td>
                <td>{{ item.nickname || item.username || item.userId }}</td>
                <td class="title-cell">{{ item.title }}</td>
                <td>{{ item.notificationType }}</td>
                <td><span class="tag">{{ item.priority }}</span></td>
                <td>{{ statusText(item) }}</td>
                <td>{{ item.deliveredAt }}</td>
                <td><button type="button" class="text-button" @click="showDetail(item)">详情</button></td>
              </tr>
              <tr v-if="!loading && !rows.length">
                <td colspan="8" class="empty">暂无投递记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <aside class="panel detail-panel">
        <div class="panel-head">
          <h2>投递详情</h2>
          <span v-if="detailLoading">加载中...</span>
        </div>
        <div v-if="selected" class="detail">
          <h3>{{ selected.title }}</h3>
          <p>{{ selected.content }}</p>
          <dl>
            <dt>Inbox ID</dt><dd>{{ selected.inboxId }}</dd>
            <dt>Message ID</dt><dd>{{ selected.messageId }}</dd>
            <dt>用户</dt><dd>{{ selected.nickname || selected.username || selected.userId }} / {{ selected.userId }}</dd>
            <dt>通知类型</dt><dd>{{ selected.notificationType }}</dd>
            <dt>业务</dt><dd>{{ selected.bizType || '-' }} / {{ selected.bizId || '-' }}</dd>
            <dt>发布范围</dt><dd>{{ selected.publishScope }}</dd>
            <dt>消息状态</dt><dd>{{ selected.messageStatus }}</dd>
            <dt>阅读状态</dt><dd>{{ statusText(selected) }}</dd>
            <dt>阅读时间</dt><dd>{{ selected.readAt || '-' }}</dd>
            <dt>投递时间</dt><dd>{{ selected.deliveredAt }}</dd>
            <dt>消息创建时间</dt><dd>{{ selected.messageCreatedAt }}</dd>
          </dl>
        </div>
        <p v-else class="empty">请选择一条投递记录查看详情。</p>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.page-card {
  display: grid;
  gap: 18px;
}

.page-header,
.actions,
.panel-head,
.summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-header,
.panel {
  border-radius: 16px;
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
}

.page-header h1,
.panel h2,
.detail h3 {
  margin: 0;
  color: #111827;
}

.page-header p,
.summary small,
.empty,
.message {
  color: #6b7280;
}

.actions button,
.filters button,
.filters input,
.filters select {
  min-height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 9px;
  padding: 0 12px;
  background: #ffffff;
}

.actions button:not(.ghost) {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}

.ghost {
  color: #374151;
  cursor: pointer;
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  align-items: end;
}

.filters label {
  display: grid;
  gap: 6px;
  color: #374151;
  font-size: 13px;
}

.summary {
  align-items: flex-start;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(80px, 1fr));
  gap: 10px;
}

.summary-grid span {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f9fafb;
}

.summary-grid b {
  color: #111827;
  font-size: 18px;
}

.summary-grid em {
  color: #6b7280;
  font-style: normal;
  font-size: 12px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}

th,
td {
  border-bottom: 1px solid #e5e7eb;
  padding: 10px;
  text-align: left;
  white-space: nowrap;
}

tr.active {
  background: #eff6ff;
}

.title-cell {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tag {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  background: #eef2ff;
  color: #3730a3;
  font-size: 12px;
}

.text-button {
  border: 0;
  padding: 0;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
}

.detail {
  display: grid;
  gap: 12px;
}

.detail p {
  margin: 0;
  padding: 12px;
  border-radius: 12px;
  background: #f9fafb;
  color: #374151;
  white-space: pre-wrap;
}

dl {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 8px 12px;
  margin: 0;
}

dt {
  color: #6b7280;
}

dd {
  margin: 0;
  color: #111827;
  word-break: break-all;
}

.empty {
  text-align: center;
  padding: 24px;
}

@media (max-width: 1100px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .summary,
  .page-header {
    display: grid;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(80px, 1fr));
  }
}
</style>
