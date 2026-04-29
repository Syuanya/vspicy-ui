<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import TranscodeStatusCard from './TranscodeStatusCard.vue'

const props = withDefaults(defineProps<{
  videoId: number
  refreshKey?: number
}>(), {
  refreshKey: 0
})

const emit = defineEmits<{
  loaded: [data: any]
  ready: [data: any]
  failed: [data: any]
}>()

const progress = ref<any>(null)
const cardKey = ref(0)

const playable = computed(() => Boolean(progress.value?.playable))

function onLoaded(data: any) {
  progress.value = data
  emit('loaded', data)
}

function onReady(data: any) {
  progress.value = data
  emit('ready', data)
}

function onFailed(data: any) {
  progress.value = data
  emit('failed', data)
}

watch(
  () => [props.videoId, props.refreshKey],
  () => {
    progress.value = null
    cardKey.value++
  }
)
</script>

<template>
  <div class="playback-gate">
    <slot v-if="playable" :progress="progress">
      <div class="ready">
        视频已就绪，可渲染播放器。
      </div>
    </slot>

    <div v-else class="blocked">
      <TranscodeStatusCard
        :key="cardKey"
        :video-id="props.videoId"
        auto-refresh
        @loaded="onLoaded"
        @ready="onReady"
        @failed="onFailed"
      />

      <div v-if="progress" class="hint">
        <p v-if="progress.suggestedAction === 'WAIT'">
          视频正在处理，请稍后刷新。
        </p>
        <p v-else-if="progress.suggestedAction === 'RERUN'">
          转码成功但 HLS 文件未就绪，建议先尝试播放就绪同步；如果仍不可播，再到管理端点击“重跑”。
        </p>
        <p v-else-if="progress.suggestedAction === 'RETRY_OR_RERUN'">
          转码失败或已取消，建议在管理端点击“重试”或“重跑”。
        </p>
        <p v-else>
          暂时无法播放，请检查转码任务和播放就绪状态。
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.playback-gate {
  width: 100%;
}

.ready {
  border: 1px solid #dcfce7;
  background: #f0fdf4;
  color: #166534;
  border-radius: 16px;
  padding: 18px;
}

.blocked {
  border: 1px dashed #e5e7eb;
  border-radius: 18px;
  padding: 8px;
}

.hint {
  margin-top: 12px;
  padding: 12px;
  border-radius: 14px;
  background: #f9fafb;
  color: #374151;
}
</style>
