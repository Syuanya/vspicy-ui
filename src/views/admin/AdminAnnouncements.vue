<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  archiveAnnouncement,
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementOverview,
  listAnnouncementsAdmin,
  offlineAnnouncement,
  publishAnnouncement,
  updateAnnouncement
} from '../../api/announcement'

type MetricItem = { name: string; value: number }
type Announcement = {
  id: number
  title: string
  content: string
  category: string
  priority: string
  status: string
  pinned: boolean
  publishStartAt?: string
  publishEndAt?: string
  publishedMessageId?: number
  publishedBy?: number
  publishedAt?: string
  offlineAt?: string
  remark?: string
  createdAt?: string
  updatedAt?: string
}
type Overview = {
  totalCount: number
  draftCount: number
  publishedCount: number
  offlineCount: number
  archivedCount: number
  pinnedCount: number
  effectiveCount: number
  expiredCount: number
  todayPublishedCount: number
  categoryDistribution: MetricItem[]
  statusDistribution: MetricItem[]
}

const announcements = ref<Announcement[]>([])
const selected = ref<Announcement | null>(null)
const overview = ref<Overview | null>(null)
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const editingId = ref<number | null>(null)

const query = ref({
  status: '',
  category: '',
  priority: '',
  pinned: '',
  onlyEffective: false,
  keyword: '',
  limit: 100
})

const form = ref({
  title: '',
  content: '',
  category: 'SYSTEM',
  priority: 'NORMAL',
  pinned: false,
  publishStartAt: '',
  publishEndAt: '',
  remark: ''
})

const categories = [
  { value: 'SYSTEM', label: '系统公告' },
  { value: 'OPERATION', label: '运营公告' },
  { value: 'MAINTENANCE', label: '维护公告' },
  { value: 'ACTIVITY', label: '活动公告' },
  { value: 'SECURITY', label: '安全公告' }
]

const priorities = [
  { value: 'LOW', label: '低' },
  { value: 'NORMAL', label: '普通' },
  { value: 'HIGH', label: '高' },
  { value: 'URGENT', label: '紧急' }
]

const statuses = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'PUBLISHED', label: '已发布' },
  { value: 'OFFLINE', label: '已下线' },
  { value: 'ARCHIVED', label: '已归档' }
]

const cards = computed(() => {
  const data = overview.value
  if (!data) return []
  return [
    { label: '公告总数', value: data.totalCount, hint: 'notification_announcement 总记录' },
    { label: '已发布', value: data.publishedCount, hint: '当前发布状态公告' },
    { label: '生效中', value: data.effectiveCount, hint: '发布时间窗口内可见' },
    { label: '置顶公告', value: data.pinnedCount, hint: '公告栏优先展示' },
    { label: '草稿', value: data.draftCount, hint: '未发布公告' },
    { label: '已过期', value: data.expiredCount, hint: '超过结束时间' },
    { label: '今日发布', value: data.todayPublishedCount, hint: '今天新增发布' },
    { label: '已归档', value: data.archivedCount, hint: '历史留存记录' }
  ]
})

function labelOf(list: Array<{ value: string; label: string }>, value?: string) {
  return list.find((item) => item.value === value)?.label || value || '-'
}

function statusClass(value?: string) {
  const status = (value || '').toUpperCase()
  if (status === 'PUBLISHED') return 'tag success'
  if (status === 'DRAFT') return 'tag warning'
  if (status === 'OFFLINE') return 'tag muted'
  if (status === 'ARCHIVED') return 'tag'
  return 'tag'
}

function priorityClass(value?: string) {
  const priority = (value || '').toUpperCase()
  if (priority === 'URGENT') return 'tag danger'
  if (priority === 'HIGH') return 'tag warning'
  if (priority === 'LOW') return 'tag muted'
  return 'tag info'
}

function toApiTime(value?: string) {
  return value ? value.replace('T', ' ') + ':00' : undefined
}

function toInputTime(value?: string) {
  return value ? value.replace(' ', 'T').slice(0, 16) : ''
}

function params() {
  const result: any = { limit: query.value.limit }
  if (query.value.status) result.status = query.value.status
  if (query.value.category) result.category = query.value.category
  if (query.value.priority) result.priority = query.value.priority
  if (query.value.pinned !== '') result.pinned = query.value.pinned === 'true'
  if (query.value.onlyEffective) result.onlyEffective = true
  if (query.value.keyword) result.keyword = query.value.keyword
  return result
}

function payload() {
  return {
    title: form.value.title,
    content: form.value.content,
    category: form.value.category,
    priority: form.value.priority,
    pinned: form.value.pinned,
    publishStartAt: toApiTime(form.value.publishStartAt),
    publishEndAt: toApiTime(form.value.publishEndAt),
    remark: form.value.remark
  }
}

function resetForm() {
  editingId.value = null
  form.value = {
    title: '',
    content: '',
    category: 'SYSTEM',
    priority: 'NORMAL',
    pinned: false,
    publishStartAt: '',
    publishEndAt: '',
    remark: ''
  }
}

function edit(item: Announcement) {
  editingId.value = item.id
  selected.value = item
  form.value = {
    title: item.title || '',
    content: item.content || '',
    category: item.category || 'SYSTEM',
    priority: item.priority || 'NORMAL',
    pinned: Boolean(item.pinned),
    publishStartAt: toInputTime(item.publishStartAt),
    publishEndAt: toInputTime(item.publishEndAt),
    remark: item.remark || ''
  }
}

async function loadOverview() {
  const res: any = await getAnnouncementOverview()
  if (res.code === 0) overview.value = res.data
}

async function load() {
  loading.value = true
  message.value = ''
  try {
    const res: any = await listAnnouncementsAdmin(params())
    if (res.code === 0) {
      announcements.value = Array.isArray(res.data) ? res.data : []
      if (!selected.value && announcements.value.length) selected.value = announcements.value[0]
    } else {
      message.value = res.message || '公告加载失败'
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '公告加载失败'
  } finally {
    loading.value = false
  }
}

async function refreshAll() {
  await Promise.all([load(), loadOverview()])
}

async function save() {
  saving.value = true
  message.value = ''
  try {
    const res: any = editingId.value
      ? await updateAnnouncement(editingId.value, payload())
      : await createAnnouncement(payload())
    if (res.code === 0) {
      selected.value = res.data
      message.value = editingId.value ? '公告已更新。' : '公告已创建。'
      resetForm()
      await refreshAll()
    } else {
      message.value = res.message || '保存失败'
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '保存失败'
  } finally {
    saving.value = false
  }
}

async function publish(item: Announcement) {
  const res: any = await publishAnnouncement(item.id, {
    publishStartAt: item.publishStartAt,
    publishEndAt: item.publishEndAt,
    pinned: item.pinned
  })
  if (res.code === 0) {
    selected.value = res.data
    message.value = '公告已发布，已同步生成站内通知消息。'
    await refreshAll()
  } else {
    message.value = res.message || '发布失败'
  }
}

async function offline(item: Announcement) {
  if (!window.confirm('确认下线该公告？公告栏将不再展示。')) return
  const res: any = await offlineAnnouncement(item.id)
  if (res.code === 0) {
    selected.value = res.data
    message.value = '公告已下线。'
    await refreshAll()
  }
}

async function archive(item: Announcement) {
  if (!window.confirm('确认归档该公告？归档后不可继续编辑。')) return
  const res: any = await archiveAnnouncement(item.id)
  if (res.code === 0) {
    selected.value = res.data
    message.value = '公告已归档。'
    await refreshAll()
  }
}

async function remove(item: Announcement) {
  if (!window.confirm('确认删除该公告？已发布公告需要先下线。')) return
  const res: any = await deleteAnnouncement(item.id)
  if (res.code === 0) {
    if (selected.value?.id === item.id) selected.value = null
    message.value = '公告已删除。'
    await refreshAll()
  } else {
    message.value = res.message || '删除失败'
  }
}

function metricPercent(item: MetricItem, list?: MetricItem[]) {
  const total = (list || []).reduce((sum, current) => sum + Number(current.value || 0), 0)
  if (!total) return 0
  return Math.round(Number(item.value || 0) * 1000 / total) / 10
}

onMounted(refreshAll)
</script>

<template>
  <section class="page-card">
    <div class="page-header">
      <div>
        <h1>系统公告管理</h1>
        <p>维护站内公告草稿、发布时间窗口、置顶顺序，并发布到用户通知公告栏。</p>
      </div>
      <div class="actions">
        <button type="button" @click="resetForm">新建公告</button>
        <button type="button" :disabled="loading" @click="refreshAll">{{ loading ? '刷新中...' : '刷新' }}</button>
      </div>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div v-if="overview" class="metrics-grid">
      <article v-for="card in cards" :key="card.label" class="metric-card">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
        <small>{{ card.hint }}</small>
      </article>
    </div>

    <div class="workspace-grid">
      <article class="panel list-panel">
        <div class="panel-title">
          <h2>公告列表</h2>
          <small>{{ announcements.length }} 条</small>
        </div>
        <div class="filters">
          <select v-model="query.status" @change="load">
            <option value="">全部状态</option>
            <option v-for="item in statuses" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
          <select v-model="query.category" @change="load">
            <option value="">全部分类</option>
            <option v-for="item in categories" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
          <select v-model="query.priority" @change="load">
            <option value="">全部优先级</option>
            <option v-for="item in priorities" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
          <select v-model="query.pinned" @change="load">
            <option value="">全部置顶</option>
            <option value="true">仅置顶</option>
            <option value="false">未置顶</option>
          </select>
          <label class="inline-check">
            <input v-model="query.onlyEffective" type="checkbox" @change="load" /> 仅生效中
          </label>
          <input v-model="query.keyword" placeholder="标题 / 内容 / 备注" @keyup.enter="load" />
          <button type="button" @click="load">查询</button>
        </div>

        <div class="announcement-list">
          <button
            v-for="item in announcements"
            :key="item.id"
            type="button"
            :class="['announcement-item', { active: selected?.id === item.id }]"
            @click="selected = item"
          >
            <div class="item-main">
              <strong>{{ item.title }}</strong>
              <span>{{ item.content }}</span>
            </div>
            <div class="item-tags">
              <em v-if="item.pinned" class="tag danger">置顶</em>
              <em :class="statusClass(item.status)">{{ labelOf(statuses, item.status) }}</em>
              <em :class="priorityClass(item.priority)">{{ labelOf(priorities, item.priority) }}</em>
            </div>
          </button>
          <p v-if="!loading && announcements.length === 0" class="empty">暂无公告记录</p>
        </div>
      </article>

      <article class="panel form-panel">
        <div class="panel-title">
          <h2>{{ editingId ? '编辑公告' : '新建公告' }}</h2>
          <small>保存为草稿后再发布</small>
        </div>
        <div class="form-grid">
          <label>
            标题
            <input v-model="form.title" maxlength="120" placeholder="请输入公告标题" />
          </label>
          <label>
            分类
            <select v-model="form.category">
              <option v-for="item in categories" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
          <label>
            优先级
            <select v-model="form.priority">
              <option v-for="item in priorities" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
          <label class="inline-check form-check">
            <input v-model="form.pinned" type="checkbox" /> 置顶展示
          </label>
          <label>
            开始时间
            <input v-model="form.publishStartAt" type="datetime-local" />
          </label>
          <label>
            结束时间
            <input v-model="form.publishEndAt" type="datetime-local" />
          </label>
          <label class="wide">
            正文
            <textarea v-model="form.content" rows="9" placeholder="请输入公告正文"></textarea>
          </label>
          <label class="wide">
            备注
            <input v-model="form.remark" maxlength="500" placeholder="仅后台可见" />
          </label>
        </div>
        <div class="actions right">
          <button type="button" @click="resetForm">重置</button>
          <button type="button" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存草稿' }}</button>
        </div>
      </article>

      <article class="panel detail-panel">
        <div class="panel-title">
          <h2>公告详情</h2>
          <small v-if="selected">#{{ selected.id }}</small>
        </div>
        <template v-if="selected">
          <div class="detail-head">
            <h3>{{ selected.title }}</h3>
            <div class="item-tags">
              <em v-if="selected.pinned" class="tag danger">置顶</em>
              <em :class="statusClass(selected.status)">{{ labelOf(statuses, selected.status) }}</em>
              <em class="tag info">{{ labelOf(categories, selected.category) }}</em>
              <em :class="priorityClass(selected.priority)">{{ labelOf(priorities, selected.priority) }}</em>
            </div>
          </div>
          <p class="content-preview">{{ selected.content }}</p>
          <dl class="meta-grid">
            <div><dt>展示开始</dt><dd>{{ selected.publishStartAt || '-' }}</dd></div>
            <div><dt>展示结束</dt><dd>{{ selected.publishEndAt || '-' }}</dd></div>
            <div><dt>发布时间</dt><dd>{{ selected.publishedAt || '-' }}</dd></div>
            <div><dt>下线时间</dt><dd>{{ selected.offlineAt || '-' }}</dd></div>
            <div><dt>消息ID</dt><dd>{{ selected.publishedMessageId || '-' }}</dd></div>
            <div><dt>更新时间</dt><dd>{{ selected.updatedAt || '-' }}</dd></div>
          </dl>
          <p v-if="selected.remark" class="remark">备注：{{ selected.remark }}</p>
          <div class="actions wrap">
            <button type="button" @click="edit(selected)">编辑</button>
            <button type="button" :disabled="selected.status === 'PUBLISHED'" @click="publish(selected)">发布</button>
            <button type="button" :disabled="selected.status !== 'PUBLISHED'" @click="offline(selected)">下线</button>
            <button type="button" :disabled="selected.status === 'ARCHIVED'" @click="archive(selected)">归档</button>
            <button type="button" class="danger-btn" @click="remove(selected)">删除</button>
          </div>
        </template>
        <p v-else class="empty">请选择一条公告</p>
      </article>

      <article v-if="overview" class="panel metric-panel">
        <h2>分类分布</h2>
        <div class="bars">
          <div v-for="item in overview.categoryDistribution" :key="item.name" class="bar-row">
            <div class="bar-head"><span>{{ labelOf(categories, item.name) }}</span><strong>{{ item.value }}</strong></div>
            <div class="bar-track"><span :style="{ width: `${metricPercent(item, overview.categoryDistribution)}%` }"></span></div>
          </div>
        </div>
        <h2>状态分布</h2>
        <div class="bars">
          <div v-for="item in overview.statusDistribution" :key="item.name" class="bar-row">
            <div class="bar-head"><span>{{ labelOf(statuses, item.name) }}</span><strong>{{ item.value }}</strong></div>
            <div class="bar-track"><span :style="{ width: `${metricPercent(item, overview.statusDistribution)}%` }"></span></div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.page-card {
  display: grid;
  gap: 18px;
}

.page-header,
.panel,
.metric-card {
  border: 1px solid #e5e7eb;
  background: #ffffff;
  border-radius: 16px;
}

.page-header,
.panel-title,
.actions,
.bar-head,
.item-tags,
.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-header {
  padding: 18px;
}

.page-header h1,
.panel h2,
.detail-head h3 {
  margin: 0;
  color: #111827;
}

.page-header p {
  margin: 6px 0 0;
  color: #6b7280;
}

.actions {
  flex-wrap: wrap;
}

.actions.right {
  justify-content: flex-end;
  margin-top: 14px;
}

.actions.wrap {
  justify-content: flex-start;
  margin-top: 16px;
}

button,
input,
select,
textarea {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 9px 11px;
  background: #ffffff;
  color: #111827;
}

button {
  cursor: pointer;
  font-weight: 700;
}

button:hover:not(:disabled) {
  border-color: #2563eb;
  color: #1d4ed8;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

textarea {
  resize: vertical;
}

.message {
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.metric-card {
  padding: 14px;
  display: grid;
  gap: 6px;
}

.metric-card span,
.metric-card small,
.panel-title small,
.item-main span,
dt {
  color: #6b7280;
}

.metric-card strong {
  font-size: 24px;
  color: #111827;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(320px, 1.1fr) minmax(360px, 1fr);
  gap: 16px;
  align-items: start;
}

.panel {
  padding: 16px;
  display: grid;
  gap: 14px;
}

.list-panel,
.metric-panel {
  grid-column: span 1;
}

.form-panel,
.detail-panel {
  grid-column: span 1;
}

.filters,
.form-grid {
  display: grid;
  gap: 10px;
}

.filters {
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
}

.form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-grid label {
  display: grid;
  gap: 6px;
  color: #374151;
  font-weight: 700;
}

.form-grid .wide {
  grid-column: 1 / -1;
}

.inline-check,
.form-check {
  display: inline-flex !important;
  align-items: center;
  justify-content: flex-start;
  gap: 8px !important;
  color: #374151;
}

.announcement-list {
  display: grid;
  gap: 10px;
  max-height: 620px;
  overflow: auto;
}

.announcement-item {
  width: 100%;
  text-align: left;
  display: grid;
  gap: 10px;
  border-color: #e5e7eb;
}

.announcement-item.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.item-main {
  display: grid;
  gap: 4px;
}

.item-main span {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

.item-tags {
  justify-content: flex-start;
  flex-wrap: wrap;
}

.tag {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 3px 9px;
  background: #f3f4f6;
  color: #4b5563;
  font-style: normal;
  font-size: 12px;
  font-weight: 700;
}

.tag.success {
  background: #ecfdf5;
  color: #047857;
}

.tag.warning {
  background: #fffbeb;
  color: #b45309;
}

.tag.danger {
  background: #fef2f2;
  color: #b91c1c;
}

.tag.info {
  background: #eff6ff;
  color: #1d4ed8;
}

.tag.muted {
  background: #f9fafb;
  color: #6b7280;
}

.content-preview {
  white-space: pre-wrap;
  line-height: 1.7;
  color: #374151;
  background: #f9fafb;
  border-radius: 12px;
  padding: 12px;
  margin: 0;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.meta-grid div {
  padding: 10px;
  border-radius: 12px;
  background: #f9fafb;
}

dt {
  font-size: 12px;
}

dd {
  margin: 4px 0 0;
  color: #111827;
  word-break: break-all;
}

.remark,
.empty {
  margin: 0;
  color: #6b7280;
}

.danger-btn {
  color: #b91c1c;
}

.bars {
  display: grid;
  gap: 10px;
}

.bar-row {
  display: grid;
  gap: 5px;
}

.bar-track {
  height: 8px;
  background: #f3f4f6;
  border-radius: 999px;
  overflow: hidden;
}

.bar-track span {
  display: block;
  height: 100%;
  background: #2563eb;
}

@media (max-width: 1080px) {
  .workspace-grid,
  .form-grid,
  .meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
