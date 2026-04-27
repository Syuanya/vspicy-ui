<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getStorageOpsConsole } from '../../api/storageOps'

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
    const res: any = await getStorageOpsConsole({
      prefix: form.value.prefix,
      limit: Number(form.value.limit),
      threshold: Number(form.value.threshold)
    })

    if (res.code === 0) {
      data.value = res.data
    } else {
      message.value = res.message || '加载存储运维总控台失败'
    }
  } finally {
    loading.value = false
  }
}

function levelClass(level: string) {
  if (level === 'HIGH') return 'level high'
  if (level === 'WARN') return 'level warn'
  return 'level info'
}

function riskText() {
  if (!data.value) return 'UNKNOWN'
  if (data.value.alertCriticalOpenCount > 0) return 'CRITICAL'
  if (data.value.alertHighOpenCount > 0 || data.value.repairFailedCount > 0 || data.value.cleanupFailedCount > 0) return 'HIGH'
  if (data.value.alertWarnOpenCount > 0 || data.value.repairPendingCount > 0 || data.value.cleanupApprovedCount > 0) return 'WARN'
  return 'OK'
}

function riskClass() {
  const risk = riskText()
  if (risk === 'CRITICAL') return 'risk critical'
  if (risk === 'HIGH') return 'risk high'
  if (risk === 'WARN') return 'risk warn'
  return 'risk ok'
}

onMounted(load)
</script>

<template>
  <section class="card">
    <div class="top">
      <div>
        <h2>存储运维总控台</h2>
        <p>聚合存储大屏、告警、HLS 修复、对象清理审批流。</p>
      </div>
      <button class="button" :disabled="loading" @click="load">
        {{ loading ? '加载中...' : '刷新' }}
      </button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="panel">
      <h3>参数</h3>
      <div class="form-grid">
        <input v-model="form.prefix" class="input" placeholder="prefix，例如 videos/" />
        <input v-model="form.limit" class="input" type="number" placeholder="limit" />
        <input v-model="form.threshold" class="input" type="number" placeholder="threshold" />
      </div>
      <button class="button" @click="load">重新加载</button>
    </div>

    <div v-if="data" class="panel hero">
      <div>
        <small>当前风险等级</small>
        <strong :class="riskClass()">{{ riskText() }}</strong>
        <p>{{ data.bucket }} / {{ data.prefix }} / threshold={{ data.threshold }}%</p>
      </div>
      <div class="hero-grid">
        <div>
          <small>OPEN 告警</small>
          <strong>{{ data.alertOpenCount }}</strong>
        </div>
        <div>
          <small>HLS 待处理</small>
          <strong>{{ data.repairPendingCount + data.repairDispatchedCount + data.repairRunningCount }}</strong>
        </div>
        <div>
          <small>待审批清理</small>
          <strong>{{ data.cleanupPendingCount }}</strong>
        </div>
        <div>
          <small>已审批待删</small>
          <strong>{{ data.cleanupApprovedCount }}</strong>
        </div>
      </div>
    </div>

    <div v-if="data" class="metric-grid">
      <div class="panel metric">
        <h3>存储概览</h3>
        <div class="kv"><span>MinIO 对象数</span><strong>{{ data.dashboard.minioObjectCount }}</strong></div>
        <div class="kv"><span>DB ObjectKey</span><strong>{{ data.dashboard.dbObjectCount }}</strong></div>
        <div class="kv danger"><span>孤儿对象</span><strong>{{ data.dashboard.objectMissingDbCount }}</strong></div>
        <div class="kv warning"><span>DB 缺失对象</span><strong>{{ data.dashboard.dbMissingObjectCount }}</strong></div>
        <div class="kv"><span>总空间占用</span><strong>{{ data.dashboard.totalUsedMb }}MB</strong></div>
      </div>

      <div class="panel metric">
        <h3>存储告警</h3>
        <div class="kv danger"><span>OPEN</span><strong>{{ data.alertOpenCount }}</strong></div>
        <div class="kv warning"><span>ACKED</span><strong>{{ data.alertAckedCount }}</strong></div>
        <div class="kv"><span>RESOLVED</span><strong>{{ data.alertResolvedCount }}</strong></div>
        <div class="kv danger"><span>CRITICAL OPEN</span><strong>{{ data.alertCriticalOpenCount }}</strong></div>
        <div class="kv warning"><span>HIGH/WARN OPEN</span><strong>{{ data.alertHighOpenCount + data.alertWarnOpenCount }}</strong></div>
      </div>

      <div class="panel metric">
        <h3>HLS 修复</h3>
        <div class="kv"><span>PENDING</span><strong>{{ data.repairPendingCount }}</strong></div>
        <div class="kv warning"><span>DISPATCHED</span><strong>{{ data.repairDispatchedCount }}</strong></div>
        <div class="kv warning"><span>RUNNING</span><strong>{{ data.repairRunningCount }}</strong></div>
        <div class="kv"><span>SUCCESS</span><strong>{{ data.repairSuccessCount }}</strong></div>
        <div class="kv danger"><span>FAILED</span><strong>{{ data.repairFailedCount }}</strong></div>
      </div>

      <div class="panel metric">
        <h3>对象清理</h3>
        <div class="kv"><span>PENDING</span><strong>{{ data.cleanupPendingCount }}</strong></div>
        <div class="kv warning"><span>APPROVED</span><strong>{{ data.cleanupApprovedCount }}</strong></div>
        <div class="kv"><span>REJECTED</span><strong>{{ data.cleanupRejectedCount }}</strong></div>
        <div class="kv"><span>EXECUTED</span><strong>{{ data.cleanupExecutedCount }}</strong></div>
        <div class="kv danger"><span>FAILED</span><strong>{{ data.cleanupFailedCount }}</strong></div>
      </div>
    </div>

    <div v-if="data" class="panel">
      <h3>运维入口</h3>
      <div class="link-grid">
        <RouterLink v-for="link in data.links" :key="link.path" :to="link.path" class="ops-link">
          <div>
            <strong>{{ link.name }}</strong>
            <p>{{ link.description }}</p>
          </div>
          <span :class="levelClass(link.level)">{{ link.level }}</span>
        </RouterLink>
      </div>
    </div>

    <div v-if="data?.dashboard?.alerts?.length" class="panel">
      <h3>容量告警用户</h3>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>userId</th>
              <th>username</th>
              <th>plan</th>
              <th>used / limit</th>
              <th>usage</th>
              <th>level</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in data.dashboard.alerts" :key="item.userId">
              <td>{{ item.userId }}</td>
              <td>{{ item.username || '-' }}</td>
              <td>{{ item.planCode }}</td>
              <td>{{ item.totalUsedMb }} / {{ item.totalLimitMb }}MB</td>
              <td>{{ item.usagePercent }}%</td>
              <td>{{ item.level }}</td>
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

.hero {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 2fr;
  gap: 20px;
  align-items: center;
  background: #f9fafb;
}

.hero small,
.metric small {
  color: #6b7280;
}

.risk {
  display: block;
  font-size: 36px;
  margin: 8px 0;
}

.risk.ok {
  color: #166534;
}

.risk.warn {
  color: #92400e;
}

.risk.high,
.risk.critical {
  color: #991b1b;
}

.hero-grid,
.metric-grid,
.link-grid {
  display: grid;
  gap: 14px;
}

.hero-grid {
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.hero-grid > div {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 12px;
  background: #fff;
}

.hero-grid strong {
  display: block;
  font-size: 26px;
  margin-top: 6px;
}

.metric-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  margin-top: 18px;
}

.metric {
  margin-top: 0;
}

.kv {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #f3f4f6;
  padding: 9px 0;
}

.kv strong {
  font-size: 18px;
}

.kv.danger strong {
  color: #991b1b;
}

.kv.warning strong {
  color: #92400e;
}

.link-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.ops-link {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 14px;
  color: #111827;
  text-decoration: none;
  background: #fff;
}

.ops-link:hover {
  background: #f9fafb;
}

.ops-link p {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.level {
  display: inline-block;
  height: fit-content;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
}

.level.info {
  background: #dbeafe;
  color: #1d4ed8;
}

.level.warn {
  background: #fef3c7;
  color: #92400e;
}

.level.high {
  background: #fee2e2;
  color: #991b1b;
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

@media (max-width: 760px) {
  .hero {
    grid-template-columns: 1fr;
  }
}
</style>
