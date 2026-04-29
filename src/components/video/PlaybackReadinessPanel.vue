<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { getPlaybackReadiness, syncPlaybackReadiness } from '../../api/playbackReadiness'
import DangerActionConfirmModal from '../common/DangerActionConfirmModal.vue'
import { useDangerActionConfirm } from '../../composables/useDangerActionConfirm'

const props = defineProps<{
  videoId: number
}>()

const emit = defineEmits<{
  synced: [data: any]
  loaded: [data: any]
}>()

const loading = ref(false)
const operating = ref(false)
const message = ref('')
const data = ref<any>(null)
const syncResult = ref<any>(null)
const dangerConfirm = useDangerActionConfirm()

async function load() {
  if (!props.videoId) return

  loading.value = true
  message.value = ''

  try {
    const res: any = await getPlaybackReadiness(props.videoId)
    if (res.code === 0) {
      data.value = res.data
      emit('loaded', res.data)
    } else {
      message.value = res.message || '加载播放就绪状态失败'
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '加载播放就绪状态失败'
  } finally {
    loading.value = false
  }
}

async function dryRun() {
  await doSync(true, 'dryRun playback readiness sync')
}

async function syncNow() {
  const payload = await dangerConfirm.open({
    title: '确认同步播放就绪状态',
    message: '该操作会更新 video 表已有状态和播放地址字段。',
    targetName: `videoId=${props.videoId}`,
    actionLabel: '正式同步',
    level: 'danger',
    confirmText: 'SYNC',
    defaultReason: 'sync playback readiness',
    impacts: [
      '可能修改 video.status',
      '可能写入 HLS 播放地址字段',
      '会影响播放页可播放判断'
    ]
  })

  if (!payload) return
  await doSync(false, payload.reason)
}

async function doSync(dryRunValue: boolean, reason: string) {
  operating.value = true
  message.value = ''

  try {
    const res: any = await syncPlaybackReadiness(props.videoId, {
      dryRun: dryRunValue,
      reason
    })

    if (res.code === 0) {
      syncResult.value = res.data
      message.value = dryRunValue ? 'dryRun 完成' : '同步完成'
      if (!dryRunValue) {
        emit('synced', res.data)
      }
      await load()
    } else {
      message.value = res.message || '同步失败'
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '同步失败'
  } finally {
    operating.value = false
  }
}

function statusClass() {
  if (!data.value) return 'status'
  if (data.value.playable) return 'status success'
  if (data.value.suggestedAction === 'SYNC') return 'status warning'
  if (data.value.suggestedAction === 'WAIT_OR_RERUN') return 'status warning'
  return 'status failed'
}

watch(() => props.videoId, load)
onMounted(load)
</script>

<template>
  <div class="readiness-panel">
    <div class="head">
      <div>
        <h3>播放就绪自愈</h3>
        <p class="muted">检查 video 状态、HLS manifest 和播放地址是否同步。</p>
      </div>
      <button class="small-btn" :disabled="loading" @click="load">
        {{ loading ? '检查中...' : '刷新' }}
      </button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div v-if="data" class="body">
      <div class="main">
        <span :class="statusClass()">{{ data.suggestedAction }}</span>
        <strong>{{ data.message }}</strong>
      </div>

      <div class="grid">
        <div>
          <small>video</small>
          <strong>{{ data.videoExists ? 'EXISTS' : 'MISSING' }}</strong>
        </div>
        <div>
          <small>status</small>
          <strong>{{ data.videoStatus || '-' }}</strong>
        </div>
        <div>
          <small>HLS</small>
          <strong>{{ data.hlsReady ? 'READY' : 'NOT READY' }}</strong>
        </div>
        <div>
          <small>playable</small>
          <strong>{{ data.playable ? 'YES' : 'NO' }}</strong>
        </div>
      </div>

      <p v-if="data.hlsManifestKey" class="muted">manifest：{{ data.hlsManifestKey }}</p>
      <p v-if="data.playbackUrl" class="muted">playbackUrl：{{ data.playbackUrl }}</p>
      <p class="muted">可同步字段：{{ data.detectedPlaybackColumns?.join(', ') || '-' }}</p>

      <div class="actions">
        <button class="small-btn" :disabled="operating" @click="dryRun">dryRun 预览</button>
        <button class="small-btn primary" :disabled="operating || !data.hlsReady" @click="syncNow">
          正式同步
        </button>
      </div>
    </div>

    <div v-if="syncResult" class="result">
      <h4>最近同步结果</h4>
      <pre>{{ syncResult }}</pre>
    </div>

    <DangerActionConfirmModal
      v-bind="dangerConfirm.modalProps.value"
      @cancel="dangerConfirm.cancel"
      @confirm="dangerConfirm.confirm"
    />
  </div>
</template>

<style scoped>
.readiness-panel {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}

.head,
.main {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.muted {
  color: #6b7280;
  margin: 4px 0 0;
}

.message {
  color: #374151;
}

.small-btn {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 10px;
  padding: 7px 10px;
  cursor: pointer;
}

.primary {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
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

.status.failed {
  background: #fee2e2;
  color: #991b1b;
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

.actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.result {
  margin-top: 14px;
  border-radius: 14px;
  background: #f9fafb;
  padding: 12px;
}

pre {
  white-space: pre-wrap;
  overflow: auto;
}
</style>
