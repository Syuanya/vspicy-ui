<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  assignSupportTicket,
  closeSupportTicket,
  createSupportTicket,
  deleteSupportTicket,
  getSupportTicket,
  getSupportTicketOverview,
  listSupportTickets,
  reopenSupportTicket,
  replySupportTicket,
  resolveSupportTicket,
  updateSupportTicket
} from '../../api/supportTicket'

type MetricItem = { name: string; value: number }
type Reply = {
  id: number
  ticketId: number
  content: string
  replyType: string
  visibleToUser: boolean
  operatorId?: number
  operatorName?: string
  createdAt?: string
}
type Ticket = {
  id: number
  ticketNo: string
  title: string
  content: string
  category: string
  priority: string
  status: string
  submitterId?: number
  submitterName?: string
  contact?: string
  assigneeId?: number
  assigneeName?: string
  resolvedBy?: number
  resolvedAt?: string
  closedAt?: string
  lastReplyAt?: string
  tags?: string
  source?: string
  remark?: string
  createdAt?: string
  updatedAt?: string
  replies?: Reply[]
}
type Overview = {
  totalCount: number
  openCount: number
  processingCount: number
  resolvedCount: number
  closedCount: number
  urgentCount: number
  todayCreatedCount: number
  unassignedCount: number
  categoryDistribution: MetricItem[]
  priorityDistribution: MetricItem[]
  statusDistribution: MetricItem[]
}

const tickets = ref<Ticket[]>([])
const selected = ref<Ticket | null>(null)
const overview = ref<Overview | null>(null)
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const editingId = ref<number | null>(null)

const query = ref({
  status: '',
  category: '',
  priority: '',
  assigneeId: '',
  keyword: '',
  limit: 100
})

const form = ref({
  title: '',
  content: '',
  category: 'VIDEO',
  priority: 'NORMAL',
  submitterId: '',
  submitterName: '',
  contact: '',
  assigneeId: '',
  assigneeName: '',
  tags: '',
  source: 'ADMIN',
  remark: ''
})

const assignForm = ref({
  assigneeId: '',
  assigneeName: '',
  remark: ''
})

const replyForm = ref({
  content: '',
  replyType: 'PUBLIC',
  visibleToUser: true
})

const categories = [
  { value: 'ACCOUNT', label: '账号' },
  { value: 'VIDEO', label: '视频' },
  { value: 'PAYMENT', label: '支付' },
  { value: 'CONTENT', label: '内容' },
  { value: 'SYSTEM', label: '系统' },
  { value: 'OTHER', label: '其他' }
]

const priorities = [
  { value: 'LOW', label: '低' },
  { value: 'NORMAL', label: '普通' },
  { value: 'HIGH', label: '高' },
  { value: 'URGENT', label: '紧急' }
]

const statuses = [
  { value: 'OPEN', label: '待处理' },
  { value: 'PROCESSING', label: '处理中' },
  { value: 'RESOLVED', label: '已解决' },
  { value: 'CLOSED', label: '已关闭' }
]

const replyTypes = [
  { value: 'PUBLIC', label: '公开回复' },
  { value: 'INTERNAL', label: '内部备注' }
]

const cards = computed(() => {
  const data = overview.value
  if (!data) return []
  return [
    { label: '工单总数', value: data.totalCount, hint: 'sys_support_ticket 总记录' },
    { label: '待处理', value: data.openCount, hint: '等待首次处理' },
    { label: '处理中', value: data.processingCount, hint: '已接入处理流' },
    { label: '已解决', value: data.resolvedCount, hint: '等待关闭或回访' },
    { label: '已关闭', value: data.closedCount, hint: '处理完结' },
    { label: '紧急', value: data.urgentCount, hint: 'URGENT 优先级' },
    { label: '今日新增', value: data.todayCreatedCount, hint: '当天新建工单' },
    { label: '未分派', value: data.unassignedCount, hint: '无处理人' }
  ]
})

function labelOf(list: Array<{ value: string; label: string }>, value?: string) {
  return list.find((item) => item.value === value)?.label || value || '-'
}

function statusClass(value?: string) {
  const status = (value || '').toUpperCase()
  if (status === 'OPEN') return 'tag warning'
  if (status === 'PROCESSING') return 'tag info'
  if (status === 'RESOLVED') return 'tag success'
  if (status === 'CLOSED') return 'tag muted'
  return 'tag'
}

function priorityClass(value?: string) {
  const priority = (value || '').toUpperCase()
  if (priority === 'URGENT') return 'tag danger'
  if (priority === 'HIGH') return 'tag warning'
  if (priority === 'LOW') return 'tag muted'
  return 'tag info'
}

function params() {
  const result: any = { limit: query.value.limit }
  if (query.value.status) result.status = query.value.status
  if (query.value.category) result.category = query.value.category
  if (query.value.priority) result.priority = query.value.priority
  if (query.value.assigneeId) result.assigneeId = Number(query.value.assigneeId)
  if (query.value.keyword) result.keyword = query.value.keyword
  return result
}

function payload() {
  return {
    title: form.value.title,
    content: form.value.content,
    category: form.value.category,
    priority: form.value.priority,
    submitterId: form.value.submitterId ? Number(form.value.submitterId) : undefined,
    submitterName: form.value.submitterName || undefined,
    contact: form.value.contact || undefined,
    assigneeId: form.value.assigneeId ? Number(form.value.assigneeId) : undefined,
    assigneeName: form.value.assigneeName || undefined,
    tags: form.value.tags || undefined,
    source: form.value.source || 'ADMIN',
    remark: form.value.remark || undefined
  }
}

async function load() {
  loading.value = true
  message.value = ''
  try {
    const [overviewRes, listRes] = await Promise.all([
      getSupportTicketOverview(),
      listSupportTickets(params())
    ])
    overview.value = overviewRes.data?.data || overviewRes.data
    tickets.value = listRes.data?.data || listRes.data || []
    if (selected.value) {
      const current = tickets.value.find((item) => item.id === selected.value?.id)
      if (!current) selected.value = null
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function select(ticket: Ticket) {
  try {
    const res = await getSupportTicket(ticket.id)
    selected.value = res.data?.data || res.data
    assignForm.value = {
      assigneeId: selected.value?.assigneeId ? String(selected.value.assigneeId) : '',
      assigneeName: selected.value?.assigneeName || '',
      remark: ''
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '详情加载失败'
  }
}

function resetForm() {
  editingId.value = null
  form.value = {
    title: '',
    content: '',
    category: 'VIDEO',
    priority: 'NORMAL',
    submitterId: '',
    submitterName: '',
    contact: '',
    assigneeId: '',
    assigneeName: '',
    tags: '',
    source: 'ADMIN',
    remark: ''
  }
}

function edit(ticket: Ticket) {
  editingId.value = ticket.id
  form.value = {
    title: ticket.title || '',
    content: ticket.content || '',
    category: ticket.category || 'VIDEO',
    priority: ticket.priority || 'NORMAL',
    submitterId: ticket.submitterId ? String(ticket.submitterId) : '',
    submitterName: ticket.submitterName || '',
    contact: ticket.contact || '',
    assigneeId: ticket.assigneeId ? String(ticket.assigneeId) : '',
    assigneeName: ticket.assigneeName || '',
    tags: ticket.tags || '',
    source: ticket.source || 'ADMIN',
    remark: ticket.remark || ''
  }
  selected.value = ticket
}

async function save() {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    message.value = '标题和内容不能为空'
    return
  }
  saving.value = true
  try {
    const data = payload()
    if (editingId.value) {
      await updateSupportTicket(editingId.value, data)
      message.value = '工单已更新'
    } else {
      await createSupportTicket(data)
      message.value = '工单已创建'
    }
    resetForm()
    await load()
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '保存失败'
  } finally {
    saving.value = false
  }
}

async function assignSelected() {
  if (!selected.value) return
  if (!assignForm.value.assigneeId) {
    message.value = '请输入处理人 ID'
    return
  }
  try {
    const res = await assignSupportTicket(selected.value.id, {
      assigneeId: Number(assignForm.value.assigneeId),
      assigneeName: assignForm.value.assigneeName || undefined,
      remark: assignForm.value.remark || undefined
    })
    selected.value = res.data?.data || res.data
    message.value = '工单已分派'
    await load()
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '分派失败'
  }
}

async function replySelected() {
  if (!selected.value) return
  if (!replyForm.value.content.trim()) {
    message.value = '回复内容不能为空'
    return
  }
  try {
    const res = await replySupportTicket(selected.value.id, {
      content: replyForm.value.content,
      replyType: replyForm.value.replyType,
      visibleToUser: replyForm.value.visibleToUser
    })
    selected.value = res.data?.data || res.data
    replyForm.value.content = ''
    message.value = '回复已提交'
    await load()
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '回复失败'
  }
}

async function changeStatus(action: 'resolve' | 'close' | 'reopen', ticket: Ticket) {
  try {
    if (action === 'resolve') await resolveSupportTicket(ticket.id)
    if (action === 'close') await closeSupportTicket(ticket.id)
    if (action === 'reopen') await reopenSupportTicket(ticket.id)
    message.value = action === 'resolve' ? '已标记解决' : action === 'close' ? '已关闭' : '已重新打开'
    await load()
    if (selected.value?.id === ticket.id) await select(ticket)
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '状态变更失败'
  }
}

async function remove(ticket: Ticket) {
  if (!window.confirm(`确认删除工单 ${ticket.ticketNo}？`)) return
  try {
    await deleteSupportTicket(ticket.id)
    message.value = '工单已删除'
    if (selected.value?.id === ticket.id) selected.value = null
    await load()
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '删除失败'
  }
}

onMounted(load)
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Support Ticket Center</p>
        <h1>后台工单中心</h1>
        <p class="subtitle">集中处理上传、转码、账号、支付、内容和系统类用户问题。</p>
      </div>
      <button class="primary" :disabled="loading" @click="load">{{ loading ? '刷新中...' : '刷新' }}</button>
    </header>

    <div v-if="message" class="message">{{ message }}</div>

    <div class="metrics">
      <article v-for="card in cards" :key="card.label" class="metric-card">
        <strong>{{ card.value }}</strong>
        <span>{{ card.label }}</span>
        <small>{{ card.hint }}</small>
      </article>
    </div>

    <section class="panel">
      <div class="panel-title">
        <div>
          <h2>筛选查询</h2>
          <p>支持按状态、分类、优先级、处理人和关键词过滤。</p>
        </div>
      </div>
      <div class="filters">
        <label>
          状态
          <select v-model="query.status">
            <option value="">全部状态</option>
            <option v-for="item in statuses" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <label>
          分类
          <select v-model="query.category">
            <option value="">全部分类</option>
            <option v-for="item in categories" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <label>
          优先级
          <select v-model="query.priority">
            <option value="">全部优先级</option>
            <option v-for="item in priorities" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <label>
          处理人 ID
          <input v-model="query.assigneeId" placeholder="例如 1" />
        </label>
        <label class="wide">
          关键词
          <input v-model="query.keyword" placeholder="工单号 / 标题 / 内容 / 联系方式 / 标签" />
        </label>
        <button class="primary" @click="load">查询</button>
      </div>
    </section>

    <div class="layout">
      <section class="panel">
        <div class="panel-title">
          <div>
            <h2>工单列表</h2>
            <p>优先展示紧急和最近更新的工单。</p>
          </div>
          <button @click="resetForm">新建工单</button>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>工单</th>
                <th>分类</th>
                <th>优先级</th>
                <th>状态</th>
                <th>处理人</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ticket in tickets" :key="ticket.id" :class="{ active: selected?.id === ticket.id }" @click="select(ticket)">
                <td>
                  <strong>{{ ticket.title }}</strong>
                  <small>{{ ticket.ticketNo }}</small>
                </td>
                <td>{{ labelOf(categories, ticket.category) }}</td>
                <td><span :class="priorityClass(ticket.priority)">{{ labelOf(priorities, ticket.priority) }}</span></td>
                <td><span :class="statusClass(ticket.status)">{{ labelOf(statuses, ticket.status) }}</span></td>
                <td>{{ ticket.assigneeName || '-' }}</td>
                <td>{{ ticket.updatedAt || ticket.createdAt || '-' }}</td>
                <td class="actions" @click.stop>
                  <button @click="edit(ticket)">编辑</button>
                  <button v-if="ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED'" @click="changeStatus('resolve', ticket)">解决</button>
                  <button v-if="ticket.status !== 'CLOSED'" @click="changeStatus('close', ticket)">关闭</button>
                  <button v-if="ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'" @click="changeStatus('reopen', ticket)">重开</button>
                  <button class="danger" @click="remove(ticket)">删除</button>
                </td>
              </tr>
              <tr v-if="tickets.length === 0">
                <td colspan="7" class="empty">暂无工单</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside class="panel">
        <div class="panel-title">
          <div>
            <h2>{{ editingId ? '编辑工单' : '新建工单' }}</h2>
            <p>{{ editingId ? '修改当前工单信息。' : '登记后台发现或用户反馈的问题。' }}</p>
          </div>
        </div>
        <div class="form-grid">
          <label class="wide">标题<input v-model="form.title" placeholder="例如：视频上传后无法播放" /></label>
          <label>分类
            <select v-model="form.category">
              <option v-for="item in categories" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
          <label>优先级
            <select v-model="form.priority">
              <option v-for="item in priorities" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
          <label>提交人 ID<input v-model="form.submitterId" placeholder="可选" /></label>
          <label>提交人<input v-model="form.submitterName" placeholder="用户昵称或来源" /></label>
          <label>联系方式<input v-model="form.contact" placeholder="邮箱 / 手机 / IM" /></label>
          <label>处理人 ID<input v-model="form.assigneeId" placeholder="可选" /></label>
          <label>处理人<input v-model="form.assigneeName" placeholder="可选" /></label>
          <label>标签<input v-model="form.tags" placeholder="上传,转码,会员" /></label>
          <label>来源<input v-model="form.source" placeholder="ADMIN / USER / SYSTEM" /></label>
          <label class="wide">内容<textarea v-model="form.content" rows="5" placeholder="描述现象、复现步骤、影响用户和期望结果" /></label>
          <label class="wide">备注<textarea v-model="form.remark" rows="3" placeholder="内部备注" /></label>
        </div>
        <div class="form-actions">
          <button @click="resetForm">重置</button>
          <button class="primary" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </aside>
    </div>

    <section v-if="selected" class="panel detail">
      <div class="panel-title">
        <div>
          <h2>工单详情：{{ selected.ticketNo }}</h2>
          <p>{{ selected.title }}</p>
        </div>
        <span :class="statusClass(selected.status)">{{ labelOf(statuses, selected.status) }}</span>
      </div>

      <div class="detail-grid">
        <div><b>分类</b><span>{{ labelOf(categories, selected.category) }}</span></div>
        <div><b>优先级</b><span :class="priorityClass(selected.priority)">{{ labelOf(priorities, selected.priority) }}</span></div>
        <div><b>提交人</b><span>{{ selected.submitterName || '-' }} / {{ selected.submitterId || '-' }}</span></div>
        <div><b>联系方式</b><span>{{ selected.contact || '-' }}</span></div>
        <div><b>处理人</b><span>{{ selected.assigneeName || '-' }} / {{ selected.assigneeId || '-' }}</span></div>
        <div><b>创建时间</b><span>{{ selected.createdAt || '-' }}</span></div>
        <div><b>最后回复</b><span>{{ selected.lastReplyAt || '-' }}</span></div>
        <div><b>标签</b><span>{{ selected.tags || '-' }}</span></div>
      </div>

      <div class="content-box">{{ selected.content }}</div>

      <div class="ops-row">
        <label>
          处理人 ID
          <input v-model="assignForm.assigneeId" placeholder="例如 1" />
        </label>
        <label>
          处理人名称
          <input v-model="assignForm.assigneeName" placeholder="例如 dev-admin" />
        </label>
        <label class="wide">
          分派备注
          <input v-model="assignForm.remark" placeholder="可选" />
        </label>
        <button class="primary" @click="assignSelected">分派</button>
      </div>

      <div class="reply-box">
        <h3>回复记录</h3>
        <div v-for="reply in selected.replies || []" :key="reply.id" class="reply">
          <div>
            <span :class="reply.replyType === 'INTERNAL' ? 'tag muted' : reply.replyType === 'SYSTEM' ? 'tag info' : 'tag success'">
              {{ reply.replyType === 'INTERNAL' ? '内部备注' : reply.replyType === 'SYSTEM' ? '系统记录' : '公开回复' }}
            </span>
            <b>{{ reply.operatorName || '-' }}</b>
            <small>{{ reply.createdAt || '-' }}</small>
          </div>
          <p>{{ reply.content }}</p>
        </div>
        <div v-if="!selected.replies?.length" class="empty">暂无回复</div>

        <div class="reply-form">
          <select v-model="replyForm.replyType">
            <option v-for="item in replyTypes" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
          <label class="inline">
            <input v-model="replyForm.visibleToUser" type="checkbox" />
            用户可见
          </label>
          <textarea v-model="replyForm.content" rows="3" placeholder="填写处理进展、用户回复或内部备注" />
          <button class="primary" @click="replySelected">提交回复</button>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.page {
  display: grid;
  gap: 18px;
  padding: 24px;
}
.page-header,
.panel-title,
.form-actions,
.ops-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.eyebrow {
  margin: 0 0 4px;
  color: #64748b;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
h1,
h2,
h3,
p {
  margin: 0;
}
.subtitle,
.panel-title p,
.metric-card small,
td small {
  color: #64748b;
}
.message {
  padding: 10px 14px;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  background: #eff6ff;
  color: #1d4ed8;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.metric-card,
.panel {
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}
.metric-card {
  display: grid;
  gap: 4px;
  padding: 16px;
}
.metric-card strong {
  font-size: 26px;
}
.panel {
  padding: 18px;
}
.filters,
.form-grid,
.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(360px, 0.8fr);
  gap: 18px;
}
label {
  display: grid;
  gap: 6px;
  color: #334155;
  font-size: 13px;
}
input,
select,
textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 9px 11px;
  background: #fff;
  color: #0f172a;
  font: inherit;
}
textarea {
  resize: vertical;
}
.wide {
  grid-column: span 2;
}
button {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 9px 12px;
  background: #fff;
  cursor: pointer;
}
button:hover {
  background: #f8fafc;
}
button.primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}
button.primary:hover {
  background: #1d4ed8;
}
button.danger {
  border-color: #fecaca;
  color: #dc2626;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
.table-wrap {
  overflow: auto;
  margin-top: 14px;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  border-bottom: 1px solid #e2e8f0;
  padding: 10px;
  text-align: left;
  vertical-align: top;
}
tr.active {
  background: #eff6ff;
}
td strong,
td small {
  display: block;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 3px 8px;
  background: #f1f5f9;
  color: #334155;
  font-size: 12px;
}
.tag.success {
  background: #dcfce7;
  color: #166534;
}
.tag.warning {
  background: #fef3c7;
  color: #92400e;
}
.tag.info {
  background: #dbeafe;
  color: #1d4ed8;
}
.tag.danger {
  background: #fee2e2;
  color: #b91c1c;
}
.tag.muted {
  background: #f1f5f9;
  color: #64748b;
}
.empty {
  padding: 18px;
  color: #94a3b8;
  text-align: center;
}
.detail-grid div {
  display: grid;
  gap: 4px;
}
.detail-grid b {
  color: #64748b;
  font-size: 12px;
}
.content-box {
  margin-top: 16px;
  padding: 14px;
  border-radius: 14px;
  background: #f8fafc;
  white-space: pre-wrap;
}
.ops-row {
  align-items: end;
  justify-content: flex-start;
  margin-top: 16px;
}
.reply-box {
  margin-top: 18px;
}
.reply {
  display: grid;
  gap: 8px;
  margin-top: 10px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
}
.reply div {
  display: flex;
  align-items: center;
  gap: 8px;
}
.reply p {
  white-space: pre-wrap;
}
.reply-form {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}
.inline {
  display: flex;
  align-items: center;
  gap: 8px;
}
.inline input {
  width: auto;
}
@media (max-width: 1180px) {
  .metrics,
  .filters,
  .form-grid,
  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .layout {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 760px) {
  .metrics,
  .filters,
  .form-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .wide {
    grid-column: span 1;
  }
  .page-header,
  .panel-title,
  .ops-row {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
