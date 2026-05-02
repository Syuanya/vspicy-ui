<template>
  <section class="release-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Release Center</p>
        <h1>系统发布版本中心</h1>
        <p class="subtitle">登记后台功能、数据库脚本、镜像版本和发布检查项，减少手工合并导致的漏配、重复和不可追踪问题。</p>
      </div>
      <button class="primary" @click="openCreate">新增发布单</button>
    </header>

    <div v-if="error" class="error-box">{{ error }}</div>

    <div class="metric-grid">
      <article class="metric-card"><span>发布总数</span><strong>{{ overview?.totalReleases ?? 0 }}</strong></article>
      <article class="metric-card warning"><span>计划发布</span><strong>{{ overview?.plannedReleases ?? 0 }}</strong></article>
      <article class="metric-card"><span>发布中</span><strong>{{ overview?.releasingReleases ?? 0 }}</strong></article>
      <article class="metric-card success"><span>成功</span><strong>{{ overview?.successReleases ?? 0 }}</strong></article>
      <article class="metric-card danger"><span>失败/回滚</span><strong>{{ (overview?.failedReleases ?? 0) + (overview?.rolledBackReleases ?? 0) }}</strong></article>
      <article class="metric-card danger"><span>高风险</span><strong>{{ overview?.highRiskReleases ?? 0 }}</strong></article>
    </div>

    <div class="panel filters">
      <input v-model.trim="query.keyword" placeholder="搜索发布单、版本、标题、commit、镜像" @keyup.enter="load" />
      <input v-model.trim="query.serviceName" placeholder="服务名，例如 vspicy-admin" @keyup.enter="load" />
      <select v-model="query.environment">
        <option value="">全部环境</option>
        <option>DEV</option><option>TEST</option><option>STAGING</option><option>PROD</option>
      </select>
      <select v-model="query.status">
        <option value="">全部状态</option>
        <option>DRAFT</option><option>PLANNED</option><option>RELEASING</option><option>SUCCESS</option><option>FAILED</option><option>ROLLED_BACK</option><option>CANCELLED</option>
      </select>
      <select v-model="query.riskLevel">
        <option value="">全部风险</option>
        <option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option>
      </select>
      <button @click="load">查询</button>
      <button class="ghost" @click="resetFilters">重置</button>
    </div>

    <div class="content-grid">
      <section class="panel release-list">
        <div class="panel-title">
          <h2>发布列表</h2>
          <span>{{ releases.length }} 条</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>发布单</th><th>环境</th><th>状态</th><th>风险</th><th>服务</th><th>检查</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in releases" :key="item.id" :class="{ selected: selected?.id === item.id }" @click="selectRelease(item)">
                <td>
                  <strong>{{ item.title }}</strong>
                  <small>{{ item.releaseNo }} · {{ item.versionName }}</small>
                  <small>{{ item.gitBranch || '-' }} / {{ item.gitCommit || '-' }}</small>
                </td>
                <td><span class="tag">{{ item.environment }}</span></td>
                <td><span :class="['status', statusClass(item.status)]">{{ item.status }}</span></td>
                <td><span :class="['risk', riskClass(item.riskLevel)]">{{ item.riskLevel }}</span></td>
                <td><small>{{ item.services || '-' }}</small></td>
                <td><small>{{ item.passedChecks }}/{{ item.totalChecks }} 通过，失败 {{ item.failedChecks }}</small></td>
                <td class="actions" @click.stop>
                  <button class="mini" @click="openEdit(item)">编辑</button>
                  <button class="mini" @click="changeStatus(item, 'start')">开始</button>
                  <button class="mini primary-text" @click="changeStatus(item, 'success')">成功</button>
                  <button class="mini danger-text" @click="changeStatus(item, 'fail')">失败</button>
                  <button class="mini danger-text" @click="changeStatus(item, 'rollback')">回滚</button>
                  <button class="mini danger-text" @click="removeRelease(item)">删除</button>
                </td>
              </tr>
              <tr v-if="!loading && releases.length === 0"><td colspan="7" class="empty">暂无发布记录</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside class="panel side-panel">
        <div class="panel-title">
          <h2>发布检查项</h2>
          <button class="ghost small" :disabled="!selected" @click="openCheckCreate">新增</button>
        </div>
        <p v-if="!selected" class="empty">选择左侧发布单后查看检查项</p>
        <div v-else class="check-list">
          <article v-for="item in checks" :key="item.id" class="check-card">
            <div class="check-head">
              <strong>{{ item.checkName }}</strong>
              <span :class="['status', item.status === 'PASS' ? 'on' : item.status === 'FAIL' ? 'off' : '']">{{ item.status }}</span>
            </div>
            <p>{{ item.checkType }} · {{ item.resultNote || '暂无备注' }}</p>
            <div class="check-actions">
              <button class="mini" @click="passCheck(item)">通过</button>
              <button class="mini danger-text" @click="failCheck(item)">失败</button>
            </div>
          </article>
          <p v-if="!checks.length" class="empty">暂无检查项</p>
        </div>
      </aside>
    </div>

    <div v-if="editing" class="drawer-mask" @click.self="closeDrawer">
      <form class="drawer" @submit.prevent="saveRelease">
        <h2>{{ form.id ? '编辑发布单' : '新增发布单' }}</h2>
        <div class="form-grid">
          <label>发布单号<input v-model.trim="form.releaseNo" required placeholder="REL-TEST-20260501-001" /></label>
          <label>版本号<input v-model.trim="form.versionName" required placeholder="v1.0.0" /></label>
        </div>
        <label>发布标题<input v-model.trim="form.title" required placeholder="后台功能合并发布" /></label>
        <div class="form-grid">
          <label>环境<select v-model="form.environment"><option>DEV</option><option>TEST</option><option>STAGING</option><option>PROD</option></select></label>
          <label>风险<select v-model="form.riskLevel"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label>
        </div>
        <label>涉及服务<input v-model.trim="form.services" placeholder="vspicy-admin,vspicy-gateway,vspicy-ui" /></label>
        <div class="form-grid">
          <label>Git 分支<input v-model.trim="form.gitBranch" placeholder="main" /></label>
          <label>Git Commit<input v-model.trim="form.gitCommit" placeholder="commit sha" /></label>
        </div>
        <label>镜像/构建版本<input v-model.trim="form.imageTag" placeholder="vspicy-admin:v1.0.0" /></label>
        <label>计划时间<input v-model.trim="form.plannedAt" placeholder="yyyy-MM-dd HH:mm:ss" /></label>
        <label>发布说明<textarea v-model="form.description" rows="3" /></label>
        <label>变更记录<textarea v-model="form.releaseNote" rows="5" /></label>
        <div class="drawer-actions">
          <button type="button" class="ghost" @click="closeDrawer">取消</button>
          <button type="submit" class="primary">保存</button>
        </div>
      </form>
    </div>

    <div v-if="checking" class="drawer-mask" @click.self="closeCheckDrawer">
      <form class="drawer small-drawer" @submit.prevent="saveCheck">
        <h2>新增检查项</h2>
        <label>检查项名称<input v-model.trim="checkForm.checkName" required placeholder="核心接口冒烟" /></label>
        <label>检查类型<select v-model="checkForm.checkType"><option>SMOKE</option><option>DATABASE</option><option>CONFIG</option><option>ROLLBACK</option><option>MANUAL</option></select></label>
        <label>排序号<input v-model.number="checkForm.sortNo" type="number" /></label>
        <label>备注<textarea v-model="checkForm.resultNote" rows="3" /></label>
        <div class="drawer-actions"><button type="button" class="ghost" @click="closeCheckDrawer">取消</button><button type="submit" class="primary">保存</button></div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  createSystemRelease,
  createSystemReleaseCheck,
  deleteSystemRelease,
  failSystemReleaseCheck,
  getSystemRelease,
  getSystemReleaseOverview,
  listSystemReleaseChecks,
  listSystemReleases,
  markSystemReleaseFail,
  markSystemReleaseSuccess,
  passSystemReleaseCheck,
  rollbackSystemRelease,
  startSystemRelease,
  updateSystemRelease,
  type SystemReleaseCheckItemView,
  type SystemReleaseOverviewView,
  type SystemReleaseView
} from '../../api/systemRelease'

type ReleaseForm = {
  id?: number
  releaseNo: string
  versionName: string
  environment: string
  riskLevel: string
  title: string
  description: string
  services: string
  gitBranch: string
  gitCommit: string
  imageTag: string
  releaseNote: string
  plannedAt: string
}

const overview = ref<SystemReleaseOverviewView | null>(null)
const releases = ref<SystemReleaseView[]>([])
const checks = ref<SystemReleaseCheckItemView[]>([])
const selected = ref<SystemReleaseView | null>(null)
const loading = ref(false)
const error = ref('')
const editing = ref(false)
const checking = ref(false)

const query = reactive({ environment: '', status: '', riskLevel: '', serviceName: '', keyword: '', limit: 100 })
const form = reactive<ReleaseForm>({ releaseNo: '', versionName: '', environment: 'TEST', riskLevel: 'LOW', title: '', description: '', services: '', gitBranch: 'main', gitCommit: '', imageTag: '', releaseNote: '', plannedAt: '' })
const checkForm = reactive({ checkName: '', checkType: 'SMOKE', sortNo: 100, resultNote: '' })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [overviewRes, listRes]: any[] = await Promise.all([
      getSystemReleaseOverview(30),
      listSystemReleases({ ...query })
    ])
    overview.value = overviewRes.data || overviewRes
    releases.value = listRes.data || listRes || []
    if (!selected.value && releases.value.length) await selectRelease(releases.value[0])
  } catch (err: any) {
    error.value = err?.response?.data?.message || err?.message || '加载发布中心失败'
  } finally {
    loading.value = false
  }
}

async function selectRelease(item: SystemReleaseView) {
  const detail: any = await getSystemRelease(item.id)
  selected.value = detail.data || detail
  await loadChecks()
}

async function loadChecks() {
  if (!selected.value) return
  const res: any = await listSystemReleaseChecks(selected.value.id)
  checks.value = res.data || res || []
}

function resetFilters() {
  query.environment = ''; query.status = ''; query.riskLevel = ''; query.serviceName = ''; query.keyword = ''; query.limit = 100
  load()
}

function openCreate() {
  Object.assign(form, { id: undefined, releaseNo: nextReleaseNo(), versionName: '', environment: 'TEST', riskLevel: 'LOW', title: '', description: '', services: 'vspicy-admin,vspicy-gateway,vspicy-ui', gitBranch: 'main', gitCommit: '', imageTag: '', releaseNote: '', plannedAt: '' })
  editing.value = true
}

function openEdit(item: SystemReleaseView) {
  Object.assign(form, { ...item, description: item.description || '', services: item.services || '', gitBranch: item.gitBranch || '', gitCommit: item.gitCommit || '', imageTag: item.imageTag || '', releaseNote: item.releaseNote || '', plannedAt: formatInputTime(item.plannedAt) })
  editing.value = true
}

async function saveRelease() {
  const payload = { ...form }
  if (form.id) await updateSystemRelease(form.id, payload)
  else await createSystemRelease(payload)
  closeDrawer()
  await load()
}

async function changeStatus(item: SystemReleaseView, action: 'start' | 'success' | 'fail' | 'rollback') {
  const note = window.prompt('状态备注，可留空', '') || ''
  if (action === 'start') await startSystemRelease(item.id, { statusNote: note })
  if (action === 'success') await markSystemReleaseSuccess(item.id, { statusNote: note })
  if (action === 'fail') await markSystemReleaseFail(item.id, { statusNote: note })
  if (action === 'rollback') await rollbackSystemRelease(item.id, { statusNote: note, rollbackReason: note })
  await load()
}

async function removeRelease(item: SystemReleaseView) {
  if (!window.confirm(`确认删除发布单 ${item.releaseNo}？`)) return
  await deleteSystemRelease(item.id)
  selected.value = null
  checks.value = []
  await load()
}

function openCheckCreate() {
  if (!selected.value) return
  Object.assign(checkForm, { checkName: '', checkType: 'SMOKE', sortNo: 100, resultNote: '' })
  checking.value = true
}

async function saveCheck() {
  if (!selected.value) return
  await createSystemReleaseCheck(selected.value.id, { ...checkForm })
  closeCheckDrawer()
  await loadChecks()
}

async function passCheck(item: SystemReleaseCheckItemView) {
  const note = window.prompt('通过备注，可留空', item.resultNote || '') || ''
  await passSystemReleaseCheck(item.id, { resultNote: note })
  await loadChecks()
}

async function failCheck(item: SystemReleaseCheckItemView) {
  const note = window.prompt('失败原因', item.resultNote || '') || ''
  await failSystemReleaseCheck(item.id, { resultNote: note })
  await loadChecks()
}

function closeDrawer() { editing.value = false }
function closeCheckDrawer() { checking.value = false }
function statusClass(status: string) { return status === 'SUCCESS' ? 'on' : (status === 'FAILED' || status === 'ROLLED_BACK') ? 'off' : 'pending' }
function riskClass(risk: string) { return risk === 'CRITICAL' || risk === 'HIGH' ? 'high' : risk === 'MEDIUM' ? 'medium' : 'low' }
function formatInputTime(value?: string) { return value ? value.replace('T', ' ').slice(0, 19) : '' }
function nextReleaseNo() { return `REL-TEST-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-4)}` }

onMounted(load)
</script>

<style scoped>
.release-page { display: flex; flex-direction: column; gap: 18px; }
.page-header, .panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 20px; box-shadow: 0 10px 30px rgba(15, 23, 42, .04); }
.page-header { display: flex; justify-content: space-between; gap: 16px; align-items: center; }
.eyebrow { margin: 0 0 6px; color: #6366f1; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
h1 { margin: 0; font-size: 28px; color: #111827; }
.subtitle { margin: 8px 0 0; color: #6b7280; max-width: 880px; }
.primary, button { border: none; border-radius: 10px; padding: 10px 14px; cursor: pointer; background: #eef2ff; color: #3730a3; }
.primary { background: #4f46e5; color: #fff; }
.ghost { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
.metric-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
.metric-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; }
.metric-card span { color: #6b7280; font-size: 13px; }
.metric-card strong { display: block; margin-top: 8px; font-size: 28px; color: #111827; }
.metric-card.success strong { color: #16a34a; } .metric-card.warning strong { color: #d97706; } .metric-card.danger strong { color: #dc2626; }
.filters { display: grid; grid-template-columns: 1.4fr 1fr repeat(3, .8fr) auto auto; gap: 10px; }
input, select, textarea { width: 100%; box-sizing: border-box; border: 1px solid #d1d5db; border-radius: 10px; padding: 10px 12px; font: inherit; }
.content-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; align-items: start; }
.panel-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.panel-title h2 { margin: 0; font-size: 18px; }
.table-wrap { overflow-x: auto; } table { width: 100%; border-collapse: collapse; } th, td { padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: left; vertical-align: top; } th { color: #64748b; font-size: 12px; }
tr.selected { background: #f8fafc; } td strong, td small { display: block; } td small { color: #64748b; margin-top: 4px; }
.tag, .status, .risk { display: inline-flex; border-radius: 999px; padding: 4px 8px; font-size: 12px; background: #f1f5f9; color: #475569; }
.status.on { background: #dcfce7; color: #166534; } .status.off { background: #fee2e2; color: #991b1b; } .status.pending { background: #fef3c7; color: #92400e; }
.risk.high { background: #fee2e2; color: #991b1b; } .risk.medium { background: #fef3c7; color: #92400e; } .risk.low { background: #dcfce7; color: #166534; }
.actions { white-space: nowrap; } .mini { padding: 6px 8px; margin: 2px; font-size: 12px; } .primary-text { color: #3730a3; } .danger-text { color: #b91c1c; }
.check-list { display: flex; flex-direction: column; gap: 10px; } .check-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; } .check-head { display: flex; justify-content: space-between; gap: 10px; }
.empty { color: #94a3b8; text-align: center; padding: 24px; } .error-box { background: #fef2f2; color: #991b1b; padding: 12px 14px; border-radius: 12px; }
.drawer-mask { position: fixed; inset: 0; background: rgba(15,23,42,.35); display: flex; justify-content: flex-end; z-index: 20; }
.drawer { width: min(620px, 96vw); height: 100%; overflow: auto; background: #fff; padding: 24px; display: flex; flex-direction: column; gap: 14px; }
.small-drawer { width: min(420px, 96vw); } .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; } label { display: flex; flex-direction: column; gap: 6px; color: #374151; font-size: 13px; }
.drawer-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
@media (max-width: 1100px) { .metric-grid { grid-template-columns: repeat(2, 1fr); } .filters, .content-grid { grid-template-columns: 1fr; } }
</style>
