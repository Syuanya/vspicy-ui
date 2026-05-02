<template>
  <section class="job-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">System Jobs</p>
        <h1>系统任务调度中心</h1>
        <p class="subtitle">集中维护平台定时任务、人工触发记录和执行日志。当前版本先提供任务治理与审计闭环，后续可接入 Quartz、XXL-JOB 或 MQ Worker。</p>
      </div>
      <button class="primary" @click="openCreate">新增任务</button>
    </header>

    <div v-if="error" class="error-box">{{ error }}</div>

    <div class="metric-grid">
      <article class="metric-card">
        <span>任务总数</span>
        <strong>{{ overview?.totalJobs ?? 0 }}</strong>
      </article>
      <article class="metric-card success">
        <span>启用任务</span>
        <strong>{{ overview?.enabledJobs ?? 0 }}</strong>
      </article>
      <article class="metric-card warning">
        <span>今日执行</span>
        <strong>{{ overview?.todayRuns ?? 0 }}</strong>
      </article>
      <article class="metric-card danger">
        <span>失败次数</span>
        <strong>{{ overview?.failedRuns ?? 0 }}</strong>
      </article>
      <article class="metric-card">
        <span>成功率</span>
        <strong>{{ overview?.successRate ?? 0 }}%</strong>
      </article>
    </div>

    <div class="panel filters">
      <input v-model.trim="query.keyword" placeholder="搜索任务编码、名称、执行目标" @keyup.enter="load" />
      <input v-model.trim="query.group" placeholder="任务分组，例如 system / video" @keyup.enter="load" />
      <select v-model="query.status">
        <option value="">全部状态</option>
        <option value="1">启用</option>
        <option value="0">停用</option>
      </select>
      <button @click="load">查询</button>
      <button class="ghost" @click="resetFilters">重置</button>
    </div>

    <div class="content-grid">
      <section class="panel job-list">
        <div class="panel-title">
          <h2>任务列表</h2>
          <span>{{ jobs.length }} 条</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>任务</th>
                <th>分组</th>
                <th>Cron</th>
                <th>状态</th>
                <th>执行情况</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in jobs" :key="item.id" :class="{ selected: selected?.id === item.id }" @click="selectJob(item)">
                <td>
                  <strong>{{ item.jobName }}</strong>
                  <small>{{ item.jobCode }}</small>
                </td>
                <td><span class="tag">{{ item.jobGroup }}</span></td>
                <td><code>{{ item.cronExpression }}</code></td>
                <td><span :class="['status', item.status === 1 ? 'on' : 'off']">{{ item.status === 1 ? '启用' : '停用' }}</span></td>
                <td>
                  <small>总 {{ item.runCount }} / 失败 {{ item.failCount }}</small>
                  <small v-if="item.lastRunAt">{{ item.lastRunStatus }} · {{ formatTime(item.lastRunAt) }}</small>
                </td>
                <td class="actions" @click.stop>
                  <button class="mini" @click="openEdit(item)">编辑</button>
                  <button class="mini" @click="toggleStatus(item)">{{ item.status === 1 ? '停用' : '启用' }}</button>
                  <button class="mini primary-text" @click="runJob(item)">触发</button>
                  <button class="mini danger-text" :disabled="!item.editable" @click="removeJob(item)">删除</button>
                </td>
              </tr>
              <tr v-if="!loading && jobs.length === 0">
                <td colspan="6" class="empty">暂无任务</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside class="panel side-panel">
        <div class="panel-title">
          <h2>执行日志</h2>
          <button class="ghost small" @click="loadLogs">刷新</button>
        </div>
        <div class="log-filter">
          <select v-model="logStatus" @change="loadLogs">
            <option value="">全部</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="SKIPPED">SKIPPED</option>
          </select>
        </div>
        <div class="log-list">
          <article v-for="log in logs" :key="log.id" class="log-card">
            <div class="log-head">
              <strong>{{ log.jobName }}</strong>
              <span :class="['status', log.runStatus === 'SUCCESS' ? 'on' : 'off']">{{ log.runStatus }}</span>
            </div>
            <p>{{ log.runMessage || log.errorMessage || '-' }}</p>
            <small>{{ log.triggerType }} · {{ log.costMs ?? 0 }}ms · {{ formatTime(log.createdAt) }}</small>
          </article>
          <p v-if="!logs.length" class="empty">暂无执行日志</p>
        </div>
      </aside>
    </div>

    <div v-if="editing" class="drawer-mask" @click.self="closeDrawer">
      <form class="drawer" @submit.prevent="saveJob">
        <h2>{{ form.id ? '编辑任务' : '新增任务' }}</h2>
        <label>任务编码<input v-model.trim="form.jobCode" required placeholder="system.xxx.job" /></label>
        <label>任务名称<input v-model.trim="form.jobName" required placeholder="任务名称" /></label>
        <div class="form-grid">
          <label>任务分组<input v-model.trim="form.jobGroup" placeholder="system" /></label>
          <label>任务类型
            <select v-model="form.jobType">
              <option>JAVA</option>
              <option>HTTP</option>
              <option>MQ</option>
              <option>SCRIPT</option>
            </select>
          </label>
        </div>
        <label>Cron 表达式<input v-model.trim="form.cronExpression" required placeholder="0 */5 * * * ?" /></label>
        <label>执行目标<textarea v-model.trim="form.invokeTarget" rows="2" placeholder="worker.method 或 URL" /></label>
        <label>参数 JSON<textarea v-model="form.jobParams" rows="4" placeholder='{"retentionDays":180}' /></label>
        <label>说明<textarea v-model="form.description" rows="3" /></label>
        <div class="form-grid">
          <label>状态
            <select v-model.number="form.status">
              <option :value="1">启用</option>
              <option :value="0">停用</option>
            </select>
          </label>
          <label>错过策略
            <select v-model.number="form.misfirePolicy">
              <option :value="1">立即执行</option>
              <option :value="2">跳过</option>
              <option :value="3">等待下次</option>
            </select>
          </label>
        </div>
        <label class="checkbox"><input v-model="form.allowConcurrent" type="checkbox" /> 允许并发执行</label>
        <label class="checkbox"><input v-model="form.editable" type="checkbox" /> 允许编辑删除</label>
        <div class="drawer-actions">
          <button type="button" class="ghost" @click="closeDrawer">取消</button>
          <button type="submit" class="primary">保存</button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  createSysJob,
  deleteSysJob,
  disableSysJob,
  enableSysJob,
  getSysJobOverview,
  listSysJobLogs,
  listSysJobs,
  runSysJob,
  updateSysJob,
  type SysJobLogView,
  type SysJobOverviewView,
  type SysJobView
} from '../../api/systemJob'

type JobForm = {
  id?: number
  jobCode: string
  jobName: string
  jobGroup: string
  jobType: string
  cronExpression: string
  invokeTarget: string
  jobParams: string
  description: string
  status: number
  allowConcurrent: boolean
  misfirePolicy: number
  editable: boolean
}

const loading = ref(false)
const error = ref('')
const overview = ref<SysJobOverviewView | null>(null)
const jobs = ref<SysJobView[]>([])
const logs = ref<SysJobLogView[]>([])
const selected = ref<SysJobView | null>(null)
const editing = ref(false)
const logStatus = ref('')

const query = reactive({
  keyword: '',
  group: '',
  status: ''
})

const form = reactive<JobForm>({
  jobCode: '',
  jobName: '',
  jobGroup: 'system',
  jobType: 'JAVA',
  cronExpression: '0 */5 * * * ?',
  invokeTarget: '',
  jobParams: '{}',
  description: '',
  status: 0,
  allowConcurrent: false,
  misfirePolicy: 2,
  editable: true
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [overviewResp, listResp] = await Promise.all([
      getSysJobOverview(),
      listSysJobs({
        keyword: query.keyword || undefined,
        group: query.group || undefined,
        status: query.status === '' ? undefined : Number(query.status),
        limit: 200
      })
    ])
    overview.value = overviewResp.data as SysJobOverviewView
    jobs.value = listResp.data as SysJobView[]
    if (!selected.value && jobs.value.length) {
      selected.value = jobs.value[0]
    }
    await loadLogs()
  } catch (err: any) {
    error.value = err?.response?.data?.message || err?.message || '加载系统任务失败'
  } finally {
    loading.value = false
  }
}

async function loadLogs() {
  const resp = await listSysJobLogs({
    jobId: selected.value?.id,
    status: logStatus.value || undefined,
    limit: 100
  })
  logs.value = resp.data as SysJobLogView[]
}

function selectJob(item: SysJobView) {
  selected.value = item
  loadLogs().catch(() => undefined)
}

function resetFilters() {
  query.keyword = ''
  query.group = ''
  query.status = ''
  load()
}

function openCreate() {
  Object.assign(form, {
    id: undefined,
    jobCode: '',
    jobName: '',
    jobGroup: 'system',
    jobType: 'JAVA',
    cronExpression: '0 */5 * * * ?',
    invokeTarget: '',
    jobParams: '{}',
    description: '',
    status: 0,
    allowConcurrent: false,
    misfirePolicy: 2,
    editable: true
  })
  editing.value = true
}

function openEdit(item: SysJobView) {
  Object.assign(form, {
    id: item.id,
    jobCode: item.jobCode,
    jobName: item.jobName,
    jobGroup: item.jobGroup,
    jobType: item.jobType,
    cronExpression: item.cronExpression,
    invokeTarget: item.invokeTarget || '',
    jobParams: item.jobParams || '{}',
    description: item.description || '',
    status: item.status,
    allowConcurrent: item.allowConcurrent,
    misfirePolicy: item.misfirePolicy || 2,
    editable: item.editable
  })
  editing.value = true
}

function closeDrawer() {
  editing.value = false
}

async function saveJob() {
  const payload = {
    jobCode: form.jobCode,
    jobName: form.jobName,
    jobGroup: form.jobGroup,
    jobType: form.jobType,
    cronExpression: form.cronExpression,
    invokeTarget: form.invokeTarget,
    jobParams: form.jobParams,
    description: form.description,
    status: form.status,
    allowConcurrent: form.allowConcurrent,
    misfirePolicy: form.misfirePolicy,
    editable: form.editable
  }
  if (form.id) {
    await updateSysJob(form.id, payload)
  } else {
    await createSysJob(payload)
  }
  editing.value = false
  await load()
}

async function toggleStatus(item: SysJobView) {
  if (item.status === 1) {
    await disableSysJob(item.id)
  } else {
    await enableSysJob(item.id)
  }
  await load()
}

async function runJob(item: SysJobView) {
  if (!window.confirm(`确认人工触发任务「${item.jobName}」？当前版本会生成触发记录，后续可接入真实调度 Worker。`)) {
    return
  }
  await runSysJob(item.id)
  selected.value = item
  await load()
}

async function removeJob(item: SysJobView) {
  if (!item.editable) {
    window.alert('系统内置任务不允许删除')
    return
  }
  if (!window.confirm(`确认删除任务「${item.jobName}」？`)) {
    return
  }
  await deleteSysJob(item.id)
  selected.value = null
  await load()
}

function formatTime(value?: string) {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 19)
}

onMounted(load)
</script>

<style scoped>
.job-page { padding: 24px; color: #1f2937; }
.page-header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; margin-bottom: 20px; }
.eyebrow { margin: 0 0 6px; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: #64748b; }
h1 { margin: 0; font-size: 28px; }
.subtitle { margin: 8px 0 0; color: #64748b; max-width: 860px; }
.metric-grid { display: grid; grid-template-columns: repeat(5, minmax(120px, 1fr)); gap: 12px; margin-bottom: 16px; }
.metric-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, .04); }
.metric-card span { display: block; color: #64748b; font-size: 13px; }
.metric-card strong { display: block; margin-top: 8px; font-size: 26px; }
.metric-card.success strong { color: #16a34a; }
.metric-card.warning strong { color: #d97706; }
.metric-card.danger strong { color: #dc2626; }
.panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 16px; box-shadow: 0 10px 30px rgba(15, 23, 42, .04); }
.filters { display: grid; grid-template-columns: 1.6fr 1fr 160px auto auto; gap: 10px; margin-bottom: 16px; }
input, select, textarea { border: 1px solid #d1d5db; border-radius: 10px; padding: 9px 10px; font: inherit; }
textarea { resize: vertical; }
button { border: 0; border-radius: 10px; padding: 9px 14px; background: #e5e7eb; cursor: pointer; }
button:disabled { opacity: .45; cursor: not-allowed; }
.primary { background: #2563eb; color: white; }
.ghost { background: #f3f4f6; color: #374151; }
.small { padding: 6px 10px; }
.mini { padding: 6px 8px; font-size: 12px; }
.primary-text { color: #2563eb; background: #eff6ff; }
.danger-text { color: #dc2626; background: #fef2f2; }
.content-grid { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 16px; }
.panel-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.panel-title h2 { margin: 0; font-size: 18px; }
.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eef2f7; vertical-align: top; }
th { color: #64748b; font-weight: 600; font-size: 13px; }
td small { display: block; color: #64748b; margin-top: 4px; }
tr.selected { background: #f8fafc; }
.tag, .status { display: inline-flex; border-radius: 999px; padding: 3px 8px; font-size: 12px; background: #f1f5f9; }
.status.on { color: #166534; background: #dcfce7; }
.status.off { color: #991b1b; background: #fee2e2; }
.actions { display: flex; flex-wrap: wrap; gap: 6px; }
.empty { color: #94a3b8; text-align: center; padding: 24px; }
.error-box { margin-bottom: 16px; border: 1px solid #fecaca; background: #fef2f2; color: #991b1b; border-radius: 12px; padding: 12px; }
.log-filter { margin-bottom: 12px; }
.log-list { display: grid; gap: 10px; max-height: 620px; overflow: auto; }
.log-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; background: #fafafa; }
.log-head { display: flex; justify-content: space-between; gap: 8px; }
.log-card p { margin: 8px 0; color: #475569; }
.log-card small { color: #64748b; }
.drawer-mask { position: fixed; inset: 0; background: rgba(15, 23, 42, .45); display: flex; justify-content: flex-end; z-index: 40; }
.drawer { width: min(560px, 100%); background: #fff; padding: 24px; overflow: auto; display: grid; gap: 14px; }
.drawer h2 { margin: 0 0 8px; }
.drawer label { display: grid; gap: 6px; font-size: 14px; color: #475569; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.checkbox { display: flex !important; align-items: center; grid-template-columns: auto 1fr; }
.drawer-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
code { color: #334155; }
@media (max-width: 1100px) { .metric-grid { grid-template-columns: repeat(2, 1fr); } .content-grid { grid-template-columns: 1fr; } .filters { grid-template-columns: 1fr; } }
</style>
