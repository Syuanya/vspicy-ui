<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getHotContent } from '../api/interaction'

const items = ref<any[]>([])
const targetType = ref('')
const loading = ref(false)
const message = ref('')

async function load() {
  loading.value = true
  message.value = ''
  try {
    const params: any = { limit: 30 }
    if (targetType.value) {
      params.targetType = targetType.value
    }

    const res: any = await getHotContent(params)
    if (res.code === 0) {
      items.value = res.data || []
    } else {
      message.value = res.message || '加载失败'
    }
  } finally {
    loading.value = false
  }
}

function detailUrl(item: any) {
  if (item.targetType === 'VIDEO') return `/video/${item.targetId}`
  if (item.targetType === 'ARTICLE') return `/article/${item.targetId}`
  return '/'
}

onMounted(load)
</script>

<template>
  <section class="card">
    <h2>内容热榜</h2>
    <p>基于浏览、播放、点赞、收藏、评论计算热度分数。</p>

    <div style="display: flex; gap: 12px; margin: 16px 0;">
      <select v-model="targetType" class="input" style="max-width: 180px; margin: 0;">
        <option value="">全部</option>
        <option value="ARTICLE">文章</option>
        <option value="VIDEO">视频</option>
      </select>
      <button class="button" :disabled="loading" @click="load">{{ loading ? '加载中...' : '刷新' }}</button>
    </div>

    <p v-if="message" style="color: #ef4444;">{{ message }}</p>

    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th>排名</th>
          <th>类型</th>
          <th>ID</th>
          <th>浏览</th>
          <th>播放</th>
          <th>点赞</th>
          <th>收藏</th>
          <th>评论</th>
          <th>热度</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in items" :key="`${item.targetType}-${item.targetId}`">
          <td>{{ index + 1 }}</td>
          <td>{{ item.targetType }}</td>
          <td><RouterLink :to="detailUrl(item)">{{ item.targetId }}</RouterLink></td>
          <td>{{ item.viewCount }}</td>
          <td>{{ item.playCount }}</td>
          <td>{{ item.likeCount }}</td>
          <td>{{ item.favoriteCount }}</td>
          <td>{{ item.commentCount }}</td>
          <td><strong>{{ item.hotScore }}</strong></td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
th, td {
  border-bottom: 1px solid #e5e7eb;
  padding: 10px;
  text-align: left;
}
</style>
