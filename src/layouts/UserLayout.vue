<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { unreadNotificationCount } from '../api/notification'
import { loadPermissionView } from '../utils/permission'

type NavLink = {
  path: string
  name: string
  description?: string
  permissionCode?: string
  badge?: boolean
}

const permissionView = ref<any>(null)
const unreadCount = ref(0)
const mobileOpen = ref(false)

const browseLinks: NavLink[] = [
  { path: '/', name: '首页', description: '内容聚合与快捷入口' },
  { path: '/videos', name: '视频', description: '浏览视频内容' },
  { path: '/articles', name: '文章', description: '浏览文章内容' },
  { path: '/hot', name: '热门', description: '热点内容排行' },
  { path: '/recommend', name: '推荐', description: '个性化推荐', permissionCode: 'recommend:view' }
]

const creationLinks: NavLink[] = [
  { path: '/video/upload', name: '上传视频', description: '分片上传与播放检测' },
  { path: '/article/editor', name: '写文章', description: '创建和提交文章', permissionCode: 'article:create' }
]

const accountLinks: NavLink[] = [
  { path: '/notifications', name: '消息', description: '通知与站内信', permissionCode: 'notification:view', badge: true },
  { path: '/member', name: '会员', description: '权益与订阅', permissionCode: 'member:view' },
  { path: '/me', name: '个人中心', description: '资料、内容和消息' },
  { path: '/login', name: '登录/注册', description: '账号入口' }
]

function canSee(link: NavLink) {
  if (!link.permissionCode) return true
  if (!permissionView.value) return true

  const roleCodes = (permissionView.value.roles || []).map((role: any) => role.roleCode)
  if (roleCodes.includes('SUPER_ADMIN')) return true

  const codes = permissionView.value.permissionCodes || []
  return codes.includes(link.permissionCode)
}

const visibleBrowseLinks = computed(() => browseLinks.filter(canSee))
const visibleCreationLinks = computed(() => creationLinks.filter(canSee))
const visibleAccountLinks = computed(() => accountLinks.filter(canSee))

async function loadUnreadCount() {
  try {
    const res: any = await unreadNotificationCount()
    if (res.code === 0) {
      unreadCount.value = res.data?.unreadCount || 0
    }
  } catch {
    unreadCount.value = 0
  }
}

function closeMobileNav() {
  mobileOpen.value = false
}

onMounted(async () => {
  permissionView.value = await loadPermissionView(false)
  await loadUnreadCount()
})
</script>

<template>
  <div class="user-shell">
    <header class="user-header">
      <div class="header-main">
        <RouterLink to="/" class="brand" @click="closeMobileNav">
          <span class="brand-mark">V</span>
          <span>
            <strong>VSpicy</strong>
            <small>用户端</small>
          </span>
        </RouterLink>

        <button class="mobile-toggle" type="button" @click="mobileOpen = !mobileOpen">
          {{ mobileOpen ? '收起' : '菜单' }}
        </button>
      </div>

      <div class="nav-layout" :class="{ open: mobileOpen }">
        <nav class="nav-section">
          <span class="nav-label">浏览</span>
          <RouterLink v-for="link in visibleBrowseLinks" :key="link.path" :to="link.path" @click="closeMobileNav">
            {{ link.name }}
          </RouterLink>
        </nav>

        <nav class="nav-section">
          <span class="nav-label">创作</span>
          <RouterLink v-for="link in visibleCreationLinks" :key="link.path" :to="link.path" @click="closeMobileNav">
            {{ link.name }}
          </RouterLink>
        </nav>

        <nav class="nav-section">
          <span class="nav-label">我的</span>
          <RouterLink v-for="link in visibleAccountLinks" :key="link.path" :to="link.path" @click="closeMobileNav">
            {{ link.name }}
            <span v-if="link.badge && unreadCount > 0" class="badge">{{ unreadCount }}</span>
          </RouterLink>
        </nav>

        <nav class="admin-entry">
          <RouterLink to="/admin" class="admin-button" @click="closeMobileNav">管理后台</RouterLink>
        </nav>
      </div>
    </header>

    <main class="user-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.user-shell {
  min-height: 100vh;
}

.user-header {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 10px 18px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.04);
}

.header-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #111827;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: linear-gradient(135deg, #111827, #2563eb);
  color: #ffffff;
  font-weight: 800;
}

.brand strong,
.brand small {
  display: block;
}

.brand strong {
  font-size: 17px;
}

.brand small {
  color: #6b7280;
  font-size: 12px;
}

.nav-layout {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.nav-section {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.nav-label {
  color: #9ca3af;
  font-size: 12px;
  margin-right: 2px;
}

.nav-section a,
.admin-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 34px;
  padding: 6px 9px;
  border-radius: 10px;
  color: #374151;
  text-decoration: none;
  font-size: 14px;
  white-space: nowrap;
}

.nav-section a:hover,
.nav-section a.router-link-active {
  background: #eff6ff;
  color: #1d4ed8;
}

.admin-entry {
  margin-left: auto;
}

.admin-button {
  border: 1px solid #d1d5db;
  background: #111827;
  color: #ffffff;
}

.admin-button:hover {
  background: #1d4ed8;
  color: #ffffff;
}

.badge {
  min-width: 18px;
  padding: 1px 5px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 12px;
  text-align: center;
}

.mobile-toggle {
  display: none;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #fff;
  padding: 7px 10px;
}

.user-main {
  max-width: 1180px;
  margin: 28px auto;
  padding: 0 16px;
}

@media (max-width: 980px) {
  .user-header {
    display: block;
  }

  .header-main {
    justify-content: space-between;
  }

  .mobile-toggle {
    display: inline-flex;
  }

  .nav-layout {
    display: none;
    padding-top: 12px;
  }

  .nav-layout.open {
    display: grid;
    gap: 10px;
  }

  .nav-section {
    flex-wrap: wrap;
  }

  .admin-entry {
    margin-left: 0;
  }
}
</style>
