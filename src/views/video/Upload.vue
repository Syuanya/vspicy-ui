<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { completeUpload, createUploadTask, uploadVideoChunk } from '../../api/video'
import { formatApiError, isSuccessResponse } from '../../api/apiError'
import { getCurrentUserId } from '../../api/http'
import ApiErrorBanner from '../../components/common/ApiErrorBanner.vue'
import TranscodeStatusCard from '../../components/video/TranscodeStatusCard.vue'

const router = useRouter()
const file = ref<File | null>(null)
const logs = ref<string[]>([])
const uploading = ref(false)
const chunkSize = 2 * 1024 * 1024
const result = ref<any>(null)
const transcodeReady = ref(false)
const transcodeProgress = ref<any>(null)
const error = ref<unknown | null>(null)
const uploadedChunks = ref(0)
const totalChunks = ref(0)

const uploadPercent = computed(() => {
  if (!totalChunks.value) return 0
  return Math.round((uploadedChunks.value / totalChunks.value) * 100)
})

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
  error.value = null
  transcodeReady.value = false
  transcodeProgress.value = null
  uploadedChunks.value = 0
  totalChunks.value = 0
  logs.value = []
}

async function startUpload() {
  if (!file.value) {
    error.value = '请选择视频文件'
    return
  }

  uploading.value = true
  error.value = null
  uploadedChunks.value = 0
  totalChunks.value = 0
  transcodeReady.value = false
  transcodeProgress.value = null

  try {
    addLog('正在计算完整文件 SHA-256...')
    const fileHash = await sha256(file.value)

    addLog('正在创建上传任务...')
    const taskRes: any = await createUploadTask({
      userId: getCurrentUserId() || 1,
      title: file.value.name,
      fileName: file.value.name,
      fileHash,
      fileSize: file.value.size,
      chunkSize
    })

    if (!isSuccessResponse(taskRes)) {
      error.value = taskRes
      return
    }

    const task = taskRes.data
    totalChunks.value = task.chunkTotal || 0
    uploadedChunks.value = task.uploadedChunkIndexes?.length || 0
    addLog(`上传任务创建成功：taskId=${task.taskId}，videoId=${task.videoId}，分片数=${task.chunkTotal}`)

    for (let i = 0; i < task.chunkTotal; i++) {
      if (task.uploadedChunkIndexes?.includes?.(i)) {
        addLog(`分片 ${i + 1}/${task.chunkTotal} 已存在，跳过`)
        continue
      }

      const start = i * chunkSize
      const end = Math.min(file.value.size, start + chunkSize)
      const chunk = file.value.slice(start, end)
      const chunkHash = await sha256(chunk)

      addLog(`正在上传分片 ${i + 1}/${task.chunkTotal}`)
      const chunkRes: any = await uploadVideoChunk(task.taskId, i, chunk, chunkHash)
      if (!isSuccessResponse(chunkRes)) {
        error.value = chunkRes
        return
      }
      uploadedChunks.value += 1
    }

    addLog('全部分片上传完成，正在提交合并和转码任务...')
    const completeRes: any = await completeUpload(task.taskId)
    if (!isSuccessResponse(completeRes)) {
      error.value = completeRes
      return
    }

    result.value = completeRes.data
    transcodeReady.value = false
    addLog(`任务提交成功：videoId=${result.value.videoId}，status=${result.value.status}`)
    addLog('转码状态卡片已启动自动刷新，HLS 就绪后可以进入播放页。')
  } catch (e) {
    error.value = e
    addLog(formatApiError(e, '上传失败'))
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
  <section class="upload-page">
    <div class="hero">
      <div>
        <span class="eyebrow">视频创作</span>
        <h1>视频分片上传与 HLS 转码</h1>
        <p>上传大文件时会自动分片、校验、合并，并提交后台转码任务。</p>
      </div>
      <div class="progress-card">
        <span>上传进度</span>
        <strong>{{ uploadPercent }}%</strong>
      </div>
    </div>

    <ApiErrorBanner :error="error" @close="error = null" />

    <section class="panel">
      <label class="file-picker">
        <span>选择视频文件</span>
        <input type="file" accept="video/*" @change="onFileChange" />
      </label>
      <div v-if="file" class="file-meta">
        <strong>{{ file.name }}</strong>
        <span>{{ (file.size / 1024 / 1024).toFixed(2) }} MB</span>
      </div>
      <div class="progress">
        <span :style="{ width: uploadPercent + '%' }"></span>
      </div>
      <button class="button" :disabled="uploading" @click="startUpload">
        {{ uploading ? '处理中...' : '开始上传' }}
      </button>
    </section>

    <section v-if="result" class="panel result-panel">
      <h2>处理结果</h2>
      <p><strong>videoId:</strong> {{ result.videoId }}</p>
      <p><strong>上传状态:</strong> {{ result.status }}</p>
      <p v-if="result.transcodeStatus"><strong>转码状态:</strong> {{ result.transcodeStatus }}</p>
      <p><strong>源文件:</strong> {{ result.originPath || '-' }}</p>
      <p v-if="result.localHlsUrl"><strong>HLS manifest:</strong> {{ result.localHlsUrl }}</p>
      <button class="button secondary" :disabled="!transcodeReady" @click="goPlayer">
        {{ transcodeReady ? '播放视频' : '等待 HLS 就绪' }}
      </button>
    </section>

    <TranscodeStatusCard
      v-if="result?.videoId"
      :video-id="Number(result.videoId)"
      auto-refresh
      @loaded="onTranscodeLoaded"
      @ready="onTranscodeReady"
      @failed="onTranscodeFailed"
    />

    <section class="panel">
      <h2>处理日志</h2>
      <pre>{{ logs.join('\n') || '等待上传任务开始...' }}</pre>
    </section>
  </section>
</template>

<style scoped>
.upload-page {
  display: grid;
  gap: 16px;
}

.hero,
.panel {
  border-radius: 8px;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 24px;
  background: #111827;
  color: #fff;
}

.hero h1 {
  margin: 8px 0;
  font-size: 30px;
}

.hero p {
  color: #d1d5db;
}

.eyebrow {
  color: #93c5fd;
  font-weight: 700;
}

.progress-card {
  width: 150px;
  padding: 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
}

.progress-card span,
.file-meta span {
  display: block;
  color: #6b7280;
}

.progress-card span {
  color: #d1d5db;
}

.progress-card strong {
  display: block;
  margin-top: 8px;
  font-size: 28px;
}

.panel {
  padding: 18px;
  border: 1px solid #e5e7eb;
  background: #fff;
}

.panel h2 {
  margin-top: 0;
  font-size: 18px;
}

.file-picker {
  display: grid;
  gap: 8px;
  font-weight: 700;
}

.file-picker input {
  padding: 12px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
}

.file-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}

.progress {
  height: 10px;
  margin: 16px 0;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
}

.progress span {
  display: block;
  height: 100%;
  background: #2563eb;
  transition: width 0.2s ease;
}

.button.secondary {
  background: #2563eb;
}

pre {
  min-height: 220px;
  margin: 0;
  padding: 16px;
  border-radius: 8px;
  background: #111827;
  color: white;
  white-space: pre-wrap;
}

@media (max-width: 760px) {
  .hero,
  .file-meta {
    flex-direction: column;
  }

  .progress-card {
    width: auto;
  }
}
</style>
