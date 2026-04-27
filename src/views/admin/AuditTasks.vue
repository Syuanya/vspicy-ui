<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listAuditTasks, passAuditTask, rejectAuditTask } from '../../api/audit'

const tasks = ref<any[]>([])
const loading = ref(false)
const status = ref('PENDING')
const message = ref('')

async function load() {
  loading.value = true
  message.value = ''
  try {
    const params: any = { limit: 100, bizType: 'ARTICLE' }
    if (status.value) {
      params.status = status.value
    }

    const res: any = await listAuditTasks(params)
    if (res.code === 0) {
      tasks.value = res.data || []
    } else {
      message.value = res.message || '查询失败'
    }
  } finally {
    loading.value = false
  }
}

async function pass(taskId: number) {
  const res: any = await passAuditTask(taskId, '审核通过')
  if (res.code === 0) {
    message.value = '已通过'
    await load()
  } else {
    message.value = res.message || '操作失败'
  }
}

async function reject(taskId: number) {
  const reason = prompt('请输入拒绝原因', '内容不符合发布规范')
  if (!reason) {
    return
  }

  const res: any = await rejectAuditTask(taskId, reason)
  if (res.code === 0) {
    message.value = '已拒绝'
    await load()
  } else {
    message.value = res.message || '操作失败'
  }
}

function statusClass(value: string) {
  if (value === 'PASS') return 'tag success'
  if (value === 'REJECT') return 'tag danger'
  if (value === 'PENDING') return 'tag pending'
  return 'tag'
}

onMounted(load)
</script>

<template>
  <section class="card">
    <h2>内容审核任务</h2>
    <p>当前版本支持文章发布审核。</p>

    <div style="display: flex; gap: 12px; margin: 16px 0;">
      <select v-model="status" class="input" style="max-width: 180px; margin: 0;">
        <option value="">全部状态</option>
        <option value="PENDING">PENDING</option>
        <option value="PASS">PASS</option>
        <option value="REJECT">REJECT</option>
      </select>

      <button class="button" :disabled="loading" @click="load">
        {{ loading ? '查询中...' : '查询' }}
      </button>
    </div>

    <p v-if="message" style="color: #ef4444;">{{ message }}</p>

    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th>任务ID</th>
            <th>业务</th>
            <th>文章ID</th>
            <th>标题</th>
            <th>风险</th>
            <th>状态</th>
            <th>原因</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in tasks" :key="task.id">
            <td>{{ task.id }}</td>
            <td>{{ task.bizType }}</td>
            <td>
              <RouterLink :to="`/article/${task.bizId}`">{{ task.bizId }}</RouterLink>
            </td>
            <td>{{ task.title }}</td>
            <td>{{ task.riskLevel }}</td>
            <td><span :class="statusClass(task.status)">{{ task.status }}</span></td>
            <td>{{ task.reason || '-' }}</td>
            <td>{{ task.createdAt || '-' }}</td>
            <td>
              <template v-if="task.status === 'PENDING'">
                <button class="button" @click="pass(task.id)">通过</button>
                <button class="button" style="background: #991b1b; margin-left: 8px;" @click="reject(task.id)">拒绝</button>
              </template>
              <span v-else>-</span>
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

.pending {
  background: #dbeafe;
  color: #1d4ed8;
}
</style>
