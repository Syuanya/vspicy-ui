<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { getServiceHealthSummary } from '../../api/serviceHealth'
import { useApiRequest } from '../../composables/useApiRequest'
import ApiState from '../common/ApiState.vue'

const request = useApiRequest(getServiceHealthSummary)

const groupedItems = computed(() => {
  const groups: Record<string, any[]> = {}
  for (const item of request.data.value?.items || []) {
    if (!groups[item.groupKey]) groups[item.groupKey] = []
    groups[item.groupKey].push(item)
  }
  return groups
})

const groupTitles: Record<string, string> = {
  database: '数据库',
  cache: '缓存',
  objectStorage: '对象存储',
  messageQueue: '消息队列',
  transcode: '转码工具',
  filesystem: '文件系统'
}

function statusClass(status: string) {
  if (status === 'UP') return 'status success'
  if (status === 'WARN') return 'status warning'
  if (status === 'DOWN') return 'status danger'
  return 'status info'
}

function cardClass(level: string) {
  return ['health-card', level || 'info'].join(' ')
}

onMounted(() => request.execute())

defineExpose({
  refresh: request.execute
})
</script>

<template>
  <section class="service-health-panel">
    <div class="head">
      <div>
        <h3>服务健康检查</h3>
        <p class="muted">
          检查 MySQL、Redis、MinIO、RocketMQ、FFmpeg 和视频存储目录。
        </p>
      </div>
      <button class="small-btn" :disabled="request.loading.value" @click="request.execute">
        {{ request.loading.value ? '检查中...' : '重新检查' }}
      </button>
    </div>

    <ApiState
      :loading="request.loading.value"
      :error="request.error.value"
      :empty="!request.data.value"
      @retry="request.execute"
      @clear-error="request.error.value = null"
    >
      <div class="summary" v-if="request.data.value">
        <div :class="statusClass(request.data.value.overallStatus)">
          {{ request.data.value.overallStatus }}
        </div>
        <div><small>UP</small><strong>{{ request.data.value.upCount }}</strong></div>
        <div><small>WARN</small><strong>{{ request.data.value.warnCount }}</strong></div>
        <div><small>DOWN</small><strong>{{ request.data.value.downCount }}</strong></div>
        <div><small>UNKNOWN</small><strong>{{ request.data.value.unknownCount }}</strong></div>
      </div>

      <div v-for="(items, groupKey) in groupedItems" :key="groupKey" class="group">
        <h4>{{ groupTitles[String(groupKey)] || groupKey }}</h4>

        <div class="grid">
          <article
            v-for="item in items"
            :key="item.key"
            :class="cardClass(item.level)"
          >
            <div class="card-top">
              <strong>{{ item.title }}</strong>
              <span :class="statusClass(item.status)">{{ item.status }}</span>
            </div>

            <p>{{ item.message }}</p>
            <small>{{ item.suggestion }}</small>

            <dl v-if="item.details && Object.keys(item.details).length">
              <template v-for="(value, key) in item.details" :key="key">
                <dt>{{ key }}</dt>
                <dd>{{ value }}</dd>
              </template>
            </dl>

            <em>{{ item.durationMs }} ms</em>
          </article>
        </div>
      </div>
    </ApiState>
  </section>
</template>

<style scoped>
.service-health-panel {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}

.head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.muted {
  color: #6b7280;
  margin: 4px 0 0;
}

.small-btn {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 10px;
  padding: 7px 10px;
  cursor: pointer;
}

.summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
  gap: 10px;
  margin-bottom: 18px;
}

.summary > div {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 10px;
  background: #f9fafb;
}

.summary small {
  display: block;
  color: #6b7280;
}

.summary strong {
  display: block;
  font-size: 24px;
}

.group {
  margin-top: 18px;
}

.group h4 {
  margin-bottom: 10px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.health-card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 14px;
  background: #fff;
}

.health-card.success {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.health-card.warning {
  border-color: #fde68a;
  background: #fffbeb;
}

.health-card.danger {
  border-color: #fecaca;
  background: #fef2f2;
}

.health-card.info {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.card-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.status {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 12px;
}

.status.success {
  background: #dcfce7;
  color: #166534;
}

.status.warning {
  background: #fef3c7;
  color: #92400e;
}

.status.danger {
  background: #fee2e2;
  color: #991b1b;
}

.status.info {
  background: #dbeafe;
  color: #1d4ed8;
}

.health-card p {
  margin: 10px 0 6px;
}

.health-card small {
  color: #6b7280;
  line-height: 1.4;
}

.health-card em {
  display: block;
  margin-top: 10px;
  color: #6b7280;
  font-size: 12px;
}

dl {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 5px 8px;
  margin: 12px 0 0;
}

dt {
  color: #6b7280;
}

dd {
  margin: 0;
  word-break: break-all;
}
</style>
