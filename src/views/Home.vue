<script setup lang="ts">
const quickActions = [
  { title: '看视频', description: '浏览最新视频内容和播放详情。', path: '/videos' },
  { title: '读文章', description: '查看文章列表、详情和创作内容。', path: '/articles' },
  { title: '开始创作', description: '上传视频或撰写文章，进入内容生产流程。', path: '/video/upload' },
  { title: '个人中心', description: '管理资料、会员、消息和自己的内容。', path: '/me' }
]
</script>

<template>
  <section class="home-page">
    <div class="hero">
      <div>
        <p class="eyebrow">VSpicy 内容平台</p>
        <h1>创作、浏览和管理内容的一体化平台</h1>
        <p class="lead">
          用户端负责内容浏览、创作、会员和个人中心；管理员端负责用户、内容、权限、审核、通知和运维管理。
        </p>
        <div class="hero-actions">
          <RouterLink class="button" to="/videos">浏览内容</RouterLink>
          <RouterLink class="button secondary" to="/admin">进入管理后台</RouterLink>
        </div>
      </div>
    </div>

    <div class="quick-grid">
      <RouterLink v-for="item in quickActions" :key="item.path" class="quick-card" :to="item.path">
        <strong>{{ item.title }}</strong>
        <span>{{ item.description }}</span>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.home-page {
  display: grid;
  gap: 18px;
}

.hero {
  min-height: 320px;
  display: grid;
  align-items: center;
  border-radius: 8px;
  padding: 36px;
  background:
    linear-gradient(120deg, rgba(17, 24, 39, 0.92), rgba(37, 99, 235, 0.72)),
    url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80');
  background-size: cover;
  background-position: center;
  color: #fff;
}

.eyebrow {
  margin: 0 0 10px;
  color: #bfdbfe;
  font-weight: 700;
}

h1 {
  max-width: 720px;
  margin: 0;
  font-size: clamp(34px, 5vw, 56px);
  line-height: 1.08;
}

.lead {
  max-width: 720px;
  color: #e5e7eb;
  line-height: 1.8;
  margin: 18px 0 0;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.secondary {
  background: #111827;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.quick-card {
  display: grid;
  gap: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 18px;
  background: #fff;
}

.quick-card:hover {
  border-color: #93c5fd;
  background: #eff6ff;
}

.quick-card span {
  color: #6b7280;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .hero {
    padding: 24px;
  }
}
</style>
