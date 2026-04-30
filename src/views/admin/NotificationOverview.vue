<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getNotificationOverview } from '../../api/notification'
import ApiErrorBanner from '../../components/common/ApiErrorBanner.vue'
import { normalizeApiError } from '../../api/apiError'

type MetricItem = {
  name: string
  value: number
}

type DailyItem = {
  day: string
  messageCount: number
  deliveryCount: number
  readCount: number
  unreadCount: number
}

type Overview = {
  totalMessages: number
  totalDeliveries: number
  unreadDeliveries: number
  readDeliveries: number
  readRate: number
  todayMessages: number
  todayDeliveries: number
  todayUnreadDeliveries: number
  failedEvents: number
  pendingEvents: number
  enabledTemplates: number
  disabledTemplates: number
  onlineUsers: number
  onlineConnections: number
  typeStats: MetricItem[]
  priorityStats: MetricItem[]
  eventStatusStats: MetricItem[]
  dailyStats: DailyItem[]
}

const days = ref(7)
const overview = ref<Overview | null>(null)
const loading = ref(false)
const error = ref<any>(null)

const cards = computed(() => {
  const data = overview.value
  if (!data) return []
  return [
    { label: '累计消息', value: data.totalMessages, hint: 'notification_message 已发布数量' },
    { label: '累计投递', value: data.totalDeliveries, hint: '未删除收件箱记录' },
    { label: '未读投递', value: data.unreadDeliveries, hint: '当前用户未读总量' },
    { label: '阅读率', value: `${data.readRate || 0}%`, hint: '已读投递 / 总投递' },
    { label: '今日消息', value: data.todayMessages, hint: '今日新增消息' },
    { label: '今日投递', value: data.todayDeliveries, hint: '今日新增收件箱' },
    { label: '失败事件', value: data.failedEvents, hint: 'FAILED / DEAD 事件' },
    { label: '待处理事件', value: data.pendingEvents, hint: 'PENDING / SENT 事件' },
    { label: '启用模板', value: data.enabledTemplates, hint: '可用于模板发布' },
    { label: '在线连接', value: data.onlineConnections, hint: `${data.onlineUsers || 0} 个在线用户` }
  ]
})

async function load() {
  loading.value = true
  error.value = null
  try {
    const res: any = await getNotificationOverview({ days: days.value })
    if (res.code === 0) {
      overview.value = res.data
    } else {
      error.value = normalizeApiError(res)
    }
  } catch (err) {
    error.value = normalizeApiError(err)
  } finally {
    loading.value = false
  }
}

function metricPercent(item: MetricItem, list: MetricItem[]) {
  const total = list.reduce((sum, current) => sum + Number(current.value || 0), 0)
  if (!total) return 0
  return Math.round(Number(item.value || 0) * 1000 / total) / 10
}

onMounted(load)
</script>

<template>
  <section class="page-card">
    <div class="page-header">
      <div>
        <h1>通知运营看板</h1>
        <p>聚合消息投递、阅读、模板、事件和 SSE 在线连接指标。</p>
      </div>
      <div class="actions">
        <select v-model.number="days" @change="load">
          <option :value="7">近 7 天</option>
          <option :value="14">近 14 天</option>
          <option :value="30">近 30 天</option>
          <option :value="90">近 90 天</option>
        </select>
        <button type="button" :disabled="loading" @click="load">{{ loading ? '刷新中...' : '刷新' }}</button>
      </div>
    </div>

    <ApiErrorBanner v-if="error" :error="error" />

    <div v-if="overview" class="metrics-grid">
      <article v-for="card in cards" :key="card.label" class="metric-card">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
        <small>{{ card.hint }}</small>
      </article>
    </div>

    <div v-if="overview" class="panel-grid">
      <article class="panel">
        <h2>消息类型分布</h2>
        <div v-if="overview.typeStats.length" class="bars">
          <div v-for="item in overview.typeStats" :key="item.name" class="bar-row">
            <div class="bar-head">
              <span>{{ item.name || 'UNKNOWN' }}</span>
              <strong>{{ item.value }}</strong>
            </div>
            <div class="bar-track"><span :style="{ width: `${metricPercent(item, overview.typeStats)}%` }"></span></div>
          </div>
        </div>
        <p v-else class="empty">暂无消息类型数据</p>
      </article>

      <article class="panel">
        <h2>优先级分布</h2>
        <div v-if="overview.priorityStats.length" class="bars">
          <div v-for="item in overview.priorityStats" :key="item.name" class="bar-row">
            <div class="bar-head">
              <span>{{ item.name || 'NORMAL' }}</span>
              <strong>{{ item.value }}</strong>
            </div>
            <div class="bar-track"><span :style="{ width: `${metricPercent(item, overview.priorityStats)}%` }"></span></div>
          </div>
        </div>
        <p v-else class="empty">暂无优先级数据</p>
      </article>

      <article class="panel">
        <h2>事件状态</h2>
        <div v-if="overview.eventStatusStats.length" class="bars">
          <div v-for="item in overview.eventStatusStats" :key="item.name" class="bar-row">
            <div class="bar-head">
              <span>{{ item.name }}</span>
              <strong>{{ item.value }}</strong>
            </div>
            <div class="bar-track"><span :style="{ width: `${metricPercent(item, overview.eventStatusStats)}%` }"></span></div>
          </div>
        </div>
        <p v-else class="empty">暂无事件日志数据</p>
      </article>

      <article class="panel wide">
        <h2>每日趋势</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>新增消息</th>
                <th>投递</th>
                <th>已读</th>
                <th>未读</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in overview.dailyStats" :key="item.day">
                <td>{{ item.day }}</td>
                <td>{{ item.messageCount }}</td>
                <td>{{ item.deliveryCount }}</td>
                <td>{{ item.readCount }}</td>
                <td>{{ item.unreadCount }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>

    <p v-if="loading && !overview" class="loading">正在加载通知运营指标...</p>
  </section>
</template>

<style scoped>
.page-card {
  display: grid;
  gap: 18px;
}

.page-header,
.actions,
.bar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-header {
  border-radius: 16px;
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
}

.page-header h1,
.panel h2 {
  margin: 0;
  color: #111827;
}

.page-header p {
  margin: 6px 0 0;
  color: #6b7280;
}

.actions select,
.actions button {
  min-height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 9px;
  padding: 0 12px;
  background: #ffffff;
}

.actions button {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
  cursor: pointer;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.metric-card,
.panel {
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
}

.metric-card {
  display: grid;
  gap: 6px;
  padding: 16px;
}

.metric-card span,
.metric-card small,
.empty,
.loading {
  color: #6b7280;
}

.metric-card strong {
  color: #111827;
  font-size: 28px;
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.panel {
  padding: 16px;
}

.panel.wide {
  grid-column: 1 / -1;
}

.panel h2 {
  margin-bottom: 14px;
  font-size: 17px;
}

.bars {
  display: grid;
  gap: 12px;
}

.bar-row {
  display: grid;
  gap: 6px;
}

.bar-head span {
  color: #374151;
  font-weight: 600;
}

.bar-head strong {
  color: #111827;
}

.bar-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e5e7eb;
}

.bar-track span {
  display: block;
  height: 100%;
  min-width: 3px;
  border-radius: inherit;
  background: #2563eb;
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
  padding: 10px 8px;
  text-align: left;
  white-space: nowrap;
}

th {
  color: #6b7280;
  font-size: 13px;
}

@media (max-width: 960px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .panel-grid {
    grid-template-columns: 1fr;
  }
}
</style>
