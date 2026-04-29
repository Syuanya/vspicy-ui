<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const routes = [
  '/admin/ops-hub',
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
      name: String(r.name || '-')
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
    <p>如果你能看到这个页面，说明 adminOpsRoutes 已经接入主 router。</p>

    <div class="panel">
      <h3>当前路由</h3>
      <p><strong>path:</strong> {{ route.path }}</p>
      <p><strong>name:</strong> {{ route.name || '-' }}</p>
    </div>

    <div class="panel">
      <h3>运维页面快捷测试</h3>
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
      <p class="warn">注意：/admin/api-diagnosticscc 是错误路径，正确是 /admin/api-diagnostics。</p>
    </div>

    <div class="panel">
      <h3>已注册 /admin 路由</h3>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>path</th>
              <th>name</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in registeredAdminRoutes" :key="item.path + item.name">
              <td>{{ item.path }}</td>
              <td>{{ item.name }}</td>
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
  border-radius: 18px;
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
  border-radius: 14px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
}

.warn {
  margin-top: 12px;
  color: #92400e;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  border-bottom: 1px solid #e5e7eb;
  padding: 9px;
  text-align: left;
  white-space: nowrap;
}
</style>
