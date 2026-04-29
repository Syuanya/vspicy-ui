<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listArticles } from '../api/article'
import { me, updateProfile } from '../api/auth'
import { getMyMembership } from '../api/member'
import { unreadNotificationCount } from '../api/notification'
import { listVideos } from '../api/video'

const user = ref<any>(null)
const membership = ref<any>(null)
const articles = ref<any[]>([])
const videos = ref<any[]>([])
const unread = ref(0)
const message = ref('')
const saving = ref(false)

const profileForm = ref({
  nickname: '',
  avatarUrl: '',
  email: '',
  phone: ''
})

const userId = computed(() => Number(localStorage.getItem('vspicy_user_id') || user.value?.userId || user.value?.id || 1))

function fillProfileForm(data: any) {
  profileForm.value = {
    nickname: data?.nickname || '',
    avatarUrl: data?.avatarUrl || '',
    email: data?.email || '',
    phone: data?.phone || ''
  }
}

async function load() {
  message.value = ''
  try {
    const [meRes, memberRes, articleRes, videoRes, unreadRes]: any[] = await Promise.all([
      me(),
      getMyMembership(userId.value),
      listArticles({ userId: userId.value, limit: 8 }),
      listVideos({ userId: userId.value, limit: 8 }),
      unreadNotificationCount(userId.value)
    ])
    if (meRes.code === 0) {
      user.value = meRes.data
      fillProfileForm(meRes.data)
    }
    if (memberRes.code === 0) membership.value = memberRes.data
    if (articleRes.code === 0) articles.value = articleRes.data || []
    if (videoRes.code === 0) videos.value = videoRes.data || []
    if (unreadRes.code === 0) unread.value = unreadRes.data.unreadCount || 0
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '个人中心加载失败'
  }
}

async function saveProfile() {
  saving.value = true
  message.value = ''
  try {
    const res: any = await updateProfile(profileForm.value)
    if (res.code === 0) {
      user.value = res.data
      fillProfileForm(res.data)
      message.value = '资料已更新'
    } else {
      message.value = res.message || '资料保存失败'
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '资料保存失败'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="card">
    <div class="page-head">
      <div>
        <h2>个人中心</h2>
        <p>集中查看登录身份、会员权益、创作内容和消息状态。</p>
      </div>
      <button class="button" @click="load">刷新</button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="summary-grid">
      <div class="summary-card profile-card">
        <img v-if="user?.avatarUrl" :src="user.avatarUrl" alt="头像" />
        <div class="avatar-fallback" v-else>{{ (user?.nickname || user?.username || 'U').slice(0, 1).toUpperCase() }}</div>
        <span>当前用户</span>
        <strong>{{ user?.nickname || user?.username || `用户 ${userId}` }}</strong>
        <small>{{ user?.email || user?.phone || '未绑定联系方式' }}</small>
      </div>
      <div class="summary-card">
        <span>会员状态</span>
        <strong>{{ membership?.planName || '-' }}</strong>
        <small>{{ membership?.active ? '权益有效' : '未开通或已过期' }}</small>
        <RouterLink to="/member">管理会员</RouterLink>
      </div>
      <div class="summary-card">
        <span>未读消息</span>
        <strong>{{ unread }}</strong>
        <RouterLink to="/notifications">查看消息中心</RouterLink>
      </div>
    </div>

    <div class="profile-editor">
      <h3>资料设置</h3>
      <div class="form-grid">
        <label>
          昵称
          <input v-model="profileForm.nickname" class="input" placeholder="昵称" />
        </label>
        <label>
          头像 URL
          <input v-model="profileForm.avatarUrl" class="input" placeholder="https://..." />
        </label>
        <label>
          邮箱
          <input v-model="profileForm.email" class="input" placeholder="email@example.com" />
        </label>
        <label>
          手机号
          <input v-model="profileForm.phone" class="input" placeholder="手机号" />
        </label>
      </div>
      <button class="button" :disabled="saving" @click="saveProfile">
        {{ saving ? '保存中...' : '保存资料' }}
      </button>
    </div>

    <div class="two-column">
      <div class="panel">
        <div class="panel-head">
          <h3>我的文章</h3>
          <RouterLink to="/article/editor">写文章</RouterLink>
        </div>
        <RouterLink v-for="article in articles" :key="article.id" :to="`/article/${article.id}`" class="row-link">
          <span>{{ article.title || `文章 #${article.id}` }}</span>
          <small>{{ article.status }}</small>
        </RouterLink>
        <p v-if="articles.length === 0" class="empty">暂无文章。</p>
      </div>
      <div class="panel">
        <div class="panel-head">
          <h3>我的视频</h3>
          <RouterLink to="/video/upload">上传视频</RouterLink>
        </div>
        <RouterLink v-for="video in videos" :key="video.id" :to="`/video/${video.id}`" class="row-link">
          <span>{{ video.title || `视频 #${video.id}` }}</span>
          <small>{{ video.status }}</small>
        </RouterLink>
        <p v-if="videos.length === 0" class="empty">暂无视频。</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page-head,
.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.summary-grid,
.two-column {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.summary-card,
.panel,
.profile-editor {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #fff;
}

.profile-card {
  display: grid;
  justify-items: start;
}

.profile-card img,
.avatar-fallback {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin-bottom: 10px;
}

.profile-card img {
  object-fit: cover;
}

.avatar-fallback {
  display: grid;
  place-items: center;
  background: #111827;
  color: #fff;
  font-weight: 700;
}

.summary-card span,
.summary-card small,
.row-link small,
.empty {
  color: #6b7280;
}

.summary-card strong {
  display: block;
  margin: 8px 0;
  font-size: 22px;
}

.summary-card a,
.panel-head a,
.row-link {
  color: #2563eb;
}

.profile-editor {
  margin-top: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

label {
  color: #374151;
  font-weight: 600;
}

.row-link {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  border-top: 1px solid #f3f4f6;
}

.message {
  color: #ef4444;
}
</style>
