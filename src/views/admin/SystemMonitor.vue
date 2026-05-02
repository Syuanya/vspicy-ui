<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getSystemMonitorOverview, type SystemMonitorOverviewView } from '../../api/systemMonitor'

const loading = ref(false)
const error = ref('')
const message = ref('')
const overview = ref<SystemMonitorOverviewView | null>(null)

function normalizeResponse(res: any) {
  if (res?.code === 0) return res.data
  throw new Error(res?.message || '接口返回异常')
}

async function load() {
  loading.value = true
  error.value = ''
  message.value = ''
  try {
    const res: any = await getSystemMonitorOverview()
    overview.value = normalizeResponse(res)
    message.value = '系统监控数据已刷新'
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '加载系统监控失败'
  } finally {
    loading.value = false
  }
}

const heapStatus = computed(() => level(overview.value?.heapMemory?.usageRate || 0))
const nonHeapStatus = computed(() => level(overview.value?.nonHeapMemory?.usageRate || 0))
const cpuStatus = computed(() => level(overview.value?.systemCpuLoad || 0))

function level(value: number) {
  if (value >= 85) return 'danger'
  if (value >= 70) return 'warning'
  return 'success'
}

function formatTime(value?: number) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

onMounted(load)
</script>

<template>
  <section class="monitor-page">
    <div class="page-head">
      <div>
        <p class="eyebrow">SYSTEM MONITOR</p>
        <h1>系统监控中心</h1>
        <p>查看 Admin 服务所在节点的 JVM、线程、CPU、磁盘和运行环境，适合本地联调与测试环境排障。</p>
      </div>
      <button :disabled="loading" @click="load">{{ loading ? '刷新中...' : '刷新监控' }}</button>
    </div>

    <div v-if="error" class="alert error">{{ error }}</div>
    <div v-else-if="message" class="alert success">{{ message }}</div>

    <template v-if="overview">
      <div class="cards">
        <article class="card">
          <span>主机</span>
          <strong>{{ overview.hostName }}</strong>
          <small>{{ overview.osName }} {{ overview.osVersion }} / {{ overview.osArch }}</small>
        </article>
        <article class="card">
          <span>运行时长</span>
          <strong>{{ overview.uptimeText }}</strong>
          <small>采集时间：{{ formatTime(overview.collectedAt) }}</small>
        </article>
        <article class="card" :class="cpuStatus">
          <span>系统 CPU</span>
          <strong>{{ overview.systemCpuLoad.toFixed(2) }}%</strong>
          <small>进程 CPU：{{ overview.processCpuLoad.toFixed(2) }}%</small>
        </article>
        <article class="card">
          <span>处理器</span>
          <strong>{{ overview.availableProcessors }}</strong>
          <small>Load Average：{{ overview.systemLoadAverage < 0 ? 'N/A' : overview.systemLoadAverage.toFixed(2) }}</small>
        </article>
      </div>

      <div class="grid two">
        <article class="panel">
          <div class="panel-title">
            <h2>JVM 内存</h2>
            <span>Heap / Non-Heap</span>
          </div>
          <div class="metric-row">
            <div>
              <strong>堆内存</strong>
              <p>{{ overview.heapMemory.usedText }} / {{ overview.heapMemory.maxText }}</p>
            </div>
            <span :class="['pill', heapStatus]">{{ overview.heapMemory.usageRate.toFixed(2) }}%</span>
          </div>
          <div class="bar"><i :style="{ width: `${Math.min(overview.heapMemory.usageRate, 100)}%` }"></i></div>
          <div class="metric-row">
            <div>
              <strong>非堆内存</strong>
              <p>{{ overview.nonHeapMemory.usedText }} / {{ overview.nonHeapMemory.maxText }}</p>
            </div>
            <span :class="['pill', nonHeapStatus]">{{ overview.nonHeapMemory.usageRate.toFixed(2) }}%</span>
          </div>
          <div class="bar"><i :style="{ width: `${Math.min(overview.nonHeapMemory.usageRate, 100)}%` }"></i></div>
        </article>

        <article class="panel">
          <div class="panel-title">
            <h2>线程状态</h2>
            <span>ThreadMXBean</span>
          </div>
          <div class="thread-grid">
            <div><strong>{{ overview.thread.liveThreadCount }}</strong><span>当前线程</span></div>
            <div><strong>{{ overview.thread.daemonThreadCount }}</strong><span>守护线程</span></div>
            <div><strong>{{ overview.thread.peakThreadCount }}</strong><span>峰值线程</span></div>
            <div><strong>{{ overview.thread.totalStartedThreadCount }}</strong><span>累计启动</span></div>
          </div>
        </article>
      </div>

      <article class="panel">
        <div class="panel-title">
          <h2>磁盘空间</h2>
          <span>{{ overview.disks.length }} 个挂载点</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>路径</th>
                <th>已用</th>
                <th>可用</th>
                <th>总量</th>
                <th>使用率</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="disk in overview.disks" :key="disk.path">
                <td>{{ disk.path }}</td>
                <td>{{ disk.usedText }}</td>
                <td>{{ disk.usableText }}</td>
                <td>{{ disk.totalText }}</td>
                <td>
                  <span :class="['pill', level(disk.usageRate)]">{{ disk.usageRate.toFixed(2) }}%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <div class="grid two">
        <article class="panel">
          <div class="panel-title">
            <h2>Java 运行环境</h2>
            <span>{{ overview.vmName }}</span>
          </div>
          <dl class="details">
            <dt>Java</dt><dd>{{ overview.javaVersion }} / {{ overview.javaVendor }}</dd>
            <dt>用户</dt><dd>{{ overview.userName }}</dd>
            <dt>工作目录</dt><dd>{{ overview.workDir }}</dd>
          </dl>
        </article>

        <article class="panel">
          <div class="panel-title">
            <h2>运行参数</h2>
            <span>Runtime Properties</span>
          </div>
          <dl class="details compact">
            <template v-for="item in overview.runtimeProperties" :key="item.name">
              <dt>{{ item.name }}</dt>
              <dd>{{ item.value || '-' }}</dd>
            </template>
          </dl>
        </article>
      </div>
    </template>
  </section>
</template>

<style scoped>
.monitor-page { padding: 24px; color: #0f172a; }
.page-head { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; margin-bottom: 18px; }
.page-head h1 { margin: 4px 0 8px; font-size: 28px; }
.page-head p { margin: 0; color: #64748b; }
.eyebrow { font-size: 12px; letter-spacing: .14em; color: #2563eb !important; font-weight: 800; }
button { border: 0; border-radius: 12px; padding: 10px 16px; background: #2563eb; color: white; cursor: pointer; font-weight: 700; }
button:disabled { opacity: .6; cursor: not-allowed; }
.alert { padding: 12px 14px; border-radius: 12px; margin-bottom: 16px; }
.alert.error { background: #fef2f2; color: #991b1b; }
.alert.success { background: #ecfdf5; color: #047857; }
.cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 16px; }
.card, .panel { background: white; border: 1px solid #e2e8f0; border-radius: 18px; box-shadow: 0 10px 30px rgba(15, 23, 42, .05); }
.card { padding: 18px; }
.card span { display: block; color: #64748b; font-size: 13px; }
.card strong { display: block; margin: 8px 0; font-size: 24px; }
.card small { color: #64748b; }
.card.warning { border-color: #facc15; }
.card.danger { border-color: #f87171; }
.grid.two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
.panel { padding: 18px; margin-bottom: 16px; }
.panel-title { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; }
.panel-title h2 { margin: 0; font-size: 18px; }
.panel-title span { color: #64748b; font-size: 13px; }
.metric-row { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-top: 12px; }
.metric-row strong { display: block; }
.metric-row p { margin: 4px 0 0; color: #64748b; }
.bar { height: 10px; border-radius: 999px; background: #e2e8f0; overflow: hidden; margin-top: 10px; }
.bar i { display: block; height: 100%; background: #2563eb; }
.pill { display: inline-flex; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; background: #e0f2fe; color: #0369a1; }
.pill.success { background: #dcfce7; color: #166534; }
.pill.warning { background: #fef3c7; color: #92400e; }
.pill.danger { background: #fee2e2; color: #991b1b; }
.thread-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.thread-grid div { background: #f8fafc; border-radius: 14px; padding: 14px; }
.thread-grid strong { display: block; font-size: 24px; }
.thread-grid span { color: #64748b; font-size: 13px; }
.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; }
th { color: #64748b; font-size: 13px; }
.details { display: grid; grid-template-columns: 120px 1fr; gap: 10px 14px; margin: 0; }
.details dt { color: #64748b; font-weight: 700; }
.details dd { margin: 0; word-break: break-all; }
.details.compact { grid-template-columns: 150px 1fr; font-size: 13px; }
@media (max-width: 1100px) { .cards, .grid.two { grid-template-columns: 1fr 1fr; } }
@media (max-width: 760px) { .page-head { flex-direction: column; } .cards, .grid.two, .thread-grid { grid-template-columns: 1fr; } }
</style>
