<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  bindContentTags,
  getContentProfile,
  getHotTags,
  getUserInterests,
  rebuildUserProfile
} from '../../api/profile'

const userId = ref(1)
const interests = ref<any[]>([])
const hotTags = ref<any[]>([])
const message = ref('')
const loading = ref(false)

const tagForm = ref({
  contentId: '',
  contentType: 'ARTICLE',
  tagNames: 'Java,SpringCloud'
})

const contentProfile = ref<any>(null)

async function rebuild() {
  loading.value = true
  message.value = ''
  try {
    const res: any = await rebuildUserProfile(Number(userId.value))
    if (res.code === 0) {
      message.value = `${res.data.message}，行为数=${res.data.behaviorCount}，标签数=${res.data.tagCount}`
      await loadInterests()
      await loadHotTags()
    } else {
      message.value = res.message || '构建失败'
    }
  } finally {
    loading.value = false
  }
}

async function loadInterests() {
  const res: any = await getUserInterests(Number(userId.value), 30)
  if (res.code === 0) {
    interests.value = res.data || []
  }
}

async function loadHotTags() {
  const res: any = await getHotTags(30)
  if (res.code === 0) {
    hotTags.value = res.data || []
  }
}

async function bindTags() {
  if (!tagForm.value.contentId) {
    alert('请输入内容ID')
    return
  }

  const tagNames = tagForm.value.tagNames
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

  const res: any = await bindContentTags({
    contentId: Number(tagForm.value.contentId),
    contentType: tagForm.value.contentType,
    tagNames
  })

  if (res.code === 0) {
    contentProfile.value = res.data
    message.value = '内容标签已绑定'
    await loadHotTags()
  } else {
    message.value = res.message || '绑定失败'
  }
}

async function loadContentProfile() {
  if (!tagForm.value.contentId) {
    alert('请输入内容ID')
    return
  }

  const res: any = await getContentProfile(tagForm.value.contentType, Number(tagForm.value.contentId))
  if (res.code === 0) {
    contentProfile.value = res.data
  } else {
    message.value = res.message || '查询失败'
  }
}

onMounted(async () => {
  await loadInterests()
  await loadHotTags()
})
</script>

<template>
  <section class="card">
    <h2>画像系统</h2>
    <p>基于行为日志、内容标签、点赞收藏评论，构建用户兴趣画像和内容画像。</p>

    <div class="card" style="background: #f9fafb; margin: 16px 0;">
      <h3>用户兴趣画像</h3>
      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <input v-model="userId" class="input" style="max-width: 160px; margin: 0;" placeholder="userId" />
        <button class="button" :disabled="loading" @click="rebuild">
          {{ loading ? '构建中...' : '重建用户画像' }}
        </button>
        <button class="button" @click="loadInterests">查询兴趣</button>
      </div>
    </div>

    <div class="card" style="background: #f9fafb; margin: 16px 0;">
      <h3>内容标签绑定</h3>
      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <select v-model="tagForm.contentType" class="input" style="max-width: 160px; margin: 0;">
          <option value="ARTICLE">ARTICLE</option>
          <option value="VIDEO">VIDEO</option>
        </select>
        <input v-model="tagForm.contentId" class="input" style="max-width: 160px; margin: 0;" placeholder="contentId" />
        <input v-model="tagForm.tagNames" class="input" style="max-width: 360px; margin: 0;" placeholder="Java,SpringCloud" />
        <button class="button" @click="bindTags">绑定标签</button>
        <button class="button" @click="loadContentProfile">查询内容画像</button>
      </div>
    </div>

    <p v-if="message" style="color: #ef4444;">{{ message }}</p>

    <div v-if="contentProfile" class="card" style="background: #fff;">
      <h3>内容画像</h3>
      <p><strong>{{ contentProfile.contentType }}#{{ contentProfile.contentId }}</strong> {{ contentProfile.title }}</p>
      <p>状态：{{ contentProfile.status }} / 热度：{{ contentProfile.hotScore }} / 质量分：{{ contentProfile.qualityScore }}</p>
      <p>标签：{{ contentProfile.tagNames.join(', ') || '-' }}</p>
    </div>

    <h3>用户兴趣标签</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th>标签</th>
          <th>分数</th>
          <th>来源</th>
          <th>最后行为</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in interests" :key="item.tagId">
          <td>{{ item.tagName }}</td>
          <td><strong>{{ item.score }}</strong></td>
          <td>{{ item.source }}</td>
          <td>{{ item.lastBehaviorAt || '-' }}</td>
        </tr>
      </tbody>
    </table>

    <h3 style="margin-top: 28px;">热门标签</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th>标签</th>
          <th>使用次数</th>
          <th>用户数</th>
          <th>总兴趣分</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tag in hotTags" :key="tag.tagId">
          <td>{{ tag.tagName }}</td>
          <td>{{ tag.useCount }}</td>
          <td>{{ tag.userCount }}</td>
          <td>{{ tag.totalScore }}</td>
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
