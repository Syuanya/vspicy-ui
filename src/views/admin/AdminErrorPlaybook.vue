<script setup lang="ts">
import { computed, ref } from 'vue'

type Level = 'success' | 'info' | 'warning' | 'danger'
type Category = 'frontend' | 'gateway' | 'auth' | 'permission' | 'backend' | 'compile' | 'storage' | 'data'

type PlaybookItem = {
  id: string
  title: string
  category: Category
  level: Level
  statusCode?: string
  keywords: string[]
  symptoms: string[]
  rootCauses: string[]
  actions: string[]
  commands: string[]
  relatedFiles: string[]
}

type Hit = {
  item: PlaybookItem
  score: number
  matchedKeywords: string[]
}

const keyword = ref('')
const selectedCategory = ref<'all' | Category>('all')
const selectedLevel = ref<'all' | Level>('all')
const copiedId = ref('')
const sampleText = ref('')

const categories: Array<{ value: 'all' | Category; label: string }> = [
  { value: 'all', label: '全部类型' },
  { value: 'frontend', label: '前端/Vite' },
  { value: 'gateway', label: '网关/路由' },
  { value: 'auth', label: '登录/JWT' },
  { value: 'permission', label: '权限/RBAC' },
  { value: 'backend', label: '后端接口' },
  { value: 'compile', label: '编译错误' },
  { value: 'storage', label: '上传/存储' },
  { value: 'data', label: '数据/SQL' }
]

const levels: Array<{ value: 'all' | Level; label: string }> = [
  { value: 'all', label: '全部等级' },
  { value: 'danger', label: '阻断' },
  { value: 'warning', label: '高风险' },
  { value: 'info', label: '需确认' },
  { value: 'success', label: '低风险' }
]

const playbooks: PlaybookItem[] = [
  {
    id: 'header-too-large',
    title: 'Request header is too large',
    category: 'auth',
    level: 'danger',
    statusCode: '400',
    keywords: ['Request header is too large', 'IllegalArgumentException', 'Http11InputBuffer', 'parseHeader', '请求头太大', 'max-http-request-header-size'],
    symptoms: ['Tomcat 在进入 Controller 前直接拒绝请求。', '浏览器登录后后续接口随机 400。', 'Authorization 或 Cookie 体积异常。'],
    rootCauses: ['JWT 塞入大量 permissions，导致 Authorization 超过 Tomcat 请求头限制。', 'localStorage 写入了 HTML/JSON 错误内容作为 token。', 'Cookie 中残留大体积调试数据。'],
    actions: ['清理浏览器登录态和 Cookie。', '确认 JWT 只保留 userId、username、roles、tokenType 等必要字段。', '开发环境将 server.max-http-request-header-size 调整到 64KB。'],
    commands: [
      "localStorage.removeItem('vspicy_access_token')",
      "localStorage.removeItem('vspicy_refresh_token')",
      "localStorage.removeItem('vspicy_user_id')",
      "localStorage.removeItem('vspicy_permission_view')",
      'document.cookie.split(\';\').forEach(c => document.cookie = c.replace(/^ +/, \'\').replace(/=.*/, \'=;expires=\' + new Date(0).toUTCString() + \';path=/\'))',
      'cd D:\\workspace\\vspicy\\vspicy-cloud',
      'mvn -pl vspicy-auth,vspicy-gateway -am clean package -DskipTests'
    ],
    relatedFiles: ['vspicy-ui/src/api/http.ts', 'vspicy-cloud/vspicy-auth/src/main/java/com/vspicy/auth/service/AuthJwtTokenService.java', '各服务 application.yml']
  },
  {
    id: 'token-rejected',
    title: '登录接口返回的 accessToken 异常，已拒绝写入本地缓存',
    category: 'auth',
    level: 'danger',
    statusCode: '登录后 401',
    keywords: ['accessToken 异常', '已拒绝写入本地缓存', 'saveTokens', '登录接口返回', 'token 异常'],
    symptoms: ['登录接口已返回，但本地没有保存 accessToken。', '登录后立刻访问 /api/auth/me 或个人中心接口返回 401。'],
    rootCauses: ['登录响应结构和前端解析字段不一致。', 'accessToken 不是字符串，或内容像 HTML/JSON。', 'token 超出前端安全阈值。'],
    actions: ['在 Network 查看登录响应 data.accessToken 是否存在。', '前端兼容 accessToken、access_token、token、jwt。', '后端瘦身 JWT，不把 permissions 全量写入 token。'],
    commands: [
      'curl -X POST http://localhost:18080/api/auth/login -H "Content-Type: application/json" -d "{\\"username\\":\\"admin\\",\\"password\\":\\"admin123456\\"}"',
      'cd D:\\workspace\\vspicy\\vspicy-cloud',
      'mvn -pl vspicy-auth -am clean package -DskipTests'
    ],
    relatedFiles: ['vspicy-ui/src/api/auth.ts', 'vspicy-ui/src/api/http.ts', 'vspicy-cloud/vspicy-auth/src/main/java/com/vspicy/auth/controller/AuthController.java']
  },
  {
    id: 'gateway-403',
    title: '登录成功后接口 403 Forbidden',
    category: 'permission',
    level: 'danger',
    statusCode: '403',
    keywords: ['403', 'Forbidden', '无权限访问', 'permission-view', 'roles', 'SUPER_ADMIN', 'AUTHENTICATED'],
    symptoms: ['登录成功，但 /api/members/me、/api/notifications/unread-count 返回 403。', '前端控制台提示无权限访问。'],
    rootCauses: ['Gateway 依赖 JWT roles，但 token 中 roles 被移除。', '用户缺少接口所需权限码。', '用户自助接口被误配置成后台权限接口。'],
    actions: ['JWT 保留 roles，但不要放全量 permissions。', 'Gateway 对用户自助接口使用 AUTHENTICATED 策略。', '后台功能接口继续用 permissionCode 精确控制。'],
    commands: [
      'curl http://localhost:18080/api/auth/me -H "Authorization: Bearer <token>"',
      'curl http://localhost:18080/api/members/me?userId=1 -H "Authorization: Bearer <token>"',
      'cd D:\\workspace\\vspicy\\vspicy-cloud',
      'mvn -pl vspicy-auth,vspicy-gateway -am clean package -DskipTests'
    ],
    relatedFiles: ['vspicy-cloud/vspicy-gateway/src/main/java/com/vspicy/gateway/security/GatewayAuthFilter.java', 'vspicy-cloud/vspicy-gateway/src/main/resources/application.yml']
  },
  {
    id: 'unauthorized-401',
    title: '接口 401 Unauthorized',
    category: 'auth',
    level: 'warning',
    statusCode: '401',
    keywords: ['401', 'Unauthorized', '未登录', '登录已过期', 'Authorization', 'Bearer'],
    symptoms: ['页面进入后多个接口同时 401。', 'Network 中请求没有 Authorization 头。', '本地 token 过期或被清理。'],
    rootCauses: ['accessToken 未写入 localStorage。', '登录响应字段解析失败。', 'token 过期或刷新逻辑未接入。'],
    actions: ['先清理本地登录态并重新登录。', '在客户端缓存页面检查 token 是否合法 JWT。', '确认 http.ts 请求拦截器注入 Authorization。'],
    commands: [
      "localStorage.getItem('vspicy_access_token')",
      "localStorage.removeItem('vspicy_access_token'); localStorage.removeItem('vspicy_refresh_token'); location.reload()",
      'curl http://localhost:18080/api/auth/me -H "Authorization: Bearer <token>"'
    ],
    relatedFiles: ['vspicy-ui/src/api/http.ts', 'vspicy-ui/src/api/auth.ts', 'vspicy-ui/src/utils/permission.ts']
  },
  {
    id: 'vite-html-fallback',
    title: '接口返回 text/html 或被 Vite fallback 接管',
    category: 'frontend',
    level: 'warning',
    statusCode: '400/404/HTML',
    keywords: ['text/html', 'localhost:5173', 'Remote Address: 127.0.0.1:5173', '<!doctype', '<html', 'Vite', 'fallback'],
    symptoms: ['Network 显示接口请求地址是 localhost:5173/api/**。', 'Response 是 HTML，不是统一 Result JSON。', '后端日志没有对应业务接口请求。'],
    rootCauses: ['vite.config.ts 没有配置 /api 代理。', '前端 baseURL 缺少 /api，或直接打到了错误端口。', '接口路径拼错，进入前端 fallback。'],
    actions: ['确认 Vite 代理 /api -> http://localhost:18080。', '确认 http.ts baseURL 为 /api。', '使用请求追踪页面验证路径是否匹配 Gateway。'],
    commands: [
      'curl http://localhost:5173/api/members/plans',
      'curl http://localhost:18080/api/members/plans',
      'cd D:\\workspace\\vspicy\\vspicy-ui',
      'npm run dev'
    ],
    relatedFiles: ['vspicy-ui/vite.config.ts', 'vspicy-ui/src/api/http.ts', 'vspicy-cloud/vspicy-gateway/src/main/resources/application.yml']
  },
  {
    id: 'no-static-resource',
    title: 'NoResourceFoundException / No static resource',
    category: 'gateway',
    level: 'info',
    statusCode: '404',
    keywords: ['NoResourceFoundException', 'No static resource', 'favicon.ico', 'ResourceHttpRequestHandler'],
    symptoms: ['后端日志出现系统异常，但资源名是 favicon.ico 或静态路径。', '请求没有进入业务 Controller。'],
    rootCauses: ['浏览器自动请求 favicon.ico。', '请求路径没有匹配 Controller 或 Gateway 路由。', '直接访问业务服务根路径。'],
    actions: ['favicon.ico 可降级为 debug/404，不作为系统异常。', '若资源不是 favicon.ico，检查前端请求路径和 Gateway Path。', '直接访问服务时使用 /api/** 真实接口路径。'],
    commands: [
      'curl http://localhost:18080/api/auth/health',
      'curl http://localhost:18081/api/auth/health',
      'curl http://localhost:18092/api/members/health'
    ],
    relatedFiles: ['vspicy-cloud/vspicy-common/src/main/java/com/vspicy/common/web/GlobalExceptionHandler.java', '各服务 Controller']
  },
  {
    id: 'missing-request-parameter',
    title: 'MissingServletRequestParameterException',
    category: 'backend',
    level: 'danger',
    statusCode: '400',
    keywords: ['MissingServletRequestParameterException', 'Required request parameter', 'chunkIndex', 'method parameter type'],
    symptoms: ['接口返回 400，后端提示缺少必填 request parameter。', '分片上传、查询筛选或操作接口参数没有传齐。'],
    rootCauses: ['前端 API 封装遗漏参数。', '后端 @RequestParam 设置 required=true，但前端场景允许为空。', '参数名不一致，例如 chunkIndex/chunkNo。'],
    actions: ['对照 Controller 方法签名补齐前端参数。', '可选参数改成 required=false 并设置默认值。', '统一 DTO，避免多个页面手写 query 参数。'],
    commands: [
      'grep -R "chunkIndex" D:\\workspace\\vspicy\\vspicy-ui\\src',
      'grep -R "@RequestParam" D:\\workspace\\vspicy\\vspicy-cloud\\vspicy-video\\src\\main\\java',
      'mvn -pl vspicy-video -am clean package -DskipTests'
    ],
    relatedFiles: ['vspicy-ui/src/api/*.ts', '对应微服务 Controller']
  },
  {
    id: 'java-method-signature',
    title: 'Java 方法参数列表长度不同 / 找不到符号',
    category: 'compile',
    level: 'danger',
    statusCode: '编译失败',
    keywords: ['无法将类', '方法 list应用到给定类型', '实际参数列表和形式参数列表长度不同', '找不到符号', 'cannot be applied to given types'],
    symptoms: ['mvn package 编译失败。', 'Service 方法签名已改，但旧 Controller/Service 仍按旧参数调用。'],
    rootCauses: ['覆盖 zip 不会删除旧 Java 文件。', '重构时只改了 Service，遗漏 Controller 或测试调用。', 'DTO 字段从 getter 改成 record 访问器或相反。'],
    actions: ['全局搜索报错方法名和类名。', '删除已废弃 Controller/Service/DTO 旧文件。', '短期可添加兼容重载，长期统一调用新签名。'],
    commands: [
      'cd D:\\workspace\\vspicy\\vspicy-cloud',
      'findstr /S /N "SystemConfigService" vspicy-admin\\src\\main\\java\\*.java',
      'mvn -pl vspicy-admin -am clean package -DskipTests'
    ],
    relatedFiles: ['vspicy-cloud/vspicy-admin/src/main/java/com/vspicy/admin/service/SystemConfigService.java', '旧版 Controller/DTO']
  },
  {
    id: 'gateway-route-miss',
    title: 'Gateway 路由缺失或路径前缀不一致',
    category: 'gateway',
    level: 'danger',
    statusCode: '404/HTML/NoResource',
    keywords: ['Path=/api', 'gateway', 'Route', '路由', 'No static resource .', '/auth/login', '/api/auth/login'],
    symptoms: ['直连服务能通，经 18080 不通。', '登录请求命中 auth 静态资源处理器。', '路径 /auth/login 和 /api/auth/login 混用。'],
    rootCauses: ['Gateway application.yml 没有对应 Path。', '前端 VITE_API_BASE_URL 没有 /api。', 'Controller 只支持 /api/auth，但请求发到 /auth。'],
    actions: ['优先统一使用 /api/**。', 'Gateway 保留兼容路由时也要明确 StripPrefix/目标服务。', '前端 http.ts 自动归一化 baseURL。'],
    commands: [
      'curl -X POST http://localhost:18080/api/auth/login -H "Content-Type: application/json" -d "{\\"username\\":\\"admin\\",\\"password\\":\\"admin123456\\"}"',
      'curl -X POST http://localhost:18080/auth/login -H "Content-Type: application/json" -d "{\\"username\\":\\"admin\\",\\"password\\":\\"admin123456\\"}"',
      'mvn -pl vspicy-gateway,vspicy-auth -am clean package -DskipTests'
    ],
    relatedFiles: ['vspicy-cloud/vspicy-gateway/src/main/resources/application.yml', 'vspicy-ui/src/api/http.ts', 'vspicy-cloud/vspicy-auth/src/main/java/com/vspicy/auth/controller/AuthController.java']
  },
  {
    id: 'notification-member-403',
    title: '个人中心会员/通知接口 403',
    category: 'permission',
    level: 'warning',
    statusCode: '403',
    keywords: ['/api/members/me', '/api/notifications/unread-count', 'member.ts', 'notification.ts', 'UserCenter.vue'],
    symptoms: ['登录后跳转个人中心，会员接口或未读数接口 403。', '页面部分卡片加载失败。'],
    rootCauses: ['这些接口属于用户自助场景，不应要求后台管理权限。', 'Gateway 鉴权规则把用户接口配置成具体 permissionCode。'],
    actions: ['Gateway 将个人中心相关接口设置为 AUTHENTICATED。', 'UserCenter.vue 使用 Promise.allSettled，单接口失败不拖垮整页。'],
    commands: [
      'curl http://localhost:18080/api/members/me?userId=1 -H "Authorization: Bearer <token>"',
      'curl http://localhost:18080/api/notifications/unread-count -H "Authorization: Bearer <token>"',
      'mvn -pl vspicy-gateway,vspicy-member,vspicy-notification -am clean package -DskipTests'
    ],
    relatedFiles: ['vspicy-cloud/vspicy-gateway/src/main/resources/application.yml', 'vspicy-ui/src/views/UserCenter.vue']
  },
  {
    id: 'result-contract-mismatch',
    title: '接口未返回统一 Result 响应结构',
    category: 'backend',
    level: 'warning',
    statusCode: '200/业务异常',
    keywords: ['Result', 'code', 'message', 'data', '响应结构', '业务 code', 'Content-Type'],
    symptoms: ['HTTP 200 但前端页面判断失败。', '接口契约中心提示缺少 code/message/data。'],
    rootCauses: ['Controller 直接返回 List/Map/String。', '异常处理返回 HTML 或默认错误结构。', '文件流接口被误纳入 JSON 契约检测。'],
    actions: ['业务 JSON 接口统一返回 Result<T>。', '文件下载、SSE、图片接口单独标记，不走统一 JSON 校验。', '全局异常处理返回统一 JSON。'],
    commands: [
      'curl -i http://localhost:18080/api/admin/health',
      'curl -i http://localhost:18080/api/members/plans'
    ],
    relatedFiles: ['vspicy-cloud/vspicy-common/src/main/java/com/vspicy/common/web/Result.java', '各服务 Controller', 'GlobalExceptionHandler.java']
  },
  {
    id: 'sql-permission-missing',
    title: '新增后台页面后菜单不显示或 403',
    category: 'data',
    level: 'warning',
    statusCode: '403/菜单缺失',
    keywords: ['sys_permission', 'sys_role_permission', 'permissionCode', '菜单不显示', '权限码缺失'],
    symptoms: ['路由已添加，但后台菜单不出现。', '直接访问新增 /admin/** 页面返回 403。'],
    rootCauses: ['数据库没有新增权限码。', '权限码没有授权给 SUPER_ADMIN。', '前端路由 meta.permissionCode 和菜单 permission 不一致。'],
    actions: ['使用权限 SQL 生成器生成幂等 SQL。', '刷新权限视图或重新登录。', '用功能地图检查路由和菜单权限码一致性。'],
    commands: [
      'SELECT * FROM sys_permission WHERE permission_code = \'system:diagnostics:view\';',
      'SELECT * FROM sys_role_permission WHERE permission_id IN (SELECT id FROM sys_permission WHERE permission_code = \'system:diagnostics:view\');'
    ],
    relatedFiles: ['vspicy-ui/src/router/index.ts', 'vspicy-ui/src/config/adminOpsMenu.ts', 'vspicy-cloud/scripts/sql/*.sql']
  }
]

const filteredPlaybooks = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return playbooks.filter((item) => {
    const categoryMatched = selectedCategory.value === 'all' || item.category === selectedCategory.value
    const levelMatched = selectedLevel.value === 'all' || item.level === selectedLevel.value
    const text = [
      item.title,
      item.category,
      item.level,
      item.statusCode || '',
      item.keywords.join(' '),
      item.symptoms.join(' '),
      item.rootCauses.join(' '),
      item.actions.join(' '),
      item.relatedFiles.join(' ')
    ].join(' ').toLowerCase()
    return categoryMatched && levelMatched && (!q || text.includes(q))
  })
})

const sampleHits = computed<Hit[]>(() => {
  const text = sampleText.value.trim().toLowerCase()
  if (!text) return []
  return playbooks
    .map((item) => {
      const matchedKeywords = item.keywords.filter((word) => text.includes(word.toLowerCase()))
      const titleMatched = text.includes(item.title.toLowerCase())
      const statusMatched = item.statusCode ? text.includes(item.statusCode.toLowerCase()) : false
      const score = matchedKeywords.length * 10 + (titleMatched ? 20 : 0) + (statusMatched ? 3 : 0)
      return { item, score, matchedKeywords }
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
})

const levelRank: Record<Level, number> = {
  danger: 4,
  warning: 3,
  info: 2,
  success: 1
}

const topHit = computed(() => sampleHits.value[0])

const summaryCards = computed(() => {
  const items = filteredPlaybooks.value
  const danger = items.filter((item) => item.level === 'danger').length
  const warning = items.filter((item) => item.level === 'warning').length
  const high = sampleHits.value[0]?.item.level
  return [
    { label: '知识条目', value: String(items.length), level: 'info' as Level },
    { label: '阻断问题', value: String(danger), level: danger ? 'danger' as Level : 'success' as Level },
    { label: '高风险问题', value: String(warning), level: warning ? 'warning' as Level : 'success' as Level },
    { label: '日志匹配', value: sampleHits.value.length ? `${sampleHits.value.length} 条` : '未匹配', level: high || 'info' as Level }
  ]
})

const sortedPlaybooks = computed(() => {
  return [...filteredPlaybooks.value].sort((a, b) => levelRank[b.level] - levelRank[a.level] || a.title.localeCompare(b.title))
})

function badgeText(level: Level) {
  const map: Record<Level, string> = {
    success: '低风险',
    info: '需确认',
    warning: '高风险',
    danger: '阻断'
  }
  return map[level]
}

function categoryText(category: Category) {
  return categories.find((item) => item.value === category)?.label || category
}

function copyText(id: string, text: string) {
  navigator.clipboard?.writeText(text)
  copiedId.value = id
  window.setTimeout(() => {
    if (copiedId.value === id) copiedId.value = ''
  }, 1600)
}

function commandText(item: PlaybookItem) {
  return item.commands.join('\n')
}

function exportJson() {
  const payload = {
    generatedAt: new Date().toISOString(),
    keyword: keyword.value,
    selectedCategory: selectedCategory.value,
    selectedLevel: selectedLevel.value,
    sample: sampleText.value,
    sampleHits: sampleHits.value.map((hit) => ({
      id: hit.item.id,
      title: hit.item.title,
      score: hit.score,
      matchedKeywords: hit.matchedKeywords
    })),
    playbooks: sortedPlaybooks.value
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vspicy-error-playbook-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function fillSample(type: '403' | 'header' | 'compile' | 'html') {
  const samples: Record<typeof type, string> = {
    '403': 'member.ts:8 GET http://localhost:5173/api/members/me?userId=1 403 (Forbidden)\nhttp.ts:89 无权限访问',
    header: 'java.lang.IllegalArgumentException: Request header is too large\n at org.apache.coyote.http11.Http11InputBuffer.parseHeader',
    compile: 'java: 无法将类 com.vspicy.admin.service.SystemConfigService中的方法 list应用到给定类型; 实际参数列表和形式参数列表长度不同',
    html: 'GET http://localhost:5173/api/members/me?userId=1 400 Bad Request\nContent-Type: text/html;charset=utf-8\nRemote Address: 127.0.0.1:5173'
  }
  sampleText.value = samples[type]
}
</script>

<template>
  <section class="error-playbook-page">
    <header class="hero-panel">
      <div>
        <p class="eyebrow">Diagnostics Playbook</p>
        <h1>错误排查手册</h1>
        <p class="subtitle">沉淀登录、网关、权限、Vite、Java 编译和接口契约常见故障，粘贴日志后自动匹配处理方案。</p>
      </div>
      <div class="hero-actions">
        <button class="ghost-btn" @click="copyText('all-playbooks', JSON.stringify(sortedPlaybooks, null, 2))">
          {{ copiedId === 'all-playbooks' ? '已复制' : '复制当前清单' }}
        </button>
        <button class="primary-btn" @click="exportJson">导出 JSON</button>
      </div>
    </header>

    <div class="summary-grid">
      <article v-for="card in summaryCards" :key="card.label" class="summary-card" :class="`level-${card.level}`">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
      </article>
    </div>

    <section class="workbench-grid">
      <article class="panel analyzer-panel">
        <div class="panel-title-row">
          <div>
            <h2>日志快速匹配</h2>
            <p>粘贴浏览器 Console、Network 摘要或后端异常栈，自动识别最可能的故障类型。</p>
          </div>
          <button class="ghost-btn small" @click="sampleText = ''">清空</button>
        </div>
        <textarea v-model="sampleText" placeholder="粘贴错误日志，例如 403 Forbidden、Request header is too large、NoResourceFoundException、方法参数列表长度不同..." />
        <div class="sample-buttons">
          <button @click="fillSample('403')">填入 403 样例</button>
          <button @click="fillSample('header')">填入请求头样例</button>
          <button @click="fillSample('compile')">填入编译样例</button>
          <button @click="fillSample('html')">填入 HTML 样例</button>
        </div>
      </article>

      <article class="panel result-panel">
        <div class="panel-title-row">
          <div>
            <h2>匹配结果</h2>
            <p>按命中关键词和风险等级排序，优先处理阻断项。</p>
          </div>
        </div>

        <div v-if="!sampleText.trim()" class="empty-state">等待粘贴日志。</div>
        <div v-else-if="!sampleHits.length" class="empty-state danger">未匹配到已知模式，请补充 HTTP 状态、接口路径或后端异常类名。</div>
        <div v-else class="hit-list">
          <article v-for="hit in sampleHits" :key="hit.item.id" class="hit-card" :class="`level-${hit.item.level}`">
            <div class="hit-header">
              <div>
                <strong>{{ hit.item.title }}</strong>
                <p>{{ categoryText(hit.item.category) }} · {{ hit.item.statusCode || '无固定状态码' }} · 命中 {{ hit.score }}</p>
              </div>
              <span class="badge" :class="`level-${hit.item.level}`">{{ badgeText(hit.item.level) }}</span>
            </div>
            <div class="chips">
              <span v-for="word in hit.matchedKeywords" :key="word">{{ word }}</span>
            </div>
          </article>
        </div>
      </article>
    </section>

    <section v-if="topHit" class="panel top-fix">
      <div class="panel-title-row">
        <div>
          <h2>优先处理建议：{{ topHit.item.title }}</h2>
          <p>{{ categoryText(topHit.item.category) }} · {{ badgeText(topHit.item.level) }}</p>
        </div>
        <button class="ghost-btn small" @click="copyText(`top-${topHit.item.id}`, commandText(topHit.item))">
          {{ copiedId === `top-${topHit.item.id}` ? '已复制' : '复制命令' }}
        </button>
      </div>
      <div class="fix-grid">
        <div>
          <h3>可能原因</h3>
          <ul>
            <li v-for="cause in topHit.item.rootCauses" :key="cause">{{ cause }}</li>
          </ul>
        </div>
        <div>
          <h3>处理动作</h3>
          <ul>
            <li v-for="action in topHit.item.actions" :key="action">{{ action }}</li>
          </ul>
        </div>
        <div>
          <h3>相关文件</h3>
          <ul>
            <li v-for="file in topHit.item.relatedFiles" :key="file">{{ file }}</li>
          </ul>
        </div>
      </div>
      <pre>{{ commandText(topHit.item) }}</pre>
    </section>

    <section class="panel filters-panel">
      <input v-model="keyword" placeholder="搜索状态码、异常类、接口路径、文件名或处理动作" />
      <select v-model="selectedCategory">
        <option v-for="item in categories" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
      <select v-model="selectedLevel">
        <option v-for="item in levels" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
    </section>

    <section class="playbook-list">
      <article v-for="item in sortedPlaybooks" :key="item.id" class="playbook-card">
        <div class="card-header">
          <div>
            <div class="card-title-line">
              <h2>{{ item.title }}</h2>
              <span class="badge" :class="`level-${item.level}`">{{ badgeText(item.level) }}</span>
              <span v-if="item.statusCode" class="status-code">{{ item.statusCode }}</span>
            </div>
            <p>{{ categoryText(item.category) }}</p>
          </div>
          <button class="ghost-btn small" @click="copyText(item.id, commandText(item))">
            {{ copiedId === item.id ? '已复制' : '复制命令' }}
          </button>
        </div>

        <div class="detail-grid">
          <div>
            <h3>现象</h3>
            <ul>
              <li v-for="text in item.symptoms" :key="text">{{ text }}</li>
            </ul>
          </div>
          <div>
            <h3>原因</h3>
            <ul>
              <li v-for="text in item.rootCauses" :key="text">{{ text }}</li>
            </ul>
          </div>
          <div>
            <h3>动作</h3>
            <ul>
              <li v-for="text in item.actions" :key="text">{{ text }}</li>
            </ul>
          </div>
        </div>

        <div class="file-row">
          <span v-for="file in item.relatedFiles" :key="file">{{ file }}</span>
        </div>
        <pre>{{ commandText(item) }}</pre>
      </article>
    </section>
  </section>
</template>

<style scoped>
.error-playbook-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  color: #172033;
}

.hero-panel,
.panel,
.playbook-card,
.summary-card {
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
}

.hero-panel {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 26px;
  background: linear-gradient(135deg, #f8fbff 0%, #eef4ff 48%, #fff7ed 100%);
}

.eyebrow {
  margin: 0 0 8px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1 {
  font-size: 30px;
  line-height: 1.2;
}

.subtitle {
  margin-top: 10px;
  max-width: 760px;
  color: #64748b;
  line-height: 1.7;
}

.hero-actions,
.panel-title-row,
.card-header,
.hit-header,
.card-title-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.hero-actions {
  align-self: flex-start;
}

.primary-btn,
.ghost-btn,
.sample-buttons button {
  border: 0;
  border-radius: 14px;
  padding: 10px 14px;
  font-weight: 800;
  cursor: pointer;
}

.primary-btn {
  color: #fff;
  background: #2563eb;
}

.ghost-btn,
.sample-buttons button {
  color: #334155;
  background: #f1f5f9;
}

.small {
  padding: 8px 10px;
  font-size: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  padding: 18px;
}

.summary-card span {
  color: #64748b;
  font-size: 13px;
}

.summary-card strong {
  display: block;
  margin-top: 8px;
  font-size: 22px;
}

.workbench-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
}

.panel,
.playbook-card {
  padding: 20px;
}

.panel-title-row p,
.card-header p,
.hit-header p {
  margin-top: 6px;
  color: #64748b;
  font-size: 13px;
}

textarea,
input,
select {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #dbe3ef;
  border-radius: 14px;
  background: #fff;
  color: #172033;
  outline: none;
}

textarea {
  min-height: 180px;
  margin-top: 16px;
  padding: 14px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1.6;
}

input,
select {
  height: 42px;
  padding: 0 12px;
}

.sample-buttons,
.chips,
.file-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sample-buttons {
  margin-top: 12px;
}

.empty-state {
  border: 1px dashed #cbd5e1;
  border-radius: 16px;
  padding: 26px;
  color: #64748b;
  text-align: center;
}

.empty-state.danger {
  border-color: #fecaca;
  color: #b91c1c;
  background: #fff1f2;
}

.hit-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.hit-card {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 14px;
  background: #f8fafc;
}

.badge,
.status-code,
.chips span,
.file-row span {
  border-radius: 999px;
  padding: 5px 9px;
  font-size: 12px;
  font-weight: 800;
}

.status-code {
  color: #475569;
  background: #f1f5f9;
}

.chips {
  margin-top: 10px;
}

.chips span {
  color: #1d4ed8;
  background: #dbeafe;
}

.level-success {
  border-color: #bbf7d0;
  color: #166534;
  background: #f0fdf4;
}

.level-info {
  border-color: #bfdbfe;
  color: #1d4ed8;
  background: #eff6ff;
}

.level-warning {
  border-color: #fde68a;
  color: #92400e;
  background: #fffbeb;
}

.level-danger {
  border-color: #fecaca;
  color: #991b1b;
  background: #fff1f2;
}

.fix-grid,
.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}

ul {
  margin: 10px 0 0;
  padding-left: 18px;
  color: #475569;
  line-height: 1.7;
}

.filters-panel {
  display: grid;
  grid-template-columns: 1fr 180px 160px;
  gap: 12px;
}

.playbook-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-title-line {
  justify-content: flex-start;
}

.card-title-line h2 {
  font-size: 19px;
}

.file-row {
  margin-top: 14px;
}

.file-row span {
  color: #334155;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

pre {
  margin: 14px 0 0;
  overflow: auto;
  border-radius: 16px;
  padding: 14px;
  color: #dbeafe;
  background: #0f172a;
  line-height: 1.6;
}

@media (max-width: 1100px) {
  .hero-panel,
  .panel-title-row,
  .card-header,
  .hit-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .summary-grid,
  .workbench-grid,
  .fix-grid,
  .detail-grid,
  .filters-panel {
    grid-template-columns: 1fr;
  }
}
</style>
