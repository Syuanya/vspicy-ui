<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAdminOpsHubSummary } from '../../api/adminOpsHub'
import { useApiRequest } from '../../composables/useApiRequest'
import ApiState from '../../components/common/ApiState.vue'
import AdminOpsNav from '../../components/admin/AdminOpsNav.vue'
import ServiceHealthPanel from '../../components/admin/ServiceHealthPanel.vue'
import RecentOperationAuditPanel from '../../components/admin/RecentOperationAuditPanel.vue'
import OperationAuditRiskPanel from '../../components/admin/OperationAuditRiskPanel.vue'
import OperationAuditAlertPanel from '../../components/admin/OperationAuditAlertPanel.vue'
import OperationAuditAlertEventInbox from '../../components/admin/OperationAuditAlertEventInbox.vue'
import OperationAuditAlertAutomationPanel from '../../components/admin/OperationAuditAlertAutomationPanel.vue'

const router = useRouter()
const message = ref('')
const summaryRequest = useApiRequest(getAdminOpsHubSummary)

const summary = computed(() => summaryRequest.data.value)

const groupedMetrics = computed(() => {
  const groups: Record<string, any[]> = {}
  for (const item of summary.value?.metrics || []) {
    if (!groups[item.groupKey]) groups[item.groupKey] = []
    groups[item.groupKey].push(item)
  }
  return groups
})

const groupTitles: Record<string, string> = {
  transcode: '转码任务',
  hlsRepair: 'HLS 修复',
  cleanup: '对象清理',
  storageAlert: '存储告警',
  playbackReadiness: '播放就绪',
  operationAudit: '操作审计告警'
}

async function load() {
  message.value = ''
  await summaryRequest.execute()
  if (summaryRequest.data.value) {
    message.value = ''
  }
}

function go(link: string) {
  if (!link) return
  router.push(link)
}

function metricClass(level: string) {
  if (level === 'success') return 'metric success'
  if (level === 'danger') return 'metric danger'
  if (level === 'warning') return 'metric warning'
  return 'metric info'
}

function linkClass(level: string) {
  if (level === 'danger') return 'quick danger'
  if (level === 'warning') return 'quick warning'
  return 'quick'
}

function refreshAll() {
  load()
}

onMounted(load)
</script>

<template>
  <section class="card">
    <AdminOpsNav>
      <template #extra>
        <button class="button" :disabled="summaryRequest.loading.value" @click="refreshAll">
          {{ summaryRequest.loading.value ? '刷新中...' : '刷新运维中心' }}
        </button>
      </template>
    </AdminOpsNav>

    <div class="top">
      <div>
        <h2>运维中心</h2>
        <p>集中查看服务健康、视频存储、转码、HLS 修复、对象清理、播放就绪和最近操作。</p>
        <p v-if="summary?.generatedAt" class="muted">生成时间：{{ summary.generatedAt }}</p>
      </div>
      <button class="button secondary" @click="go('/admin/service-health')">服务健康详情</button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <ServiceHealthPanel />

    <RecentOperationAuditPanel :limit="10" />

    <OperationAuditAlertPanel :hours="24" :limit="6" compact />
    <OperationAuditAlertEventInbox :hours="24" :limit="8" compact />
    <OperationAuditAlertAutomationPanel compact />

    <OperationAuditRiskPanel :hours="24" :limit="6" compact />

    <ApiState
      :loading="summaryRequest.loading.value"
      :error="summaryRequest.error.value"
      :empty="!summary"
      @retry="load"
      @clear-error="summaryRequest.error.value = null"
    >
      <div v-if="summary?.dispatchHealth" class="dispatch panel">
        <div>
          <h3>转码分发健康</h3>
          <p>
            <span :class="summary.dispatchHealth.rocketMqTemplateAvailable ? 'ok' : 'warn'">
              RocketMQTemplate：{{ summary.dispatchHealth.rocketMqTemplateAvailable ? '可用' : '不可用' }}
            </span>
            <span> / RocketMQ：{{ summary.dispatchHealth.rocketMqEnabled ? '启用' : '关闭' }}</span>
            <span> / 本地 fallback：{{ summary.dispatchHealth.fallbackLocalEnabled ? '启用' : '关闭' }}</span>
          </p>
          <p class="muted">
            {{ summary.dispatchHealth.destination || '-' }}，{{ summary.dispatchHealth.message || '-' }}
          </p>
          <p v-if="summary.dispatchHealth.errorMessage" class="error">
            {{ summary.dispatchHealth.errorMessage }}
          </p>
        </div>
        <button class="button secondary" @click="go('/admin/transcode-tasks')">查看转码任务</button>
      </div>

      <div v-if="summary?.quickLinks?.length" class="quick-grid">
        <button
          v-for="item in summary.quickLinks"
          :key="item.link"
          :class="linkClass(item.level)"
          @click="go(item.link)"
        >
          <strong>{{ item.title }}</strong>
          <span>{{ item.description }}</span>
        </button>
      </div>

      <div v-for="(items, groupKey) in groupedMetrics" :key="groupKey" class="panel">
        <h3>{{ groupTitles[String(groupKey)] || groupKey }}</h3>
        <div class="metrics">
          <button
            v-for="item in items"
            :key="item.groupKey + item.metricKey"
            :class="metricClass(item.level)"
            @click="go(item.link)"
          >
            <small>{{ item.title }}</small>
            <strong>{{ item.value }}</strong>
            <span>{{ item.description }}</span>
          </button>
        </div>
      </div>

      <div class="panel advice">
        <h3>建议处理顺序</h3>
        <ol>
          <li>先看服务健康：MySQL / Redis / MinIO / RocketMQ / FFmpeg / 存储目录。</li>
          <li>再看操作审计告警：优先处理 _REJECTED 被拒绝高危操作。</li>
          <li>再看最近操作：确认是否有人执行过重跑、同步、清理等高危动作。</li>
          <li>再看转码分发健康：RocketMQ 不可用时确认 fallback 是否启用。</li>
          <li>处理转码失败和长期 PENDING / RUNNING 任务。</li>
          <li>处理播放就绪问题：有 HLS 但 video 状态或播放地址未同步。</li>
          <li>最后处理 HLS 修复、对象清理和存储告警。</li>
        </ol>
      </div>
    </ApiState>
  </section>
</template>

<style scoped>
.top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.muted {
  color: #6b7280;
  margin: 4px 0 0;
}

.message {
  color: #374151;
}

.error {
  color: #991b1b;
}

.ok {
  color: #166534;
  font-weight: 700;
}

.warn {
  color: #92400e;
  font-weight: 700;
}

.panel {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}

.dispatch {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  background: #f9fafb;
}

.secondary {
  background: #374151;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.quick {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 18px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
}

.quick:hover {
  border-color: #93c5fd;
  background: #eff6ff;
}

.quick.warning {
  border-color: #fde68a;
  background: #fffbeb;
}

.quick.danger {
  border-color: #fecaca;
  background: #fef2f2;
}

.quick strong,
.quick span {
  display: block;
}

.quick span {
  color: #6b7280;
  margin-top: 8px;
  line-height: 1.5;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
}

.metric {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 14px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.metric small {
  display: block;
  color: #6b7280;
}

.metric strong {
  display: block;
  font-size: 28px;
  margin-top: 6px;
}

.metric span {
  display: block;
  margin-top: 8px;
  color: #6b7280;
  line-height: 1.4;
}

.metric.success {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.metric.warning {
  border-color: #fde68a;
  background: #fffbeb;
}

.metric.danger {
  border-color: #fecaca;
  background: #fef2f2;
}

.metric.info {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.advice ol {
  margin: 0;
  padding-left: 20px;
  color: #374151;
  line-height: 1.8;
}

@media (max-width: 760px) {
  .top,
  .dispatch {
    display: block;
  }
}
</style>
