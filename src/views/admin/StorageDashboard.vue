<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getStorageDashboard } from '../../api/storageDashboard'

const loading = ref(false)
const message = ref('')
const data = ref<any>(null)

const form = ref({
  prefix: 'videos/',
  limit: 1000,
  threshold: 80
})

async function load() {
  loading.value = true
  message.value = ''
  try {
    const res: any = await getStorageDashboard({
      prefix: form.value.prefix,
      limit: Number(form.value.limit),
      threshold: Number(form.value.threshold)
    })

    if (res.code === 0) {
      data.value = res.data
    } else {
      message.value = res.message || '加载存储大屏失败'
    }
  } finally {
    loading.value = false
  }
}

function levelClass(level: string) {
  if (level === 'CRITICAL') return 'level critical'
  if (level === 'HIGH') return 'level high'
  if (level === 'WARN') return 'level warn'
  return 'level info'
}

function percentWidth(value: number) {
  return Math.min(100, Math.max(0, Number(value || 0))) + '%'
}

onMounted(load)
</script>

<template>
  <section class="card">
    <div class="top">
      <div>
        <h2>存储大屏</h2>
        <p>查看 MinIO 对象、数据库追踪、孤儿对象、用户空间排行和容量告警。</p>
      </div>
      <button class="button" :disabled="loading" @click="load">
        {{ loading ? '扫描中...' : '刷新' }}
      </button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="panel">
      <h3>扫描参数</h3>
      <div class="form-grid">
        <input v-model="form.prefix" class="input" placeholder="prefix，例如 videos/" />
        <input v-model="form.limit" class="input" type="number" placeholder="limit" />
        <input v-model="form.threshold" class="input" type="number" placeholder="告警阈值 %" />
      </div>
      <button class="button" @click="load">执行扫描</button>
    </div>

    <div v-if="data" class="panel">
      <h3>总览</h3>
      <div class="metric-grid">
        <div class="metric-card">
          <small>Bucket</small>
          <strong>{{ data.bucket }}</strong>
          <p>prefix: {{ data.prefix }}</p>
        </div>
        <div class="metric-card">
          <small>MinIO 对象数</small>
          <strong>{{ data.minioObjectCount }}</strong>
          <p>limit: {{ data.limit }}</p>
        </div>
        <div class="metric-card">
          <small>数据库 ObjectKey 数</small>
          <strong>{{ data.dbObjectCount }}</strong>
          <p>来自 record / trace</p>
        </div>
        <div class="metric-card danger">
          <small>孤儿对象</small>
          <strong>{{ data.objectMissingDbCount }}</strong>
          <p>MinIO 有，DB 无</p>
        </div>
        <div class="metric-card warning">
          <small>DB 缺失对象</small>
          <strong>{{ data.dbMissingObjectCount }}</strong>
          <p>DB 有，MinIO 无</p>
        </div>
        <div class="metric-card">
          <small>孤儿对象大小</small>
          <strong>{{ data.minioTotalMb }}MB</strong>
          <p>{{ data.minioTotalBytes }} bytes</p>
        </div>
        <div class="metric-card">
          <small>空间用户数</small>
          <strong>{{ data.userCount }}</strong>
          <p>有 TOTAL usage 的用户</p>
        </div>
        <div class="metric-card">
          <small>总空间占用</small>
          <strong>{{ data.totalUsedMb }}MB</strong>
          <p>confirmed usage</p>
        </div>
      </div>
    </div>

    <div v-if="data" class="panel">
      <h3>容量告警用户</h3>
      <p>阈值：{{ data.threshold }}%</p>

      <div v-if="!data.alerts || data.alerts.length === 0" class="empty">暂无容量告警</div>

      <div style="overflow-x:auto;">
        <table v-if="data.alerts && data.alerts.length > 0">
          <thead>
            <tr>
              <th>userId</th>
              <th>username</th>
              <th>plan</th>
              <th>used / limit</th>
              <th>usage</th>
              <th>level</th>
              <th>message</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in data.alerts" :key="item.userId">
              <td>{{ item.userId }}</td>
              <td>{{ item.username || '-' }}</td>
              <td>{{ item.planCode }}</td>
              <td>{{ item.totalUsedMb }} / {{ item.totalLimitMb }}MB</td>
              <td>
                <div class="usage">
                  <div class="bar"><span :style="{ width: percentWidth(item.usagePercent) }"></span></div>
                  <span>{{ item.usagePercent }}%</span>
                </div>
              </td>
              <td><span :class="levelClass(item.level)">{{ item.level }}</span></td>
              <td>{{ item.message }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="data" class="panel">
      <h3>用户空间 Top</h3>

      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>userId</th>
              <th>username</th>
              <th>plan</th>
              <th>used / limit</th>
              <th>usage</th>
              <th>CONFIRMED</th>
              <th>RELEASED</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in data.topUsers" :key="item.userId">
              <td>{{ item.userId }}</td>
              <td>{{ item.username || '-' }}</td>
              <td>{{ item.planCode }}</td>
              <td>{{ item.totalUsedMb }} / {{ item.totalLimitMb }}MB</td>
              <td>
                <div class="usage">
                  <div class="bar"><span :style="{ width: percentWidth(item.usagePercent) }"></span></div>
                  <span>{{ item.usagePercent }}%</span>
                </div>
              </td>
              <td>{{ item.confirmedRecordCount }}</td>
              <td>{{ item.releasedRecordCount }}</td>
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

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
}

.metric-card {
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 16px;
  padding: 14px;
}

.metric-card small {
  color: #6b7280;
}

.metric-card strong {
  display: block;
  font-size: 24px;
  margin-top: 8px;
}

.metric-card.danger {
  background: #fef2f2;
  border-color: #fecaca;
}

.metric-card.warning {
  background: #fffbeb;
  border-color: #fde68a;
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

.usage {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar {
  width: 110px;
  height: 8px;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
}

.bar span {
  display: block;
  height: 100%;
  background: #2563eb;
}

.level {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: #f3f4f6;
  color: #374151;
}

.level.warn {
  background: #fef3c7;
  color: #92400e;
}

.level.high {
  background: #fee2e2;
  color: #991b1b;
}

.level.critical {
  background: #7f1d1d;
  color: #fff;
}

.level.info {
  background: #dbeafe;
  color: #1d4ed8;
}

.empty {
  color: #6b7280;
}
</style>
