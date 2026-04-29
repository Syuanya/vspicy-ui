<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listArticles } from '../api/article'

const articles = ref<any[]>([])
const status = ref('')
const keyword = ref('')
const loading = ref(false)
const message = ref('')

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'DRAFT', label: '草稿' },
  { value: 'PENDING', label: '待审核' },
  { value: 'AUDITING', label: '审核中' },
  { value: 'PUBLISHED', label: '已发布' },
  { value: 'REJECTED', label: '已驳回' }
]

const filteredArticles = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  if (!key) return articles.value
  return articles.value.filter((article) => {
    return [article.title, article.summary, article.status]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(key))
  })
})

function statusLabel(value?: string) {
  return statusOptions.find((item) => item.value === value)?.label || value || '-'
}

async function load() {
  loading.value = true
  message.value = ''
  try {
    const params: any = { limit: 100 }
    if (status.value) params.status = status.value
    const res: any = await listArticles(params)
    if (res.code === 0) {
      articles.value = res.data || []
    } else {
      message.value = res.message || '文章列表加载失败'
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '文章列表加载失败'
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
        <h2>文章广场</h2>
        <p>浏览文章、草稿和审核后的内容，也可以继续创作并提交审核。</p>
      </div>
      <RouterLink class="button secondary" to="/article/editor">写文章</RouterLink>
    </div>

    <div class="toolbar">
      <input v-model="keyword" class="input search-input" placeholder="搜索标题、摘要或状态" />
      <select v-model="status" class="input compact" @change="load">
        <option v-for="item in statusOptions" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
      <button class="button" :disabled="loading" @click="load">{{ loading ? '加载中...' : '刷新' }}</button>
    </div>

    <p v-if="message" class="error">{{ message }}</p>

    <div class="article-list">
      <article v-for="article in filteredArticles" :key="article.id" class="article-row">
        <div>
          <h3>{{ article.title || `文章 #${article.id}` }}</h3>
          <p>{{ article.summary || '暂无摘要' }}</p>
          <small>{{ statusLabel(article.status) }} / 浏览 {{ article.viewCount || 0 }} / 点赞 {{ article.likeCount || 0 }}</small>
        </div>
        <RouterLink class="link-button" :to="`/article/${article.id}`">查看</RouterLink>
      </article>
    </div>

    <p v-if="loading" class="empty">正在加载文章...</p>
    <p v-else-if="filteredArticles.length === 0" class="empty">暂无匹配的文章。</p>
  </section>
</template>

<style scoped>
.page-head,
.toolbar,
.article-row {
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

.article-list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.article-row {
  justify-content: space-between;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
  background: #fff;
}

.article-row h3 {
  margin: 0 0 8px;
}

.article-row p {
  color: #4b5563;
  line-height: 1.6;
}

.article-row small,
.empty {
  color: #6b7280;
}

.link-button {
  color: #2563eb;
  white-space: nowrap;
}

.secondary {
  background: #111827;
}

.error {
  color: #dc2626;
}

@media (max-width: 640px) {
  .article-row {
    display: grid;
  }
}
</style>
