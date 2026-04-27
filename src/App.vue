<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { loadPermissionView } from './utils/permission'
import { unreadNotificationCount } from './api/notification'

const permissionView = ref<any>(null)
const unreadCount = ref(0)

type NavLink = {
  path: string
  name: string
  permissionCode?: string
  badge?: boolean
}

type NavGroup = {
  name: string
  links: NavLink[]
}

const navGroups: NavGroup[] = [
  {
    name: '内容',
    links: [
      { path: '/', name: '首页' },
      { path: '/hot', name: '热榜' },
      { path: '/recommend', name: '推荐', permissionCode: 'recommend:view' },
      { path: '/video/upload', name: '上传视频' },
      { path: '/video/2', name: '播放测试' },
      { path: '/article/editor', name: '写文章', permissionCode: 'article:create' },
      { path: '/notifications', name: '消息', permissionCode: 'notification:view', badge: true },
      { path: '/member', name: '会员', permissionCode: 'member:view' },
      { path: '/login', name: '登录' }
    ]
  },
  {
    name: '管理',
    links: [
      { path: '/admin/dashboard', name: '数据大屏', permissionCode: 'dashboard:view' },
      { path: '/admin/transcode-tasks', name: '转码任务', permissionCode: 'video:transcode:view' },
      { path: '/admin/audit-tasks', name: '审核任务', permissionCode: 'content:audit:view' },
      { path: '/admin/sensitive-words', name: '敏感词', permissionCode: 'content:sensitive:view' },
      { path: '/admin/profiles', name: '画像', permissionCode: 'profile:view' },
      { path: '/admin/permissions', name: '权限', permissionCode: 'permission:view' },
      { path: '/admin/operation-logs', name: '审计日志', permissionCode: 'operation:log:view' }
    ]
  },
  {
    name: '存储',
    links: [
      { path: '/admin/storage-ops', name: '运维总控', permissionCode: 'video:storage:ops:view' },
      { path: '/admin/video-upload-quota', name: '上传配额', permissionCode: 'video:upload:quota:view' },
      { path: '/admin/user-space', name: '用户空间', permissionCode: 'video:upload:space:view' },
      { path: '/admin/storage-dashboard', name: '存储大屏', permissionCode: 'video:storage:dashboard:view' },
      { path: '/admin/video-file-consistency', name: '文件一致性', permissionCode: 'video:file:consistency:view' },
      { path: '/admin/hls-integrity', name: 'HLS完整性', permissionCode: 'video:hls:integrity:view' },
      { path: '/admin/storage-alerts', name: '存储告警', permissionCode: 'video:storage:alert:view' },
      { path: '/admin/storage-alert-notifications', name: '告警通知', permissionCode: 'video:storage:alert:notification:view' },
      { path: '/admin/hls-repair', name: 'HLS修复', permissionCode: 'video:hls:repair:view' },
      { path: '/admin/object-cleanup', name: '对象清理', permissionCode: 'video:object:cleanup:view' }
    ]
  }
]

const flatLinks = computed(() => navGroups.flatMap((group) => group.links))

function canSee(link: NavLink) {
  if (!link.permissionCode) {
    return true
  }

  if (!permissionView.value) {
    return true
  }

  const roleCodes = (permissionView.value.roles || []).map((role: any) => role.roleCode)
  if (roleCodes.includes('SUPER_ADMIN')) {
    return true
  }

  const codes = permissionView.value.permissionCodes || []
  return codes.includes(link.permissionCode)
}

const visibleGroups = computed(() => {
  return navGroups
    .map((group) => ({
      ...group,
      links: group.links.filter(canSee)
    }))
    .filter((group) => group.links.length > 0)
})

const primaryLinks = computed(() => {
  return flatLinks.value
    .filter((link) => ['/', '/hot', '/video/upload', '/member'].includes(link.path))
    .filter(canSee)
})

async function loadUnreadCount() {
  try {
    const res: any = await unreadNotificationCount()
    if (res.code === 0) {
      unreadCount.value = res.data.unreadCount || 0
    }
  } catch {
    unreadCount.value = 0
  }
}

onMounted(async () => {
  permissionView.value = await loadPermissionView(false)
  await loadUnreadCount()
})
</script>

<template>
  <div>
    <header class="header app-header">
      <RouterLink to="/" class="brand">VSpicy</RouterLink>

      <nav class="quick-nav">
        <RouterLink v-for="link in primaryLinks" :key="link.path" :to="link.path">
          {{ link.name }}
          <span v-if="link.badge && unreadCount > 0" class="badge">{{ unreadCount }}</span>
        </RouterLink>
      </nav>

      <nav class="group-nav">
        <details v-for="group in visibleGroups" :key="group.name" class="nav-menu">
          <summary>{{ group.name }}</summary>
          <div class="nav-dropdown">
            <RouterLink v-for="link in group.links" :key="link.path" :to="link.path">
              {{ link.name }}
              <span v-if="link.badge && unreadCount > 0" class="badge">{{ unreadCount }}</span>
            </RouterLink>
          </div>
        </details>
      </nav>
    </header>

    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 56px;
  padding: 10px 18px;
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  z-index: 20;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.brand {
  font-weight: 800;
  color: #111827;
  text-decoration: none;
  font-size: 18px;
  margin-right: 4px;
}

.quick-nav,
.group-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quick-nav {
  flex: 0 1 auto;
}

.group-nav {
  margin-left: auto;
  flex: 0 1 auto;
}

.quick-nav a,
.nav-menu summary {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 6px 10px;
  border-radius: 10px;
  color: #374151;
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
  user-select: none;
}

.quick-nav a:hover,
.nav-menu summary:hover {
  background: #f3f4f6;
  color: #111827;
}

.quick-nav a.router-link-active {
  background: #eff6ff;
  color: #1d4ed8;
}

.nav-menu {
  position: relative;
}

.nav-menu summary {
  list-style: none;
  border: 1px solid #e5e7eb;
  background: #ffffff;
}

.nav-menu summary::-webkit-details-marker {
  display: none;
}

.nav-menu summary::after {
  content: '▾';
  margin-left: 6px;
  font-size: 11px;
  color: #6b7280;
}

.nav-dropdown {
  position: absolute;
  right: 0;
  top: 42px;
  min-width: 180px;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
  display: grid;
  gap: 4px;
  z-index: 30;
}

.nav-dropdown a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 10px;
  color: #374151;
  text-decoration: none;
  white-space: nowrap;
  font-size: 14px;
}

.nav-dropdown a:hover {
  background: #f3f4f6;
  color: #111827;
}

.nav-dropdown a.router-link-active {
  background: #eff6ff;
  color: #1d4ed8;
}

.badge {
  display: inline-block;
  min-width: 18px;
  padding: 1px 5px;
  margin-left: 4px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 12px;
  text-align: center;
}

@media (max-width: 760px) {
  .app-header {
    align-items: flex-start;
  }

  .brand {
    width: 100%;
  }

  .group-nav {
    margin-left: 0;
  }

  .nav-dropdown {
    left: 0;
    right: auto;
  }
}
</style>
