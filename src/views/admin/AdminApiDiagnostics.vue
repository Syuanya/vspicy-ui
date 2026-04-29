<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getAdminOpsHubSummary } from '../../api/adminOpsHub'
import { getTranscodeDispatchHealth, getTranscodeStateStats } from '../../api/transcodeState'
import { scanPlaybackReadinessBatch } from '../../api/playbackReadinessBatch'
import { useApiRequest } from '../../composables/useApiRequest'
import ApiState from '../../components/common/ApiState.vue'
import ApiErrorBanner from '../../components/common/ApiErrorBanner.vue'

const lastMessage = ref('')

const opsHub = useApiRequest(getAdminOpsHubSummary)
const dispatchHealth = useApiRequest(getTranscodeDispatchHealth)
const transcodeStats = useApiRequest(getTranscodeStateStats)
const readinessScan = useApiRequest(() => scanPlaybackReadinessBatch({ limit: 20, onlyProblem: true }))

const cards = computed(() => [
  {
    key: 'opsHub',
    title: '运维中心 Summary',
    request: opsHub,
    okText: opsHub.data.value ? `metrics=${opsHub.data.value.metrics?.length || 0}` : '-'
  },
  {
    key: 'dispatch',
    title: '转码分发 Health',
    request: dispatchHealth,
    okText: dispatchHealth.data.value
      ? `RocketMQTemplate=${dispatchHealth.data.value.rocketMqTemplateAvailable ? 'YES' : 'NO'}`
      : '-'
  },
  {
    key: 'stats',
    title: '转码状态 Stats',
    request: transcodeStats,
    okText: transcodeStats.data.value ? `total=${transcodeStats.data.value.totalCount || 0}` : '-'
  },
  {
    key: 'readiness',
    title: '播放就绪批量 Scan',
    request: readinessScan,
    okText: readinessScan.data.value ? `problem=${readinessScan.data.value.problemCount || 0}` : '-'
  }
])

async function runAll() {
  lastMessage.value = ''
  await Promise.all([
    opsHub.execute(),
    dispatchHealth.execute(),
    transcodeStats.execute(),
    readinessScan.execute()
  ])
  lastMessage.value = '诊断完成'
}

async function runOne(item: any) {
  await item.request.execute()
}

function hasError(item: any) {
  return Boolean(item.request.error.value)
}

function hasData(item: any) {
  return Boolean(item.request.data.value)
}

function cardClass(item: any) {
  if (item.request.loading.value) return 'diag-card loading'
  if (hasError(item)) return 'diag-card error'
  if (hasData(item)) return 'diag-card success'
  return 'diag-card'
}

onMounted(runAll)
</script>

<template>
  <section class="card">
    <div class="top">
      <div>
        <h2>API 诊断</h2>
        <p>用于验证前端统一 API 错误处理、网关路径和后端运维接口是否正常。</p>
      </div>
      <button class="button" @click="runAll">全部重试</button>
    </div>

    <p v-if="lastMessage" class="message">{{ lastMessage }}</p>

    <div class="diag-grid">
      <div v-for="item in cards" :key="item.key" :class="cardClass(item)">
        <div class="card-head">
          <h3>{{ item.title }}</h3>
          <button type="button" @click="runOne(item)">重试</button>
        </div>

        <ApiState
          :loading="item.request.loading.value"
          :error="item.request.error.value"
          :empty="!item.request.data.value"
          @retry="runOne(item)"
          @clear-error="item.request.error.value = null"
        >
          <p class="ok">正常：{{ item.okText }}</p>
          <pre>{{ item.request.data.value }}</pre>
        </ApiState>
      </div>
    </div>

    <div class="panel">
      <h3>错误展示测试</h3>
      <ApiErrorBanner
        :error="{ status: 500, message: '这是统一错误条示例', type: 'HTTP' }"
        title="示例错误"
      />
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
  color: #374151;
}

.diag-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.diag-card {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 16px;
  background: #fff;
}

.diag-card.success {
  border-color: #bbf7d0;
}

.diag-card.error {
  border-color: #fecaca;
}

.diag-card.loading {
  border-color: #bfdbfe;
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.card-head button {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #fff;
  padding: 6px 10px;
  cursor: pointer;
}

.ok {
  color: #166534;
  font-weight: 700;
}

pre {
  white-space: pre-wrap;
  overflow: auto;
  max-height: 240px;
  background: #f9fafb;
  border-radius: 12px;
  padding: 12px;
}

.panel {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}
</style>
