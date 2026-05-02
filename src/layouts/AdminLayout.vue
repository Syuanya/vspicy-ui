<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { adminOpsMenuItems, type AdminOpsMenuItem } from '../config/adminOpsMenu'
import { hasPermission, loadPermissionView, type PermissionView } from '../utils/permission'

type AdminGroupView = {
  code: string
  name: string
  description: string
  links: AdminOpsMenuItem[]
}

const route = useRoute()
const permissionView = ref<PermissionView | null>(null)
const sidebarOpen = ref(false)
const keyword = ref('')

const groupMeta: Record<string, { name: string; description: string; order: number }> = {
  overview: { name: '运维概览', description: '总览入口与核心工作台', order: 10 },
  admin: { name: '运营管理', description: '用户、内容、会员、通知与工单处理', order: 20 },
  system: { name: '系统治理', description: '权限、菜单、组织、配置、字典、任务与发布', order: 30 },
  security: { name: '安全治理', description: '敏感词、登录安全和风险入口', order: 40 },
  health: { name: '服务健康', description: '基础设施、依赖组件与健康检查', order: 50 },
  diagnostics: { name: '诊断工具', description: '预检、API、路由、权限与前后端联调诊断', order: 60 },
  transcode: { name: '转码播放', description: '转码任务、播放就绪与媒体链路', order: 70 },
  playback: { name: '播放治理', description: '播放地址、HLS 状态与就绪修复', order: 80 },
  repair: { name: '修复任务', description: 'HLS 修复与一致性处理', order: 90 },
  storage: { name: '存储运维', description: '对象存储、容量、文件一致性和告警', order: 100 },
  cleanup: { name: '清理治理', description: '孤儿对象、清理审批与执行', order: 110 },
  audit: { name: '审计治理', description: '操作审计、后台日志与权限追踪', order: 120 }
}

function canSee(item: AdminOpsMenuItem) {
  return hasPermission(item.permission, permissionView.value)
}

function matchesKeyword(item: AdminOpsMenuItem) {
  const value = keyword.value.trim().toLowerCase()
  if (!value) return true
  return [item.title, item.description, item.path, item.permission, item.group]
    .filter(Boolean)
    .some((text) => String(text).toLowerCase().includes(value))
}

function isActive(path: string) {
  return route.path === path || route.path.startsWith(`${path}/`)
}

const visibleAdminGroups = computed<AdminGroupView[]>(() => {
  const bucket = new Map<string, AdminOpsMenuItem[]>()

  adminOpsMenuItems
    .filter(canSee)
    .filter(matchesKeyword)
    .forEach((item) => {
      const group = item.group || 'admin'
      const items = bucket.get(group) || []
      items.push(item)
      bucket.set(group, items)
    })

  return Array.from(bucket.entries())
    .map(([code, links]) => ({
      code,
      links,
      name: groupMeta[code]?.name || code,
      description: groupMeta[code]?.description || '后台功能入口'
    }))
    .sort((a, b) => (groupMeta[a.code]?.order || 999) - (groupMeta[b.code]?.order || 999))
})

const visibleMenuCount = computed(() => visibleAdminGroups.value.reduce((sum, group) => sum + group.links.length, 0))

const currentMenu = computed(() => adminOpsMenuItems.find((item) => isActive(item.path)))

const currentTitle = computed(() => currentMenu.value?.title || '管理后台')
const currentDescription = computed(() => currentMenu.value?.description || '后台功能与运维工作台')

function closeSidebar() {
  sidebarOpen.value = false
}

function clearKeyword() {
  keyword.value = ''
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

      <div class="nav-search">
        <input v-model="keyword" type="search" placeholder="搜索菜单 / 权限码" />
        <button v-if="keyword" type="button" @click="clearKeyword">清空</button>
      </div>

      <div class="nav-summary">
        <span>可见菜单</span>
        <strong>{{ visibleMenuCount }}</strong>
      </div>

      <section v-for="group in visibleAdminGroups" :key="group.code" class="admin-group">
        <header>
          <div>
            <h3>{{ group.name }}</h3>
            <p>{{ group.description }}</p>
          </div>
          <span>{{ group.links.length }}</span>
        </header>

        <RouterLink
          v-for="link in group.links"
          :key="link.path"
          :to="link.path"
          :class="['admin-link', `level-${link.level}`, { active: isActive(link.path) }]"
          @click="closeSidebar"
        >
          <span class="link-title">{{ link.title }}</span>
          <small>{{ link.description }}</small>
        </RouterLink>
      </section>

      <div v-if="visibleMenuCount === 0" class="empty-menu">
        没有匹配的菜单。请清空搜索条件，或确认当前账号权限。
      </div>
    </aside>

    <div v-if="sidebarOpen" class="sidebar-mask" @click="closeSidebar"></div>

    <section class="admin-workspace">
      <header class="admin-topbar">
        <button class="sidebar-toggle" type="button" @click="sidebarOpen = !sidebarOpen">菜单</button>
        <div class="topbar-title">
          <strong>{{ currentTitle }}</strong>
          <small>{{ currentDescription }}</small>
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
  grid-template-columns: 292px minmax(0, 1fr);
  background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
}

.admin-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  padding: 18px 14px;
  background: linear-gradient(180deg, #0f172a 0%, #111827 58%, #1e1b4b 100%);
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
  text-decoration: none;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
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
  border-radius: 12px;
  padding: 9px 11px;
  color: #bfdbfe;
  text-decoration: none;
}

.nav-search {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
  margin: 12px 6px 8px;
}

.nav-search input {
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.36);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.78);
  color: #e5e7eb;
  padding: 8px 10px;
  outline: none;
}

.nav-search input::placeholder {
  color: #94a3b8;
}

.nav-search button {
  border: 0;
  border-radius: 12px;
  background: #334155;
  color: #e5e7eb;
  padding: 0 9px;
  cursor: pointer;
}

.nav-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 10px 6px 4px;
  border-radius: 12px;
  background: rgba(30, 41, 59, 0.85);
  padding: 8px 10px;
  color: #cbd5e1;
  font-size: 12px;
}

.nav-summary strong {
  color: #ffffff;
}

.admin-group {
  display: grid;
  gap: 5px;
  margin-top: 16px;
}

.admin-group header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin: 0 8px 4px;
}

.admin-group h3 {
  margin: 0;
  color: #cbd5e1;
  font-size: 12px;
}

.admin-group p {
  margin: 2px 0 0;
  color: #64748b;
  font-size: 11px;
  line-height: 1.35;
}

.admin-group header span {
  align-self: flex-start;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
  color: #94a3b8;
  padding: 1px 7px;
  font-size: 11px;
}

.admin-link {
  display: grid;
  gap: 2px;
  border-left: 3px solid transparent;
  border-radius: 12px;
  padding: 9px 10px;
  color: #d1d5db;
  text-decoration: none;
}

.admin-link small {
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.35;
}

.admin-link:hover,
.admin-link.active,
.admin-link.router-link-active {
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  color: #ffffff;
}

.admin-link:hover small,
.admin-link.active small,
.admin-link.router-link-active small {
  color: #dbeafe;
}

.admin-link.level-success {
  border-left-color: #22c55e;
}

.admin-link.level-warning {
  border-left-color: #f59e0b;
}

.admin-link.level-danger {
  border-left-color: #ef4444;
}

.admin-link.level-info {
  border-left-color: #38bdf8;
}

.link-title {
  font-size: 13px;
  font-weight: 700;
}

.empty-menu {
  margin: 18px 6px;
  border: 1px dashed rgba(148, 163, 184, 0.4);
  border-radius: 10px;
  padding: 14px;
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.6;
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
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  backdrop-filter: blur(12px);
}

.topbar-title {
  min-width: 0;
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
  text-decoration: none;
}

.admin-main {
  max-width: 1440px;
  margin: 0 auto;
  padding: 22px;
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
    left: -292px;
    width: 268px;
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
