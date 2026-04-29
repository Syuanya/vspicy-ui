<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  cancelTranscodeTask,
  dispatchTranscodeTask,
  dispatchTranscodeTaskLocal,
  failTranscodeTask,
  getTranscodeDispatchHealth,
  getTranscodeStateStats,
  listTranscodeStateTasks,
  resetTranscodeTask,
  retryTranscodeTask,
  rerunTranscodeTask,
  successTranscodeTask
} from '../../api/transcodeState'
import DangerActionConfirmModal from '../../components/common/DangerActionConfirmModal.vue'
import { useDangerActionConfirm } from '../../composables/useDangerActionConfirm'

const loading = ref(false)
const operating = ref(false)
const message = ref('')
const tasks = ref<any[]>([])
const stats = ref<any>(null)
const health = ref<any>(null)
const lastResult = ref<any>(null)
const dangerConfirm = useDangerActionConfirm()

const filter = ref({
  status: '',
  limit: 100
})

const reason = ref('manual operation')

const statusOptions = [
  { label: '全部', value: '' },
  { label: 'PENDING', value: 'PENDING' },
  { label: 'DISPATCHED', value: 'DISPATCHED' },
  { label: 'RUNNING', value: 'RUNNING' },
  { label: 'SUCCESS', value: 'SUCCESS' },
  { label: 'FAILED', value: 'FAILED' },
  { label: 'CANCELED', value: 'CANCELED' }
]

const statusCards = computed(() => {
  const s = stats.value || {}
  return [
    { label: 'TOTAL', value: s.totalCount || 0, status: 'TOTAL' },
    { label: 'PENDING', value: s.pendingCount || 0, status: 'PENDING' },
    { label: 'DISPATCHED', value: s.dispatchedCount || 0, status: 'DISPATCHED' },
    { label: 'RUNNING', value: s.runningCount || 0, status: 'RUNNING' },
    { label: 'SUCCESS', value: s.successCount || 0, status: 'SUCCESS' },
    { label: 'FAILED', value: s.failedCount || 0, status: 'FAILED' },
    { label: 'CANCELED', value: s.canceledCount || 0, status: 'CANCELED' },
    { label: 'RETRY EXHAUSTED', value: s.retryExhaustedCount || 0, status: 'FAILED' }
  ]
})

async function loadAll() {
  loading.value = true
  message.value = ''
  try {
    await Promise.all([loadHealth(), loadStats(), loadTasks()])
  } finally {
    loading.value = false
  }
}

async function loadHealth() {
  try {
    const res: any = await getTranscodeDispatchHealth()
    if (res.code === 0) {
      health.value = res.data
    } else {
      message.value = res.message || '加载分发健康失败'
    }
  } catch (error: any) {
    message.value = error?.message || '加载分发健康失败'
  }
}

async function loadStats() {
  try {
    const res: any = await getTranscodeStateStats()
    if (res.code === 0) {
      stats.value = res.data
    } else {
      message.value = res.message || '加载状态统计失败'
    }
  } catch (error: any) {
    message.value = error?.message || '加载状态统计失败'
  }
}

async function loadTasks() {
  try {
    const res: any = await listTranscodeStateTasks({
      status: filter.value.status || undefined,
      limit: Number(filter.value.limit)
    })
    if (res.code === 0) {
      tasks.value = res.data || []
    } else {
      message.value = res.message || '加载转码任务失败'
    }
  } catch (error: any) {
    message.value = error?.message || '加载转码任务失败'
  }
}

async function setStatus(status: string) {
  filter.value.status = status === 'TOTAL' ? '' : status
  await loadTasks()
}

async function confirmDanger(action: string, item: any) {
  const id = Number(item.id)

  if (action === 'rerun') {
    return dangerConfirm.open({
      title: '确认强制重跑转码任务',
      message: '该操作会将任务重新置为 PENDING 并重新生成 HLS。',
      targetName: `转码任务 #${id}`,
      actionLabel: '确认重跑',
      level: 'danger',
      confirmText: 'RERUN',
      defaultReason: reason.value || 'manual rerun',
      impacts: [
        '会重新执行 FFmpeg',
        '可能覆盖旧 HLS 产物',
        '会增加服务器 CPU / IO 压力'
      ]
    })
  }

  if (action === 'cancel') {
    return dangerConfirm.open({
      title: '确认取消转码任务',
      message: '取消只修改任务状态，不一定强杀正在运行的 FFmpeg 进程。',
      targetName: `转码任务 #${id}`,
      actionLabel: '确认取消',
      level: 'warning',
      confirmText: 'CANCEL',
      defaultReason: reason.value || 'manual cancel',
      impacts: ['任务状态会变为 CANCELED', '后续需要 retry 或 rerun 才能继续']
    })
  }

  if (action === 'reset') {
    return dangerConfirm.open({
      title: '确认重置转码任务',
      message: '该操作只重置状态为 PENDING，不会自动分发。',
      targetName: `转码任务 #${id}`,
      actionLabel: '确认重置',
      level: 'warning',
      confirmText: 'RESET',
      defaultReason: reason.value || 'manual reset',
      impacts: ['任务状态会回到 PENDING', '需要手动分发或等待补偿任务']
    })
  }

  if (action === 'success') {
    return dangerConfirm.open({
      title: '确认手动标记成功',
      message: '该操作会绕过真实转码校验，慎用。',
      targetName: `转码任务 #${id}`,
      actionLabel: '标记成功',
      level: 'warning',
      confirmText: 'SUCCESS',
      defaultReason: reason.value || 'manual mark success',
      impacts: ['任务状态会变为 SUCCESS', '如果 HLS 不存在，播放仍可能失败']
    })
  }

  if (action === 'fail') {
    return dangerConfirm.open({
      title: '确认手动标记失败',
      message: '该操作会将任务标记为 FAILED。',
      targetName: `转码任务 #${id}`,
      actionLabel: '标记失败',
      level: 'danger',
      confirmText: 'FAIL',
      defaultReason: reason.value || 'manual mark failed',
      impacts: ['任务状态会变为 FAILED', '可能触发后续重试或人工处理']
    })
  }

  return { reason: reason.value || 'manual operation', confirmText: '' }
}

async function operate(action: string, item: any) {
  const id = Number(item.id)
  if (!id) return

  let reasonText = reason.value || 'manual operation'

  if (['rerun', 'cancel', 'reset', 'success', 'fail'].includes(action)) {
    const payload = await confirmDanger(action, item)
    if (!payload) return
    reasonText = payload.reason
  }

  operating.value = true
  message.value = ''
  try {
    let res: any

    if (action === 'retry') res = await retryTranscodeTask(id, reasonText)
    if (action === 'rerun') res = await rerunTranscodeTask(id, reasonText)
    if (action === 'cancel') res = await cancelTranscodeTask(id, reasonText)
    if (action === 'reset') res = await resetTranscodeTask(id, reasonText)
    if (action === 'success') res = await successTranscodeTask(id, reasonText)
    if (action === 'fail') res = await failTranscodeTask(id, reasonText)
    if (action === 'dispatch') res = await dispatchTranscodeTask(id)
    if (action === 'local') res = await dispatchTranscodeTaskLocal(id)

    if (res?.code === 0) {
      lastResult.value = res.data
      message.value = '操作完成'
      await Promise.all([loadStats(), loadTasks(), loadHealth()])
    } else {
      message.value = res?.message || '操作失败'
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '操作失败'
  } finally {
    operating.value = false
  }
}

function statusClass(status: string) {
  if (status === 'PENDING') return 'status pending'
  if (status === 'DISPATCHED') return 'status dispatched'
  if (status === 'RUNNING') return 'status running'
  if (status === 'SUCCESS') return 'status success'
  if (status === 'FAILED') return 'status failed'
  if (status === 'CANCELED') return 'status canceled'
  return 'status'
}

function modeClass(mode: string) {
  if (!mode) return 'mode'
  if (mode === 'ROCKETMQ') return 'mode rocketmq'
  if (mode.includes('LOCAL') || mode.includes('FALLBACK')) return 'mode local'
  if (mode === 'FORCE_LOCAL') return 'mode local'
  return 'mode'
}

function canRetry(item: any) {
  return ['PENDING', 'FAILED', 'CANCELED'].includes(item.status)
}

function canCancel(item: any) {
  return ['PENDING', 'DISPATCHED', 'RUNNING', 'FAILED'].includes(item.status)
}

function canDispatch(item: any) {
  return ['PENDING', 'DISPATCHED', 'FAILED', 'CANCELED'].includes(item.status)
}

function canRerun(item: any) {
  return Boolean(item.id)
}

function shortText(value: string | null | undefined, max = 80) {
  if (!value) return '-'
  return value.length > max ? value.slice(0, max) + '...' : value
}

onMounted(loadAll)
</script>

<template>
  <section class="card">
    <div class="top">
      <div>
        <h2>转码任务</h2>
        <p>统一管理转码状态、分发、重试、强制重跑、取消和人工校正。</p>
      </div>
      <button class="button" :disabled="loading" @click="loadAll">
        {{ loading ? '加载中...' : '刷新' }}
      </button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="panel health">
      <div>
        <h3>分发健康</h3>
        <p v-if="health">
          <span :class="health.rocketMqTemplateAvailable ? 'ok' : 'warn'">
            RocketMQTemplate：{{ health.rocketMqTemplateAvailable ? '可用' : '不可用' }}
          </span>
          <span> / RocketMQ：{{ health.rocketMqEnabled ? '启用' : '关闭' }}</span>
          <span> / 本地 fallback：{{ health.fallbackLocalEnabled ? '启用' : '关闭' }}</span>
        </p>
        <p v-if="health" class="muted">
          {{ health.destination }}，{{ health.message }}
        </p>
        <p v-else class="muted">暂无健康信息</p>
      </div>
      <button class="button secondary" @click="loadHealth">检查分发</button>
    </div>

    <div class="stats">
      <button
        v-for="item in statusCards"
        :key="item.label"
        class="stat"
        :class="{ active: filter.status === item.status || (!filter.status && item.status === 'TOTAL') }"
        @click="setStatus(item.status)"
      >
        <small>{{ item.label }}</small>
        <strong>{{ item.value }}</strong>
      </button>
    </div>

    <div class="panel">
      <h3>筛选</h3>
      <div class="form-grid">
        <select v-model="filter.status" class="input">
          <option v-for="item in statusOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
        <input v-model="filter.limit" class="input" type="number" placeholder="limit" />
        <input v-model="reason" class="input" placeholder="默认操作原因" />
      </div>
      <button class="button" @click="loadTasks">查询</button>
    </div>

    <div v-if="lastResult" class="panel result">
      <h3>最近操作结果</h3>
      <pre>{{ lastResult }}</pre>
    </div>

    <div class="panel">
      <h3>任务列表</h3>
      <div v-if="tasks.length === 0" class="empty">暂无转码任务</div>

      <div style="overflow-x:auto;">
        <table v-if="tasks.length > 0">
          <thead>
            <tr>
              <th>ID</th>
              <th>videoId</th>
              <th>状态</th>
              <th>重试</th>
              <th>分发模式</th>
              <th>源文件</th>
              <th>错误</th>
              <th>分发时间</th>
              <th>开始</th>
              <th>完成</th>
              <th>取消</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in tasks" :key="item.id">
              <td>{{ item.id }}</td>
              <td>{{ item.videoId || '-' }}</td>
              <td><span :class="statusClass(item.status)">{{ item.status }}</span></td>
              <td>{{ item.retryCount }} / {{ item.maxRetryCount }}</td>
              <td>
                <span :class="modeClass(item.lastDispatchMode)">{{ item.lastDispatchMode || '-' }}</span>
              </td>
              <td class="path" :title="item.sourceFilePath">{{ shortText(item.sourceFilePath, 70) }}</td>
              <td class="error" :title="item.errorMessage || item.lastDispatchError">
                {{ shortText(item.errorMessage || item.lastDispatchError, 90) }}
              </td>
              <td>{{ item.dispatchedAt || '-' }}</td>
              <td>{{ item.startedAt || '-' }}</td>
              <td>{{ item.finishedAt || '-' }}</td>
              <td>{{ item.canceledAt || '-' }}</td>
              <td class="actions">
                <button v-if="canDispatch(item)" class="plain" :disabled="operating" @click="operate('dispatch', item)">分发</button>
                <button v-if="canDispatch(item)" class="plain" :disabled="operating" @click="operate('local', item)">本地</button>
                <button v-if="canRetry(item)" class="plain" :disabled="operating" @click="operate('retry', item)">重试</button>
                <button v-if="canRerun(item)" class="plain warning-text" :disabled="operating" @click="operate('rerun', item)">重跑</button>
                <button v-if="canCancel(item)" class="plain danger-text" :disabled="operating" @click="operate('cancel', item)">取消</button>
                <button class="plain" :disabled="operating" @click="operate('reset', item)">重置</button>
                <button class="plain" :disabled="operating" @click="operate('success', item)">成功</button>
                <button class="plain danger-text" :disabled="operating" @click="operate('fail', item)">失败</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <DangerActionConfirmModal
      v-bind="dangerConfirm.modalProps.value"
      @cancel="dangerConfirm.cancel"
      @confirm="dangerConfirm.confirm"
    />
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

.health {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  background: #f9fafb;
}

.ok {
  color: #166534;
  font-weight: 700;
}

.warn {
  color: #92400e;
  font-weight: 700;
}

.muted {
  color: #6b7280;
  margin-top: 6px;
}

.secondary {
  background: #374151;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.stat {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 14px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.stat:hover,
.stat.active {
  border-color: #93c5fd;
  background: #eff6ff;
}

.stat small {
  display: block;
  color: #6b7280;
}

.stat strong {
  display: block;
  font-size: 26px;
  margin-top: 6px;
}

.form-grid {
  display: grid;
  grid-template-columns: 180px 160px minmax(240px, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.result {
  background: #eff6ff;
  border-color: #bfdbfe;
}

pre {
  white-space: pre-wrap;
  overflow: auto;
  max-height: 260px;
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

.path {
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.error {
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #991b1b;
}

.status,
.mode {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
}

.status.pending {
  background: #dbeafe;
  color: #1d4ed8;
}

.status.dispatched,
.status.running {
  background: #fef3c7;
  color: #92400e;
}

.status.success {
  background: #dcfce7;
  color: #166534;
}

.status.failed {
  background: #fee2e2;
  color: #991b1b;
}

.status.canceled {
  background: #f3f4f6;
  color: #374151;
}

.mode.rocketmq {
  background: #dbeafe;
  color: #1d4ed8;
}

.mode.local {
  background: #fef3c7;
  color: #92400e;
}

.actions {
  min-width: 360px;
}

.plain {
  border: none;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  margin-right: 8px;
}

.warning-text {
  color: #92400e;
}

.danger-text {
  color: #991b1b;
}

.empty {
  color: #6b7280;
}

@media (max-width: 760px) {
  .health {
    display: block;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
