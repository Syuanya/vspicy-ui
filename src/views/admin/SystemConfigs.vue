<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  createSystemConfig,
  deleteSystemConfig,
  disableSystemConfig,
  enableSystemConfig,
  listSystemConfigGroups,
  listSystemConfigs,
  updateSystemConfig
} from '../../api/admin'

type SystemConfig = {
  id: number
  configKey: string
  configName: string
  configValue: string
  configType: string
  groupCode: string
  description?: string
  editable: boolean
  encrypted: boolean
  status: number
  createdAt?: string
  updatedAt?: string
}

type ConfigGroup = {
  groupCode: string
  totalCount: number
  enabledCount: number
  disabledCount: number
}

const loading = ref(false)
const saving = ref(false)
const message = ref('')
const error = ref('')
const configs = ref<SystemConfig[]>([])
const groups = ref<ConfigGroup[]>([])
const selected = ref<SystemConfig | null>(null)

const query = ref({
  groupCode: '',
  keyword: '',
  status: '',
  limit: 100
})

const form = ref({
  id: 0,
  configKey: '',
  configName: '',
  configValue: '',
  configType: 'STRING',
  groupCode: 'system',
  description: '',
  editable: true,
  encrypted: false,
  status: 1
})

const isEdit = computed(() => form.value.id > 0)

const groupOptions = computed(() => {
  const values = new Set(groups.value.map((item) => item.groupCode))
  ;['system', 'video', 'notification', 'recommend', 'member', 'security'].forEach((item) => values.add(item))
  return [...values]
})

function resetMessage() {
  message.value = ''
  error.value = ''
}

async function load() {
  loading.value = true
  resetMessage()
  try {
    const params: any = { limit: Number(query.value.limit) || 100 }
    if (query.value.groupCode) params.groupCode = query.value.groupCode
    if (query.value.keyword) params.keyword = query.value.keyword
    if (query.value.status !== '') params.status = Number(query.value.status)

    const [configRes, groupRes]: any[] = await Promise.all([
      listSystemConfigs(params),
      listSystemConfigGroups()
    ])

    if (configRes.code === 0) {
      configs.value = configRes.data || []
    } else {
      error.value = configRes.message || '加载配置失败'
    }

    if (groupRes.code === 0) {
      groups.value = groupRes.data || []
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '加载配置失败'
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  query.value = { groupCode: '', keyword: '', status: '', limit: 100 }
  load()
}

function resetForm() {
  selected.value = null
  form.value = {
    id: 0,
    configKey: '',
    configName: '',
    configValue: '',
    configType: 'STRING',
    groupCode: 'system',
    description: '',
    editable: true,
    encrypted: false,
    status: 1
  }
}

function edit(item: SystemConfig) {
  selected.value = item
  form.value = {
    id: item.id,
    configKey: item.configKey,
    configName: item.configName,
    configValue: item.encrypted ? '' : (item.configValue || ''),
    configType: item.configType || 'STRING',
    groupCode: item.groupCode || 'system',
    description: item.description || '',
    editable: item.editable !== false,
    encrypted: item.encrypted === true,
    status: item.status ?? 1
  }
}

function validateForm() {
  if (!form.value.configKey.trim()) return '配置键不能为空'
  if (!/^[a-z][a-z0-9_.:-]{2,127}$/.test(form.value.configKey.trim())) {
    return '配置键只能包含小写字母、数字、下划线、点、冒号和短横线，且长度为 3-128'
  }
  if (!form.value.configName.trim()) return '配置名称不能为空'
  if (!['STRING', 'NUMBER', 'BOOLEAN', 'JSON'].includes(form.value.configType)) return '配置类型不合法'
  if (form.value.configType === 'JSON' && form.value.configValue.trim()) {
    try {
      JSON.parse(form.value.configValue)
    } catch {
      return 'JSON 类型配置值不是合法 JSON'
    }
  }
  return ''
}

async function save() {
  resetMessage()
  const validation = validateForm()
  if (validation) {
    error.value = validation
    return
  }

  saving.value = true
  try {
    const payload = {
      configKey: form.value.configKey.trim(),
      configName: form.value.configName.trim(),
      configValue: form.value.configValue,
      configType: form.value.configType,
      groupCode: form.value.groupCode || 'default',
      description: form.value.description,
      editable: form.value.editable,
      encrypted: form.value.encrypted,
      status: Number(form.value.status) || 0
    }

    const res: any = isEdit.value
      ? await updateSystemConfig(form.value.id, payload)
      : await createSystemConfig(payload)

    if (res.code === 0) {
      message.value = isEdit.value ? '配置已更新' : '配置已创建'
      resetForm()
      await load()
    } else {
      error.value = res.message || '保存失败'
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '保存失败'
  } finally {
    saving.value = false
  }
}

async function switchStatus(item: SystemConfig) {
  resetMessage()
  try {
    const res: any = item.status === 1 ? await disableSystemConfig(item.id) : await enableSystemConfig(item.id)
    if (res.code === 0) {
      message.value = item.status === 1 ? '配置已停用' : '配置已启用'
      await load()
    } else {
      error.value = res.message || '操作失败'
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '操作失败'
  }
}

async function remove(item: SystemConfig) {
  if (!window.confirm(`确认删除配置 ${item.configKey}？`)) return
  resetMessage()
  try {
    const res: any = await deleteSystemConfig(item.id)
    if (res.code === 0) {
      message.value = '配置已删除'
      if (selected.value?.id === item.id) resetForm()
      await load()
    } else {
      error.value = res.message || '删除失败'
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '删除失败'
  }
}

function statusClass(status: number) {
  return status === 1 ? 'tag success' : 'tag muted'
}

function valuePreview(item: SystemConfig) {
  if (item.encrypted) return '******'
  const value = item.configValue || ''
  return value.length > 90 ? `${value.slice(0, 90)}...` : value
}

onMounted(load)
</script>

<template>
  <section class="card page">
    <div class="top">
      <div>
        <h2>系统配置</h2>
        <p>集中维护运行参数、业务开关和运营默认值。高风险配置会写入操作审计日志。</p>
      </div>
      <button class="button" :disabled="loading" @click="load">{{ loading ? '刷新中...' : '刷新' }}</button>
    </div>

    <p v-if="message" class="message success-text">{{ message }}</p>
    <p v-if="error" class="message danger-text">{{ error }}</p>

    <div class="group-cards">
      <button
        v-for="group in groups"
        :key="group.groupCode"
        class="group-card"
        type="button"
        @click="query.groupCode = group.groupCode; load()"
      >
        <strong>{{ group.groupCode }}</strong>
        <span>{{ group.enabledCount }} 启用 / {{ group.disabledCount }} 停用</span>
      </button>
    </div>

    <div class="filter">
      <select v-model="query.groupCode" class="input">
        <option value="">全部分组</option>
        <option v-for="group in groupOptions" :key="group" :value="group">{{ group }}</option>
      </select>
      <select v-model="query.status" class="input">
        <option value="">全部状态</option>
        <option value="1">启用</option>
        <option value="0">停用</option>
      </select>
      <input v-model="query.keyword" class="input keyword" placeholder="搜索 key / 名称 / 说明" @keyup.enter="load" />
      <input v-model="query.limit" class="input limit" type="number" min="1" max="500" />
      <button class="button" :disabled="loading" @click="load">查询</button>
      <button class="button secondary" @click="resetFilter">重置</button>
    </div>

    <div class="grid">
      <div class="panel">
        <div class="panel-title">
          <strong>配置列表</strong>
          <small>{{ configs.length }} 条</small>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>分组</th>
                <th>配置键</th>
                <th>配置名称</th>
                <th>类型</th>
                <th>值</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in configs" :key="item.id" :class="{ active: selected?.id === item.id }">
                <td><span class="tag info">{{ item.groupCode }}</span></td>
                <td class="key-cell">{{ item.configKey }}</td>
                <td>{{ item.configName }}</td>
                <td>{{ item.configType }}</td>
                <td class="value-cell">{{ valuePreview(item) }}</td>
                <td><span :class="statusClass(item.status)">{{ item.status === 1 ? '启用' : '停用' }}</span></td>
                <td class="actions">
                  <button class="mini" @click="edit(item)">编辑</button>
                  <button class="mini" @click="switchStatus(item)">{{ item.status === 1 ? '停用' : '启用' }}</button>
                  <button class="mini danger" :disabled="!item.editable" @click="remove(item)">删除</button>
                </td>
              </tr>
              <tr v-if="!configs.length && !loading">
                <td colspan="7" class="empty">暂无配置</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel editor">
        <div class="panel-title">
          <strong>{{ isEdit ? '编辑配置' : '新增配置' }}</strong>
          <button class="mini" @click="resetForm">新建</button>
        </div>

        <label>配置键</label>
        <input v-model="form.configKey" class="input full" placeholder="system.maintenance.enabled" />

        <label>配置名称</label>
        <input v-model="form.configName" class="input full" placeholder="系统维护模式" />

        <label>配置分组</label>
        <input v-model="form.groupCode" class="input full" list="system-config-groups" />
        <datalist id="system-config-groups">
          <option v-for="group in groupOptions" :key="group" :value="group" />
        </datalist>

        <label>配置类型</label>
        <select v-model="form.configType" class="input full">
          <option value="STRING">STRING</option>
          <option value="NUMBER">NUMBER</option>
          <option value="BOOLEAN">BOOLEAN</option>
          <option value="JSON">JSON</option>
        </select>

        <label>配置值</label>
        <textarea v-model="form.configValue" class="input textarea" :placeholder="form.encrypted && isEdit ? '敏感配置不回显，留空表示不修改' : '配置值'" />

        <label>说明</label>
        <textarea v-model="form.description" class="input textarea small" />

        <div class="switches">
          <label><input v-model="form.editable" type="checkbox" /> 允许编辑</label>
          <label><input v-model="form.encrypted" type="checkbox" /> 敏感配置</label>
          <label><input v-model="form.status" type="checkbox" :true-value="1" :false-value="0" /> 启用</label>
        </div>

        <button class="button full-button" :disabled="saving" @click="save">
          {{ saving ? '保存中...' : (isEdit ? '保存修改' : '创建配置') }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page { display: grid; gap: 16px; }
.top, .panel-title, .filter, .actions, .switches { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.top, .panel-title { justify-content: space-between; }
.top h2 { margin: 0; }
.top p { margin: 6px 0 0; color: #64748b; }
.message { margin: 0; }
.success-text { color: #166534; }
.danger-text { color: #b91c1c; }
.group-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
.group-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; text-align: left; background: #fff; cursor: pointer; }
.group-card strong, .group-card span { display: block; }
.group-card span { margin-top: 4px; color: #64748b; font-size: 12px; }
.filter { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
.input { border: 1px solid #d1d5db; border-radius: 10px; padding: 9px 10px; background: #fff; min-width: 120px; }
.keyword { min-width: 260px; flex: 1; }
.limit { width: 100px; min-width: 100px; }
.grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; }
.panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { border-bottom: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 13px; vertical-align: top; }
th { color: #475569; background: #f8fafc; }
tr.active { background: #eff6ff; }
.key-cell { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #1d4ed8; }
.value-cell { max-width: 280px; white-space: normal; color: #475569; }
.empty { text-align: center; color: #94a3b8; padding: 30px; }
.tag { display: inline-flex; align-items: center; border-radius: 999px; padding: 2px 8px; font-size: 12px; }
.info { background: #dbeafe; color: #1d4ed8; }
.success { background: #dcfce7; color: #166534; }
.muted { background: #e5e7eb; color: #475569; }
.button, .mini { border: 0; border-radius: 10px; background: #111827; color: #fff; padding: 9px 13px; cursor: pointer; }
.button:disabled, .mini:disabled { opacity: .55; cursor: not-allowed; }
.secondary { background: #e5e7eb; color: #111827; }
.mini { padding: 5px 8px; font-size: 12px; background: #2563eb; }
.mini.danger { background: #dc2626; }
.editor { display: grid; gap: 9px; align-content: start; }
.editor label { color: #374151; font-size: 13px; }
.full { width: 100%; box-sizing: border-box; }
.textarea { min-height: 90px; resize: vertical; box-sizing: border-box; }
.textarea.small { min-height: 70px; }
.switches { justify-content: flex-start; color: #475569; }
.full-button { width: 100%; justify-content: center; }
@media (max-width: 1100px) { .grid { grid-template-columns: 1fr; } }
</style>
