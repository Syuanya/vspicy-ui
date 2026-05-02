<template>
  <div class="feature-governance-page">
    <section class="page-header">
      <div>
        <p class="eyebrow">FEATURE GOVERNANCE</p>
        <h1>系统功能治理中心</h1>
        <p class="subtitle">统一登记后台页面、接口、权限码与菜单入口，检查重复和缺失问题，避免系统功能越开发越混乱。</p>
      </div>
      <div class="header-actions">
        <button class="secondary" @click="loadAll">刷新</button>
        <button class="primary" @click="runCheck">运行检查</button>
        <button class="primary ghost" @click="openCreate">登记功能</button>
      </div>
    </section>

    <section class="metrics" v-if="overview">
      <article class="metric-card">
        <span>功能总数</span>
        <strong>{{ overview.totalFeatures }}</strong>
      </article>
      <article class="metric-card ok">
        <span>启用功能</span>
        <strong>{{ overview.enabledFeatures }}</strong>
      </article>
      <article class="metric-card danger">
        <span>待处理问题</span>
        <strong>{{ overview.openIssues }}</strong>
      </article>
      <article class="metric-card danger">
        <span>阻断问题</span>
        <strong>{{ overview.blockerIssues }}</strong>
      </article>
      <article class="metric-card warn">
        <span>高危问题</span>
        <strong>{{ overview.highIssues }}</strong>
      </article>
      <article class="metric-card">
        <span>最近检查</span>
        <strong class="small-text">{{ overview.lastRunAt || '未检查' }}</strong>
      </article>
    </section>

    <section class="layout-grid">
      <section class="content-card">
        <div class="card-title">
          <div>
            <h2>功能登记</h2>
            <p>每个后台功能都应该有稳定的路由、权限码和接口登记。</p>
          </div>
          <button class="secondary" @click="loadFeatures">查询</button>
        </div>
        <div class="filters">
          <input v-model.trim="featureQuery.keyword" placeholder="搜索功能名 / 路由 / API / 权限码" @keyup.enter="loadFeatures" />
          <select v-model="featureQuery.moduleName" @change="loadFeatures">
            <option value="">全部模块</option>
            <option v-for="item in modules" :key="item" :value="item">{{ item }}</option>
          </select>
          <select v-model="featureQuery.featureType" @change="loadFeatures">
            <option value="">全部类型</option>
            <option v-for="item in featureTypes" :key="item" :value="item">{{ item }}</option>
          </select>
          <select v-model="featureQuery.status" @change="loadFeatures">
            <option value="">全部状态</option>
            <option value="ENABLED">启用</option>
            <option value="DISABLED">禁用</option>
          </select>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>功能</th>
                <th>类型</th>
                <th>路由 / API</th>
                <th>权限码</th>
                <th>风险</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in features" :key="item.id">
                <td>
                  <strong>{{ item.featureName }}</strong>
                  <small>{{ item.featureCode }}</small>
                  <small>{{ item.moduleName }} / {{ item.serviceName }}</small>
                </td>
                <td><span class="pill">{{ item.featureType }}</span></td>
                <td class="path-cell">
                  <code v-if="item.routePath">{{ item.routePath }}</code>
                  <code v-if="item.apiPath">{{ item.apiMethod || 'ALL' }} {{ item.apiPath }}</code>
                </td>
                <td><code>{{ item.permissionCode || '-' }}</code></td>
                <td><span :class="['risk', item.riskLevel?.toLowerCase()]">{{ item.riskLevel }}</span></td>
                <td><span :class="['status', item.status === 'ENABLED' ? 'ok' : 'off']">{{ item.status }}</span></td>
                <td class="actions">
                  <button @click="openEdit(item)">编辑</button>
                  <button v-if="item.status === 'ENABLED'" @click="toggleFeature(item, 'disable')">禁用</button>
                  <button v-else @click="toggleFeature(item, 'enable')">启用</button>
                  <button class="danger" @click="removeFeature(item)">删除</button>
                </td>
              </tr>
              <tr v-if="!features.length && !loadingFeatures">
                <td colspan="7" class="empty">暂无功能登记</td>
              </tr>
            </tbody>
          </table>
          <div v-if="loadingFeatures" class="loading">加载中...</div>
        </div>
      </section>

      <section class="content-card issue-card">
        <div class="card-title">
          <div>
            <h2>治理问题</h2>
            <p>重点处理重复路由、重复 API、重复权限码和菜单重名。</p>
          </div>
          <button class="secondary" @click="loadIssues">查询</button>
        </div>
        <div class="filters issue-filters">
          <input v-model.trim="issueQuery.keyword" placeholder="搜索问题 / 目标值 / 功能编码" @keyup.enter="loadIssues" />
          <select v-model="issueQuery.status" @change="loadIssues">
            <option value="OPEN">待处理</option>
            <option value="RESOLVED">已处理</option>
            <option value="IGNORED">已忽略</option>
            <option value="">全部</option>
          </select>
          <select v-model="issueQuery.severity" @change="loadIssues">
            <option value="">全部等级</option>
            <option value="BLOCKER">阻断</option>
            <option value="HIGH">高危</option>
            <option value="WARN">警告</option>
            <option value="INFO">提示</option>
          </select>
        </div>
        <div class="issue-list">
          <article v-for="item in issues" :key="item.id" class="issue-item">
            <div class="issue-head">
              <span :class="['severity', item.severity?.toLowerCase()]">{{ item.severity }}</span>
              <strong>{{ item.issueType }}</strong>
              <span :class="['status', item.status === 'OPEN' ? 'danger-status' : 'ok']">{{ item.status }}</span>
            </div>
            <p>{{ item.issueMessage }}</p>
            <code>{{ item.targetType }}：{{ item.targetValue || '-' }}</code>
            <small>{{ item.featureCode }} / {{ item.featureName }} / {{ item.createdAt }}</small>
            <div class="actions">
              <button v-if="item.status === 'OPEN'" @click="handleIssue(item, 'resolve')">标记已处理</button>
              <button v-if="item.status === 'OPEN'" @click="handleIssue(item, 'ignore')">忽略</button>
              <button v-if="item.status !== 'OPEN'" @click="handleIssue(item, 'reopen')">重新打开</button>
            </div>
          </article>
          <div v-if="!issues.length && !loadingIssues" class="empty issue-empty">暂无治理问题</div>
          <div v-if="loadingIssues" class="loading">加载中...</div>
        </div>
      </section>
    </section>

    <dialog ref="editDialog" class="dialog">
      <form method="dialog" @submit.prevent="submitFeature">
        <h3>{{ editing?.id ? '编辑功能登记' : '新增功能登记' }}</h3>
        <div class="form-grid">
          <label>功能编码<input v-model.trim="form.featureCode" :disabled="!!editing?.id" required /></label>
          <label>功能名称<input v-model.trim="form.featureName" required /></label>
          <label>功能类型
            <select v-model="form.featureType"><option v-for="item in featureTypes" :key="item" :value="item">{{ item }}</option></select>
          </label>
          <label>模块
            <select v-model="form.moduleName"><option v-for="item in modules" :key="item" :value="item">{{ item }}</option></select>
          </label>
          <label>服务名<input v-model.trim="form.serviceName" /></label>
          <label>风险等级
            <select v-model="form.riskLevel"><option v-for="item in riskLevels" :key="item" :value="item">{{ item }}</option></select>
          </label>
          <label class="wide">前端路由<input v-model.trim="form.routePath" placeholder="/admin/xxx" /></label>
          <label class="wide">接口路径<input v-model.trim="form.apiPath" placeholder="/api/admin/xxx/**" /></label>
          <label>接口方法<input v-model.trim="form.apiMethod" placeholder="GET / POST / ALL" /></label>
          <label>权限码<input v-model.trim="form.permissionCode" placeholder="system:xxx:view" /></label>
          <label>菜单标题<input v-model.trim="form.menuTitle" /></label>
          <label>菜单分组<input v-model.trim="form.menuGroup" /></label>
          <label>负责人<input v-model.trim="form.owner" /></label>
          <label>状态
            <select v-model="form.status"><option value="ENABLED">启用</option><option value="DISABLED">禁用</option></select>
          </label>
          <label class="wide">说明<textarea v-model="form.description" rows="3" /></label>
        </div>
        <div class="dialog-actions">
          <button type="button" class="secondary" @click="closeDialog">取消</button>
          <button type="submit" class="primary">保存</button>
        </div>
      </form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  createFeatureRegistry,
  deleteFeatureRegistry,
  disableFeatureRegistry,
  enableFeatureRegistry,
  getFeatureGovernanceOverview,
  ignoreFeatureGovernanceIssue,
  listFeatureGovernanceIssues,
  listFeatureRegistry,
  reopenFeatureGovernanceIssue,
  resolveFeatureGovernanceIssue,
  runFeatureGovernanceCheck,
  updateFeatureRegistry,
} from '../../api/featureGovernance'

const featureTypes = ['PAGE', 'API', 'BUTTON', 'JOB', 'INTEGRATION']
const modules = ['SYSTEM', 'VIDEO', 'SUPPORT', 'NOTIFICATION', 'MEMBER', 'CONTENT', 'USER', 'DASHBOARD', 'OTHER']
const riskLevels = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL']

const overview = ref<any>(null)
const features = ref<any[]>([])
const issues = ref<any[]>([])
const loadingFeatures = ref(false)
const loadingIssues = ref(false)
const editDialog = ref<HTMLDialogElement>()
const editing = ref<any>(null)

const featureQuery = reactive({ keyword: '', moduleName: '', featureType: '', status: '', riskLevel: '', limit: 200 })
const issueQuery = reactive({ keyword: '', status: 'OPEN', severity: '', issueType: '', limit: 200 })

const form = reactive<any>({
  featureCode: '',
  featureName: '',
  featureType: 'PAGE',
  moduleName: 'SYSTEM',
  serviceName: 'vspicy-admin',
  routePath: '',
  apiPath: '',
  apiMethod: 'GET',
  permissionCode: '',
  menuTitle: '',
  menuGroup: 'system',
  owner: 'system',
  riskLevel: 'NORMAL',
  status: 'ENABLED',
  description: '',
})

function unwrap(res: any) {
  return res?.data?.data ?? res?.data ?? res
}

async function loadOverview() {
  overview.value = unwrap(await getFeatureGovernanceOverview())
}

async function loadFeatures() {
  loadingFeatures.value = true
  try {
    features.value = unwrap(await listFeatureRegistry({ ...featureQuery })) || []
  } finally {
    loadingFeatures.value = false
  }
}

async function loadIssues() {
  loadingIssues.value = true
  try {
    issues.value = unwrap(await listFeatureGovernanceIssues({ ...issueQuery })) || []
  } finally {
    loadingIssues.value = false
  }
}

async function loadAll() {
  await Promise.all([loadOverview(), loadFeatures(), loadIssues()])
}

async function runCheck() {
  await runFeatureGovernanceCheck()
  await loadAll()
}

function resetForm() {
  Object.assign(form, {
    featureCode: '',
    featureName: '',
    featureType: 'PAGE',
    moduleName: 'SYSTEM',
    serviceName: 'vspicy-admin',
    routePath: '',
    apiPath: '',
    apiMethod: 'GET',
    permissionCode: '',
    menuTitle: '',
    menuGroup: 'system',
    owner: 'system',
    riskLevel: 'NORMAL',
    status: 'ENABLED',
    description: '',
  })
}

function openCreate() {
  editing.value = null
  resetForm()
  editDialog.value?.showModal()
}

function openEdit(item: any) {
  editing.value = item
  Object.assign(form, { ...item })
  editDialog.value?.showModal()
}

function closeDialog() {
  editDialog.value?.close()
}

async function submitFeature() {
  if (editing.value?.id) {
    await updateFeatureRegistry(editing.value.id, { ...form })
  } else {
    await createFeatureRegistry({ ...form })
  }
  closeDialog()
  await loadAll()
}

async function toggleFeature(item: any, action: 'enable' | 'disable') {
  if (action === 'enable') {
    await enableFeatureRegistry(item.id)
  } else {
    await disableFeatureRegistry(item.id)
  }
  await loadAll()
}

async function removeFeature(item: any) {
  if (!confirm(`确认删除功能登记：${item.featureName}？`)) return
  await deleteFeatureRegistry(item.id)
  await loadAll()
}

async function handleIssue(item: any, action: 'resolve' | 'ignore' | 'reopen') {
  if (action === 'resolve') {
    const remark = prompt('处理备注', '已完成路由/权限/菜单调整') || ''
    await resolveFeatureGovernanceIssue(item.id, remark)
  } else if (action === 'ignore') {
    const remark = prompt('忽略原因', '确认该差异可接受') || ''
    await ignoreFeatureGovernanceIssue(item.id, remark)
  } else {
    await reopenFeatureGovernanceIssue(item.id)
  }
  await loadAll()
}

onMounted(loadAll)
</script>

<style scoped>
.feature-governance-page { padding: 24px; color: #172033; }
.page-header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; margin-bottom: 20px; }
.eyebrow { margin: 0 0 6px; font-size: 12px; letter-spacing: 0.12em; color: #667085; font-weight: 700; }
h1 { margin: 0; font-size: 28px; }
.subtitle { margin: 8px 0 0; color: #667085; }
.header-actions, .actions, .dialog-actions { display: flex; gap: 8px; flex-wrap: wrap; }
button { border: 1px solid #d0d5dd; background: #fff; color: #344054; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
button.primary { background: #155eef; border-color: #155eef; color: #fff; }
button.ghost { background: #eef4ff; color: #155eef; }
button.secondary { background: #f8fafc; }
button.danger { color: #b42318; border-color: #fecdca; background: #fff5f6; }
.metrics { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.metric-card { background: #fff; border: 1px solid #eaecf0; border-radius: 16px; padding: 16px; box-shadow: 0 1px 2px rgba(16,24,40,.04); }
.metric-card span { display: block; color: #667085; font-size: 13px; margin-bottom: 8px; }
.metric-card strong { font-size: 24px; }
.metric-card .small-text { font-size: 13px; }
.metric-card.ok strong { color: #027a48; }
.metric-card.warn strong { color: #b54708; }
.metric-card.danger strong { color: #b42318; }
.layout-grid { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(360px, .7fr); gap: 16px; }
.content-card { background: #fff; border: 1px solid #eaecf0; border-radius: 16px; padding: 16px; box-shadow: 0 1px 2px rgba(16,24,40,.04); }
.card-title { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
h2 { margin: 0; font-size: 18px; }
.card-title p { margin: 6px 0 0; color: #667085; font-size: 13px; }
.filters { display: grid; grid-template-columns: minmax(220px, 1fr) 140px 140px 120px; gap: 8px; margin-bottom: 12px; }
.issue-filters { grid-template-columns: minmax(180px, 1fr) 120px 120px; }
input, select, textarea { width: 100%; border: 1px solid #d0d5dd; border-radius: 8px; padding: 8px 10px; box-sizing: border-box; }
.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { text-align: left; border-bottom: 1px solid #eaecf0; padding: 10px; vertical-align: top; }
th { color: #667085; font-weight: 600; background: #f9fafb; }
td small { display: block; color: #667085; margin-top: 4px; }
code { display: block; padding: 3px 5px; background: #f2f4f7; border-radius: 6px; color: #344054; margin: 2px 0; word-break: break-all; }
.path-cell { min-width: 200px; }
.pill, .status, .risk, .severity { display: inline-flex; align-items: center; border-radius: 999px; padding: 3px 8px; font-size: 12px; font-weight: 700; }
.pill { background: #eef4ff; color: #155eef; }
.status.ok { background: #ecfdf3; color: #027a48; }
.status.off { background: #f2f4f7; color: #667085; }
.status.danger-status { background: #fff1f3; color: #c01048; }
.risk.low { background: #f0f9ff; color: #026aa2; }
.risk.normal { background: #f2f4f7; color: #344054; }
.risk.high, .severity.high { background: #fffaeb; color: #b54708; }
.risk.critical, .severity.blocker { background: #fff1f3; color: #c01048; }
.severity.warn { background: #fffaeb; color: #b54708; }
.severity.info { background: #f0f9ff; color: #026aa2; }
.issue-list { display: flex; flex-direction: column; gap: 10px; max-height: 720px; overflow: auto; }
.issue-item { border: 1px solid #eaecf0; border-radius: 14px; padding: 12px; background: #fcfcfd; }
.issue-head { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.issue-item p { margin: 0 0 8px; color: #344054; }
.issue-item small { display: block; color: #667085; margin: 8px 0; }
.empty, .loading { padding: 24px; text-align: center; color: #667085; }
.dialog { border: 0; border-radius: 16px; width: min(760px, 92vw); padding: 0; }
.dialog form { padding: 20px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.form-grid label { display: flex; flex-direction: column; gap: 6px; color: #344054; font-size: 13px; }
.form-grid .wide { grid-column: 1 / -1; }
.dialog-actions { justify-content: flex-end; margin-top: 16px; }
@media (max-width: 1180px) { .metrics { grid-template-columns: repeat(3, 1fr); } .layout-grid { grid-template-columns: 1fr; } }
@media (max-width: 760px) { .page-header { flex-direction: column; } .metrics { grid-template-columns: repeat(2, 1fr); } .filters { grid-template-columns: 1fr; } }
</style>
