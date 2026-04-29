<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getTranscodeProgressByTaskId, getTranscodeProgressByVideoId } from '../../api/transcodeProgress'

const props = withDefaults(defineProps<{
  videoId?: number | null
  taskId?: number | null
  autoRefresh?: boolean
  intervalMs?: number
}>(), {
  videoId: null,
  taskId: null,
  autoRefresh: false,
  intervalMs: 3000
})

const emit = defineEmits<{
  ready: [data: any]
  failed: [data: any]
  loaded: [data: any]
}>()

const loading = ref(false)
const message = ref('')
const data = ref<any>(null)
let timer: number | undefined

async function load() {
  if (!props.videoId && !props.taskId) {
    data.value = null
    message.value = '缺少 videoId 或 taskId'
    return
  }

  loading.value = true
  message.value = ''

  try {
    const res: any = props.taskId
      ? await getTranscodeProgressByTaskId(Number(props.taskId))
      : await getTranscodeProgressByVideoId(Number(props.videoId))

    if (res.code === 0) {
      data.value = res.data
      emit('loaded', res.data)

      if (res.data?.playable) {
        emit('ready', res.data)
        stop()
      }

      if (res.data?.status === 'FAILED') {
        emit('failed', res.data)
      }
    } else {
      message.value = res.message || '加载转码状态失败'
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '加载转码状态失败'
  } finally {
    loading.value = false
  }
}

function start() {
  stop()
  if (!props.autoRefresh) return

  timer = window.setInterval(() => {
    if (!data.value?.playable) {
      load()
    }
  }, props.intervalMs)
}

function stop() {
  if (timer) {
    window.clearInterval(timer)
    timer = undefined
  }
}

function statusClass(status: string) {
  if (status === 'PENDING') return 'status pending'
  if (status === 'DISPATCHED') return 'status dispatched'
  if (status === 'RUNNING') return 'status running'
  if (status === 'SUCCESS') return data.value?.playable ? 'status success' : 'status warning'
  if (status === 'FAILED') return 'status failed'
  if (status === 'CANCELED') return 'status canceled'
  return 'status'
}

watch(() => [props.videoId, props.taskId], () => {
  load()
  start()
})

onMounted(() => {
  load()
  start()
})

onBeforeUnmount(stop)
</script>

<template>
  <div class="transcode-card">
    <div class="card-head">
      <div>
        <h3>转码状态</h3>
        <p v-if="data" class="muted">
          videoId={{ data.videoId || '-' }} / taskId={{ data.transcodeTaskId || '-' }}
        </p>
      </div>
      <button class="small-btn" :disabled="loading" @click="load">
        {{ loading ? '刷新中...' : '刷新' }}
      </button>
    </div>

    <p v-if="message" class="error">{{ message }}</p>

    <div v-if="data" class="content">
      <div class="main-row">
        <span :class="statusClass(data.status)">{{ data.status }}</span>
        <strong>{{ data.displayStatus }}</strong>
      </div>

      <p class="message">{{ data.displayMessage }}</p>

      <div class="grid">
        <div>
          <small>HLS</small>
          <strong>{{ data.hlsReady ? 'READY' : 'NOT READY' }}</strong>
        </div>
        <div>
          <small>可播放</small>
          <strong>{{ data.playable ? 'YES' : 'NO' }}</strong>
        </div>
        <div>
          <small>建议</small>
          <strong>{{ data.suggestedAction }}</strong>
        </div>
        <div>
          <small>重试</small>
          <strong>{{ data.retryCount }} / {{ data.maxRetryCount }}</strong>
        </div>
      </div>

      <p v-if="data.hlsManifestKey" class="muted">
        manifest：{{ data.hlsManifestKey }}
      </p>

      <p v-if="data.errorMessage || data.lastDispatchError" class="error">
        {{ data.errorMessage || data.lastDispatchError }}
      </p>
    </div>

    <div v-else class="empty">
      暂无转码状态
    </div>
  </div>
</template>

<style scoped>
.transcode-card {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}

.card-head,
.main-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.small-btn {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 10px;
  padding: 7px 10px;
  cursor: pointer;
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

.status {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 12px;
}

.status.pending {
  background: #dbeafe;
  color: #1d4ed8;
}

.status.dispatched,
.status.running,
.status.warning {
  background: #fef3c7;
  color: #92400e;
}

.status.success {
  background: #dcfce7;
  color: #166534;
}

.status.failed {
  background: #fee2e2;
  color: #991b1b;
}

.status.canceled {
  background: #f3f4f6;
  color: #374151;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin: 14px 0;
}

.grid > div {
  border: 1px solid #f3f4f6;
  border-radius: 12px;
  padding: 10px;
}

.grid small {
  display: block;
  color: #6b7280;
}

.grid strong {
  display: block;
  margin-top: 5px;
}

.empty {
  color: #6b7280;
}
</style>
