<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getArticle } from '../../api/article'
import {
  createComment,
  getInteractionStatus,
  listComments,
  recordBehavior,
  toggleFavorite,
  toggleLike
} from '../../api/interaction'

const route = useRoute()
const detail = ref<any>(null)
const loading = ref(false)
const error = ref('')
const status = ref<any>(null)
const comments = ref<any[]>([])
const commentContent = ref('')

async function load() {
  const articleId = Number(route.params.id)
  if (!articleId) {
    error.value = 'articleId 不合法'
    return
  }

  loading.value = true
  try {
    const res: any = await getArticle(articleId)
    if (res.code === 0) {
      detail.value = res.data
      await recordBehavior({
        userId: 1,
        targetId: articleId,
        targetType: 'ARTICLE',
        actionType: 'VIEW'
      })
      await loadInteraction()
      await loadComments()
    } else {
      error.value = res.message || '加载失败'
    }
  } finally {
    loading.value = false
  }
}

async function loadInteraction() {
  const articleId = Number(route.params.id)
  const res: any = await getInteractionStatus({
    userId: 1,
    targetId: articleId,
    targetType: 'ARTICLE'
  })
  if (res.code === 0) {
    status.value = res.data
  }
}

async function loadComments() {
  const articleId = Number(route.params.id)
  const res: any = await listComments({
    contentId: articleId,
    contentType: 'ARTICLE',
    limit: 50
  })
  if (res.code === 0) {
    comments.value = res.data || []
  }
}

async function like() {
  const articleId = Number(route.params.id)
  const res: any = await toggleLike({
    userId: 1,
    targetId: articleId,
    targetType: 'ARTICLE'
  })
  if (res.code === 0) {
    status.value = res.data
  }
}

async function favorite() {
  const articleId = Number(route.params.id)
  const res: any = await toggleFavorite({
    userId: 1,
    targetId: articleId,
    targetType: 'ARTICLE'
  })
  if (res.code === 0) {
    status.value = res.data
  }
}

async function submitComment() {
  const articleId = Number(route.params.id)
  if (!commentContent.value.trim()) {
    alert('请输入评论')
    return
  }

  const res: any = await createComment({
    userId: 1,
    contentId: articleId,
    contentType: 'ARTICLE',
    content: commentContent.value
  })
  if (res.code === 0) {
    commentContent.value = ''
    await loadComments()
    await loadInteraction()
  } else {
    alert(res.message || '评论失败')
  }
}

onMounted(load)
</script>

<template>
  <section class="card">
    <p v-if="loading">加载中...</p>
    <p v-if="error" style="color: #ef4444;">{{ error }}</p>

    <template v-if="detail">
      <h1>{{ detail.article.title }}</h1>
      <p style="color: #6b7280;">状态：{{ detail.article.status }} | 版本：{{ detail.versionNo }}</p>
      <p v-if="detail.article.summary">{{ detail.article.summary }}</p>

      <div style="display: flex; gap: 12px; margin: 16px 0;">
        <button class="button" @click="like">
          {{ status?.liked ? '已点赞' : '点赞' }} {{ status?.likeCount ?? 0 }}
        </button>
        <button class="button" @click="favorite">
          {{ status?.favorited ? '已收藏' : '收藏' }} {{ status?.favoriteCount ?? 0 }}
        </button>
        <span style="align-self: center;">评论 {{ status?.commentCount ?? 0 }}</span>
      </div>

      <div class="article-content" v-html="detail.content"></div>

      <div class="card" style="margin-top: 24px; background: #f9fafb;">
        <h3>评论</h3>
        <textarea v-model="commentContent" class="input" style="min-height: 90px;" placeholder="写下你的评论..."></textarea>
        <button class="button" @click="submitComment">发表评论</button>

        <div style="margin-top: 16px;">
          <div v-for="comment in comments" :key="comment.id" style="border-top: 1px solid #e5e7eb; padding: 12px 0;">
            <strong>用户 {{ comment.userId }}</strong>
            <p>{{ comment.content }}</p>
            <small>{{ comment.createdAt }}</small>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.article-content {
  line-height: 1.9;
  font-size: 16px;
}

.article-content :deep(img) {
  max-width: 100%;
}
</style>
