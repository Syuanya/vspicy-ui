<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_ID_KEY, clearTokens } from '../../api/http'

type StorageArea = 'localStorage' | 'sessionStorage' | 'cookie'
type CacheRisk = 'PASS' | 'WARN' | 'DANGER' | 'INFO'
type CacheCategory = 'auth' | 'permission' | 'ui' | 'runtime' | 'unknown'

type CacheEntry = {
  id: string
  area: StorageArea
  key: string
  valuePreview: string
  valueLength: number
  byteSize: number
  category: CacheCategory
  risk: CacheRisk
  reason: string
  removable: boolean
  parsed: boolean
  expireAt?: string
}

type JwtPayload = {
  userId?: number | string
  username?: string
  roles?: unknown
  tokenType?: string
  exp?: number
  iat?: number
  [key: string]: unknown
}

const keyword = ref('')
const areaFilter = ref<'ALL' | StorageArea>('ALL')
const riskFilter = ref<'ALL' | CacheRisk>('ALL')
const categoryFilter = ref<'ALL' | CacheCategory>('ALL')
const entries = ref<CacheEntry[]>([])
const selectedIds = ref<string[]>([])
const lastScanAt = ref('')
const copied = ref(false)
const showValues = ref(false)
const jsonPreview = ref('')

const knownKeyMeta: Record<string, { category: CacheCategory; label: string }> = {
  [ACCESS_TOKEN_KEY]: { category: 'auth', label: '登录 accessToken' },
  [REFRESH_TOKEN_KEY]: { category: 'auth', label: '登录 refreshToken' },
  [USER_ID_KEY]: { category: 'auth', label: '当前用户 ID' },
  vspicy_permission_view: { category: 'permission', label: '权限视图缓存' },
  vspicy_admin_sidebar: { category: 'ui', label: '后台侧栏状态' },
  vite: { category: 'runtime', label: 'Vite 运行缓存' }
}

const riskLabels: Record<CacheRisk, string> = {
  PASS: '正常',
  WARN: '需关注',
  DANGER: '高风险',
  INFO: '信息'
}

const categoryLabels: Record<CacheCategory, string> = {
  auth: '登录态',
  permission: '权限缓存',
  ui: '界面偏好',
  runtime: '运行缓存',
  unknown: '未知缓存'
}

function byteLength(value: string) {
  return new Blob([value]).size
}

function nowText() {
  return new Date().toLocaleString()
}

function safeAtob(value: string) {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4)
    return decodeURIComponent(
      Array.from(atob(normalized + padding))
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    )
  } catch (error) {
    return ''
  }
}

function parseJwt(token: string): JwtPayload | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  const payload = safeAtob(parts[1])
  if (!payload) return null
  try {
    return JSON.parse(payload)
  } catch (error) {
    return null
  }
}

function formatJwtTime(value?: number) {
  if (!value) return ''
  return new Date(value * 1000).toLocaleString()
}

function maskValue(value: string) {
  if (!value) return ''
  if (showValues.value) return value
  if (value.length <= 16) return value
  return `${value.slice(0, 8)}...${value.slice(-6)}`
}

function inferCategory(key: string): CacheCategory {
  const lower = key.toLowerCase()
  if (knownKeyMeta[key]) return knownKeyMeta[key].category
  if (lower.includes('token') || lower.includes('user') || lower.includes('auth')) return 'auth'
  if (lower.includes('permission') || lower.includes('role')) return 'permission'
  if (lower.includes('theme') || lower.includes('sidebar') || lower.includes('layout')) return 'ui'
  if (lower.includes('vite') || lower.includes('debug')) return 'runtime'
  return 'unknown'
}

function analyzeValue(area: StorageArea, key: string, value: string) {
  const lower = value.trim().toLowerCase()
  const category = inferCategory(key)
  let risk: CacheRisk = category === 'unknown' ? 'INFO' : 'PASS'
  let reason = knownKeyMeta[key]?.label || '未登记缓存键'
  let parsed = false
  let expireAt = ''

  if (!value) {
    risk = 'WARN'
    reason = '值为空，建议清理。'
  }

  if (value.length > 16384 || byteLength(value) > 16384) {
    risk = 'DANGER'
    reason = '缓存值超过 16KB，可能触发 Request header is too large 或影响页面性能。'
  } else if (value.length > 4096 || byteLength(value) > 4096) {
    risk = 'WARN'
    reason = '缓存值超过 4KB，需要确认是否为异常 token 或大权限缓存。'
  }

  if (lower.startsWith('<!doctype') || lower.startsWith('<html')) {
    risk = 'DANGER'
    reason = '缓存值像 HTML 页面，可能曾把错误页写入缓存。'
  }

  if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
    try {
      JSON.parse(value)
      parsed = true
    } catch (error) {
      risk = 'WARN'
      reason = '缓存值像 JSON 但无法解析，建议清理后重新登录或刷新权限。'
    }
  }

  if (key === ACCESS_TOKEN_KEY || key === REFRESH_TOKEN_KEY) {
    const token = value.trim().replace(/^bearer\s+/i, '')
    const payload = parseJwt(token)
    if (!payload) {
      risk = 'DANGER'
      reason = 'Token 不是可解析 JWT，必须清理并重新登录。'
    } else {
      parsed = true
      expireAt = formatJwtTime(payload.exp)
      const expired = typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()
      if (expired) {
        risk = 'WARN'
        reason = 'Token 已过期，需要重新登录。'
      } else if (Array.isArray(payload.permissions) && payload.permissions.length > 0) {
        risk = 'WARN'
        reason = 'JWT 仍包含 permissions，建议确认 auth 服务是否已使用瘦身 token。'
      } else {
        reason = 'Token 可解析，未发现明显结构异常。'
      }
    }
  }

  if (key === 'vspicy_permission_view') {
    try {
      const view = JSON.parse(value) as { permissionCodes?: unknown; permissions?: unknown; roles?: unknown }
      parsed = true
      const permissionCodes = Array.isArray(view.permissionCodes)
        ? view.permissionCodes
        : Array.isArray(view.permissions)
          ? view.permissions
          : []
      const roles = Array.isArray(view.roles) ? view.roles : []
      reason = `权限缓存可解析：${permissionCodes.length} 个权限码，${roles.length} 个角色。`
      if (permissionCodes.length === 0) {
        risk = 'WARN'
        reason = '权限缓存中权限码为空，可能导致后台菜单不可见或接口 403。'
      }
    } catch (error) {
      risk = 'DANGER'
      reason = '权限缓存不是合法 JSON，建议清理后重新登录。'
    }
  }

  if (area === 'cookie' && category === 'auth') {
    risk = risk === 'DANGER' ? risk : 'WARN'
    reason = '登录态不应重复写入 Cookie，可能增加请求头体积。'
  }

  return { category, risk, reason, parsed, expireAt }
}

function collectStorage(area: StorageArea) {
  if (area === 'localStorage' || area === 'sessionStorage') {
    const storage = area === 'localStorage' ? localStorage : sessionStorage
    const rows: CacheEntry[] = []
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index) || ''
      const value = storage.getItem(key) || ''
      const analysis = analyzeValue(area, key, value)
      rows.push({
        id: `${area}:${key}`,
        area,
        key,
        valuePreview: maskValue(value),
        valueLength: value.length,
        byteSize: byteLength(value),
        category: analysis.category,
        risk: analysis.risk,
        reason: analysis.reason,
        removable: true,
        parsed: analysis.parsed,
        expireAt: analysis.expireAt
      })
    }
    return rows
  }

  return document.cookie
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separator = item.indexOf('=')
      const key = separator >= 0 ? item.slice(0, separator) : item
      const value = separator >= 0 ? decodeURIComponent(item.slice(separator + 1)) : ''
      const analysis = analyzeValue('cookie', key, value)
      return {
        id: `cookie:${key}`,
        area: 'cookie' as const,
        key,
        valuePreview: maskValue(value),
        valueLength: value.length,
        byteSize: byteLength(value),
        category: analysis.category,
        risk: analysis.risk,
        reason: analysis.reason,
        removable: true,
        parsed: analysis.parsed,
        expireAt: analysis.expireAt
      }
    })
}

function scanCache() {
  entries.value = [
    ...collectStorage('localStorage'),
    ...collectStorage('sessionStorage'),
    ...collectStorage('cookie')
  ].sort((a, b) => {
    const riskOrder: Record<CacheRisk, number> = { DANGER: 1, WARN: 2, PASS: 3, INFO: 4 }
    return riskOrder[a.risk] - riskOrder[b.risk] || b.byteSize - a.byteSize
  })
  selectedIds.value = selectedIds.value.filter((id) => entries.value.some((entry) => entry.id === id))
  lastScanAt.value = nowText()
  buildJsonPreview()
}

function removeEntry(entry: CacheEntry) {
  if (entry.area === 'localStorage') {
    localStorage.removeItem(entry.key)
  } else if (entry.area === 'sessionStorage') {
    sessionStorage.removeItem(entry.key)
  } else {
    document.cookie = `${entry.key}=;expires=${new Date(0).toUTCString()};path=/`
  }
  scanCache()
}

function removeSelected() {
  filteredEntries.value
    .filter((entry) => selectedIds.value.includes(entry.id))
    .forEach(removeEntry)
  selectedIds.value = []
  scanCache()
}

function clearAuthOnly() {
  clearTokens()
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  sessionStorage.removeItem(USER_ID_KEY)
  document.cookie.split(';').forEach((item) => {
    const key = item.trim().split('=')[0]
    if (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth')) {
      document.cookie = `${key}=;expires=${new Date(0).toUTCString()};path=/`
    }
  })
  scanCache()
}

function toggleSelected(entry: CacheEntry) {
  if (selectedIds.value.includes(entry.id)) {
    selectedIds.value = selectedIds.value.filter((id) => id !== entry.id)
  } else {
    selectedIds.value = [...selectedIds.value, entry.id]
  }
}

function toggleAllVisible() {
  const ids = filteredEntries.value.map((entry) => entry.id)
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.value.includes(id))
  selectedIds.value = allSelected
    ? selectedIds.value.filter((id) => !ids.includes(id))
    : Array.from(new Set([...selectedIds.value, ...ids]))
}

function entryMatches(entry: CacheEntry) {
  const value = keyword.value.trim().toLowerCase()
  const passKeyword = !value || [entry.key, entry.valuePreview, entry.reason, entry.area, entry.category, entry.risk]
    .some((item) => String(item).toLowerCase().includes(value))
  const passArea = areaFilter.value === 'ALL' || entry.area === areaFilter.value
  const passRisk = riskFilter.value === 'ALL' || entry.risk === riskFilter.value
  const passCategory = categoryFilter.value === 'ALL' || entry.category === categoryFilter.value
  return passKeyword && passArea && passRisk && passCategory
}

const filteredEntries = computed(() => entries.value.filter(entryMatches))

const metrics = computed(() => {
  const totalBytes = entries.value.reduce((sum, entry) => sum + entry.byteSize, 0)
  return {
    total: entries.value.length,
    danger: entries.value.filter((entry) => entry.risk === 'DANGER').length,
    warn: entries.value.filter((entry) => entry.risk === 'WARN').length,
    auth: entries.value.filter((entry) => entry.category === 'auth').length,
    totalBytes,
    selected: selectedIds.value.length
  }
})

const authSummary = computed(() => {
  const access = entries.value.find((entry) => entry.key === ACCESS_TOKEN_KEY)
  const permission = entries.value.find((entry) => entry.key === 'vspicy_permission_view')
  const userId = entries.value.find((entry) => entry.key === USER_ID_KEY)
  return [
    access ? `accessToken：${access.risk}，${access.byteSize}B` : 'accessToken：缺失',
    userId ? `userId：${userId.valuePreview}` : 'userId：缺失',
    permission ? `权限缓存：${permission.risk}，${permission.byteSize}B` : '权限缓存：缺失'
  ].join(' / ')
})

function buildSnapshot() {
  return {
    generatedAt: new Date().toISOString(),
    location: window.location.href,
    lastScanAt: lastScanAt.value,
    metrics: metrics.value,
    authSummary: authSummary.value,
    entries: entries.value.map((entry) => ({
      area: entry.area,
      key: entry.key,
      valueLength: entry.valueLength,
      byteSize: entry.byteSize,
      category: entry.category,
      risk: entry.risk,
      reason: entry.reason,
      parsed: entry.parsed,
      expireAt: entry.expireAt || undefined
    }))
  }
}

function buildJsonPreview() {
  jsonPreview.value = JSON.stringify(buildSnapshot(), null, 2)
}

async function copySnapshot() {
  buildJsonPreview()
  copied.value = false
  try {
    await navigator.clipboard.writeText(jsonPreview.value)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 1600)
  } catch (error) {
    const textarea = document.createElement('textarea')
    textarea.value = jsonPreview.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copied.value = true
  }
}

function exportSnapshot() {
  buildJsonPreview()
  const blob = new Blob([jsonPreview.value], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `vspicy-client-cache-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function refreshWithValues() {
  showValues.value = !showValues.value
  scanCache()
}

onMounted(() => {
  scanCache()
})
</script>

<template>
  <section>
    <div class="page-header">
      <div>
        <p class="eyebrow">Client Cache Governance</p>
        <h1>客户端缓存治理</h1>
        <p class="subtitle">
          统一检查 localStorage、sessionStorage 和 Cookie 中的登录态、权限缓存与异常大对象，避免坏 token、HTML 错误页、过期权限缓存继续触发 401、403 或请求头过大问题。
        </p>
      </div>
      <div class="header-actions">
        <button type="button" class="secondary" @click="scanCache">重新扫描</button>
        <button type="button" class="secondary" @click="copySnapshot">{{ copied ? '已复制' : '复制快照' }}</button>
        <button type="button" class="secondary" @click="exportSnapshot">导出 JSON</button>
        <button type="button" class="danger" @click="clearAuthOnly">清理登录态</button>
      </div>
    </div>

    <div class="metrics">
      <div class="metric-card">
        <span>缓存项</span>
        <strong>{{ metrics.total }}</strong>
      </div>
      <div class="metric-card danger">
        <span>高风险</span>
        <strong>{{ metrics.danger }}</strong>
      </div>
      <div class="metric-card warn">
        <span>需关注</span>
        <strong>{{ metrics.warn }}</strong>
      </div>
      <div class="metric-card">
        <span>登录态相关</span>
        <strong>{{ metrics.auth }}</strong>
      </div>
      <div class="metric-card success">
        <span>总大小</span>
        <strong>{{ metrics.totalBytes }}B</strong>
      </div>
      <div class="metric-card">
        <span>已选择</span>
        <strong>{{ metrics.selected }}</strong>
      </div>
    </div>

    <div class="content-card summary-card">
      <div>
        <strong>登录态摘要</strong>
        <p>{{ authSummary }}</p>
      </div>
      <div class="pill">最后扫描：{{ lastScanAt || '-' }}</div>
    </div>

    <div class="filters">
      <input v-model="keyword" type="search" placeholder="搜索 key / 原因 / 类型" />
      <select v-model="areaFilter">
        <option value="ALL">全部存储区</option>
        <option value="localStorage">localStorage</option>
        <option value="sessionStorage">sessionStorage</option>
        <option value="cookie">Cookie</option>
      </select>
      <select v-model="categoryFilter">
        <option value="ALL">全部分类</option>
        <option value="auth">登录态</option>
        <option value="permission">权限缓存</option>
        <option value="ui">界面偏好</option>
        <option value="runtime">运行缓存</option>
        <option value="unknown">未知缓存</option>
      </select>
      <select v-model="riskFilter">
        <option value="ALL">全部风险</option>
        <option value="DANGER">高风险</option>
        <option value="WARN">需关注</option>
        <option value="PASS">正常</option>
        <option value="INFO">信息</option>
      </select>
      <button type="button" class="secondary" @click="refreshWithValues">{{ showValues ? '隐藏值' : '显示值' }}</button>
      <button type="button" class="danger" :disabled="selectedIds.length === 0" @click="removeSelected">删除选中</button>
    </div>

    <div class="content-card table-wrap">
      <table>
        <thead>
          <tr>
            <th><input type="checkbox" :checked="filteredEntries.length > 0 && filteredEntries.every(entry => selectedIds.includes(entry.id))" @change="toggleAllVisible" /></th>
            <th>风险</th>
            <th>存储区</th>
            <th>Key</th>
            <th>分类</th>
            <th>大小</th>
            <th>值预览</th>
            <th>判断原因</th>
            <th>过期时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in filteredEntries" :key="entry.id">
            <td><input type="checkbox" :checked="selectedIds.includes(entry.id)" @change="toggleSelected(entry)" /></td>
            <td><span :class="['status', entry.risk === 'DANGER' ? 'danger' : entry.risk === 'WARN' ? 'warn' : entry.risk === 'PASS' ? 'ok' : 'off']">{{ riskLabels[entry.risk] }}</span></td>
            <td><code>{{ entry.area }}</code></td>
            <td>
              <strong>{{ entry.key }}</strong>
              <small v-if="entry.parsed">结构可解析</small>
            </td>
            <td>{{ categoryLabels[entry.category] }}</td>
            <td>{{ entry.byteSize }}B<small>{{ entry.valueLength }} 字符</small></td>
            <td><code class="value-preview">{{ entry.valuePreview || '-' }}</code></td>
            <td>{{ entry.reason }}</td>
            <td>{{ entry.expireAt || '-' }}</td>
            <td><button type="button" class="danger" @click="removeEntry(entry)">删除</button></td>
          </tr>
          <tr v-if="filteredEntries.length === 0">
            <td colspan="10" class="empty">没有匹配的缓存项。</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="content-card guide-card">
      <h3>处理建议</h3>
      <ol>
        <li>出现 <code>Request header is too large</code>：优先清理登录态和 Cookie 中的 token。</li>
        <li>登录后持续 401：清理 accessToken、refreshToken、userId 后重新登录。</li>
        <li>接口 403：刷新或清理 <code>vspicy_permission_view</code>，再重新登录确认角色权限。</li>
        <li>缓存值显示 HTML 或 JSON 解析失败：直接删除该项，避免错误响应被当作 token 或权限缓存。</li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.summary-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.summary-card p {
  margin: 8px 0 0;
  color: var(--vspicy-muted);
  line-height: 1.6;
}

.value-preview {
  display: inline-block;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.guide-card {
  margin-top: 16px;
}

.guide-card h3 {
  margin: 0 0 10px;
}

.guide-card ol {
  margin: 0;
  padding-left: 20px;
  color: #334155;
  line-height: 1.8;
}

@media (max-width: 780px) {
  .summary-card {
    display: grid;
  }
}
</style>
