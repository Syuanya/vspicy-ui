<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listOperationLogs } from '../../api/admin'

const logs = ref<any[]>([])
const loading = ref(false)
const message = ref('')

const query = ref({
  userId: '',
  operationType: '',
  status: '',
  limit: 100
})

async function load() {
  loading.value = true
  message.value = ''
  try {
    const params: any = {
      limit: query.value.limit
    }

    if (query.value.userId) {
      params.userId = Number(query.value.userId)
    }
    if (query.value.operationType) {
      params.operationType = query.value.operationType
    }
    if (query.value.status) {
      params.status = query.value.status
    }

    const res: any = await listOperationLogs(params)
    if (res.code === 0) {
      logs.value = res.data || []
    } else {
      message.value = res.message || '加载失败'
    }
  } finally {
    loading.value = false
  }
}

function statusClass(status: string) {
  return status === 'SUCCESS' ? 'tag success' : 'tag danger'
}

onMounted(load)
</script>

<template>
  <section class="card">
    <h2>操作审计日志</h2>
    <p>记录后台高风险操作，例如角色、权限、授权变更。</p>

    <div class="filter">
      <input v-model="query.userId" class="input" style="max-width: 140px; margin: 0;" placeholder="userId" />
      <select v-model="query.operationType" class="input" style="max-width: 160px; margin: 0;">
        <option value="">全部类型</option>
        <option value="CREATE">CREATE</option>
        <option value="UPDATE">UPDATE</option>
        <option value="DELETE">DELETE</option>
        <option value="ASSIGN">ASSIGN</option>
        <option value="AUDIT">AUDIT</option>
        <option value="OTHER">OTHER</option>
      </select>
      <select v-model="query.status" class="input" style="max-width: 160px; margin: 0;">
        <option value="">全部状态</option>
        <option value="SUCCESS">SUCCESS</option>
        <option value="FAILED">FAILED</option>
      </select>
      <input v-model="query.limit" type="number" class="input" style="max-width: 120px; margin: 0;" placeholder="limit" />
      <button class="button" :disabled="loading" @click="load">
        {{ loading ? '加载中...' : '查询' }}
      </button>
    </div>

    <p v-if="message" style="color: #ef4444;">{{ message }}</p>

    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th>ID</th>
            <th>时间</th>
            <th>用户</th>
            <th>角色</th>
            <th>类型</th>
            <th>操作</th>
            <th>状态</th>
            <th>耗时</th>
            <th>请求</th>
            <th>IP</th>
            <th>错误</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id">
            <td>{{ log.id }}</td>
            <td>{{ log.createdAt }}</td>
            <td>{{ log.username || '-' }} / {{ log.userId || '-' }}</td>
            <td>{{ log.roles || '-' }}</td>
            <td>{{ log.operationType }}</td>
            <td>{{ log.operationTitle }}</td>
            <td><span :class="statusClass(log.status)">{{ log.status }}</span></td>
            <td>{{ log.costMs }}ms</td>
            <td>{{ log.requestMethod }} {{ log.requestUri }}</td>
            <td>{{ log.clientIp || '-' }}</td>
            <td>{{ log.errorMessage || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.filter {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin: 16px 0;
}

th, td {
  border-bottom: 1px solid #e5e7eb;
  padding: 10px;
  text-align: left;
  font-size: 13px;
  white-space: nowrap;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
}

.success {
  background: #dcfce7;
  color: #166534;
}

.danger {
  background: #fee2e2;
  color: #991b1b;
}
</style>
