<script setup lang="ts">
import Hls from 'hls.js'
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getPlayInfo } from '../../api/video'
import { recordBehavior } from '../../api/interaction'
import VideoPlaybackGate from '../../components/video/VideoPlaybackGate.vue'
import PlaybackReadinessPanel from '../../components/video/PlaybackReadinessPanel.vue'

const route = useRoute()
const videoId = computed(() => Number(route.params.id))
const videoRef = ref<HTMLVideoElement | null>(null)
const loading = ref(false)
const error = ref('')
const playInfo = ref<any>(null)
const progress = ref<any>(null)
const readiness = ref<any>(null)
const playerInitialized = ref(false)
const gateRefreshKey = ref(0)
let hls: Hls | null = null
let playStartedAt = 0

const showReadinessPanel = computed(() => {
  if (!videoId.value) return false
  if (!progress.value) return true
  return !progress.value.playable
})

async function initPlayer() {
  if (!videoId.value) {
    error.value = 'videoId 不合法'
    return
  }

  if (playerInitialized.value) {
    return
  }

  loading.value = true
  error.value = ''

  try {
    const res: any = await getPlayInfo(videoId.value)
    if (res.code !== 0) {
      error.value = res.message || '获取播放信息失败'
      return
    }

    playInfo.value = res.data
    const src = playInfo.value.localHlsUrl || playInfo.value.minioHlsUrl

    if (!src) {
      error.value = 'HLS 地址未生成。可尝试下方“播放就绪自愈”正式同步。'
      return
    }

    await nextTick()

    if (!videoRef.value) {
      error.value = '播放器未就绪'
      return
    }

    videoRef.value.addEventListener('play', onPlay)
    videoRef.value.addEventListener('pause', onPauseOrEnded)
    videoRef.value.addEventListener('ended', onPauseOrEnded)

    if (videoRef.value.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.value.src = src
      playerInitialized.value = true
      return
    }

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false
      })
      hls.loadSource(src)
      hls.attachMedia(videoRef.value)
      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error(data)
        if (data.fatal) {
          error.value = `HLS 播放失败: ${data.type} / ${data.details}`
        }
      })
      playerInitialized.value = true
    } else {
      error.value = '当前浏览器不支持 HLS 播放'
    }
  } finally {
    loading.value = false
  }
}

async function onGateReady(data: any) {
  progress.value = data
  await nextTick()
  await initPlayer()
}

function onGateLoaded(data: any) {
  progress.value = data
}

function onGateFailed(data: any) {
  progress.value = data
}

function onReadinessLoaded(data: any) {
  readiness.value = data
}

async function onReadinessSynced(data: any) {
  readiness.value = data
  error.value = ''
  destroyPlayer()
  playInfo.value = null
  playerInitialized.value = false
  gateRefreshKey.value++
}

function destroyPlayer() {
  if (videoRef.value) {
    videoRef.value.removeEventListener('play', onPlay)
    videoRef.value.removeEventListener('pause', onPauseOrEnded)
    videoRef.value.removeEventListener('ended', onPauseOrEnded)
    videoRef.value.removeAttribute('src')
    videoRef.value.load()
  }

  if (hls) {
    hls.destroy()
    hls = null
  }
}

async function reloadPlayback() {
  destroyPlayer()
  playInfo.value = null
  progress.value = null
  readiness.value = null
  playerInitialized.value = false
  error.value = ''
  gateRefreshKey.value++
}

async function onPlay() {
  playStartedAt = Date.now()
  await recordBehavior({
    userId: 1,
    targetId: videoId.value,
    targetType: 'VIDEO',
    actionType: 'PLAY'
  })
}

async function onPauseOrEnded() {
  if (!playStartedAt) return
  const duration = Math.max(1, Math.floor((Date.now() - playStartedAt) / 1000))
  playStartedAt = 0
  await recordBehavior({
    userId: 1,
    targetId: videoId.value,
    targetType: 'VIDEO',
    actionType: 'PLAY_DURATION',
    durationSeconds: duration
  })
}

onBeforeUnmount(() => {
  destroyPlayer()
})
</script>

<template>
  <section class="card">
    <div class="top">
      <div>
        <h2>视频播放</h2>
        <p>先检查转码/HLS 状态，HLS 就绪后再初始化播放器。</p>
      </div>
      <button class="button" @click="reloadPlayback">重新检查</button>
    </div>

    <p v-if="loading">加载中...</p>
    <p v-if="error" style="color: #ef4444;">{{ error }}</p>
    <p v-if="!videoId" style="color: #ef4444;">videoId 不合法</p>

    <VideoPlaybackGate
      v-else
      :video-id="videoId"
      :refresh-key="gateRefreshKey"
      @loaded="onGateLoaded"
      @ready="onGateReady"
      @failed="onGateFailed"
    >
      <video
        ref="videoRef"
        controls
        style="width: 100%; max-height: 640px; background: #000; border-radius: 16px;"
      ></video>
    </VideoPlaybackGate>

    <PlaybackReadinessPanel
      v-if="showReadinessPanel"
      :video-id="videoId"
      @loaded="onReadinessLoaded"
      @synced="onReadinessSynced"
    />

    <div v-if="playInfo" class="card" style="margin-top: 20px; background: #f9fafb;">
      <h3>{{ playInfo.video.title }}</h3>
      <p><strong>videoId:</strong> {{ playInfo.video.id }}</p>
      <p><strong>status:</strong> {{ playInfo.video.status }}</p>
      <p><strong>localHlsUrl:</strong> {{ playInfo.localHlsUrl || '-' }}</p>
      <p><strong>minioHlsUrl:</strong> {{ playInfo.minioHlsUrl || '未公开或未生成' }}</p>
    </div>

    <div v-if="progress" class="card" style="margin-top: 20px; background: #f9fafb;">
      <h3>转码状态</h3>
      <p><strong>taskId:</strong> {{ progress.transcodeTaskId || '-' }}</p>
      <p><strong>status:</strong> {{ progress.status }}</p>
      <p><strong>hlsReady:</strong> {{ progress.hlsReady ? 'YES' : 'NO' }}</p>
      <p><strong>playable:</strong> {{ progress.playable ? 'YES' : 'NO' }}</p>
      <p><strong>suggestedAction:</strong> {{ progress.suggestedAction }}</p>
    </div>

    <div v-if="readiness" class="card" style="margin-top: 20px; background: #f9fafb;">
      <h3>播放就绪状态</h3>
      <p><strong>videoStatus:</strong> {{ readiness.videoStatus || '-' }}</p>
      <p><strong>hlsReady:</strong> {{ readiness.hlsReady ? 'YES' : 'NO' }}</p>
      <p><strong>playbackUrlPresent:</strong> {{ readiness.playbackUrlPresent ? 'YES' : 'NO' }}</p>
      <p><strong>suggestedAction:</strong> {{ readiness.suggestedAction }}</p>
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
</style>
