<script setup lang="ts">
import Hls from 'hls.js'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getPlayInfo } from '../../api/video'
import { recordBehavior } from '../../api/interaction'

const route = useRoute()
const videoRef = ref<HTMLVideoElement | null>(null)
const loading = ref(false)
const error = ref('')
const playInfo = ref<any>(null)
let hls: Hls | null = null
let playStartedAt = 0

async function initPlayer() {
  const videoId = Number(route.params.id)
  if (!videoId) {
    error.value = 'videoId 不合法'
    return
  }

  loading.value = true
  try {
    const res: any = await getPlayInfo(videoId)
    if (res.code !== 0) {
      error.value = res.message || '获取播放信息失败'
      return
    }

    playInfo.value = res.data
    const src = playInfo.value.localHlsUrl

    if (!videoRef.value) {
      return
    }

    videoRef.value.addEventListener('play', onPlay)
    videoRef.value.addEventListener('pause', onPauseOrEnded)
    videoRef.value.addEventListener('ended', onPauseOrEnded)

    if (videoRef.value.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.value.src = src
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
    } else {
      error.value = '当前浏览器不支持 HLS 播放'
    }
  } finally {
    loading.value = false
  }
}

async function onPlay() {
  playStartedAt = Date.now()
  const videoId = Number(route.params.id)
  await recordBehavior({
    userId: 1,
    targetId: videoId,
    targetType: 'VIDEO',
    actionType: 'PLAY'
  })
}

async function onPauseOrEnded() {
  if (!playStartedAt) return
  const duration = Math.max(1, Math.floor((Date.now() - playStartedAt) / 1000))
  playStartedAt = 0
  const videoId = Number(route.params.id)
  await recordBehavior({
    userId: 1,
    targetId: videoId,
    targetType: 'VIDEO',
    actionType: 'PLAY_DURATION',
    durationSeconds: duration
  })
}

onMounted(initPlayer)

onBeforeUnmount(() => {
  if (videoRef.value) {
    videoRef.value.removeEventListener('play', onPlay)
    videoRef.value.removeEventListener('pause', onPauseOrEnded)
    videoRef.value.removeEventListener('ended', onPauseOrEnded)
  }
  if (hls) {
    hls.destroy()
    hls = null
  }
})
</script>

<template>
  <section class="card">
    <h2>视频播放</h2>

    <p v-if="loading">加载中...</p>
    <p v-if="error" style="color: #ef4444;">{{ error }}</p>

    <video
      ref="videoRef"
      controls
      style="width: 100%; max-height: 640px; background: #000; border-radius: 16px;"
    ></video>

    <div v-if="playInfo" class="card" style="margin-top: 20px; background: #f9fafb;">
      <h3>{{ playInfo.video.title }}</h3>
      <p><strong>videoId:</strong> {{ playInfo.video.id }}</p>
      <p><strong>status:</strong> {{ playInfo.video.status }}</p>
      <p><strong>localHlsUrl:</strong> {{ playInfo.localHlsUrl }}</p>
      <p><strong>minioHlsUrl:</strong> {{ playInfo.minioHlsUrl || '未公开或未生成' }}</p>
    </div>
  </section>
</template>
