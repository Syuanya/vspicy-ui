<template>
  <div class="system-config-page">
    <section class="page-header">
      <div>
        <p class="eyebrow">SYSTEM CONFIG</p>
        <h1>系统配置中心</h1>
        <p class="subtitle">集中维护站点、上传、转码、通知与安全参数，并记录每次变更。</p>
      </div>
      <div class="header-actions">
        <button class="secondary" @click="loadAll">刷新</button>
        <button class="primary" @click="openCreate">新增配置</button>
      </div>
    </section>

    <section class="metrics" v-if="overview">
      <article class="metric-card">
        <span>总配置</span>
        <strong>{{ overview.total }}</strong>
      </article>
      <article class="metric-card">
        <span>启用</span>
        <strong>{{ overview.enabled }}</strong>
      </article>
      <article class="metric-card">
        <span>可编辑</span>
        <strong>{{ overview.editable }}</strong>
      </article>
      <article class="metric-card warn">
        <span>敏感配置</span>
        <strong>{{ overview.sensitive }}</strong>
      </article>
      <article class="metric-card">
        <span>今日变更</span>
        <strong>{{ overview.changedToday }}</strong>
      </article>
    </section>

    <section class="filters">
      <input v-model.trim="query.keyword" placeholder="搜索配置键 / 名称 / 描述" @keyup.enter="loadConfigs" />
      <select v-model="query.category" @change="loadConfigs">
        <option value="">全部分类</option>
        <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
      </select>
      <select v-model="query.valueType" @change="loadConfigs">
        <option value="">全部类型</option>
        <option v-for="item in valueTypes" :key="item" :value="item">{{ item }}</option>
      </select>
      <select v-model="query.status" @change="loadConfigs">
        <option value="">全部状态</option>
        <option value="ENABLED">启用</option>
        <option value="DISABLED">禁用</option>
      </select>
      <label class="check"><input type="checkbox" v-model="query.includeSensitive" @change="loadConfigs" /> 显示敏感值</label>
      <button class="secondary" @click="loadConfigs">查询</button>
    </section>

    <section class="content-card">
      <table>
        <thead>
          <tr>
            <th>配置键</th>
            <th>名称</th>
            <th>分类</th>
            <th>类型</th>
            <th>配置值</th>
            <th>状态</th>
            <th>版本</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in configs" :key="item.id">
            <td><code>{{ item.configKey }}</code></td>
            <td>
              <strong>{{ item.configName }}</strong>
              <small v-if="item.description">{{ item.description }}</small>
            </td>
            <td><span class="pill">{{ item.category }}</span></td>
            <td>{{ item.valueType }}</td>
            <td class="value-cell">{{ item.configValue }}</td>
            <td><span :class="['status', item.status === 'ENABLED' ? 'ok' : 'off']">{{ item.status }}</span></td>
            <td>v{{ item.version }}</td>
            <td>{{ item.updatedAt }}</td>
            <td class="actions">
              <button @click="openEdit(item)">编辑</button>
              <button @click="openChanges(item)">变更</button>
              <button v-if="item.status === 'ENABLED'" @click="changeStatus(item, 'disable')">禁用</button>
              <button v-else @click="changeStatus(item, 'enable')">启用</button>
              <button @click="resetItem(item)">重置</button>
              <button class="danger" @click="removeItem(item)">删除</button>
            </td>
          </tr>
          <tr v-if="!configs.length && !loading">
            <td colspan="9" class="empty">暂无配置</td>
          </tr>
        </tbody>
      </table>
      <div v-if="loading" class="loading">加载中...</div>
    </section>

    <dialog ref="editDialog" class="dialog">
      <form method="dialog" @submit.prevent="submitForm">
        <h3>{{ editing?.id ? '编辑配置' : '新增配置' }}</h3>
        <div class="form-grid">
          <label>配置键<input v-model.trim="form.configKey" :disabled="!!editing?.id" required /></label>
          <label>配置名称<input v-model.trim="form.configName" required /></label>
          <label>分类
            <select v-model="form.category"><option v-for="item in categories" :key="item" :value="item">{{ item }}</option></select>
          </label>
          <label>值类型
            <select v-model="form.valueType"><option v-for="item in valueTypes" :key="item" :value="item">{{ item }}</option></select>
          </label>
          <label class="wide">配置值<textarea v-model="form.configValue" rows="4" /></label>
          <label class="wide">默认值<textarea v-model="form.defaultValue" rows="2" /></label>
          <label>状态
            <select v-model="form.status"><option value="ENABLED">启用</option><option value="DISABLED">禁用</option></select>
          </label>
          <label>校验规则<input v-model.trim="form.validationRule" /></label>
          <label class="wide">说明<textarea v-model="form.description" rows="2" /></label>
          <label class="check"><input type="checkbox" v-model="form.editable" /> 允许编辑</label>
          <label class="check"><input type="checkbox" v-model="form.sensitive" /> 敏感配置</label>
          <label class="check"><input type="checkbox" v-model="form.required" /> 必填</label>
          <label class="wide">变更原因<input v-model.trim="form.changeReason" placeholder="建议填写，便于审计追踪" /></label>
        </div>
        <div class="dialog-actions">
          <button type="button" class="secondary" @click="closeEdit">取消</button>
          <button type="submit" class="primary">保存</button>
        </div>
      </form>
    </dialog>

    <dialog ref="changeDialog" class="dialog wide-dialog">
      <h3>配置变更记录</h3>
      <div class="change-list">
        <article v-for="item in changes" :key="item.id" class="change-item">
          <header>
            <strong>{{ item.changeType }}</strong>
            <span>{{ item.createdAt }}</span>
          </header>
          <p>操作人：{{ item.operatorName || item.operatorId || '-' }} ｜ IP：{{ item.operatorIp || '-' }}</p>
          <p v-if="item.changeReason">原因：{{ item.changeReason }}</p>
          <pre>Before: {{ item.beforeValue ?? '-' }}\nAfter: {{ item.afterValue ?? '-' }}</pre>
        </article>
        <p v-if="!changes.length" class="empty">暂无变更记录</p>
      </div>
      <div class="dialog-actions">
        <button class="secondary" @click="closeChanges">关闭</button>
      </div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  createSystemConfig,
  deleteSystemConfig,
  disableSystemConfig,
  enableSystemConfig,
  getSystemConfigOverview,
  listSystemConfigChanges,
  listSystemConfigs,
  resetSystemConfig,
  updateSystemConfig,
  type SystemConfigPayload,
} from '../../api/systemConfig'

const categories = ['SYSTEM', 'UPLOAD', 'VIDEO', 'NOTIFICATION', 'SECURITY', 'BILLING', 'OTHER']
const valueTypes = ['STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'TEXT']

const loading = ref(false)
const overview = ref<any>(null)
const configs = ref<any[]>([])
const changes = ref<any[]>([])
const editing = ref<any>(null)
const editDialog = ref<HTMLDialogElement | null>(null)
const changeDialog = ref<HTMLDialogElement | null>(null)

const query = reactive({
  keyword: '',
  category: '',
  valueType: '',
  status: '',
  includeSensitive: false,
  limit: 200,
})

const form = reactive<SystemConfigPayload>({
  configKey: '',
  configName: '',
  configValue: '',
  defaultValue: '',
  category: 'SYSTEM',
  valueType: 'STRING',
  editable: true,
  sensitive: false,
  required: false,
  validationRule: '',
  description: '',
  status: 'ENABLED',
  changeReason: '',
})

function unwrap(res: any) {
  return res?.data?.data ?? res?.data ?? res
}

async function loadOverview() {
  overview.value = unwrap(await getSystemConfigOverview())
}

async function loadConfigs() {
  loading.value = true
  try {
    configs.value = unwrap(await listSystemConfigs({ ...query })) || []
  } finally {
    loading.value = false
  }
}

async function loadAll() {
  await Promise.all([loadOverview(), loadConfigs()])
}

function resetForm() {
  Object.assign(form, {
    configKey: '',
    configName: '',
    configValue: '',
    defaultValue: '',
    category: 'SYSTEM',
    valueType: 'STRING',
    editable: true,
    sensitive: false,
    required: false,
    validationRule: '',
    description: '',
    status: 'ENABLED',
    changeReason: '',
  })
}

function openCreate() {
  editing.value = null
  resetForm()
  editDialog.value?.showModal()
}

function openEdit(item: any) {
  editing.value = item
  Object.assign(form, {
    configKey: item.configKey,
    configName: item.configName,
    configValue: item.rawConfigValue ?? item.configValue,
    defaultValue: item.defaultValue,
    category: item.category,
    valueType: item.valueType,
    editable: item.editable,
    sensitive: item.sensitive,
    required: item.required,
    validationRule: item.validationRule,
    description: item.description,
    status: item.status,
    changeReason: '',
  })
  editDialog.value?.showModal()
}

function closeEdit() {
  editDialog.value?.close()
}

async function submitForm() {
  if (editing.value?.id) {
    await updateSystemConfig(editing.value.id, { ...form })
  } else {
    await createSystemConfig({ ...form })
  }
  closeEdit()
  await loadAll()
}

async function changeStatus(item: any, action: 'enable' | 'disable') {
  const reason = window.prompt(`请输入${action === 'enable' ? '启用' : '禁用'}原因`, '') || undefined
  if (action === 'enable') {
    await enableSystemConfig(item.id, reason)
  } else {
    await disableSystemConfig(item.id, reason)
  }
  await loadAll()
}

async function resetItem(item: any) {
  const reason = window.prompt('请输入重置原因', '恢复默认值') || undefined
  await resetSystemConfig(item.id, reason)
  await loadAll()
}

async function removeItem(item: any) {
  const reason = window.prompt(`确认删除配置 ${item.configKey}，请输入删除原因`, '')
  if (!reason) return
  await deleteSystemConfig(item.id, reason)
  await loadAll()
}

async function openChanges(item: any) {
  changes.value = unwrap(await listSystemConfigChanges(item.id)) || []
  changeDialog.value?.showModal()
}

function closeChanges() {
  changeDialog.value?.close()
}

onMounted(loadAll)
</script>

<style scoped>
.system-config-page { padding: 24px; color: #111827; }
.page-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 20px; }
.eyebrow { margin: 0 0 6px; color: #6366f1; font-weight: 700; letter-spacing: .08em; }
h1 { margin: 0; font-size: 28px; }
.subtitle { margin: 8px 0 0; color: #6b7280; }
.header-actions, .dialog-actions { display: flex; gap: 10px; justify-content: flex-end; }
.metrics { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.metric-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; box-shadow: 0 8px 24px rgba(15,23,42,.04); }
.metric-card span { color: #6b7280; display: block; margin-bottom: 6px; }
.metric-card strong { font-size: 24px; }
.metric-card.warn strong { color: #b45309; }
.filters { display: flex; flex-wrap: wrap; gap: 10px; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 14px; margin-bottom: 16px; }
input, select, textarea { border: 1px solid #d1d5db; border-radius: 10px; padding: 9px 10px; font: inherit; }
.filters input { min-width: 260px; }
.check { display: inline-flex; gap: 6px; align-items: center; color: #374151; }
button { border: 1px solid #d1d5db; background: #fff; border-radius: 10px; padding: 8px 12px; cursor: pointer; }
button.primary { background: #111827; color: #fff; border-color: #111827; }
button.secondary { background: #f9fafb; }
button.danger { color: #b91c1c; border-color: #fecaca; }
.content-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { border-bottom: 1px solid #f3f4f6; padding: 12px; text-align: left; vertical-align: top; }
th { background: #f9fafb; color: #374151; font-weight: 700; }
td small { display: block; color: #6b7280; margin-top: 4px; max-width: 360px; }
code { background: #f3f4f6; padding: 3px 6px; border-radius: 6px; }
.value-cell { max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pill, .status { display: inline-block; border-radius: 999px; padding: 3px 8px; font-size: 12px; }
.pill { background: #eef2ff; color: #3730a3; }
.status.ok { background: #dcfce7; color: #166534; }
.status.off { background: #fee2e2; color: #991b1b; }
.actions { display: flex; flex-wrap: wrap; gap: 6px; }
.empty, .loading { text-align: center; color: #6b7280; padding: 24px; }
.dialog { border: none; border-radius: 18px; padding: 22px; width: min(760px, 92vw); box-shadow: 0 24px 80px rgba(15,23,42,.22); }
.wide-dialog { width: min(920px, 94vw); }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.form-grid label { display: flex; flex-direction: column; gap: 6px; color: #374151; }
.form-grid .wide { grid-column: 1 / -1; }
.change-list { max-height: 60vh; overflow: auto; }
.change-item { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; margin-bottom: 10px; }
.change-item header { display: flex; justify-content: space-between; gap: 12px; }
.change-item pre { background: #f9fafb; border-radius: 10px; padding: 10px; white-space: pre-wrap; }
@media (max-width: 900px) { .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } .page-header { flex-direction: column; } }
</style>
