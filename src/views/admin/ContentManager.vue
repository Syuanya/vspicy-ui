<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listArticles, submitArticle } from '../../api/article'
import { listVideos, updateVideoStatus } from '../../api/video'

const articles = ref<any[]>([])
const videos = ref<any[]>([])
const status = ref('')
const message = ref('')
const operating = ref('')

const articleStatuses = ['DRAFT', 'PENDING', 'AUDITING', 'PUBLISHED', 'REJECTED']
const videoStatuses = ['UPLOADING', 'UPLOADED', 'MERGING', 'TRANSCODING', 'PUBLISHED', 'HIDDEN', 'OFFLINE', 'FAILED']

function labelStatus(value: string) {
  const map: Record<string, string> = {
    DRAFT: '草稿',
    PENDING: '待审核',
    AUDITING: '审核中',
    PUBLISHED: '已发布',
    REJECTED: '已驳回',
    UPLOADING: '上传中',
    UPLOADED: '已上传',
    MERGING: '合并中',
    TRANSCODING: '转码中',
    HIDDEN: '隐藏',
    OFFLINE: '下架',
    FAILED: '失败'
  }
  return map[value] || value
}

async function load() {
  message.value = ''
  try {
    const params: any = { limit: 50 }
    if (status.value) params.status = status.value
    const [articleRes, videoRes]: any[] = await Promise.all([
      listArticles(params),
      listVideos(params)
    ])
    if (articleRes.code === 0) articles.value = articleRes.data || []
    if (videoRes.code === 0) videos.value = videoRes.data || []
    if (articleRes.code !== 0 || videoRes.code !== 0) {
      message.value = articleRes.message || videoRes.message || '内容数据加载失败'
    }
  } catch (error: any) {
    message.value = error?.message || '内容数据加载失败'
  }
}

async function submitForAudit(articleId: number) {
  operating.value = `article-${articleId}`
  message.value = ''
  try {
    const res: any = await submitArticle(articleId)
    if (res.code !== 0) {
      message.value = res.message || '文章提交审核失败'
      return
    }
    await load()
  } catch (error: any) {
    message.value = error?.message || '文章提交审核失败'
  } finally {
    operating.value = ''
  }
}

async function changeVideoStatus(videoId: number, nextStatus: string) {
  if (!nextStatus) return
  operating.value = `video-${videoId}`
  message.value = ''
  try {
    const res: any = await updateVideoStatus(videoId, nextStatus)
    if (res.code !== 0) {
      message.value = res.message || '视频状态更新失败'
      return
    }
    await load()
  } catch (error: any) {
    message.value = error?.message || '视频状态更新失败'
  } finally {
    operating.value = ''
  }
}

onMounted(load)
</script>

<template>
  <section class="card">
    <div class="page-head">
      <div>
        <h2>内容管理</h2>
        <p>聚合文章与视频内容，提供审核流转、发布状态和运营处理入口。</p>
      </div>
      <div class="filters">
        <select v-model="status" class="input compact">
          <option value="">全部状态</option>
          <option v-for="item in [...articleStatuses, 'HIDDEN', 'OFFLINE', 'FAILED']" :key="item" :value="item">
            {{ labelStatus(item) }}
          </option>
        </select>
        <button class="button" @click="load">刷新</button>
      </div>
    </div>

    <p v-if="message" class="error">{{ message }}</p>

    <div class="two-column">
      <div class="panel">
        <div class="panel-head">
          <h3>文章内容</h3>
          <RouterLink class="text-button" to="/admin/audit/tasks">审核队列</RouterLink>
        </div>
        <div v-for="article in articles" :key="article.id" class="content-row">
          <RouterLink :to="`/article/${article.id}`" class="row-main">
            <span>{{ article.title || `文章 #${article.id}` }}</span>
            <small>{{ labelStatus(article.status) }}</small>
          </RouterLink>
          <div class="row-actions">
            <button
              v-if="article.status === 'DRAFT' || article.status === 'REJECTED'"
              class="text-button"
              :disabled="operating === `article-${article.id}`"
              @click="submitForAudit(article.id)"
            >
              提交审核
            </button>
            <RouterLink v-if="article.status === 'PENDING' || article.status === 'AUDITING'" class="text-button" to="/admin/audit/tasks">
              去审核
            </RouterLink>
          </div>
        </div>
        <p v-if="articles.length === 0" class="empty">暂无文章。</p>
      </div>

      <div class="panel">
        <div class="panel-head">
          <h3>视频内容</h3>
          <span class="muted">发布、隐藏、下架、失败标记</span>
        </div>
        <div v-for="video in videos" :key="video.id" class="content-row">
          <RouterLink :to="`/video/${video.id}`" class="row-main">
            <span>{{ video.title || `视频 #${video.id}` }}</span>
            <small>{{ labelStatus(video.status) }}</small>
          </RouterLink>
          <select
            class="inline-select"
            :value="video.status"
            :disabled="operating === `video-${video.id}`"
            @change="changeVideoStatus(video.id, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="item in videoStatuses" :key="item" :value="item">
              {{ labelStatus(item) }}
            </option>
          </select>
        </div>
        <p v-if="videos.length === 0" class="empty">暂无视频。</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page-head,
.filters,
.panel-head,
.row-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.page-head,
.panel-head {
  justify-content: space-between;
}

.compact {
  width: 160px;
  margin: 0;
}

.two-column {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
}

.content-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid #f3f4f6;
}

.row-main {
  display: grid;
  gap: 4px;
  color: #2563eb;
}

.row-main small,
.empty,
.muted {
  color: #6b7280;
}

.text-button {
  border: 0;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
}

.text-button:disabled {
  color: #94a3b8;
  cursor: wait;
}

.inline-select {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 6px 8px;
  background: #fff;
}

.error {
  color: #dc2626;
}

@media (max-width: 720px) {
  .content-row {
    grid-template-columns: 1fr;
  }
}
</style>
