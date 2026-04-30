<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  checkNotificationTemplatePublish,
  copyNotificationTemplate,
  createNotificationTemplate,
  deleteNotificationTemplate,
  listNotificationTemplates,
  listNotificationTemplatePublishLogs,
  publishNotificationTemplate,
  updateNotificationTemplate,
  validateNotificationTemplate,
  type NotificationTemplatePayload,
  retryNotificationTemplatePublishLog,
  type NotificationTemplatePublishCheckResult,
  type NotificationTemplatePublishLogItem,
  type NotificationTemplateValidationResult
} from '../../api/notification'

const templates = ref<any[]>([])
const keyword = ref('')
const enabledFilter = ref('')
const loading = ref(false)
const saving = ref(false)
const publishing = ref(false)
const message = ref('')
const editingId = ref<number | null>(null)
const selectedTemplate = ref<any | null>(null)
const publishCheck = ref<NotificationTemplatePublishCheckResult | null>(null)
const validation = ref<NotificationTemplateValidationResult | null>(null)
const publishLogs = ref<NotificationTemplatePublishLogItem[]>([])
const publishLogStatus = ref('')
const publishLogLoading = ref(false)

const form = reactive<NotificationTemplatePayload>({
  templateCode: '',
  templateName: '',
  titleTemplate: '',
  contentTemplate: '',
  notificationType: 'SYSTEM',
  bizType: '',
  priority: 'NORMAL',
  enabled: true,
  remark: ''
})

const publishForm = reactive({
  receiverUserIdsText: '',
  variablesText: '{\n  "title": "示例视频",\n  "reason": "内容不符合规范"\n}',
  bizId: '',
  bizType: '',
  priority: ''
})

const isEditing = computed(() => editingId.value !== null)
const selectedRequiredVariables = computed(() => extractVariablesFromTemplate(selectedTemplate.value))

function unwrap(response: any) {
  return response?.code === 0 ? response.data : response
}

async function load() {
  loading.value = true
  message.value = ''
  try {
    const params: any = { limit: 200 }
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    if (enabledFilter.value !== '') params.enabled = enabledFilter.value === 'true'
    templates.value = unwrap(await listNotificationTemplates(params)) || []
    await loadPublishLogs()
  } catch (error: any) {
    message.value = error?.message || '通知模板加载失败'
  } finally {
    loading.value = false
  }
}

async function loadPublishLogs() {
  publishLogLoading.value = true
  try {
    const params: any = { limit: 100 }
    if (selectedTemplate.value?.id) params.templateId = selectedTemplate.value.id
    if (publishLogStatus.value) params.status = publishLogStatus.value
    publishLogs.value = unwrap(await listNotificationTemplatePublishLogs(params)) || []
  } catch (error: any) {
    message.value = error?.message || '发布记录加载失败'
  } finally {
    publishLogLoading.value = false
  }
}

function resetForm() {
  editingId.value = null
  Object.assign(form, {
    templateCode: '',
    templateName: '',
    titleTemplate: '',
    contentTemplate: '',
    notificationType: 'SYSTEM',
    bizType: '',
    priority: 'NORMAL',
    enabled: true,
    remark: ''
  })
}

function editTemplate(item: any) {
  editingId.value = item.id
  Object.assign(form, {
    templateCode: item.templateCode,
    templateName: item.templateName,
    titleTemplate: item.titleTemplate,
    contentTemplate: item.contentTemplate,
    notificationType: item.notificationType || 'SYSTEM',
    bizType: item.bizType || '',
    priority: item.priority || 'NORMAL',
    enabled: item.enabled !== false,
    remark: item.remark || ''
  })
}

async function saveTemplate() {
  saving.value = true
  message.value = ''
  try {
    if (editingId.value) {
      await updateNotificationTemplate(editingId.value, form)
      message.value = '模板已更新'
    } else {
      await createNotificationTemplate(form)
      message.value = '模板已创建'
    }
    resetForm()
    await load()
  } catch (error: any) {
    message.value = error?.message || '模板保存失败'
  } finally {
    saving.value = false
  }
}

async function removeTemplate(item: any) {
  if (!confirm(`确认停用并删除模板「${item.templateName}」？`)) return
  message.value = ''
  try {
    await deleteNotificationTemplate(item.id)
    message.value = '模板已删除'
    if (selectedTemplate.value?.id === item.id) selectedTemplate.value = null
    await load()
  } catch (error: any) {
    message.value = error?.message || '模板删除失败'
  }
}

async function duplicateTemplate(item: any) {
  const defaultCode = `${item.templateCode}_COPY`.slice(0, 64)
  const templateCode = prompt('请输入副本模板编码', defaultCode)
  if (!templateCode) return
  const templateName = prompt('请输入副本模板名称', `${item.templateName} 副本`)
  if (!templateName) return
  message.value = ''
  try {
    await copyNotificationTemplate(item.id, { templateCode, templateName, enabled: false })
    message.value = '模板副本已创建，默认停用，请确认后启用'
    await load()
  } catch (error: any) {
    message.value = error?.message || '模板复制失败'
  }
}

async function selectTemplate(item: any) {
  selectedTemplate.value = item
  publishCheck.value = null
  validation.value = null
  await loadPublishLogs()
}

function parseReceiverIds() {
  return publishForm.receiverUserIdsText
    .split(/[，,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map(Number)
    .filter((item) => Number.isFinite(item) && item > 0)
}

function parseVariables() {
  const raw = publishForm.variablesText.trim()
  if (!raw) return {}
  return JSON.parse(raw)
}

function buildPublishPayload() {
  return {
    receiverUserIds: parseReceiverIds(),
    variables: parseVariables(),
    bizId: publishForm.bizId ? Number(publishForm.bizId) : undefined,
    bizType: publishForm.bizType || undefined,
    priority: publishForm.priority || undefined
  }
}

function extractVariablesFromTemplate(item: any) {
  if (!item) return []
  const text = `${item.titleTemplate || ''}\n${item.contentTemplate || ''}`
  const names = new Set<string>()
  const pattern = /\{\{\s*([a-zA-Z0-9_.-]+)\s*}}|\$\{\s*([a-zA-Z0-9_.-]+)\s*}/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text))) {
    names.add(match[1] || match[2])
  }
  return Array.from(names).sort()
}

async function doValidate() {
  if (!selectedTemplate.value) return null
  message.value = ''
  try {
    const data = unwrap(await validateNotificationTemplate(selectedTemplate.value.id, buildPublishPayload()))
    validation.value = data
    return data as NotificationTemplateValidationResult
  } catch (error: any) {
    message.value = error?.message || '变量校验失败，请检查变量 JSON'
    return null
  }
}

async function doPreview() {
  if (!selectedTemplate.value) return
  message.value = ''
  try {
    publishCheck.value = unwrap(await checkNotificationTemplatePublish(selectedTemplate.value.id, buildPublishPayload()))
    validation.value = publishCheck.value?.validation || null
  } catch (error: any) {
    message.value = error?.message || '模板预检失败，请检查变量 JSON'
  }
}

async function doPublish() {
  if (!selectedTemplate.value) return
  publishing.value = true
  message.value = ''
  try {
    const check = unwrap(await checkNotificationTemplatePublish(selectedTemplate.value.id, buildPublishPayload())) as NotificationTemplatePublishCheckResult
    publishCheck.value = check
    validation.value = check.validation
    if (!check.validation?.valid) {
      message.value = `模板变量缺失：${check.validation?.missingVariables?.join(', ') || '-'}`
      return
    }
    const receiverText = check.receiverMode === 'ALL' ? `全员 ${check.receiverCount} 人` : `${check.receiverCount} 个指定用户`
    if (!confirm(`确认按模板发布通知？接收范围：${receiverText}`)) return
    const data = unwrap(await publishNotificationTemplate(selectedTemplate.value.id, buildPublishPayload()))
    message.value = `通知已发布，messageId=${data}`
    await load()
    await loadPublishLogs()
  } catch (error: any) {
    message.value = error?.message || '模板通知发布失败'
  } finally {
    publishing.value = false
  }
}

async function retryPublishLog(item: NotificationTemplatePublishLogItem) {
  if (!confirm(`确认重试发布记录 #${item.id}？`)) return
  message.value = ''
  try {
    const messageId = unwrap(await retryNotificationTemplatePublishLog(item.id))
    message.value = `重试已发布，messageId=${messageId}`
    await loadPublishLogs()
  } catch (error: any) {
    message.value = error?.message || '发布记录重试失败'
  }
}

function showPublishLogDetail(item: NotificationTemplatePublishLogItem) {
  const detail = [
    `记录 ID：${item.id}`,
    `模板：${item.templateName || '-'} / ${item.templateCode || '-'}`,
    `状态：${item.status}`,
    `消息 ID：${item.messageId || '-'}`,
    `接收范围：${item.receiverMode} / ${item.receiverCount}`,
    `标题：${item.title}`,
    `内容：${item.content}`,
    `变量：${item.variablesJson || '{}'}`,
    `接收用户：${item.receiverUserIdsJson || '[]'}`,
    `错误：${item.errorMessage || '-'}`
  ].join('\n')
  alert(detail)
}

onMounted(load)
</script>

<template>
  <section class="card notification-template-page">
    <div class="page-head">
      <div>
        <h2>通知模板</h2>
        <p>维护站内通知模板，支持变量校验、发布预检、模板复制和按模板发布通知。</p>
      </div>
      <button class="button" :disabled="loading" @click="load">{{ loading ? '加载中' : '刷新' }}</button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="layout">
      <section class="panel">
        <h3>{{ isEditing ? '编辑模板' : '新建模板' }}</h3>
        <div class="form-grid">
          <label>模板编码<input v-model="form.templateCode" class="input" placeholder="VIDEO_TRANSCODE_DONE" /></label>
          <label>模板名称<input v-model="form.templateName" class="input" placeholder="视频转码完成" /></label>
          <label>通知类型<input v-model="form.notificationType" class="input" placeholder="SYSTEM/VIDEO/AUDIT" /></label>
          <label>业务类型<input v-model="form.bizType" class="input" placeholder="VIDEO_TRANSCODE" /></label>
          <label>优先级
            <select v-model="form.priority" class="input">
              <option>LOW</option>
              <option>NORMAL</option>
              <option>HIGH</option>
              <option>URGENT</option>
            </select>
          </label>
          <label class="checkbox"><input v-model="form.enabled" type="checkbox" /> 启用模板</label>
        </div>
        <label>标题模板<input v-model="form.titleTemplate" class="input" placeholder="视频《{{title}}》转码完成" /></label>
        <label>内容模板<textarea v-model="form.contentTemplate" class="input" rows="4" placeholder="你的内容《{{title}}》审核未通过，原因：{{reason}}。" /></label>
        <label>备注<input v-model="form.remark" class="input" /></label>
        <div class="actions">
          <button class="button" :disabled="saving" @click="saveTemplate">{{ saving ? '保存中' : '保存模板' }}</button>
          <button class="button secondary" type="button" @click="resetForm">清空</button>
        </div>
      </section>

      <section class="panel">
        <h3>模板发布</h3>
        <p class="muted">选择左侧列表中的模板后，可先校验变量和接收范围，再正式发布。接收人为空表示全员发布。</p>
        <div v-if="selectedTemplate" class="selected">
          <div>当前模板：{{ selectedTemplate.templateName }} / {{ selectedTemplate.templateCode }}</div>
          <div class="chips">
            <span v-for="name in selectedRequiredVariables" :key="name" class="chip">{{ name }}</span>
            <span v-if="!selectedRequiredVariables.length" class="chip muted-chip">无变量</span>
          </div>
        </div>
        <label>接收用户 ID<input v-model="publishForm.receiverUserIdsText" class="input" placeholder="1,2,3；留空为全员" /></label>
        <label>变量 JSON<textarea v-model="publishForm.variablesText" class="input mono" rows="6" /></label>
        <div class="form-grid">
          <label>业务 ID<input v-model="publishForm.bizId" class="input" placeholder="可选" /></label>
          <label>覆盖业务类型<input v-model="publishForm.bizType" class="input" placeholder="可选" /></label>
          <label>覆盖优先级
            <select v-model="publishForm.priority" class="input">
              <option value="">使用模板</option>
              <option>LOW</option>
              <option>NORMAL</option>
              <option>HIGH</option>
              <option>URGENT</option>
            </select>
          </label>
        </div>
        <div class="actions">
          <button class="button secondary" :disabled="!selectedTemplate" @click="doValidate">校验变量</button>
          <button class="button secondary" :disabled="!selectedTemplate" @click="doPreview">发布预检</button>
          <button class="button" :disabled="!selectedTemplate || publishing" @click="doPublish">{{ publishing ? '发布中' : '发布通知' }}</button>
        </div>
        <article v-if="validation" :class="['validation', validation.valid ? 'ok' : 'bad']">
          <strong>{{ validation.valid ? '变量校验通过' : '变量校验未通过' }}</strong>
          <p>必填变量：{{ validation.requiredVariables?.join(', ') || '-' }}</p>
          <p v-if="validation.missingVariables?.length">缺失变量：{{ validation.missingVariables.join(', ') }}</p>
          <p v-if="validation.extraVariables?.length">多余变量：{{ validation.extraVariables.join(', ') }}</p>
        </article>
        <article v-if="publishCheck" class="preview">
          <div class="preview-meta">{{ publishCheck.receiverMode === 'ALL' ? '全员发布' : '指定用户' }} / 预计接收 {{ publishCheck.receiverCount }} 人</div>
          <strong>{{ publishCheck.title }}</strong>
          <p>{{ publishCheck.content }}</p>
          <small>{{ publishCheck.notificationType }} / {{ publishCheck.bizType || '-' }} / {{ publishCheck.priority }}</small>
        </article>
      </section>
    </div>

    <section class="panel list-panel">
      <div class="filters">
        <input v-model="keyword" class="input" placeholder="模板编码/名称/标题" @keyup.enter="load" />
        <select v-model="enabledFilter" class="input">
          <option value="">全部状态</option>
          <option value="true">启用</option>
          <option value="false">停用</option>
        </select>
        <button class="button secondary" @click="load">筛选</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>编码</th>
              <th>名称</th>
              <th>类型</th>
              <th>优先级</th>
              <th>状态</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in templates" :key="item.id" :class="{ active: selectedTemplate?.id === item.id }">
              <td>{{ item.templateCode }}</td>
              <td>{{ item.templateName }}</td>
              <td>{{ item.notificationType }}</td>
              <td>{{ item.priority }}</td>
              <td>{{ item.enabled ? '启用' : '停用' }}</td>
              <td>{{ item.updatedAt }}</td>
              <td class="row-actions">
                <button class="text-button" @click="selectTemplate(item)">选择</button>
                <button class="text-button" @click="editTemplate(item)">编辑</button>
                <button class="text-button" @click="duplicateTemplate(item)">复制</button>
                <button class="text-button danger" @click="removeTemplate(item)">删除</button>
              </td>
            </tr>
            <tr v-if="!templates.length && !loading"><td colspan="7" class="empty">暂无模板</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel list-panel">
      <div class="filters">
        <h3>模板发布记录</h3>
        <select v-model="publishLogStatus" class="input compact" @change="loadPublishLogs">
          <option value="">全部状态</option>
          <option value="SUCCESS">成功</option>
          <option value="FAILED">失败</option>
          <option value="PENDING">处理中</option>
        </select>
        <button class="button secondary" :disabled="publishLogLoading" @click="loadPublishLogs">{{ publishLogLoading ? '加载中' : '刷新记录' }}</button>
        <span class="muted">{{ selectedTemplate ? `当前模板：${selectedTemplate.templateName}` : '默认显示最近发布记录' }}</span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>模板</th>
              <th>标题</th>
              <th>范围</th>
              <th>状态</th>
              <th>消息ID</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in publishLogs" :key="item.id">
              <td>#{{ item.id }}</td>
              <td>{{ item.templateName || item.templateCode || '-' }}</td>
              <td>{{ item.title }}</td>
              <td>{{ item.receiverMode === 'ALL' ? '全员' : '指定用户' }} / {{ item.receiverCount }}</td>
              <td>
                <span :class="['status', item.status.toLowerCase()]">{{ item.status }}</span>
                <small v-if="item.errorMessage" class="error-text">{{ item.errorMessage }}</small>
              </td>
              <td>{{ item.messageId || '-' }}</td>
              <td>{{ item.createdAt }}</td>
              <td class="row-actions">
                <button class="text-button" @click="showPublishLogDetail(item)">详情</button>
                <button v-if="item.status === 'FAILED'" class="text-button" @click="retryPublishLog(item)">重试</button>
              </td>
            </tr>
            <tr v-if="!publishLogs.length && !publishLogLoading"><td colspan="8" class="empty">暂无发布记录</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<style scoped>
.notification-template-page { display: grid; gap: 16px; }
.page-head, .filters, .actions, .row-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.page-head { justify-content: space-between; }
.layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, 460px); gap: 16px; align-items: start; }
.panel { border: 1px solid #e5e7eb; background: #fff; border-radius: 16px; padding: 16px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
label { display: grid; gap: 6px; margin-bottom: 10px; color: #374151; font-size: 13px; }
.checkbox { display: flex; align-items: center; margin-top: 24px; }
.input { width: 100%; border: 1px solid #d1d5db; border-radius: 10px; padding: 8px 10px; background: #fff; }
.input.compact { width: auto; min-width: 140px; }
.button { border: 0; border-radius: 10px; background: #2563eb; color: #fff; padding: 8px 12px; cursor: pointer; }
.button:disabled { opacity: .55; cursor: not-allowed; }
.button.secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
.text-button { border: 0; background: transparent; color: #2563eb; cursor: pointer; }
.text-button.danger { color: #dc2626; }
.message { color: #dc2626; background: #fef2f2; border-radius: 10px; padding: 8px 10px; }
.muted { color: #6b7280; }
.selected, .preview, .validation { border: 1px dashed #93c5fd; border-radius: 12px; background: #eff6ff; padding: 10px; margin-bottom: 10px; }
.preview p { white-space: pre-wrap; }
.preview-meta { color: #1d4ed8; font-size: 12px; margin-bottom: 6px; }
.validation.ok { border-color: #86efac; background: #f0fdf4; }
.validation.bad { border-color: #fca5a5; background: #fef2f2; }
.validation p { margin: 4px 0; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.chip { border-radius: 999px; background: #dbeafe; color: #1d4ed8; padding: 2px 8px; font-size: 12px; }
.muted-chip { background: #f3f4f6; color: #6b7280; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; margin-top: 12px; }
th, td { border-bottom: 1px solid #e5e7eb; padding: 10px; text-align: left; }
tr.active { background: #eff6ff; }
.empty { text-align: center; color: #6b7280; }
.status { display: inline-block; border-radius: 999px; padding: 2px 8px; font-size: 12px; background: #f3f4f6; color: #374151; }
.status.success { background: #dcfce7; color: #166534; }
.status.failed { background: #fee2e2; color: #991b1b; }
.status.pending { background: #fef3c7; color: #92400e; }
.error-text { display: block; max-width: 220px; color: #dc2626; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 4px; }
@media (max-width: 960px) { .layout { grid-template-columns: 1fr; } }
</style>
