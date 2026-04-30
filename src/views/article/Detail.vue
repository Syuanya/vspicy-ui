<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getArticle } from '../../api/article'
import { isSuccessResponse } from '../../api/apiError'
import { getCurrentUserId } from '../../api/http'
import {
  createComment,
  getInteractionStatus,
  listComments,
  recordBehavior,
  toggleFavorite,
  toggleLike
} from '../../api/interaction'
import ApiErrorBanner from '../../components/common/ApiErrorBanner.vue'

const route = useRoute()
const detail = ref<any>(null)
const loading = ref(false)
const error = ref<unknown | null>(null)
const status = ref<any>(null)
const comments = ref<any[]>([])
const commentContent = ref('')
const commentSubmitting = ref(false)

function articleId() {
  return Number(route.params.id)
}

function currentUserId() {
  return getCurrentUserId() || 1
}

async function load() {
  if (!articleId()) {
    error.value = 'articleId 不合法'
    return
  }

  loading.value = true
  error.value = null
  try {
    const res: any = await getArticle(articleId())
    if (isSuccessResponse(res)) {
      detail.value = res.data
      await recordBehavior({
        userId: currentUserId(),
        targetId: articleId(),
        targetType: 'ARTICLE',
        actionType: 'VIEW'
      })
      await loadInteraction()
      await loadComments()
    } else {
      error.value = res
    }
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
}

async function loadInteraction() {
  const res: any = await getInteractionStatus({
    userId: currentUserId(),
    targetId: articleId(),
    targetType: 'ARTICLE'
  })
  if (isSuccessResponse(res)) {
    status.value = res.data
  }
}

async function loadComments() {
  const res: any = await listComments({
    contentId: articleId(),
    contentType: 'ARTICLE',
    limit: 50
  })
  if (isSuccessResponse(res)) {
    comments.value = res.data || []
  }
}

async function like() {
  const res: any = await toggleLike({
    userId: currentUserId(),
    targetId: articleId(),
    targetType: 'ARTICLE'
  })
  if (isSuccessResponse(res)) {
    status.value = res.data
  } else {
    error.value = res
  }
}

async function favorite() {
  const res: any = await toggleFavorite({
    userId: currentUserId(),
    targetId: articleId(),
    targetType: 'ARTICLE'
  })
  if (isSuccessResponse(res)) {
    status.value = res.data
  } else {
    error.value = res
  }
}

async function submitComment() {
  if (!commentContent.value.trim()) {
    error.value = '请输入评论'
    return
  }

  commentSubmitting.value = true
  error.value = null
  try {
    const res: any = await createComment({
      userId: currentUserId(),
      contentId: articleId(),
      contentType: 'ARTICLE',
      content: commentContent.value.trim()
    })
    if (isSuccessResponse(res)) {
      commentContent.value = ''
      await loadComments()
      await loadInteraction()
    } else {
      error.value = res
    }
  } catch (e) {
    error.value = e
  } finally {
    commentSubmitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="detail-page">
    <p v-if="loading" class="loading">加载中...</p>
    <ApiErrorBanner :error="error" @close="error = null" />

    <article v-if="detail" class="article-card">
      <header>
        <h1>{{ detail.article.title }}</h1>
        <p class="meta">状态：{{ detail.article.status }} / 版本：{{ detail.versionNo }}</p>
        <p v-if="detail.article.summary" class="summary">{{ detail.article.summary }}</p>
      </header>

      <div class="interaction-bar">
        <button class="button" @click="like">
          {{ status?.liked ? '已点赞' : '点赞' }} {{ status?.likeCount ?? 0 }}
        </button>
        <button class="button secondary" @click="favorite">
          {{ status?.favorited ? '已收藏' : '收藏' }} {{ status?.favoriteCount ?? 0 }}
        </button>
        <span>评论 {{ status?.commentCount ?? 0 }}</span>
      </div>

      <div class="article-content" v-html="detail.content"></div>
    </article>

    <section v-if="detail" class="comment-panel">
      <h2>评论</h2>
      <textarea v-model="commentContent" class="input textarea" placeholder="写下你的评论..."></textarea>
      <button class="button" :disabled="commentSubmitting" @click="submitComment">
        {{ commentSubmitting ? '发表中...' : '发表评论' }}
      </button>

      <div class="comment-list">
        <div v-if="comments.length === 0" class="empty">暂无评论</div>
        <article v-for="comment in comments" :key="comment.id" class="comment-item">
          <strong>用户 {{ comment.userId }}</strong>
          <p>{{ comment.content }}</p>
          <small>{{ comment.createdAt }}</small>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.detail-page {
  display: grid;
  gap: 16px;
}

.article-card,
.comment-panel {
  padding: 22px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.article-card h1 {
  margin: 0 0 8px;
  font-size: 32px;
}

.meta,
.summary,
.loading {
  color: #6b7280;
}

.interaction-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin: 16px 0;
}

.button.secondary {
  background: #2563eb;
}

.article-content {
  line-height: 1.9;
  font-size: 16px;
}

.article-content :deep(img) {
  max-width: 100%;
}

.textarea {
  min-height: 90px;
  padding-top: 10px;
}

.comment-list {
  margin-top: 16px;
}

.comment-item {
  border-top: 1px solid #e5e7eb;
  padding: 12px 0;
}

.empty {
  padding: 16px;
  border-radius: 8px;
  background: #f9fafb;
  color: #6b7280;
}
</style>
