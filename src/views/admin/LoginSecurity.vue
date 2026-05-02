<template>
  <section class="login-security-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Security</p>
        <h1>登录安全中心</h1>
        <p class="muted">查看登录日志、在线会话和异常登录趋势，支持强制下线风险会话。</p>
      </div>
      <div class="actions">
        <select v-model.number="days" @change="refresh">
          <option :value="7">近 7 天</option>
          <option :value="14">近 14 天</option>
          <option :value="30">近 30 天</option>
          <option :value="90">近 90 天</option>
        </select>
        <button @click="refresh">刷新</button>
      </div>
    </header>

    <div v-if="error" class="error">{{ error }}</div>

    <div class="metrics" v-if="overview">
      <article><span>今日登录</span><strong>{{ overview.todayLoginCount ?? 0 }}</strong></article>
      <article><span>成功登录</span><strong>{{ overview.todaySuccessCount ?? 0 }}</strong></article>
      <article><span>失败登录</span><strong>{{ overview.todayFailedCount ?? 0 }}</strong></article>
      <article><span>成功率</span><strong>{{ overview.todaySuccessRate ?? 0 }}%</strong></article>
      <article><span>在线会话</span><strong>{{ overview.onlineSessionCount ?? 0 }}</strong></article>
      <article><span>异常 IP</span><strong>{{ overview.abnormalIpCount ?? 0 }}</strong></article>
    </div>

    <div class="panel-grid">
      <section class="panel">
        <div class="panel-title">
          <h2>登录日志</h2>
          <button @click="loadLogs">查询</button>
        </div>
        <div class="filters">
          <input v-model="logFilter.userId" placeholder="用户 ID" />
          <select v-model="logFilter.status">
            <option value="">全部状态</option>
            <option value="SUCCESS">成功</option>
            <option value="FAILED">失败</option>
          </select>
          <input v-model="logFilter.keyword" placeholder="用户名 / IP / UA" />
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>用户</th><th>IP</th><th>设备</th><th>状态</th><th>时间</th></tr></thead>
            <tbody>
              <tr v-for="item in logs" :key="item.id">
                <td>{{ item.id }}</td>
                <td>{{ item.username || item.userId || '-' }}</td>
                <td>{{ item.ip || '-' }}</td>
                <td>{{ item.device || '-' }}</td>
                <td><span :class="['tag', statusClass(item.status)]">{{ statusText(item.status) }}</span></td>
                <td>{{ formatTime(item.createdAt) }}</td>
              </tr>
              <tr v-if="!logs.length"><td colspan="6" class="empty">暂无登录日志</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">
          <h2>在线会话</h2>
          <button @click="loadSessions">查询</button>
        </div>
        <div class="filters">
          <input v-model="sessionFilter.userId" placeholder="用户 ID" />
          <select v-model="sessionFilter.status">
            <option value="">全部状态</option>
            <option value="ONLINE">在线</option>
            <option value="KICKED">已踢出</option>
            <option value="EXPIRED">已过期</option>
          </select>
          <input v-model="sessionFilter.keyword" placeholder="用户名 / IP / 设备" />
          <button @click="cleanupExpired">清理过期</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>用户</th><th>IP</th><th>状态</th><th>最后活跃</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="item in sessions" :key="item.id">
                <td>{{ item.id }}</td>
                <td>{{ item.username || item.userId || '-' }}</td>
                <td>{{ item.ip || '-' }}</td>
                <td><span :class="['tag', statusClass(item.status)]">{{ statusText(item.status) }}</span></td>
                <td>{{ formatTime(item.lastActiveAt) }}</td>
                <td><button :disabled="item.status !== 'ONLINE'" @click="kick(item.id)">强制下线</button></td>
              </tr>
              <tr v-if="!sessions.length"><td colspan="6" class="empty">暂无在线会话</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { cleanupExpiredSessions, getLoginSecurityOverview, kickOnlineSession, listLoginLogs, listOnlineSessions, type LoginLogItem, type LoginSecurityOverview, type OnlineSessionItem } from '../../api/loginSecurity'

const days = ref(7)
const overview = ref<LoginSecurityOverview | null>(null)
const logs = ref<LoginLogItem[]>([])
const sessions = ref<OnlineSessionItem[]>([])
const error = ref('')
const logFilter = reactive({ userId: '', status: '', keyword: '', limit: 100 })
const sessionFilter = reactive({ userId: '', status: 'ONLINE', keyword: '', limit: 100 })

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

async function refresh() {
  error.value = ''
  try {
    overview.value = await getLoginSecurityOverview(days.value)
    await Promise.all([loadLogs(), loadSessions()])
  } catch (e: any) {
    error.value = e?.message || '加载登录安全数据失败'
  }
}

async function loadLogs() {
  logs.value = asArray(await listLoginLogs(logFilter))
}

async function loadSessions() {
  sessions.value = asArray(await listOnlineSessions(sessionFilter))
}

async function kick(id: number) {
  const reason = window.prompt('请输入强制下线原因', '管理员强制下线') || '管理员强制下线'
  await kickOnlineSession(id, reason)
  await loadSessions()
}

async function cleanupExpired() {
  await cleanupExpiredSessions()
  await loadSessions()
}

function statusText(value?: string | null) {
  return value && String(value).trim() ? String(value) : 'UNKNOWN'
}

function statusClass(value?: string | null) {
  const normalized = value && String(value).trim() ? String(value).trim().toLowerCase() : 'unknown'
  return normalized.replace(/[^a-z0-9_-]/g, '-')
}

function formatTime(value?: string) {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 19)
}

onMounted(refresh)
</script>

<style scoped>
.login-security-page { padding: 24px; }
.page-header { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; margin-bottom:20px; }
.eyebrow { color:#64748b; text-transform:uppercase; letter-spacing:.08em; margin:0 0 4px; }
h1 { margin:0; font-size:26px; }
.muted { color:#64748b; margin:6px 0 0; }
.actions, .filters { display:flex; gap:10px; flex-wrap:wrap; }
button, select, input { border:1px solid #d1d5db; border-radius:10px; padding:8px 12px; background:#fff; }
button { cursor:pointer; }
button:disabled { cursor:not-allowed; opacity:.5; }
.error { background:#fef2f2; color:#991b1b; padding:12px; border-radius:12px; margin-bottom:16px; }
.metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:14px; margin-bottom:18px; }
.metrics article { background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:16px; box-shadow:0 8px 24px rgba(15,23,42,.04); }
.metrics span { display:block; color:#64748b; font-size:13px; }
.metrics strong { display:block; margin-top:8px; font-size:24px; }
.panel-grid { display:grid; grid-template-columns:1fr; gap:18px; }
.panel { background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:18px; }
.panel-title { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; }
.panel-title h2 { margin:0; font-size:18px; }
.table-wrap { overflow:auto; margin-top:12px; }
table { width:100%; border-collapse:collapse; }
th, td { padding:10px; border-bottom:1px solid #eef2f7; text-align:left; white-space:nowrap; }
th { color:#475569; font-weight:600; background:#f8fafc; }
.empty { text-align:center; color:#94a3b8; padding:24px; }
.tag { border-radius:999px; padding:3px 8px; font-size:12px; background:#e2e8f0; }
.tag.success, .tag.online { background:#dcfce7; color:#166534; }
.tag.failed, .tag.kicked { background:#fee2e2; color:#991b1b; }
.tag.expired { background:#f1f5f9; color:#475569; }
.tag.unknown { background:#fef3c7; color:#92400e; }
</style>
