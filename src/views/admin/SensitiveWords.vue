<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  createSensitiveWord,
  deleteSensitiveWord,
  disableSensitiveWord,
  enableSensitiveWord,
  getSensitiveWordOverview,
  listModerationRecords,
  listSensitiveWords,
  testSensitiveWordText,
  updateSensitiveWord
} from '../../api/safety'

type SensitiveWord = {
  id: number
  word: string
  category: string
  riskLevel: string
  status: number
  createdAt?: string
  updatedAt?: string
}

type MetricItem = {
  name: string
  count: number
}

type SensitiveWordOverview = {
  totalCount: number
  enabledCount: number
  disabledCount: number
  highRiskCount: number
  mediumRiskCount: number
  lowRiskCount: number
  categoryStats: MetricItem[]
  riskStats: MetricItem[]
}

type ModerationRecord = {
  id: number
  bizType: string
  bizId: number
  userId?: number
  checkType: string
  result: string
  riskLevel: string
  matchedWords?: string
  reason?: string
  createdAt?: string
}

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const message = ref('')
const error = ref('')
const overview = ref<SensitiveWordOverview | null>(null)
const words = ref<SensitiveWord[]>([])
const records = ref<ModerationRecord[]>([])
const testText = ref('')
const testResult = ref<any>(null)

const query = ref({
  category: '',
  riskLevel: '',
  status: '',
  keyword: '',
  limit: 200
})

const form = ref({
  id: 0,
  word: '',
  category: 'GENERAL',
  riskLevel: 'MEDIUM'
})

const isEditing = computed(() => form.value.id > 0)

const categoryOptions = ['GENERAL', 'AD', 'PORN', 'GAMBLING', 'ABUSE', 'POLITICS', 'FRAUD', 'COPYRIGHT']
const riskOptions = ['LOW', 'MEDIUM', 'HIGH']

function normalizeResponse(res: any) {
  if (res && typeof res === 'object' && 'code' in res) return res
  return { code: 0, data: res }
}

function resetMessage() {
  message.value = ''
  error.value = ''
}

async function loadOverview() {
  const res = normalizeResponse(await getSensitiveWordOverview())
  if (res.code === 0) {
    overview.value = res.data
  }
}

async function loadWords() {
  const params: any = { limit: Number(query.value.limit) || 200 }
  if (query.value.category) params.category = query.value.category
  if (query.value.riskLevel) params.riskLevel = query.value.riskLevel
  if (query.value.status !== '') params.status = Number(query.value.status)
  if (query.value.keyword) params.keyword = query.value.keyword
  const res = normalizeResponse(await listSensitiveWords(params))
  if (res.code === 0) {
    words.value = res.data || []
  } else {
    error.value = res.message || '查询敏感词失败'
  }
}

async function loadRecords() {
  const res = normalizeResponse(await listModerationRecords({ limit: 50 }))
  if (res.code === 0) {
    records.value = res.data || []
  }
}

async function load() {
  loading.value = true
  resetMessage()
  try {
    await Promise.all([loadOverview(), loadWords(), loadRecords()])
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '加载内容安全数据失败'
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  query.value = { category: '', riskLevel: '', status: '', keyword: '', limit: 200 }
  loadWords()
}

function resetForm() {
  form.value = { id: 0, word: '', category: 'GENERAL', riskLevel: 'MEDIUM' }
}

function editWord(word: SensitiveWord) {
  form.value = {
    id: word.id,
    word: word.word,
    category: word.category || 'GENERAL',
    riskLevel: word.riskLevel || 'MEDIUM'
  }
}

async function saveWord() {
  if (!form.value.word.trim()) {
    error.value = '请输入敏感词'
    return
  }
  saving.value = true
  resetMessage()
  try {
    const payload = {
      word: form.value.word.trim(),
      category: form.value.category,
      riskLevel: form.value.riskLevel
    }
    const res: any = isEditing.value
      ? await updateSensitiveWord(form.value.id, payload)
      : await createSensitiveWord(payload)
    const data = normalizeResponse(res)
    if (data.code === 0) {
      message.value = isEditing.value ? '敏感词已更新' : '敏感词已添加'
      resetForm()
      await Promise.all([loadOverview(), loadWords()])
    } else {
      error.value = data.message || '保存失败'
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '保存失败'
  } finally {
    saving.value = false
  }
}

async function toggle(word: SensitiveWord) {
  resetMessage()
  const res: any = word.status === 1
    ? await disableSensitiveWord(word.id)
    : await enableSensitiveWord(word.id)
  const data = normalizeResponse(res)
  if (data.code === 0) {
    await Promise.all([loadOverview(), loadWords()])
  } else {
    error.value = data.message || '操作失败'
  }
}

async function remove(word: SensitiveWord) {
  if (!confirm(`确认删除敏感词「${word.word}」？`)) return
  resetMessage()
  const res: any = await deleteSensitiveWord(word.id)
  const data = normalizeResponse(res)
  if (data.code === 0) {
    message.value = '敏感词已删除'
    await Promise.all([loadOverview(), loadWords()])
  } else {
    error.value = data.message || '删除失败'
  }
}

async function runTest() {
  if (!testText.value.trim()) {
    error.value = '请输入需要检测的文本'
    return
  }
  testing.value = true
  resetMessage()
  try {
    const res = normalizeResponse(await testSensitiveWordText(testText.value))
    if (res.code === 0) {
      testResult.value = res.data
    } else {
      error.value = res.message || '检测失败'
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '检测失败'
  } finally {
    testing.value = false
  }
}

function riskClass(value: string) {
  if (value === 'HIGH') return 'tag danger'
  if (value === 'MEDIUM') return 'tag warning'
  return 'tag success'
}

function resultClass(value: string) {
  if (value === 'REJECT') return 'tag danger'
  if (value === 'REVIEW') return 'tag warning'
  return 'tag success'
}

onMounted(load)
</script>

<template>
  <section class="page">
    <div class="header-row">
      <div>
        <h2>内容安全：敏感词库</h2>
        <p>维护平台敏感词、风险等级和检测预览，文章审核会复用这里的启用词库。</p>
      </div>
      <button class="button" :disabled="loading" @click="load">刷新</button>
    </div>

    <div v-if="overview" class="metric-grid">
      <div class="metric-card"><span>词库总数</span><strong>{{ overview.totalCount }}</strong></div>
      <div class="metric-card"><span>启用词</span><strong>{{ overview.enabledCount }}</strong></div>
      <div class="metric-card"><span>停用词</span><strong>{{ overview.disabledCount }}</strong></div>
      <div class="metric-card danger-metric"><span>高风险</span><strong>{{ overview.highRiskCount }}</strong></div>
      <div class="metric-card"><span>中风险</span><strong>{{ overview.mediumRiskCount }}</strong></div>
      <div class="metric-card"><span>低风险</span><strong>{{ overview.lowRiskCount }}</strong></div>
    </div>

    <p v-if="message" class="message success-text">{{ message }}</p>
    <p v-if="error" class="message error-text">{{ error }}</p>

    <div class="panel-grid">
      <div class="card">
        <h3>{{ isEditing ? '编辑敏感词' : '新增敏感词' }}</h3>
        <div class="form-grid">
          <label>
            <span>敏感词</span>
            <input v-model="form.word" class="input" placeholder="请输入敏感词" />
          </label>
          <label>
            <span>分类</span>
            <select v-model="form.category" class="input">
              <option v-for="item in categoryOptions" :key="item" :value="item">{{ item }}</option>
            </select>
          </label>
          <label>
            <span>风险等级</span>
            <select v-model="form.riskLevel" class="input">
              <option v-for="item in riskOptions" :key="item" :value="item">{{ item }}</option>
            </select>
          </label>
        </div>
        <div class="actions">
          <button class="button" :disabled="saving" @click="saveWord">{{ saving ? '保存中...' : '保存' }}</button>
          <button v-if="isEditing" class="button secondary" @click="resetForm">取消编辑</button>
        </div>
      </div>

      <div class="card">
        <h3>文本检测预览</h3>
        <textarea v-model="testText" class="textarea" rows="5" placeholder="输入标题、简介或正文片段，预览当前词库命中情况"></textarea>
        <div class="actions">
          <button class="button" :disabled="testing" @click="runTest">{{ testing ? '检测中...' : '开始检测' }}</button>
          <button class="button secondary" @click="testText = ''; testResult = null">清空</button>
        </div>
        <div v-if="testResult" class="test-result">
          <p>结果：<span :class="resultClass(testResult.result)">{{ testResult.result }}</span></p>
          <p>风险：<span :class="riskClass(testResult.riskLevel)">{{ testResult.riskLevel }}</span></p>
          <p>命中：{{ testResult.matchedWords?.length ? testResult.matchedWords.join('，') : '-' }}</p>
          <p>原因：{{ testResult.reason }}</p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="header-row compact">
        <h3>敏感词列表</h3>
        <div class="filter-row">
          <input v-model="query.keyword" class="input compact-input" placeholder="词 / 分类 / 风险" />
          <select v-model="query.category" class="input compact-input">
            <option value="">全部分类</option>
            <option v-for="item in categoryOptions" :key="item" :value="item">{{ item }}</option>
          </select>
          <select v-model="query.riskLevel" class="input compact-input">
            <option value="">全部风险</option>
            <option v-for="item in riskOptions" :key="item" :value="item">{{ item }}</option>
          </select>
          <select v-model="query.status" class="input compact-input">
            <option value="">全部状态</option>
            <option value="1">启用</option>
            <option value="0">停用</option>
          </select>
          <button class="button" @click="loadWords">查询</button>
          <button class="button secondary" @click="resetFilter">重置</button>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>敏感词</th>
              <th>分类</th>
              <th>风险等级</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="word in words" :key="word.id">
              <td>{{ word.id }}</td>
              <td class="strong">{{ word.word }}</td>
              <td>{{ word.category }}</td>
              <td><span :class="riskClass(word.riskLevel)">{{ word.riskLevel }}</span></td>
              <td>{{ word.status === 1 ? '启用' : '停用' }}</td>
              <td>{{ word.createdAt || '-' }}</td>
              <td class="row-actions">
                <button class="link-button" @click="editWord(word)">编辑</button>
                <button class="link-button" @click="toggle(word)">{{ word.status === 1 ? '停用' : '启用' }}</button>
                <button class="link-button danger-link" @click="remove(word)">删除</button>
              </td>
            </tr>
            <tr v-if="!words.length">
              <td colspan="7" class="empty">暂无敏感词</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h3>最近检测记录</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>业务</th>
              <th>业务ID</th>
              <th>用户ID</th>
              <th>结果</th>
              <th>风险</th>
              <th>命中词</th>
              <th>原因</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in records" :key="record.id">
              <td>{{ record.id }}</td>
              <td>{{ record.bizType }}</td>
              <td>{{ record.bizId }}</td>
              <td>{{ record.userId || '-' }}</td>
              <td><span :class="resultClass(record.result)">{{ record.result }}</span></td>
              <td><span :class="riskClass(record.riskLevel)">{{ record.riskLevel }}</span></td>
              <td>{{ record.matchedWords || '-' }}</td>
              <td>{{ record.reason || '-' }}</td>
              <td>{{ record.createdAt || '-' }}</td>
            </tr>
            <tr v-if="!records.length">
              <td colspan="9" class="empty">暂无检测记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.header-row.compact { align-items: center; }
.metric-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
.metric-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; background: #fff; }
.metric-card span { display: block; color: #6b7280; font-size: 13px; }
.metric-card strong { display: block; margin-top: 8px; font-size: 24px; }
.danger-metric strong { color: #dc2626; }
.panel-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
.card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px; background: #fff; }
.form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.form-grid label span { display: block; margin-bottom: 6px; color: #4b5563; font-size: 13px; }
.input, .textarea { width: 100%; border: 1px solid #d1d5db; border-radius: 10px; padding: 9px 10px; box-sizing: border-box; }
.textarea { resize: vertical; font-family: inherit; }
.compact-input { width: 150px; }
.filter-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.actions { display: flex; gap: 10px; margin-top: 14px; }
.button { border: 0; border-radius: 10px; padding: 9px 14px; background: #2563eb; color: #fff; cursor: pointer; }
.button:disabled { opacity: .6; cursor: not-allowed; }
.button.secondary { background: #f3f4f6; color: #111827; }
.message { margin: 0; }
.success-text { color: #15803d; }
.error-text { color: #dc2626; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { border-bottom: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 14px; vertical-align: top; }
.strong { font-weight: 700; }
.empty { text-align: center; color: #6b7280; }
.row-actions { display: flex; gap: 10px; white-space: nowrap; }
.link-button { border: 0; background: transparent; color: #2563eb; cursor: pointer; padding: 0; }
.danger-link { color: #dc2626; }
.tag { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #e5e7eb; font-size: 12px; }
.success { background: #dcfce7; color: #166534; }
.warning { background: #fef3c7; color: #92400e; }
.danger { background: #fee2e2; color: #991b1b; }
.test-result { margin-top: 12px; padding: 12px; border-radius: 12px; background: #f9fafb; }
.test-result p { margin: 6px 0; }
@media (max-width: 1100px) {
  .metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .panel-grid { grid-template-columns: 1fr; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
