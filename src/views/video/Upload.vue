<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { completeUpload, createUploadTask, uploadVideoChunk } from '../../api/video'
import TranscodeStatusCard from '../../components/video/TranscodeStatusCard.vue'

const router = useRouter()
const file = ref<File | null>(null)
const logs = ref<string[]>([])
const uploading = ref(false)
const chunkSize = 2 * 1024 * 1024
const result = ref<any>(null)
const transcodeReady = ref(false)
const transcodeProgress = ref<any>(null)

function addLog(message: string) {
  logs.value.unshift(`[${new Date().toLocaleTimeString()}] ${message}`)
}

async function sha256(blob: Blob) {
  const buffer = await blob.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  file.value = input.files?.[0] || null
  result.value = null
  transcodeReady.value = false
  transcodeProgress.value = null
  logs.value = []
}

async function startUpload() {
  if (!file.value) {
    alert('请选择视频文件')
    return
  }

  uploading.value = true
  transcodeReady.value = false
  transcodeProgress.value = null

  try {
    addLog('计算完整文件 SHA-256...')
    const fileHash = await sha256(file.value)

    addLog('创建上传任务...')
    const taskRes: any = await createUploadTask({
      userId: 1,
      title: file.value.name,
      fileName: file.value.name,
      fileHash,
      fileSize: file.value.size,
      chunkSize
    })

    if (taskRes.code !== 0) {
      alert(taskRes.message)
      return
    }

    const task = taskRes.data
    addLog(`上传任务创建成功 taskId=${task.taskId}, videoId=${task.videoId}, chunkTotal=${task.chunkTotal}`)

    for (let i = 0; i < task.chunkTotal; i++) {
      if (task.uploadedChunkIndexes?.includes?.(i)) {
        addLog(`分片 ${i} 已存在，跳过`)
        continue
      }

      const start = i * chunkSize
      const end = Math.min(file.value.size, start + chunkSize)
      const chunk = file.value.slice(start, end)
      const chunkHash = await sha256(chunk)

      addLog(`上传分片 ${i + 1}/${task.chunkTotal}`)
      await uploadVideoChunk(task.taskId, i, chunk, chunkHash)
    }

    addLog('全部分片上传完成，提交后台转码任务...')
    const completeRes: any = await completeUpload(task.taskId)
    if (completeRes.code !== 0) {
      alert(completeRes.message)
      return
    }

    result.value = completeRes.data
    transcodeReady.value = false
    addLog(`任务提交成功，videoId=${result.value.videoId}, status=${result.value.status}`)
    addLog('转码状态卡片已启动自动刷新，HLS 就绪后可进入播放页。')
  } catch (e: any) {
    addLog(e?.message || '上传失败')
    alert(e?.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

function onTranscodeLoaded(data: any) {
  transcodeProgress.value = data
  if (result.value) {
    result.value.transcodeStatus = data.status
  }
}

function onTranscodeReady(data: any) {
  transcodeProgress.value = data
  transcodeReady.value = true
  if (result.value) {
    result.value.status = 'PUBLISHED'
    result.value.localHlsUrl = data.hlsManifestKey || result.value.localHlsUrl
  }
  addLog(`HLS 已就绪，可以播放。manifest=${data.hlsManifestKey || '-'}`)
}

function onTranscodeFailed(data: any) {
  transcodeProgress.value = data
  if (result.value) {
    result.value.status = 'TRANSCODE_FAILED'
  }
  addLog(`转码失败：${data.errorMessage || data.lastDispatchError || '未知错误'}`)
}

function goPlayer() {
  if (result.value?.videoId) {
    router.push(`/video/${result.value.videoId}`)
  }
}
</script>

<template>
  <section class="card">
    <h2>视频分片上传 + 异步 HLS 转码</h2>
    <p>当前版本：SHA-256、分片上传、合并、后台异步转码；上传完成后由转码状态卡片自动刷新。</p>

    <input type="file" accept="video/*" @change="onFileChange" />
    <div style="margin-top: 16px;">
      <button class="button" :disabled="uploading" @click="startUpload">
        {{ uploading ? '处理中...' : '开始上传' }}
      </button>
    </div>

    <div v-if="result" class="card" style="margin-top: 20px; background: #f9fafb;">
      <h3>处理结果</h3>
      <p><strong>videoId:</strong> {{ result.videoId }}</p>
      <p><strong>upload status:</strong> {{ result.status }}</p>
      <p v-if="result.transcodeStatus"><strong>transcode status:</strong> {{ result.transcodeStatus }}</p>
      <p><strong>originPath:</strong> {{ result.originPath || '-' }}</p>
      <p v-if="result.localHlsUrl"><strong>localHlsUrl / manifest:</strong> {{ result.localHlsUrl }}</p>

      <button class="button" :disabled="!transcodeReady" @click="goPlayer">
        {{ transcodeReady ? '播放视频' : '等待 HLS 就绪' }}
      </button>
    </div>

    <TranscodeStatusCard
      v-if="result?.videoId"
      :video-id="Number(result.videoId)"
      auto-refresh
      @loaded="onTranscodeLoaded"
      @ready="onTranscodeReady"
      @failed="onTranscodeFailed"
    />

    <div style="margin-top: 24px;">
      <h3>日志</h3>
      <pre style="white-space: pre-wrap; background: #111827; color: white; padding: 16px; border-radius: 12px; min-height: 220px;">{{ logs.join('\n') }}</pre>
    </div>
  </section>
</template>
