<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { compensateTranscodeTasks, listTranscodeTasks, retryTranscodeTask } from '../../api/transcode'

const tasks = ref<any[]>([])
const loading = ref(false)
const compensating = ref(false)
const status = ref('')
const videoId = ref('')
const message = ref('')

async function load() {
  loading.value = true
  message.value = ''
  try {
    const params: any = { limit: 100 }
    if (status.value) {
      params.status = status.value
    }
    if (videoId.value) {
      params.videoId = Number(videoId.value)
    }

    const res: any = await listTranscodeTasks(params)
    if (res.code === 0) {
      tasks.value = res.data || []
    } else {
      message.value = res.message || '查询失败'
    }
  } finally {
    loading.value = false
  }
}

async function retry(taskId: number) {
  if (!confirm(`确认重试转码任务 ${taskId}？`)) {
    return
  }

  const res: any = await retryTranscodeTask(taskId)
  if (res.code === 0) {
    message.value = res.data.message || '已提交重试'
    await load()
  } else {
    message.value = res.message || '重试失败'
  }
}

async function compensate() {
  if (!confirm('确认执行一次补偿扫描？')) {
    return
  }

  compensating.value = true
  try {
    const res: any = await compensateTranscodeTasks()
    if (res.code === 0) {
      message.value = `补偿完成：扫描 ${res.data.scanned}，提交 ${res.data.submitted}，跳过 ${res.data.skipped}`
      await load()
    } else {
      message.value = res.message || '补偿失败'
    }
  } finally {
    compensating.value = false
  }
}

function statusClass(value: string) {
  if (value === 'SUCCESS') return 'tag success'
  if (value === 'FAILED') return 'tag danger'
  if (value === 'RUNNING') return 'tag warning'
  if (value === 'PENDING') return 'tag pending'
  return 'tag'
}

onMounted(load)
</script>

<template>
  <section class="card">
    <h2>转码任务管理</h2>
    <p>用于查看 RocketMQ 转码任务状态，并对异常任务做人工补偿或自动补偿。</p>

    <div style="display: flex; gap: 12px; align-items: center; margin: 16px 0; flex-wrap: wrap;">
      <select v-model="status" class="input" style="max-width: 180px; margin: 0;">
        <option value="">全部状态</option>
        <option value="PENDING">PENDING</option>
        <option value="RUNNING">RUNNING</option>
        <option value="SUCCESS">SUCCESS</option>
        <option value="FAILED">FAILED</option>
      </select>

      <input v-model="videoId" class="input" style="max-width: 180px; margin: 0;" placeholder="videoId" />

      <button class="button" :disabled="loading" @click="load">
        {{ loading ? '查询中...' : '查询' }}
      </button>

      <button class="button" :disabled="compensating" style="background: #2563eb;" @click="compensate">
        {{ compensating ? '补偿中...' : '补偿扫描' }}
      </button>
    </div>

    <p v-if="message" style="color: #ef4444;">{{ message }}</p>

    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th>任务ID</th>
            <th>视频ID</th>
            <th>状态</th>
            <th>重试次数</th>
            <th>Profile</th>
            <th>源文件</th>
            <th>错误</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in tasks" :key="task.id">
            <td>{{ task.id }}</td>
            <td>
              <RouterLink :to="`/video/${task.videoId}`">{{ task.videoId }}</RouterLink>
            </td>
            <td><span :class="statusClass(task.status)">{{ task.status }}</span></td>
            <td>{{ task.retryCount }}</td>
            <td>{{ task.targetProfile }}</td>
            <td style="max-width: 260px; word-break: break-all;">{{ task.sourceFilePath }}</td>
            <td style="max-width: 260px; word-break: break-all;">{{ task.errorMessage || '-' }}</td>
            <td>{{ task.updatedAt || '-' }}</td>
            <td>
              <button class="button" :disabled="task.status === 'RUNNING' || task.status === 'SUCCESS'" @click="retry(task.id)">
                重试
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
th, td {
  border-bottom: 1px solid #e5e7eb;
  padding: 10px;
  text-align: left;
  font-size: 14px;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e5e7eb;
}

.success {
  background: #dcfce7;
  color: #166534;
}

.danger {
  background: #fee2e2;
  color: #991b1b;
}

.warning {
  background: #fef3c7;
  color: #92400e;
}

.pending {
  background: #dbeafe;
  color: #1d4ed8;
}
</style>
