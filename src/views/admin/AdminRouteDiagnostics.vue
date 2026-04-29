<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const routes = [
  '/admin/ops-hub',
  '/admin/users',
  '/admin/content',
  '/admin/members',
  '/admin/notification-events',
  '/admin/service-health',
  '/admin/api-diagnostics',
  '/admin/transcode-tasks',
  '/admin/playback-readiness-batch',
  '/admin/operation-audit',
  '/admin/route-diagnostics'
]

const registeredAdminRoutes = computed(() => {
  return router.getRoutes()
    .filter((r) => r.path.startsWith('/admin'))
    .map((r) => ({
      path: r.path,
      name: String(r.name || '-'),
      permissionCode: String(r.meta.permissionCode || r.meta.permission || '-')
    }))
    .sort((a, b) => a.path.localeCompare(b.path))
})

function go(path: string) {
  router.push(path)
}
</script>

<template>
  <section class="card">
    <h2>后台路由诊断</h2>
    <p>检查管理员系统路由是否已注册，并快速跳转到核心管理页面。</p>

    <div class="panel">
      <h3>当前路由</h3>
      <p><strong>path:</strong> {{ route.path }}</p>
      <p><strong>name:</strong> {{ route.name || '-' }}</p>
    </div>

    <div class="panel">
      <h3>管理员页面快捷测试</h3>
      <div class="grid">
        <button
          v-for="path in routes"
          :key="path"
          class="link-card"
          @click="go(path)"
        >
          {{ path }}
        </button>
      </div>
    </div>

    <div class="panel">
      <h3>已注册 /admin 路由</h3>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>path</th>
              <th>name</th>
              <th>permission</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in registeredAdminRoutes" :key="item.path + item.name">
              <td>{{ item.path }}</td>
              <td>{{ item.name }}</td>
              <td>{{ item.permissionCode }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.link-card {
  border: 1px solid #dbeafe;
  background: #eff6ff;
  color: #1d4ed8;
  border-radius: 10px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border-bottom: 1px solid #e5e7eb;
  padding: 9px;
  text-align: left;
  white-space: nowrap;
}
</style>
