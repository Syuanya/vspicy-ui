<template>
  <div class="error-code-page">
    <section class="hero-card">
      <div>
        <p class="eyebrow">SYSTEM GOVERNANCE</p>
        <h1>错误码目录</h1>
        <p class="subtitle">统一管理 HTTP 状态、业务 code、前端提示、后端异常类型和排查动作，减少接口联调时的 401/403/404/500 误判。</p>
      </div>
      <div class="hero-actions">
        <button class="primary" @click="copyCatalog">复制目录快照</button>
        <button @click="downloadCatalog">导出 JSON</button>
      </div>
    </section>

    <section class="metrics-grid">
      <div class="metric-card">
        <span>错误码总数</span>
        <strong>{{ filteredItems.length }}</strong>
        <small>当前筛选结果</small>
      </div>
      <div class="metric-card danger">
        <span>高风险</span>
        <strong>{{ riskCount.danger }}</strong>
        <small>影响登录、权限或服务稳定性</small>
      </div>
      <div class="metric-card warning">
        <span>需治理</span>
        <strong>{{ riskCount.warning }}</strong>
        <small>参数、契约、路由和缓存问题</small>
      </div>
      <div class="metric-card success">
        <span>统一契约</span>
        <strong>Result</strong>
        <small>code / message / data</small>
      </div>
    </section>

    <section class="tool-card">
      <div class="tool-header">
        <div>
          <h2>快速匹配</h2>
          <p>粘贴 HTTP 状态、业务 code、错误文案或异常栈关键字，自动匹配可能的错误码规则。</p>
        </div>
        <button @click="fillSample">填入样例</button>
      </div>
      <textarea v-model="probeText" placeholder="例如：403 Forbidden、Request header is too large、NoResourceFoundException、code: 40100、text/html fallback"></textarea>
      <div class="match-list" v-if="matchedItems.length">
        <article v-for="item in matchedItems" :key="item.key" class="match-item" :class="item.level">
          <div>
            <strong>{{ item.httpStatus }} / {{ item.businessCode }}</strong>
            <span>{{ item.title }}</span>
          </div>
          <p>{{ item.reason }}</p>
        </article>
      </div>
      <p v-else class="empty-hint">暂无匹配结果。输入关键字后会按状态码、异常类名、文案和处理建议匹配。</p>
    </section>

    <section class="filter-card">
      <input v-model="keyword" placeholder="搜索状态码、业务码、异常、服务、处理建议" />
      <select v-model="category">
        <option value="all">全部分类</option>
        <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
      </select>
      <select v-model="level">
        <option value="all">全部等级</option>
        <option value="danger">高风险</option>
        <option value="warning">需治理</option>
        <option value="info">提示</option>
        <option value="success">正常</option>
      </select>
      <select v-model="service">
        <option value="all">全部服务</option>
        <option v-for="item in services" :key="item" :value="item">{{ item }}</option>
      </select>
    </section>

    <section class="catalog-table">
      <div class="table-row table-head">
        <span>HTTP / code</span>
        <span>分类</span>
        <span>标题</span>
        <span>影响服务</span>
        <span>处理动作</span>
      </div>
      <article v-for="item in filteredItems" :key="item.key" class="table-row">
        <div class="code-cell">
          <strong>{{ item.httpStatus }}</strong>
          <small>{{ item.businessCode }}</small>
          <em :class="item.level">{{ levelText[item.level] }}</em>
        </div>
        <div>{{ item.category }}</div>
        <div>
          <strong>{{ item.title }}</strong>
          <p>{{ item.reason }}</p>
          <div class="tags">
            <span v-for="tag in item.keywords" :key="tag">{{ tag }}</span>
          </div>
        </div>
        <div>
          <span v-for="target in item.services" :key="target" class="service-chip">{{ target }}</span>
        </div>
        <div>
          <ol>
            <li v-for="action in item.actions" :key="action">{{ action }}</li>
          </ol>
          <button class="mini" @click="copyItem(item)">复制处理方案</button>
        </div>
      </article>
      <div v-if="!filteredItems.length" class="empty-card">没有匹配的错误码规则。</div>
    </section>

    <section class="snippet-grid">
      <article class="snippet-card">
        <div class="snippet-title">
          <h2>前端拦截器建议</h2>
          <button @click="copyText(tsSnippet)">复制 TS</button>
        </div>
        <pre>{{ tsSnippet }}</pre>
      </article>
      <article class="snippet-card">
        <div class="snippet-title">
          <h2>后端错误码枚举建议</h2>
          <button @click="copyText(javaSnippet)">复制 Java</button>
        </div>
        <pre>{{ javaSnippet }}</pre>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type Level = 'success' | 'info' | 'warning' | 'danger'

interface ErrorCodeItem {
  key: string
  httpStatus: number | string
  businessCode: number | string
  category: string
  title: string
  reason: string
  services: string[]
  level: Level
  keywords: string[]
  actions: string[]
}

const keyword = ref('')
const category = ref('all')
const level = ref<'all' | Level>('all')
const service = ref('all')
const probeText = ref('')

const levelText: Record<Level, string> = {
  success: '正常',
  info: '提示',
  warning: '需治理',
  danger: '高风险'
}

const catalog: ErrorCodeItem[] = [
  {
    key: 'ok',
    httpStatus: 200,
    businessCode: 0,
    category: '统一响应',
    title: '请求成功',
    reason: '接口应返回统一 Result 结构，业务成功时 code 为 0。',
    services: ['all'],
    level: 'success',
    keywords: ['Result', 'code 0', 'success'],
    actions: ['确认响应 Content-Type 为 application/json。', '确认响应结构包含 code、message、data。']
  },
  {
    key: 'bad-request',
    httpStatus: 400,
    businessCode: 40000,
    category: '参数错误',
    title: '请求参数不合法',
    reason: '常见于 @RequestParam 缺失、字段类型转换失败、分页参数非法。',
    services: ['gateway', 'auth', 'admin', 'member', 'video'],
    level: 'warning',
    keywords: ['400', 'Bad Request', 'MissingServletRequestParameterException', '参数'],
    actions: ['检查 Network 里的 Query String 和 Request Payload。', '确认前端 API 封装参数名与 Controller 入参一致。', '后端对可选参数设置 required=false 或默认值。']
  },
  {
    key: 'unauthorized',
    httpStatus: 401,
    businessCode: 40100,
    category: '认证失败',
    title: '未登录或 token 失效',
    reason: 'Authorization 缺失、accessToken 过期、token 被前端安全逻辑拒绝写入。',
    services: ['gateway', 'auth', 'ui'],
    level: 'danger',
    keywords: ['401', 'Unauthorized', 'token', '未登录', '登录过期'],
    actions: ['清理 localStorage 中的 vspicy_access_token 后重新登录。', '检查登录接口返回 accessToken 字段是否稳定。', '确认 Gateway 能解析 JWT 的 userId、username、roles。']
  },
  {
    key: 'forbidden',
    httpStatus: 403,
    businessCode: 40300,
    category: '权限不足',
    title: '用户缺少角色或权限码',
    reason: '常见于 Gateway 规则需要权限码，但 JWT 或权限视图没有对应授权。',
    services: ['gateway', 'admin', 'auth'],
    level: 'danger',
    keywords: ['403', 'Forbidden', '无权限', 'permission', 'roles'],
    actions: ['打开权限诊断页检查 roles 和 permissionCodes。', '确认 sys_role_permission 已授权给当前角色。', '用户自助接口优先配置为 AUTHENTICATED，而不是后台权限码。']
  },
  {
    key: 'not-found',
    httpStatus: 404,
    businessCode: 40400,
    category: '路径错误',
    title: '接口或静态资源不存在',
    reason: '常见于少了 /api 前缀、Gateway 路由缺失、Controller 路径不匹配、favicon.ico 探测。',
    services: ['gateway', 'ui', 'all'],
    level: 'warning',
    keywords: ['404', 'NoResourceFoundException', 'favicon.ico', 'Not Found'],
    actions: ['用请求追踪页确认路径是否匹配 Gateway 路由。', '确认 Vite proxy 将 /api 转发到 18080。', 'favicon.ico 缺失应降级为 404，不要按系统异常处理。']
  },
  {
    key: 'conflict',
    httpStatus: 409,
    businessCode: 40900,
    category: '状态冲突',
    title: '重复提交或状态不允许',
    reason: '常见于重复字典项、重复权限码、重复任务提交、状态机不允许当前操作。',
    services: ['admin', 'video', 'content'],
    level: 'warning',
    keywords: ['409', 'Conflict', 'duplicate', '重复', '状态'],
    actions: ['后端使用唯一索引或业务唯一校验。', '前端在提交按钮增加 loading 防重。', '返回明确 message，说明冲突字段。']
  },
  {
    key: 'header-too-large',
    httpStatus: 431,
    businessCode: 43100,
    category: '请求头过大',
    title: 'Request header is too large',
    reason: 'JWT、Cookie 或 Authorization 头过大，Tomcat 在进入 Controller 前拒绝请求。',
    services: ['gateway', 'auth', 'member', 'admin'],
    level: 'danger',
    keywords: ['Request header is too large', 'IllegalArgumentException', 'header', '431', 'Cookie'],
    actions: ['清理浏览器 localStorage 和 Cookie。', 'JWT 只保留 userId、username、roles，不要塞入完整 permissions。', '后端配置 server.max-http-request-header-size=64KB。']
  },
  {
    key: 'unsupported-media',
    httpStatus: 415,
    businessCode: 41500,
    category: '请求体错误',
    title: 'Content-Type 不匹配',
    reason: 'JSON 接口没有发送 application/json，或上传接口没有使用 multipart/form-data。',
    services: ['ui', 'file', 'video'],
    level: 'warning',
    keywords: ['415', 'Unsupported Media Type', 'Content-Type', 'multipart'],
    actions: ['JSON POST 使用 application/json。', '文件上传使用 FormData，不手写错误 Content-Type。', '检查 axios 封装是否覆盖了请求头。']
  },
  {
    key: 'too-many-requests',
    httpStatus: 429,
    businessCode: 42900,
    category: '限流保护',
    title: '请求频率过高',
    reason: '登录、上传、通知或诊断接口短时间请求过多。',
    services: ['gateway', 'auth', 'video', 'notification'],
    level: 'info',
    keywords: ['429', 'Too Many Requests', '限流', '频率'],
    actions: ['前端增加按钮 loading 和 debounce。', '网关限流规则按接口分级设置。', '返回 retryAfter 提示用户等待。']
  },
  {
    key: 'html-fallback',
    httpStatus: '200/404',
    businessCode: '非 Result',
    category: '响应契约',
    title: '接口返回 text/html',
    reason: '请求被 Vite fallback、前端 index.html 或 Spring 静态资源处理接管，没有进入目标 API。',
    services: ['ui', 'gateway'],
    level: 'danger',
    keywords: ['text/html', '<!doctype', '<html', 'fallback', 'index.html'],
    actions: ['确认请求路径以 /api 开头。', '检查 vite.config.ts 的 proxy.target 是否为 http://localhost:18080。', '使用接口契约页检查 Content-Type。']
  },
  {
    key: 'server-error',
    httpStatus: 500,
    businessCode: 50000,
    category: '服务异常',
    title: '后端系统异常',
    reason: '业务代码抛出未处理异常、SQL 异常、空指针、方法签名不一致或依赖服务异常。',
    services: ['all'],
    level: 'danger',
    keywords: ['500', 'Exception', '系统异常', 'NullPointerException', 'SQL'],
    actions: ['先看具体服务日志，不要只看浏览器状态码。', '确认最近覆盖包是否遗留旧 Java 文件。', '公共异常处理器返回 traceId，方便定位日志。']
  }
]

const categories = computed(() => Array.from(new Set(catalog.map((item) => item.category))))
const services = computed(() => Array.from(new Set(catalog.flatMap((item) => item.services))).sort())

function normalize(value: unknown) {
  return String(value ?? '').toLowerCase()
}

const filteredItems = computed(() => {
  const q = normalize(keyword.value).trim()
  return catalog.filter((item) => {
    const text = normalize([
      item.httpStatus,
      item.businessCode,
      item.category,
      item.title,
      item.reason,
      item.services.join(' '),
      item.keywords.join(' '),
      item.actions.join(' ')
    ].join(' '))
    return (!q || text.includes(q))
      && (category.value === 'all' || item.category === category.value)
      && (level.value === 'all' || item.level === level.value)
      && (service.value === 'all' || item.services.includes(service.value) || item.services.includes('all'))
  })
})

const matchedItems = computed(() => {
  const text = normalize(probeText.value)
  if (!text.trim()) return []
  return catalog.filter((item) => {
    const haystack = normalize([
      item.httpStatus,
      item.businessCode,
      item.title,
      item.reason,
      ...item.keywords,
      ...item.actions
    ].join(' '))
    return haystack.split(/\s+/).some((word) => word.length > 2 && text.includes(word))
      || item.keywords.some((tag) => text.includes(normalize(tag)))
  }).slice(0, 5)
})

const riskCount = computed(() => ({
  danger: filteredItems.value.filter((item) => item.level === 'danger').length,
  warning: filteredItems.value.filter((item) => item.level === 'warning').length
}))

const tsSnippet = `export interface Result<T = unknown> {\n  code: number\n  message: string\n  data: T\n}\n\nexport function assertResult(value: unknown): value is Result {\n  return !!value && typeof value === 'object'\n    && 'code' in value\n    && 'message' in value\n    && 'data' in value\n}\n\nexport function resolveErrorMessage(status?: number, code?: number) {\n  if (status === 401 || code === 40100) return '未登录或登录已过期'\n  if (status === 403 || code === 40300) return '无权限访问'\n  if (status === 404 || code === 40400) return '接口不存在或网关路径错误'\n  if (status === 431 || code === 43100) return '请求头过大，请清理登录缓存'\n  return '系统异常，请稍后重试'\n}`

const javaSnippet = `public enum ErrorCode {\n    SUCCESS(0, "success"),\n    BAD_REQUEST(40000, "请求参数不合法"),\n    UNAUTHORIZED(40100, "未登录或登录已过期"),\n    FORBIDDEN(40300, "无权限访问"),\n    NOT_FOUND(40400, "资源不存在"),\n    CONFLICT(40900, "数据状态冲突"),\n    REQUEST_HEADER_TOO_LARGE(43100, "请求头过大"),\n    SERVER_ERROR(50000, "系统异常");\n\n    private final int code;\n    private final String message;\n}`

function buildSnapshot() {
  return {
    generatedAt: new Date().toISOString(),
    total: catalog.length,
    filters: {
      keyword: keyword.value,
      category: category.value,
      level: level.value,
      service: service.value
    },
    items: filteredItems.value
  }
}

async function copyText(text: string) {
  await navigator.clipboard?.writeText(text)
}

async function copyCatalog() {
  await copyText(JSON.stringify(buildSnapshot(), null, 2))
}

async function copyItem(item: ErrorCodeItem) {
  const content = `${item.httpStatus} / ${item.businessCode} ${item.title}\n原因：${item.reason}\n处理：\n${item.actions.map((action, index) => `${index + 1}. ${action}`).join('\n')}`
  await copyText(content)
}

function downloadCatalog() {
  const blob = new Blob([JSON.stringify(buildSnapshot(), null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `vspicy-error-code-catalog-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function fillSample() {
  probeText.value = 'GET /api/members/me 403 Forbidden，无权限访问。Gateway 解析 JWT roles 为空，permissionCodes 缺失。'
}
</script>

<style scoped>
.error-code-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero-card,
.tool-card,
.filter-card,
.catalog-table,
.snippet-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 22px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 28px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: 30px;
  color: #0f172a;
}

h2 {
  font-size: 18px;
  color: #0f172a;
}

.subtitle,
.tool-header p,
.table-row p,
.empty-hint {
  margin-top: 8px;
  color: #64748b;
  line-height: 1.65;
}

.hero-actions,
.tool-header,
.snippet-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

button {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  border-radius: 12px;
  padding: 9px 14px;
  cursor: pointer;
  font-weight: 700;
}

button.primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

button.mini {
  margin-top: 10px;
  padding: 6px 10px;
  font-size: 12px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, #ffffff, #eff6ff);
  border: 1px solid rgba(37, 99, 235, 0.12);
}

.metric-card span,
.metric-card small {
  display: block;
  color: #64748b;
}

.metric-card strong {
  display: block;
  margin: 8px 0;
  color: #0f172a;
  font-size: 28px;
}

.metric-card.danger {
  background: linear-gradient(135deg, #fff, #fef2f2);
}

.metric-card.warning {
  background: linear-gradient(135deg, #fff, #fffbeb);
}

.metric-card.success {
  background: linear-gradient(135deg, #fff, #ecfdf5);
}

.tool-card {
  padding: 20px;
}

textarea {
  width: 100%;
  min-height: 100px;
  margin-top: 14px;
  resize: vertical;
  border: 1px solid #cbd5e1;
  border-radius: 16px;
  padding: 14px;
  color: #0f172a;
  box-sizing: border-box;
}

.match-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.match-item {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.match-item div {
  display: flex;
  gap: 10px;
  align-items: center;
}

.match-item.danger {
  border-color: #fecaca;
  background: #fef2f2;
}

.match-item.warning {
  border-color: #fde68a;
  background: #fffbeb;
}

.filter-card {
  display: grid;
  grid-template-columns: 1fr 180px 160px 160px;
  gap: 12px;
  padding: 16px;
}

input,
select {
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 10px 12px;
  color: #0f172a;
  background: #fff;
}

.catalog-table {
  overflow: hidden;
}

.table-row {
  display: grid;
  grid-template-columns: 140px 120px 1.4fr 180px 1.2fr;
  gap: 14px;
  padding: 16px 18px;
  border-top: 1px solid #e2e8f0;
  align-items: start;
}

.table-row:first-child {
  border-top: none;
}

.table-head {
  background: #f8fafc;
  color: #475569;
  font-weight: 800;
}

.code-cell strong,
.code-cell small,
.code-cell em {
  display: block;
}

.code-cell small {
  margin-top: 4px;
  color: #64748b;
}

.code-cell em {
  width: max-content;
  margin-top: 8px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-style: normal;
}

.code-cell em.success,
.match-item.success {
  color: #047857;
  background: #ecfdf5;
}

.code-cell em.info,
.match-item.info {
  color: #0369a1;
  background: #eff6ff;
}

.code-cell em.warning {
  color: #92400e;
  background: #fef3c7;
}

.code-cell em.danger {
  color: #b91c1c;
  background: #fee2e2;
}

.tags,
.service-chip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tags span,
.service-chip {
  padding: 4px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 12px;
}

ol {
  margin: 0;
  padding-left: 18px;
  color: #475569;
  line-height: 1.6;
}

.empty-card {
  padding: 24px;
  color: #64748b;
  text-align: center;
}

.snippet-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.snippet-card {
  padding: 18px;
  overflow: hidden;
}

pre {
  margin: 14px 0 0;
  padding: 14px;
  border-radius: 14px;
  background: #0f172a;
  color: #e2e8f0;
  overflow: auto;
  line-height: 1.55;
}

@media (max-width: 1100px) {
  .hero-card,
  .tool-header,
  .snippet-title {
    flex-direction: column;
    align-items: flex-start;
  }

  .metrics-grid,
  .snippet-grid,
  .filter-card,
  .table-row {
    grid-template-columns: 1fr;
  }
}
</style>
