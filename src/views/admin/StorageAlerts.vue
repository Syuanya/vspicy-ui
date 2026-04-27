<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  ackStorageAlert,
  generateStorageAlerts,
  listStorageAlerts,
  resolveStorageAlert
} from '../../api/storageAlert'

const loading = ref(false)
const generating = ref(false)
const message = ref('')
const alerts = ref<any[]>([])

const filter = ref({
  status: 'OPEN',
  level: '',
  limit: 100
})

const generateForm = ref({
  prefix: 'videos/',
  limit: 1000,
  threshold: 80,
  hlsLimit: 200
})

async function load() {
  loading.value = true
  message.value = ''
  try {
    const res: any = await listStorageAlerts({
      status: filter.value.status,
      level: filter.value.level || undefined,
      limit: Number(filter.value.limit)
    })

    if (res.code === 0) {
      alerts.value = res.data || []
    } else {
      message.value = res.message || '加载存储告警失败'
    }
  } finally {
    loading.value = false
  }
}

async function generate() {
  generating.value = true
  message.value = ''
  try {
    const res: any = await generateStorageAlerts({
      prefix: generateForm.value.prefix,
      limit: Number(generateForm.value.limit),
      threshold: Number(generateForm.value.threshold),
      hlsLimit: Number(generateForm.value.hlsLimit)
    })

    if (res.code === 0) {
      message.value = `告警生成完成：generated=${res.data.generatedCount}, open=${res.data.openCount}`
      await load()
    } else {
      message.value = res.message || '生成告警失败'
    }
  } finally {
    generating.value = false
  }
}

async function ack(item: any) {
  const res: any = await ackStorageAlert(item.id)
  if (res.code === 0) {
    message.value = '告警已确认'
    await load()
  } else {
    message.value = res.message || '确认失败'
  }
}

async function resolve(item: any) {
  const res: any = await resolveStorageAlert(item.id)
  if (res.code === 0) {
    message.value = '告警已解决'
    await load()
  } else {
    message.value = res.message || '解决失败'
  }
}

function levelClass(level: string) {
  if (level === 'CRITICAL') return 'level critical'
  if (level === 'HIGH') return 'level high'
  if (level === 'WARN') return 'level warn'
  return 'level info'
}

function statusClass(status: string) {
  if (status === 'OPEN') return 'status open'
  if (status === 'ACKED') return 'status acked'
  if (status === 'RESOLVED') return 'status resolved'
  return 'status'
}

onMounted(load)
</script>

<template>
  <section class="card">
    <div class="top">
      <div>
        <h2>存储告警</h2>
        <p>生成并管理容量、孤儿对象、DB 缺失对象、HLS 缺失等存储告警。</p>
      </div>
      <button class="button" :disabled="loading" @click="load">
        {{ loading ? '加载中...' : '刷新' }}
      </button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="panel">
      <h3>生成告警</h3>
      <div class="form-grid">
        <input v-model="generateForm.prefix" class="input" placeholder="prefix" />
        <input v-model="generateForm.limit" class="input" type="number" placeholder="storage limit" />
        <input v-model="generateForm.threshold" class="input" type="number" placeholder="threshold" />
        <input v-model="generateForm.hlsLimit" class="input" type="number" placeholder="hls limit" />
      </div>
      <button class="button" :disabled="generating" @click="generate">
        {{ generating ? '生成中...' : '生成告警' }}
      </button>
    </div>

    <div class="panel">
      <h3>筛选</h3>
      <div class="form-grid">
        <select v-model="filter.status" class="input">
          <option value="OPEN">OPEN</option>
          <option value="ACKED">ACKED</option>
          <option value="RESOLVED">RESOLVED</option>
        </select>
        <select v-model="filter.level" class="input">
          <option value="">全部级别</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="WARN">WARN</option>
          <option value="INFO">INFO</option>
        </select>
        <input v-model="filter.limit" class="input" type="number" placeholder="limit" />
      </div>
      <button class="button" @click="load">查询</button>
    </div>

    <div class="panel">
      <h3>告警列表</h3>
      <div v-if="alerts.length === 0" class="empty">暂无告警</div>

      <div style="overflow-x:auto;">
        <table v-if="alerts.length > 0">
          <thead>
            <tr>
              <th>ID</th>
              <th>级别</th>
              <th>状态</th>
              <th>类型</th>
              <th>标题</th>
              <th>目标</th>
              <th>objectKey</th>
              <th>userId</th>
              <th>videoId</th>
              <th>来源</th>
              <th>最后出现</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in alerts" :key="item.id">
              <td>{{ item.id }}</td>
              <td><span :class="levelClass(item.alertLevel)">{{ item.alertLevel }}</span></td>
              <td><span :class="statusClass(item.status)">{{ item.status }}</span></td>
              <td>{{ item.alertCode }}</td>
              <td>
                <strong>{{ item.title }}</strong>
                <p class="content">{{ item.content }}</p>
              </td>
              <td>{{ item.targetType }} / {{ item.targetId || '-' }}</td>
              <td class="key">{{ item.objectKey || '-' }}</td>
              <td>{{ item.userId || '-' }}</td>
              <td>{{ item.videoId || '-' }}</td>
              <td>{{ item.source }}</td>
              <td>{{ item.lastSeenAt }}</td>
              <td>
                <button v-if="item.status === 'OPEN'" class="plain" @click="ack(item)">确认</button>
                <button v-if="item.status !== 'RESOLVED'" class="plain danger-text" @click="resolve(item)">解决</button>
                <span v-if="item.status === 'RESOLVED'">-</span>
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

.panel {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
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
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content {
  max-width: 460px;
  white-space: normal;
  color: #6b7280;
  margin: 4px 0 0;
}

.level,
.status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
}

.level.critical {
  background: #7f1d1d;
  color: #fff;
}

.level.high {
  background: #fee2e2;
  color: #991b1b;
}

.level.warn {
  background: #fef3c7;
  color: #92400e;
}

.level.info {
  background: #dbeafe;
  color: #1d4ed8;
}

.status.open {
  background: #fee2e2;
  color: #991b1b;
}

.status.acked {
  background: #fef3c7;
  color: #92400e;
}

.status.resolved {
  background: #dcfce7;
  color: #166534;
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
</style>
