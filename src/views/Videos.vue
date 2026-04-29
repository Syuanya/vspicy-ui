<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listVideos } from '../api/video'

const videos = ref<any[]>([])
const status = ref('')
const keyword = ref('')
const loading = ref(false)
const message = ref('')

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'PUBLISHED', label: '已发布' },
  { value: 'UPLOADED', label: '已上传' },
  { value: 'TRANSCODING', label: '转码中' },
  { value: 'HIDDEN', label: '隐藏' },
  { value: 'OFFLINE', label: '已下架' },
  { value: 'FAILED', label: '失败' }
]

const filteredVideos = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  if (!key) return videos.value
  return videos.value.filter((video) => {
    return [video.title, video.description, video.status]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(key))
  })
})

function durationText(seconds?: number) {
  if (!seconds) return '-'
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function statusLabel(value?: string) {
  return statusOptions.find((item) => item.value === value)?.label || value || '-'
}

async function load() {
  loading.value = true
  message.value = ''
  try {
    const params: any = { limit: 80 }
    if (status.value) params.status = status.value
    const res: any = await listVideos(params)
    if (res.code === 0) {
      videos.value = res.data || []
    } else {
      message.value = res.message || '视频列表加载失败'
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '视频列表加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="card">
    <div class="page-head">
      <div>
        <h2>视频广场</h2>
        <p>浏览已上传的视频内容，进入播放页检查播放链路和视频详情。</p>
      </div>
      <RouterLink class="button secondary" to="/video/upload">上传视频</RouterLink>
    </div>

    <div class="toolbar">
      <input v-model="keyword" class="input search-input" placeholder="搜索标题、简介或状态" />
      <select v-model="status" class="input compact" @change="load">
        <option v-for="item in statusOptions" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
      <button class="button" :disabled="loading" @click="load">{{ loading ? '加载中...' : '刷新' }}</button>
    </div>

    <p v-if="message" class="error">{{ message }}</p>

    <div class="content-grid">
      <article v-for="video in filteredVideos" :key="video.id" class="content-card">
        <RouterLink :to="`/video/${video.id}`" class="cover">
          <img v-if="video.coverUrl" :src="video.coverUrl" alt="" />
          <span v-else>VSpicy</span>
        </RouterLink>
        <div class="card-body">
          <h3>{{ video.title || `视频 #${video.id}` }}</h3>
          <p>{{ video.description || '暂无简介' }}</p>
          <div class="meta">
            <span>{{ statusLabel(video.status) }}</span>
            <span>{{ durationText(video.durationSeconds) }}</span>
          </div>
          <RouterLink class="link-button" :to="`/video/${video.id}`">打开播放页</RouterLink>
        </div>
      </article>
    </div>

    <p v-if="loading" class="empty">正在加载视频...</p>
    <p v-else-if="filteredVideos.length === 0" class="empty">暂无匹配的视频。</p>
  </section>
</template>

<style scoped>
.page-head,
.toolbar,
.meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-head {
  justify-content: space-between;
  flex-wrap: wrap;
}

.toolbar {
  flex-wrap: wrap;
  margin-top: 18px;
}

.search-input {
  max-width: 320px;
}

.compact {
  width: 160px;
  margin: 0;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.content-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.cover {
  aspect-ratio: 16 / 9;
  background: #111827;
  color: #fff;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-body {
  padding: 14px;
}

.card-body h3 {
  margin: 0 0 8px;
}

.card-body p {
  min-height: 44px;
  color: #4b5563;
  line-height: 1.6;
}

.meta {
  justify-content: space-between;
  color: #6b7280;
  font-size: 13px;
}

.link-button {
  display: inline-flex;
  margin-top: 12px;
  color: #2563eb;
}

.secondary {
  background: #111827;
}

.error {
  color: #dc2626;
}

.empty {
  color: #6b7280;
}
</style>
