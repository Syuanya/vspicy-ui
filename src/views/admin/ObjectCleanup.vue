<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  approveObjectCleanupRequest,
  executeApprovedObjectCleanupRequests,
  executeObjectCleanupRequest,
  generateObjectCleanupRequests,
  listObjectCleanupRequests,
  rejectObjectCleanupRequest
} from '../../api/objectCleanup'

const loading = ref(false)
const generating = ref(false)
const executing = ref(false)
const message = ref('')
const rows = ref<any[]>([])
const result = ref<any>(null)

const filter = ref({
  status: '',
  limit: 100
})

const generateForm = ref({
  prefix: 'videos/',
  limit: 1000
})

const executeForm = ref({
  limit: 20
})

async function load() {
  loading.value = true
  message.value = ''
  try {
    const res: any = await listObjectCleanupRequests({
      status: filter.value.status || undefined,
      limit: Number(filter.value.limit)
    })

    if (res.code === 0) {
      rows.value = res.data || []
    } else {
      message.value = res.message || '加载对象清理申请失败'
    }
  } finally {
    loading.value = false
  }
}

async function generate() {
  generating.value = true
  message.value = ''
  try {
    const res: any = await generateObjectCleanupRequests({
      prefix: generateForm.value.prefix,
      limit: Number(generateForm.value.limit)
    })
    if (res.code === 0) {
      result.value = res.data
      message.value = `生成完成：created=${res.data.createdCount}, existing=${res.data.existingCount}, pending=${res.data.pendingCount}`
      await load()
    } else {
      message.value = res.message || '生成失败'
    }
  } finally {
    generating.value = false
  }
}

async function approve(item: any) {
  const res: any = await approveObjectCleanupRequest(item.id)
  if (res.code === 0) {
    message.value = '已审批'
    await load()
  } else {
    message.value = res.message || '审批失败'
  }
}

async function reject(item: any) {
  const res: any = await rejectObjectCleanupRequest(item.id)
  if (res.code === 0) {
    message.value = '已拒绝'
    await load()
  } else {
    message.value = res.message || '拒绝失败'
  }
}

async function executeOne(item: any, dryRun: boolean) {
  if (!dryRun && !confirm(`确认删除对象？\n${item.objectKey}`)) return

  const res: any = await executeObjectCleanupRequest(item.id, { dryRun })
  if (res.code === 0) {
    result.value = res.data
    message.value = dryRun ? 'dryRun 完成，未删除' : '删除执行完成'
    await load()
  } else {
    message.value = res.message || '执行失败'
  }
}

async function executeApproved(dryRun: boolean) {
  if (!dryRun && !confirm(`确认批量删除已审批对象？limit=${executeForm.value.limit}`)) return

  executing.value = true
  message.value = ''
  try {
    const res: any = await executeApprovedObjectCleanupRequests({
      limit: Number(executeForm.value.limit),
      dryRun
    })

    if (res.code === 0) {
      result.value = res.data
      message.value = `执行完成：deleted=${res.data.deletedCount}, skipped=${res.data.skippedCount}, failed=${res.data.failedCount}`
      await load()
    } else {
      message.value = res.message || '批量执行失败'
    }
  } finally {
    executing.value = false
  }
}

function statusClass(status: string) {
  if (status === 'PENDING') return 'status pending'
  if (status === 'APPROVED') return 'status approved'
  if (status === 'REJECTED') return 'status rejected'
  if (status === 'EXECUTED') return 'status executed'
  if (status === 'FAILED') return 'status failed'
  return 'status'
}

function formatSize(size: number | null | undefined) {
  if (!size) return '-'
  if (size < 1024 * 1024) return `${size} B`
  return `${Math.ceil(size / 1024 / 1024)} MB`
}

onMounted(load)
</script>

<template>
  <section class="card">
    <div class="top">
      <div>
        <h2>对象清理</h2>
        <p>孤儿对象先生成清理申请，审批通过后才能删除，默认 dryRun。</p>
      </div>
      <button class="button" :disabled="loading" @click="load">
        {{ loading ? '加载中...' : '刷新' }}
      </button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="grid">
      <div class="panel">
        <h3>生成清理申请</h3>
        <p>扫描 OBJECT_MISSING_DB 并生成 PENDING 申请。</p>
        <div class="form-grid">
          <input v-model="generateForm.prefix" class="input" placeholder="prefix，例如 videos/" />
          <input v-model="generateForm.limit" class="input" type="number" placeholder="limit" />
        </div>
        <button class="button" :disabled="generating" @click="generate">
          {{ generating ? '生成中...' : '生成申请' }}
        </button>
      </div>

      <div class="panel">
        <h3>批量执行已审批</h3>
        <p>只处理 APPROVED。正式删除前建议先 dryRun。</p>
        <div class="form-grid">
          <input v-model="executeForm.limit" class="input" type="number" placeholder="limit" />
        </div>
        <button class="button" :disabled="executing" @click="executeApproved(true)">dryRun</button>
        <button class="button danger" :disabled="executing" @click="executeApproved(false)">正式删除</button>
      </div>
    </div>

    <div v-if="result" class="panel result-panel">
      <h3>操作结果</h3>
      <pre>{{ result }}</pre>
    </div>

    <div class="panel">
      <h3>筛选</h3>
      <div class="form-grid">
        <select v-model="filter.status" class="input">
          <option value="">全部状态</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="EXECUTED">EXECUTED</option>
          <option value="FAILED">FAILED</option>
        </select>
        <input v-model="filter.limit" class="input" type="number" placeholder="limit" />
      </div>
      <button class="button" @click="load">查询</button>
    </div>

    <div class="panel">
      <h3>清理申请</h3>
      <div v-if="rows.length === 0" class="empty">暂无对象清理申请</div>

      <div style="overflow-x:auto;">
        <table v-if="rows.length > 0">
          <thead>
            <tr>
              <th>ID</th>
              <th>状态</th>
              <th>bucket</th>
              <th>objectKey</th>
              <th>大小</th>
              <th>原因</th>
              <th>错误</th>
              <th>审批</th>
              <th>执行</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in rows" :key="item.id">
              <td>{{ item.id }}</td>
              <td><span :class="statusClass(item.status)">{{ item.status }}</span></td>
              <td>{{ item.bucket }}</td>
              <td class="key">{{ item.objectKey }}</td>
              <td>{{ formatSize(item.objectSize) }}</td>
              <td class="content">{{ item.reason || '-' }}</td>
              <td class="error">{{ item.errorMessage || '-' }}</td>
              <td>{{ item.approvedAt || '-' }}</td>
              <td>{{ item.executedAt || '-' }}</td>
              <td>{{ item.createdAt }}</td>
              <td class="actions">
                <button v-if="item.status === 'PENDING' || item.status === 'FAILED'" class="plain" @click="approve(item)">审批</button>
                <button v-if="item.status === 'PENDING' || item.status === 'APPROVED' || item.status === 'FAILED'" class="plain danger-text" @click="reject(item)">拒绝</button>
                <button v-if="item.status === 'APPROVED'" class="plain" @click="executeOne(item, true)">dryRun</button>
                <button v-if="item.status === 'APPROVED'" class="plain danger-text" @click="executeOne(item, false)">删除</button>
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
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
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
  max-width: 360px;
  white-space: normal;
  color: #374151;
}

.error {
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #991b1b;
}

.status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
}

.status.pending {
  background: #dbeafe;
  color: #1d4ed8;
}

.status.approved {
  background: #fef3c7;
  color: #92400e;
}

.status.rejected {
  background: #f3f4f6;
  color: #374151;
}

.status.executed {
  background: #dcfce7;
  color: #166534;
}

.status.failed {
  background: #fee2e2;
  color: #991b1b;
}

.actions {
  min-width: 180px;
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
  white-space: pre-wrap;
  overflow: auto;
}
</style>
