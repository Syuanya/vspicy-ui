<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  cancelHlsRepairTask,
  dispatchHlsRepairTasks,
  executeHlsRepairTask,
  executeHlsRepairTasks,
  failHlsRepairTask,
  generateHlsRepairTasks,
  generateHlsRepairTasksFromAlerts,
  listHlsRepairTasks,
  previewHlsRepairDispatch,
  previewHlsRepairExecute,
  previewHlsRepairVerify,
  retryHlsRepairTask,
  successHlsRepairTask,
  verifyHlsRepairTask,
  verifyHlsRepairTasks
} from '../../api/hlsRepair'

const loading = ref(false)
const generating = ref(false)
const dispatching = ref(false)
const executing = ref(false)
const verifying = ref(false)

const message = ref('')
const tasks = ref<any[]>([])
const actionResult = ref<any>(null)
const actionTitle = ref('')

const filter = ref({
  status: '',
  limit: 100
})

const generateForm = ref({
  prefix: 'videos/',
  limit: 200,
  alertLimit: 100
})

const dispatchForm = ref({
  limit: 10
})

const executeForm = ref({
  limit: 10,
  allowPending: false
})

const verifyForm = ref({
  limit: 10,
  markFailedOnError: false
})

async function load() {
  loading.value = true
  message.value = ''
  try {
    const res: any = await listHlsRepairTasks({
      status: filter.value.status || undefined,
      limit: Number(filter.value.limit)
    })

    if (res.code === 0) {
      tasks.value = res.data || []
    } else {
      message.value = res.message || '加载 HLS 修复任务失败'
    }
  } finally {
    loading.value = false
  }
}

async function generateFromScan() {
  generating.value = true
  message.value = ''
  try {
    const res: any = await generateHlsRepairTasks({
      prefix: generateForm.value.prefix,
      limit: Number(generateForm.value.limit)
    })
    if (res.code === 0) {
      message.value = `从扫描生成完成：created=${res.data.createdCount}, existing=${res.data.existingCount}`
      actionTitle.value = '生成结果'
      actionResult.value = res.data
      await load()
    } else {
      message.value = res.message || '生成失败'
    }
  } finally {
    generating.value = false
  }
}

async function generateFromAlerts() {
  generating.value = true
  message.value = ''
  try {
    const res: any = await generateHlsRepairTasksFromAlerts({
      limit: Number(generateForm.value.alertLimit)
    })
    if (res.code === 0) {
      message.value = `从告警生成完成：created=${res.data.createdCount}, existing=${res.data.existingCount}`
      actionTitle.value = '生成结果'
      actionResult.value = res.data
      await load()
    } else {
      message.value = res.message || '生成失败'
    }
  } finally {
    generating.value = false
  }
}

async function previewDispatch() {
  dispatching.value = true
  message.value = ''
  try {
    const res: any = await previewHlsRepairDispatch(Number(dispatchForm.value.limit))
    if (res.code === 0) {
      actionTitle.value = '分发预览'
      actionResult.value = res.data
      message.value = `预览完成：待分发 ${res.data.selectedCount} 条，RocketMQ=${res.data.rocketMqAvailable ? '可用' : '不可用'}`
    } else {
      message.value = res.message || '预览失败'
    }
  } finally {
    dispatching.value = false
  }
}

async function dispatchTasks(dryRun: boolean) {
  dispatching.value = true
  message.value = ''
  try {
    const res: any = await dispatchHlsRepairTasks({
      limit: Number(dispatchForm.value.limit),
      dryRun
    })
    if (res.code === 0) {
      actionTitle.value = dryRun ? 'dryRun 分发结果' : '正式分发结果'
      actionResult.value = res.data
      message.value = `分发完成：dispatched=${res.data.dispatchedCount}, skipped=${res.data.skippedCount}, failed=${res.data.failedCount}`
      await load()
    } else {
      message.value = res.message || '分发失败'
    }
  } finally {
    dispatching.value = false
  }
}

async function previewExecute() {
  executing.value = true
  message.value = ''
  try {
    const res: any = await previewHlsRepairExecute(Number(executeForm.value.limit))
    if (res.code === 0) {
      actionTitle.value = '执行预览'
      actionResult.value = res.data
      message.value = `执行预览完成：selected=${res.data.selectedCount}`
    } else {
      message.value = res.message || '执行预览失败'
    }
  } finally {
    executing.value = false
  }
}

async function executeTasks(dryRun: boolean) {
  executing.value = true
  message.value = ''
  try {
    const res: any = await executeHlsRepairTasks({
      limit: Number(executeForm.value.limit),
      dryRun,
      allowPending: executeForm.value.allowPending
    })
    if (res.code === 0) {
      actionTitle.value = dryRun ? 'dryRun 执行结果' : '正式执行结果'
      actionResult.value = res.data
      message.value = `执行完成：executed=${res.data.executedCount}, skipped=${res.data.skippedCount}, failed=${res.data.failedCount}`
      await load()
    } else {
      message.value = res.message || '执行失败'
    }
  } finally {
    executing.value = false
  }
}

async function previewVerify() {
  verifying.value = true
  message.value = ''
  try {
    const res: any = await previewHlsRepairVerify(Number(verifyForm.value.limit))
    if (res.code === 0) {
      actionTitle.value = '复检预览'
      actionResult.value = res.data
      message.value = `复检预览完成：selected=${res.data.selectedCount}`
    } else {
      message.value = res.message || '复检预览失败'
    }
  } finally {
    verifying.value = false
  }
}

async function verifyTasks(dryRun: boolean) {
  verifying.value = true
  message.value = ''
  try {
    const res: any = await verifyHlsRepairTasks({
      limit: Number(verifyForm.value.limit),
      dryRun,
      markFailedOnError: verifyForm.value.markFailedOnError
    })
    if (res.code === 0) {
      actionTitle.value = dryRun ? 'dryRun 复检结果' : '正式复检结果'
      actionResult.value = res.data
      message.value = `复检完成：ok=${res.data.okCount}, stillBroken=${res.data.stillBrokenCount}, alertResolved=${res.data.alertResolvedCount}`
      await load()
    } else {
      message.value = res.message || '复检失败'
    }
  } finally {
    verifying.value = false
  }
}

async function operate(action: string, item: any) {
  let res: any

  if (action === 'retry') res = await retryHlsRepairTask(item.id)
  if (action === 'cancel') res = await cancelHlsRepairTask(item.id)
  if (action === 'success') res = await successHlsRepairTask(item.id)
  if (action === 'fail') res = await failHlsRepairTask(item.id)
  if (action === 'execute') res = await executeHlsRepairTask(item.id, { dryRun: false, allowPending: true })
  if (action === 'verify') res = await verifyHlsRepairTask(item.id, { dryRun: false, markFailedOnError: false })

  if (res?.code === 0) {
    actionTitle.value = '单任务操作结果'
    actionResult.value = res.data
    message.value = '操作完成'
    await load()
  } else {
    message.value = res?.message || '操作失败'
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

function repairClass(type: string) {
  if (type === 'MANIFEST_MISSING') return 'repair critical'
  if (type === 'SEGMENT_MISSING') return 'repair high'
  return 'repair warn'
}

function resultRows() {
  if (!actionResult.value) return []
  return actionResult.value.tasks || []
}

function resultSummary() {
  if (!actionResult.value) return ''
  const d = actionResult.value
  return Object.entries(d)
    .filter(([key, value]) => key !== 'tasks' && typeof value !== 'object')
    .map(([key, value]) => `${key}=${value}`)
    .join(' / ')
}

onMounted(load)
</script>

<template>
  <section class="card">
    <div class="top">
      <div>
        <h2>HLS修复</h2>
        <p>统一处理 HLS 异常：生成任务、分发、执行、复检、关闭告警。</p>
      </div>
      <button class="button" :disabled="loading" @click="load">
        {{ loading ? '加载中...' : '刷新' }}
      </button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="grid">
      <div class="panel">
        <h3>1. 生成修复任务</h3>
        <div class="form-grid">
          <input v-model="generateForm.prefix" class="input" placeholder="prefix" />
          <input v-model="generateForm.limit" class="input" type="number" placeholder="扫描 limit" />
          <input v-model="generateForm.alertLimit" class="input" type="number" placeholder="告警 limit" />
        </div>
        <button class="button" :disabled="generating" @click="generateFromScan">从扫描生成</button>
        <button class="button secondary" :disabled="generating" @click="generateFromAlerts">从告警生成</button>
      </div>

      <div class="panel">
        <h3>2. 分发修复任务</h3>
        <p>将 PENDING 任务分发到 RocketMQ。dryRun 不发送 MQ。</p>
        <div class="form-grid">
          <input v-model="dispatchForm.limit" class="input" type="number" placeholder="分发 limit" />
        </div>
        <button class="button" :disabled="dispatching" @click="previewDispatch">预览分发</button>
        <button class="button secondary" :disabled="dispatching" @click="dispatchTasks(true)">dryRun</button>
        <button class="button danger" :disabled="dispatching" @click="dispatchTasks(false)">正式分发</button>
      </div>

      <div class="panel">
        <h3>3. 执行修复任务</h3>
        <p>执行 DISPATCHED 任务；allowPending 可跳过分发直接执行 PENDING。</p>
        <div class="form-grid">
          <input v-model="executeForm.limit" class="input" type="number" placeholder="执行 limit" />
          <label class="check">
            <input v-model="executeForm.allowPending" type="checkbox" />
            allowPending
          </label>
        </div>
        <button class="button" :disabled="executing" @click="previewExecute">执行预览</button>
        <button class="button secondary" :disabled="executing" @click="executeTasks(true)">dryRun执行</button>
        <button class="button danger" :disabled="executing" @click="executeTasks(false)">正式执行</button>
      </div>

      <div class="panel">
        <h3>4. 复检修复结果</h3>
        <p>重新检查 m3u8 和分片；HLS_OK 后任务 SUCCESS，并自动关闭关联告警。</p>
        <div class="form-grid">
          <input v-model="verifyForm.limit" class="input" type="number" placeholder="复检 limit" />
          <label class="check">
            <input v-model="verifyForm.markFailedOnError" type="checkbox" />
            异常时标记 FAILED
          </label>
        </div>
        <button class="button" :disabled="verifying" @click="previewVerify">复检预览</button>
        <button class="button secondary" :disabled="verifying" @click="verifyTasks(true)">dryRun复检</button>
        <button class="button danger" :disabled="verifying" @click="verifyTasks(false)">正式复检</button>
      </div>
    </div>

    <div v-if="actionResult" class="panel result-panel">
      <h3>{{ actionTitle }}</h3>
      <p>{{ resultSummary() }}</p>
      <div v-if="resultRows().length > 0" style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>taskId</th>
              <th>类型</th>
              <th>状态</th>
              <th>manifest</th>
              <th>videoId</th>
              <th>executor</th>
              <th>verify</th>
              <th>message</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in resultRows()" :key="row.taskId || row.id">
              <td>{{ row.taskId || row.id }}</td>
              <td>{{ row.repairType || '-' }}</td>
              <td>{{ row.status || row.beforeStatus || '-' }} <span v-if="row.afterStatus">→ {{ row.afterStatus }}</span></td>
              <td class="key">{{ row.manifestObjectKey }}</td>
              <td>{{ row.videoId || '-' }}</td>
              <td>{{ row.executorBean || '-' }} <span v-if="row.executorMethod">#{{ row.executorMethod }}</span></td>
              <td>{{ row.verifyStatus || '-' }}</td>
              <td class="content">{{ row.message || row.verifyMessage || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <h3>筛选任务</h3>
      <div class="form-grid">
        <select v-model="filter.status" class="input">
          <option value="">全部状态</option>
          <option value="PENDING">PENDING</option>
          <option value="DISPATCHED">DISPATCHED</option>
          <option value="RUNNING">RUNNING</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILED">FAILED</option>
          <option value="CANCELED">CANCELED</option>
        </select>
        <input v-model="filter.limit" class="input" type="number" placeholder="limit" />
      </div>
      <button class="button" @click="load">查询</button>
    </div>

    <div class="panel">
      <h3>任务列表</h3>
      <div v-if="tasks.length === 0" class="empty">暂无 HLS 修复任务</div>

      <div style="overflow-x:auto;">
        <table v-if="tasks.length > 0">
          <thead>
            <tr>
              <th>ID</th>
              <th>类型</th>
              <th>状态</th>
              <th>优先级</th>
              <th>manifest</th>
              <th>missing</th>
              <th>videoId</th>
              <th>recordId</th>
              <th>alertId</th>
              <th>retry</th>
              <th>error</th>
              <th>verify</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in tasks" :key="item.id">
              <td>{{ item.id }}</td>
              <td><span :class="repairClass(item.repairType)">{{ item.repairType }}</span></td>
              <td><span :class="statusClass(item.status)">{{ item.status }}</span></td>
              <td>{{ item.priority }}</td>
              <td class="key">{{ item.manifestObjectKey }}</td>
              <td>
                <details v-if="item.missingSegmentCount > 0">
                  <summary>{{ item.missingSegmentCount }}</summary>
                  <pre>{{ item.missingSegments }}</pre>
                </details>
                <span v-else>0</span>
              </td>
              <td>{{ item.videoId || '-' }}</td>
              <td>{{ item.recordId || '-' }}</td>
              <td>{{ item.alertId || '-' }}</td>
              <td>{{ item.retryCount }} / {{ item.maxRetryCount }}</td>
              <td class="error">{{ item.lastError || '-' }}</td>
              <td>{{ item.verifyStatus || '-' }}</td>
              <td>{{ item.createdAt }}</td>
              <td class="actions">
                <button v-if="item.status === 'FAILED' || item.status === 'CANCELED'" class="plain" @click="operate('retry', item)">重试</button>
                <button v-if="item.status !== 'SUCCESS' && item.status !== 'CANCELED'" class="plain danger-text" @click="operate('cancel', item)">取消</button>
                <button v-if="item.status !== 'SUCCESS'" class="plain" @click="operate('success', item)">成功</button>
                <button v-if="item.status !== 'FAILED'" class="plain danger-text" @click="operate('fail', item)">失败</button>
                <button v-if="item.status === 'PENDING' || item.status === 'DISPATCHED'" class="plain" @click="operate('execute', item)">执行</button>
                <button v-if="item.status === 'RUNNING' || item.status === 'DISPATCHED' || item.status === 'FAILED'" class="plain" @click="operate('verify', item)">复检</button>
              </td>
            </tr>
          </tbody>
        </table>
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

.message {
  color: #ef4444;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.panel {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}

.grid .panel {
  margin-top: 0;
}

.result-panel {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
  align-items: center;
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #374151;
  font-size: 14px;
}

.secondary {
  margin-left: 8px;
  background: #374151;
}

.danger {
  margin-left: 8px;
  background: #991b1b;
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

.key {
  max-width: 460px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content {
  max-width: 420px;
  white-space: normal;
  color: #374151;
}

.error {
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #991b1b;
}

.status,
.repair {
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

.repair.critical {
  background: #7f1d1d;
  color: #fff;
}

.repair.high {
  background: #fee2e2;
  color: #991b1b;
}

.repair.warn {
  background: #fef3c7;
  color: #92400e;
}

.actions {
  min-width: 260px;
}

.plain {
  border: none;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  margin-right: 8px;
}

.danger-text {
  color: #991b1b;
}

.empty {
  color: #6b7280;
}

pre {
  max-width: 420px;
  white-space: pre-wrap;
}

@media (max-width: 760px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
