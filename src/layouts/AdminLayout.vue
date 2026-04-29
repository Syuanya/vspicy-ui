<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { loadPermissionView } from '../utils/permission'

type AdminLink = {
  path: string
  name: string
  permissionCode?: string
}

type AdminGroup = {
  name: string
  links: AdminLink[]
}

const route = useRoute()
const permissionView = ref<any>(null)
const sidebarOpen = ref(false)

const adminGroups: AdminGroup[] = [
  {
    name: '运营管理',
    links: [
      { path: '/admin/dashboard', name: '数据大屏', permissionCode: 'dashboard:view' },
      { path: '/admin/users', name: '用户管理', permissionCode: 'user:view' },
      { path: '/admin/content', name: '内容管理', permissionCode: 'content:manage' },
      { path: '/admin/members', name: '会员管理', permissionCode: 'member:manage' },
      { path: '/admin/notification-events', name: '通知事件', permissionCode: 'notification:event:view' }
    ]
  },
  {
    name: '审核与权限',
    links: [
      { path: '/admin/audit-tasks', name: '审核任务', permissionCode: 'content:audit:view' },
      { path: '/admin/sensitive-words', name: '敏感词', permissionCode: 'content:sensitive:view' },
      { path: '/admin/profiles', name: '用户画像', permissionCode: 'profile:view' },
      { path: '/admin/permissions', name: '权限管理', permissionCode: 'permission:view' },
      { path: '/admin/operation-logs', name: '审计日志', permissionCode: 'operation:log:view' }
    ]
  },
  {
    name: '视频运维',
    links: [
      { path: '/admin/ops-hub', name: '运维中心', permissionCode: 'video:ops:hub:view' },
      { path: '/admin/service-health', name: '服务健康', permissionCode: 'video:service:health:view' },
      { path: '/admin/api-diagnostics', name: 'API 诊断', permissionCode: 'video:ops:hub:view' },
      { path: '/admin/transcode-tasks', name: '转码任务', permissionCode: 'video:transcode:view' },
      { path: '/admin/playback-readiness-batch', name: '播放就绪', permissionCode: 'video:playback:readiness:view' },
      { path: '/admin/operation-audit', name: '操作审计', permissionCode: 'video:operation:audit:view' },
      { path: '/admin/route-diagnostics', name: '路由诊断' }
    ]
  },
  {
    name: '存储运维',
    links: [
      { path: '/admin/storage-ops', name: '运维总控', permissionCode: 'video:storage:ops:view' },
      { path: '/admin/video-upload-quota', name: '上传配额', permissionCode: 'video:upload:quota:view' },
      { path: '/admin/user-space', name: '用户空间', permissionCode: 'video:upload:space:view' },
      { path: '/admin/storage-dashboard', name: '存储大屏', permissionCode: 'video:storage:dashboard:view' },
      { path: '/admin/video-file-consistency', name: '文件一致性', permissionCode: 'video:file:consistency:view' },
      { path: '/admin/hls-integrity', name: 'HLS 完整性', permissionCode: 'video:hls:integrity:view' },
      { path: '/admin/storage-alerts', name: '存储告警', permissionCode: 'video:storage:alert:view' },
      { path: '/admin/storage-alert-notifications', name: '告警通知', permissionCode: 'video:storage:alert:notification:view' },
      { path: '/admin/hls-repair', name: 'HLS 修复', permissionCode: 'video:hls:repair:view' },
      { path: '/admin/object-cleanup', name: '对象清理', permissionCode: 'video:object:cleanup:view' }
    ]
  }
]

const currentTitle = computed(() => {
  for (const group of adminGroups) {
    const link = group.links.find((item) => item.path === route.path)
    if (link) return link.name
  }
  return '管理后台'
})

function canSee(link: AdminLink) {
  if (!link.permissionCode) return true
  if (!permissionView.value) return true

  const roleCodes = (permissionView.value.roles || []).map((role: any) => role.roleCode)
  if (roleCodes.includes('SUPER_ADMIN')) return true

  const codes = permissionView.value.permissionCodes || []
  return codes.includes(link.permissionCode)
}

const visibleAdminGroups = computed(() => adminGroups
  .map((group) => ({ ...group, links: group.links.filter(canSee) }))
  .filter((group) => group.links.length > 0)
)

function closeSidebar() {
  sidebarOpen.value = false
}

onMounted(async () => {
  permissionView.value = await loadPermissionView(false)
})
</script>

<template>
  <div class="admin-shell">
    <aside class="admin-sidebar" :class="{ open: sidebarOpen }">
      <div class="brand-row">
        <RouterLink to="/admin" class="admin-brand" @click="closeSidebar">
          <span class="brand-mark">A</span>
          <span>
            <strong>VSpicy Admin</strong>
            <small>管理员端</small>
          </span>
        </RouterLink>
      </div>

      <RouterLink class="back-user" to="/" @click="closeSidebar">返回用户端</RouterLink>

      <section v-for="group in visibleAdminGroups" :key="group.name" class="admin-group">
        <h3>{{ group.name }}</h3>
        <RouterLink v-for="link in group.links" :key="link.path" :to="link.path" @click="closeSidebar">
          {{ link.name }}
        </RouterLink>
      </section>
    </aside>

    <div v-if="sidebarOpen" class="sidebar-mask" @click="closeSidebar"></div>

    <section class="admin-workspace">
      <header class="admin-topbar">
        <button class="sidebar-toggle" type="button" @click="sidebarOpen = !sidebarOpen">菜单</button>
        <div>
          <strong>{{ currentTitle }}</strong>
          <small>后台功能与运维工作台</small>
        </div>
        <RouterLink class="user-link" to="/">用户端</RouterLink>
      </header>

      <main class="admin-main">
        <RouterView />
      </main>
    </section>
  </div>
</template>

<style scoped>
.admin-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 248px 1fr;
  background: #f3f4f6;
}

.admin-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  padding: 16px 12px;
  background: #0f172a;
  color: #e5e7eb;
}

.brand-row {
  padding: 0 6px 14px;
  border-bottom: 1px solid rgba(229, 231, 235, 0.16);
}

.admin-brand {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  color: #fff;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-weight: 800;
}

.admin-brand strong,
.admin-brand small {
  display: block;
}

.admin-brand small {
  color: #94a3b8;
  font-size: 12px;
}

.back-user {
  display: block;
  margin: 12px 6px 8px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 8px;
  padding: 8px 10px;
  color: #bfdbfe;
}

.admin-group {
  display: grid;
  gap: 4px;
  margin-top: 16px;
}

.admin-group h3 {
  margin: 0 8px 5px;
  color: #94a3b8;
  font-size: 12px;
}

.admin-group a {
  border-radius: 8px;
  padding: 8px 10px;
  color: #d1d5db;
}

.admin-group a:hover,
.admin-group a.router-link-active {
  background: #1d4ed8;
  color: #ffffff;
}

.admin-workspace {
  min-width: 0;
}

.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.admin-topbar strong,
.admin-topbar small {
  display: block;
}

.admin-topbar small {
  color: #6b7280;
  font-size: 12px;
}

.sidebar-toggle {
  display: none;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  padding: 7px 10px;
}

.user-link {
  margin-left: auto;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 7px 10px;
  color: #2563eb;
}

.admin-main {
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px;
}

.sidebar-mask {
  display: none;
}

@media (max-width: 980px) {
  .admin-shell {
    display: block;
  }

  .admin-sidebar {
    position: fixed;
    z-index: 40;
    left: -260px;
    width: 236px;
    transition: left 0.2s ease;
  }

  .admin-sidebar.open {
    left: 0;
  }

  .sidebar-mask {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 35;
    background: rgba(15, 23, 42, 0.38);
  }

  .sidebar-toggle {
    display: inline-flex;
  }

  .admin-main {
    padding: 16px;
  }
}
</style>
