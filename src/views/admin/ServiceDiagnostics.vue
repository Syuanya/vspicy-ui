<template>
  <section class="diagnostics-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Diagnostics</p>
        <h1>服务诊断中心</h1>
        <p class="muted">集中检查 Gateway、业务微服务和本地中间件端口，快速定位前端批量 500、Connection refused 和配置未启动问题。</p>
      </div>
      <div class="actions">
        <button :disabled="loading" @click="load">{{ loading ? '检测中...' : '刷新检测' }}</button>
      </div>
    </header>

    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="overview" class="metrics">
      <article>
        <span>业务服务</span>
        <strong>{{ overview.serviceUp }}/{{ overview.serviceTotal }}</strong>
        <small>异常 {{ overview.serviceDown }}</small>
      </article>
      <article>
        <span>中间件</span>
        <strong>{{ overview.middlewareUp }}/{{ overview.middlewareTotal }}</strong>
        <small>异常 {{ overview.middlewareDown }}</small>
      </article>
      <article>
        <span>采集时间</span>
        <strong>{{ formatTime(overview.collectedAt) }}</strong>
        <small>Admin 服务本机视角</small>
      </article>
      <article>
        <span>总体状态</span>
        <strong :class="overallOk ? 'ok-text' : 'bad-text'">{{ overallOk ? '正常' : '异常' }}</strong>
        <small>关键组件优先处理</small>
      </article>
    </div>

    <section v-if="overview" class="panel suggestions">
      <h2>处理建议</h2>
      <ul>
        <li v-for="item in safeSuggestions" :key="item">{{ item }}</li>
      </ul>
    </section>

    <div class="panel-grid" v-if="overview">
      <section class="panel">
        <div class="panel-title">
          <h2>微服务端口</h2>
          <span>{{ overview.serviceUp }}/{{ overview.serviceTotal }} UP</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>服务</th><th>模块</th><th>地址</th><th>状态</th><th>耗时</th><th>启动提示</th></tr>
            </thead>
            <tbody>
              <tr v-for="item in safeServices" :key="item.code" :class="{ important: item.required }">
                <td>
                  <strong>{{ item.name }}</strong>
                  <small>{{ item.code }}</small>
                </td>
                <td>{{ item.ownerModule }}</td>
                <td><code>{{ item.host }}:{{ item.port }}</code></td>
                <td><span :class="['tag', statusClass(item.status)]">{{ item.status }}</span></td>
                <td>{{ item.latencyMillis }}ms</td>
                <td>
                  <span v-if="item.status === 'UP'" class="muted">{{ item.message }}</span>
                  <span v-else>{{ item.startHint }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">
          <h2>中间件端口</h2>
          <span>{{ overview.middlewareUp }}/{{ overview.middlewareTotal }} UP</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>组件</th><th>地址</th><th>状态</th><th>耗时</th><th>提示</th></tr>
            </thead>
            <tbody>
              <tr v-for="item in safeMiddlewares" :key="item.code" :class="{ important: item.required }">
                <td>
                  <strong>{{ item.name }}</strong>
                  <small>{{ item.ownerModule }}</small>
                </td>
                <td><code>{{ item.endpoint }}</code></td>
                <td><span :class="['tag', statusClass(item.status)]">{{ item.status }}</span></td>
                <td>{{ item.latencyMillis }}ms</td>
                <td>
                  <span v-if="item.status === 'UP'" class="muted">{{ item.message }}</span>
                  <span v-else>{{ item.startHint }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section v-if="overview" class="panel command-panel">
      <div class="panel-title">
        <h2>PowerShell 快速检查</h2>
        <button @click="copyChecks">复制命令</button>
      </div>
      <pre>{{ powershellChecksText }}</pre>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getServiceDiagnosticsOverview, type ServiceDiagnosticsOverviewView } from '../../api/serviceDiagnostics'

const overview = ref<ServiceDiagnosticsOverviewView | null>(null)
const loading = ref(false)
const error = ref('')

const safeServices = computed(() => asArray(overview.value?.services))
const safeMiddlewares = computed(() => asArray(overview.value?.middlewares))
const safeSuggestions = computed(() => {
  const rows = asArray(overview.value?.suggestions)
  return rows.length ? rows : ['暂无诊断建议。']
})
const safePowershellChecks = computed(() => asArray(overview.value?.powershellChecks))
const powershellChecksText = computed(() => {
  const rows = safePowershellChecks.value
  return rows.length ? rows.join('\n') : '暂无可复制的 PowerShell 检查命令。'
})

const overallOk = computed(() => {
  if (!overview.value) return false
  return Number(overview.value.serviceDown || 0) === 0 && Number(overview.value.middlewareDown || 0) === 0
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    overview.value = await getServiceDiagnosticsOverview()
  } catch (e: any) {
    error.value = e?.message || '加载服务诊断数据失败'
  } finally {
    loading.value = false
  }
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function statusClass(value?: string) {
  return String(value || 'UNKNOWN').toLowerCase()
}

function formatTime(value?: number) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

async function copyChecks() {
  if (!overview.value) return
  const text = powershellChecksText.value
  try {
    await navigator.clipboard.writeText(text)
    window.alert('已复制 PowerShell 检查命令')
  } catch {
    window.prompt('复制以下命令', text)
  }
}

onMounted(load)
</script>

<style scoped>
.diagnostics-page { padding: 24px; }
.page-header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:20px; }
.eyebrow { margin:0 0 4px; color:#64748b; text-transform:uppercase; letter-spacing:.08em; }
h1 { margin:0; font-size:26px; }
.muted { color:#64748b; }
.actions { display:flex; gap:10px; }
button { border:1px solid #d1d5db; border-radius:10px; padding:8px 12px; background:#fff; cursor:pointer; }
button:disabled { opacity:.55; cursor:not-allowed; }
.error { margin-bottom:16px; border-radius:12px; background:#fef2f2; color:#991b1b; padding:12px; }
.metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:14px; margin-bottom:18px; }
.metrics article { border:1px solid #e5e7eb; border-radius:16px; background:#fff; padding:16px; box-shadow:0 8px 24px rgba(15,23,42,.04); }
.metrics span, .metrics small { display:block; color:#64748b; }
.metrics strong { display:block; margin:8px 0 4px; font-size:24px; }
.ok-text { color:#166534; }
.bad-text { color:#991b1b; }
.panel-grid { display:grid; grid-template-columns:1fr; gap:18px; }
.panel { border:1px solid #e5e7eb; border-radius:16px; background:#fff; padding:18px; margin-bottom:18px; }
.panel-title { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; }
.panel-title h2 { margin:0; font-size:18px; }
.suggestions ul { margin:0; padding-left:20px; color:#334155; line-height:1.8; }
.table-wrap { overflow:auto; }
table { width:100%; border-collapse:collapse; }
th, td { border-bottom:1px solid #eef2f7; padding:10px; text-align:left; white-space:nowrap; vertical-align:top; }
th { background:#f8fafc; color:#475569; font-weight:600; }
td strong, td small { display:block; }
td small { color:#64748b; margin-top:4px; }
tr.important td:first-child strong::after { content:' *'; color:#dc2626; }
code { border-radius:8px; background:#f1f5f9; color:#0f172a; padding:3px 6px; }
.tag { border-radius:999px; padding:3px 9px; font-size:12px; background:#e2e8f0; color:#334155; }
.tag.up { background:#dcfce7; color:#166534; }
.tag.down { background:#fee2e2; color:#991b1b; }
.command-panel pre { margin:0; overflow:auto; border-radius:12px; background:#0f172a; color:#e5e7eb; padding:14px; line-height:1.7; }
@media (max-width: 720px) { .page-header { flex-direction:column; } }
</style>
