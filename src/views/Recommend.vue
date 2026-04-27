<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  clearRecommendCache,
  getHotRecommend,
  getRecommendCacheStats,
  getRecommendDebug,
  getRecommendFeed,
  recordRecommendExposure,
  recordRecommendFeedback
} from '../api/recommend'

const feed = ref<any[]>([])
const hot = ref<any[]>([])
const debug = ref<any>(null)
const cacheStats = ref<any>(null)
const targetType = ref('')
const loading = ref(false)
const message = ref('')
const requestId = ref(`rec-${Date.now()}-${Math.random().toString(16).slice(2)}`)

function detailUrl(item: any) {
  if (item.targetType === 'VIDEO') return `/video/${item.targetId}`
  if (item.targetType === 'ARTICLE') return `/article/${item.targetId}`
  return '/'
}

async function load() {
  loading.value = true
  message.value = ''
  requestId.value = `rec-${Date.now()}-${Math.random().toString(16).slice(2)}`

  try {
    const p1: any = await getRecommendFeed({
      userId: 1,
      limit: 20
    })

    const p2: any = await getHotRecommend({
      targetType: targetType.value || undefined,
      limit: 20
    })

    if (p1.code === 0) {
      feed.value = p1.data || []
      await expose(feed.value, 'HOME')
    } else {
      message.value = p1.message || '推荐加载失败'
    }

    if (p2.code === 0) {
      hot.value = p2.data || []
      await expose(hot.value, 'HOT')
    }

    await loadCacheStats()
  } finally {
    loading.value = false
  }
}

async function loadDebug() {
  const res: any = await getRecommendDebug(1)
  if (res.code === 0) {
    debug.value = res.data
  } else {
    message.value = res.message || '调试信息加载失败'
  }
}

async function loadCacheStats() {
  const res: any = await getRecommendCacheStats()
  if (res.code === 0) {
    cacheStats.value = res.data
  }
}

async function clearCache() {
  if (!confirm('确认清理所有推荐缓存？')) {
    return
  }
  const res: any = await clearRecommendCache()
  if (res.code === 0) {
    message.value = res.data
    await loadCacheStats()
  } else {
    message.value = res.message || '清理失败'
  }
}

async function expose(items: any[], scene: string) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    await recordRecommendExposure({
      userId: 1,
      targetId: item.targetId,
      targetType: item.targetType,
      scene,
      rankNo: i + 1,
      score: item.score,
      requestId: requestId.value
    })
  }
}

async function dislike(item: any, scene: string) {
  await recordRecommendFeedback({
    userId: 1,
    targetId: item.targetId,
    targetType: item.targetType,
    scene,
    feedbackType: 'DISLIKE',
    requestId: requestId.value
  })
  feed.value = feed.value.filter((x) => !(x.targetId === item.targetId && x.targetType === item.targetType))
  hot.value = hot.value.filter((x) => !(x.targetId === item.targetId && x.targetType === item.targetType))
}

onMounted(async () => {
  await load()
  await loadCacheStats()
})
</script>

<template>
  <section class="card">
    <h2>推荐系统</h2>
    <p>当前版本：用户画像标签召回 + 热门召回 + 类型偏好召回 + Redis 缓存降级。</p>

    <div style="display: flex; gap: 12px; margin: 16px 0; flex-wrap: wrap;">
      <select v-model="targetType" class="input" style="max-width: 180px; margin: 0;">
        <option value="">全部类型</option>
        <option value="ARTICLE">文章</option>
        <option value="VIDEO">视频</option>
      </select>
      <button class="button" :disabled="loading" @click="load">
        {{ loading ? '加载中...' : '刷新推荐' }}
      </button>
      <button class="button" style="background: #2563eb;" @click="loadDebug">
        推荐调试
      </button>
      <button class="button" style="background: #7c3aed;" @click="loadCacheStats">
        缓存统计
      </button>
      <button class="button" style="background: #991b1b;" @click="clearCache">
        清理缓存
      </button>
    </div>

    <p v-if="message" style="color: #ef4444;">{{ message }}</p>

    <div v-if="cacheStats" class="card" style="background: #f9fafb;">
      <h3>缓存状态</h3>
      <p>
        enabled={{ cacheStats.enabled }} /
        freshKeys={{ cacheStats.freshKeyCount }} /
        staleKeys={{ cacheStats.staleKeyCount }}
      </p>
      <p>
        feedTTL={{ cacheStats.feedTtlSeconds }}s /
        hotTTL={{ cacheStats.hotTtlSeconds }}s /
        similarTTL={{ cacheStats.similarTtlSeconds }}s /
        staleTTL={{ cacheStats.staleTtlSeconds }}s
      </p>
    </div>

    <div v-if="debug" class="card" style="background: #f9fafb;">
      <h3>推荐调试：userId={{ debug.userId }}</h3>
      <p><strong>兴趣标签：</strong>{{ debug.interests.map((x: any) => `${x.tag_name || x.tagName}:${x.score}`).join('，') || '-' }}</p>
      <p><strong>最近行为：</strong>{{ debug.recentBehaviors.length }} 条</p>
      <p><strong>最近曝光：</strong>{{ debug.recentExposures.length }} 条</p>
    </div>

    <h3>多路召回 Feed</h3>
    <div class="grid">
      <div v-for="item in feed" :key="`p-${item.targetType}-${item.targetId}`" class="rec-card">
        <div class="meta">{{ item.targetType }} · {{ item.status }} · {{ item.recallSource }}</div>
        <h4><RouterLink :to="detailUrl(item)">{{ item.title }}</RouterLink></h4>
        <p>{{ item.reason }}</p>
        <div class="score">score: {{ item.score }}</div>
        <div class="stats">
          浏览 {{ item.viewCount }} / 播放 {{ item.playCount }} / 赞 {{ item.likeCount }} / 藏 {{ item.favoriteCount }} / 评 {{ item.commentCount }}
        </div>
        <button class="plain" @click="dislike(item, 'HOME')">不感兴趣</button>
      </div>
    </div>

    <h3 style="margin-top: 28px;">热门兜底</h3>
    <div class="grid">
      <div v-for="item in hot" :key="`h-${item.targetType}-${item.targetId}`" class="rec-card">
        <div class="meta">{{ item.targetType }} · {{ item.status }} · {{ item.recallSource }}</div>
        <h4><RouterLink :to="detailUrl(item)">{{ item.title }}</RouterLink></h4>
        <p>{{ item.reason }}</p>
        <div class="score">score: {{ item.score }}</div>
        <div class="stats">
          浏览 {{ item.viewCount }} / 播放 {{ item.playCount }} / 赞 {{ item.likeCount }} / 藏 {{ item.favoriteCount }} / 评 {{ item.commentCount }}
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.rec-card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 16px;
  background: #fff;
}

.meta {
  color: #6b7280;
  font-size: 13px;
}

.score {
  font-weight: 700;
  margin-top: 8px;
}

.stats {
  color: #6b7280;
  font-size: 13px;
  margin-top: 8px;
}

.plain {
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  padding: 8px 0 0;
}
</style>
