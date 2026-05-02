export type AdminOpsMenuLevel = 'info' | 'success' | 'warning' | 'danger'

export interface AdminOpsMenuItem {
  title: string
  description: string
  path: string
  permission: string
  level: AdminOpsMenuLevel
  group: string
}

/**
 * 管理端唯一菜单源。
 *
 * 规则：
 * 1. path 必须与 src/router/index.ts 的 /admin 子路由保持一致。
 * 2. permission 必须与路由 meta.permissionCode 保持一致。
 * 3. 旧入口 /admin/dictionaries 已在路由中重定向到 /admin/system-dicts，不再作为菜单项暴露。
 */
export const adminOpsMenuItems: AdminOpsMenuItem[] = [
  { title: '运维中心', description: '统一查看转码、HLS、对象清理、播放就绪、服务健康和存储告警。', path: '/admin/ops-hub', permission: 'video:ops:hub:view', level: 'info', group: 'overview' },
  { title: '数据总览', description: '查看用户、内容、会员、通知和平台核心指标。', path: '/admin/dashboard', permission: 'dashboard:view', level: 'success', group: 'overview' },

  { title: '用户管理', description: '查询用户资料、账号状态，并联动查看 RBAC 权限视图。', path: '/admin/users', permission: 'user:view', level: 'info', group: 'admin' },
  { title: '内容管理', description: '聚合文章和视频内容，作为审核、推荐、搜索和运营治理的统一入口。', path: '/admin/content', permission: 'content:manage', level: 'info', group: 'admin' },
  { title: '内容审核', description: '处理文章、视频和敏感内容审核任务。', path: '/admin/audit-tasks', permission: 'content:audit:view', level: 'warning', group: 'admin' },
  { title: '会员管理', description: '查看套餐、用户权益、高清播放和上传容量校验。', path: '/admin/members', permission: 'member:manage', level: 'success', group: 'admin' },
  { title: '资料管理', description: '查看用户资料、头像、简介和资料审核状态。', path: '/admin/profiles', permission: 'profile:view', level: 'info', group: 'admin' },
  { title: '公告管理', description: '维护站内公告、发布范围和上线状态。', path: '/admin/announcements', permission: 'notification:announcement:view', level: 'info', group: 'admin' },
  { title: '工单管理', description: '处理用户反馈、问题工单和客服跟进记录。', path: '/admin/support-tickets', permission: 'support:ticket:view', level: 'warning', group: 'admin' },

  { title: '通知看板', description: '查看通知投递、阅读率、事件状态、模板和在线连接指标。', path: '/admin/notification-overview', permission: 'notification:overview:view', level: 'info', group: 'admin' },
  { title: '通知事件', description: '查看异步通知事件日志，并对失败事件进行人工重试。', path: '/admin/notification-events', permission: 'notification:event:view', level: 'warning', group: 'admin' },
  { title: '通知模板', description: '维护站内通知模板，支持变量预览、发布预检和模板发布记录。', path: '/admin/notification-templates', permission: 'notification:template:view', level: 'info', group: 'admin' },
  { title: '通知投递', description: '按用户、状态、类型和关键词查询通知投递与阅读情况。', path: '/admin/notification-inbox', permission: 'notification:inbox:admin:view', level: 'info', group: 'admin' },

  { title: '权限管理', description: '治理角色、权限、用户角色和角色权限关系，支持最终权限视图。', path: '/admin/permissions', permission: 'permission:view', level: 'danger', group: 'system' },
  { title: '菜单管理', description: '维护后台菜单树、路由、权限码和角色菜单可见范围。', path: '/admin/menus', permission: 'system:menu:view', level: 'warning', group: 'system' },
  { title: '组织架构', description: '维护部门树、岗位和用户组织关系，为数据权限和审核分派打基础。', path: '/admin/org', permission: 'system:org:view', level: 'info', group: 'system' },
  { title: '系统配置', description: '集中维护系统运行参数、业务开关和运营默认值，支持敏感值与变更记录。', path: '/admin/system-configs', permission: 'system:config:view', level: 'warning', group: 'system' },
  { title: '系统字典', description: '维护平台状态、类型、等级和运营枚举，供后台筛选与业务校验复用。', path: '/admin/system-dicts', permission: 'system:dict:view', level: 'info', group: 'system' },
  { title: '任务调度', description: '维护系统定时任务、人工触发和执行日志。', path: '/admin/jobs', permission: 'system:job:view', level: 'warning', group: 'system' },
  { title: '功能治理', description: '巡检功能注册、页面路由、权限码和接口配置一致性。', path: '/admin/feature-governance', permission: 'system:feature:view', level: 'warning', group: 'system' },
  { title: '发布版本', description: '登记发布版本、涉及服务、数据库脚本、检查项和回滚状态。', path: '/admin/releases', permission: 'system:release:view', level: 'warning', group: 'system' },

  { title: '敏感词库', description: '维护内容安全敏感词、风险等级和检测预览。', path: '/admin/sensitive-words', permission: 'content:sensitive:view', level: 'danger', group: 'security' },
  { title: '登录安全', description: '查看登录日志、在线会话、异常登录并支持强制下线。', path: '/admin/login-security', permission: 'login:security:view', level: 'danger', group: 'security' },

  { title: '服务健康', description: '检查 MySQL、Redis、MinIO、RocketMQ、FFmpeg 和存储目录。', path: '/admin/service-health', permission: 'video:service:health:view', level: 'danger', group: 'health' },
  { title: '系统监控', description: '查看 JVM、线程、CPU、磁盘和运行环境。', path: '/admin/system-monitor', permission: 'system:monitor:view', level: 'success', group: 'health' },
  { title: '服务诊断', description: '检查 Gateway、业务服务和中间件端口。', path: '/admin/service-diagnostics', permission: 'system:diagnostics:view', level: 'danger', group: 'diagnostics' },
  { title: 'API 诊断', description: '批量探测后台关键接口，定位网关、权限、服务未启动和响应结构异常。', path: '/admin/api-diagnostics', permission: 'system:api-diagnostics:view', level: 'warning', group: 'diagnostics' },
  { title: '路由诊断', description: '校验后台路由、运维菜单和权限码一致性，避免菜单死链和权限错配。', path: '/admin/route-diagnostics', permission: 'system:feature:view', level: 'warning', group: 'diagnostics' },
  { title: '权限诊断', description: '检查登录态、JWT、权限缓存、菜单授权和 401/403 定位信息。', path: '/admin/permission-diagnostics', permission: 'permission:view', level: 'danger', group: 'diagnostics' },
  { title: '上线预检', description: '一键检查登录态、网关、权限、会员、通知和后台核心接口，生成联调预检报告。', path: '/admin/preflight-check', permission: 'system:diagnostics:view', level: 'danger', group: 'diagnostics' },
  { title: '故障快照', description: '采集脱敏登录态、JWT、权限缓存、路由菜单和核心接口探测结果，用于快速提交排障信息。', path: '/admin/troubleshooting', permission: 'system:diagnostics:view', level: 'warning', group: 'diagnostics' },
  { title: '环境检查', description: '检查前端运行地址、API 基础路径、本地缓存、Vite 代理和核心服务响应。', path: '/admin/environment-check', permission: 'system:diagnostics:view', level: 'warning', group: 'diagnostics' },
  { title: '功能地图', description: '总览后台菜单、路由、权限码和功能分组关系，辅助识别重复建设和功能边界。', path: '/admin/function-map', permission: 'system:diagnostics:view', level: 'info', group: 'diagnostics' },
  { title: '服务目录', description: '统一查看微服务端口、Gateway 路由、健康接口和前端 API 模块映射。', path: '/admin/service-catalog', permission: 'system:diagnostics:view', level: 'info', group: 'diagnostics' },
  { title: '客户端缓存', description: '检查 localStorage、sessionStorage 和 Cookie，治理异常 token、权限缓存和大请求头风险。', path: '/admin/client-cache', permission: 'system:diagnostics:view', level: 'warning', group: 'diagnostics' },
  { title: '接口契约', description: '检查核心接口 HTTP 状态、Content-Type 和统一 Result 响应结构，定位 HTML fallback、401、403 和业务码异常。', path: '/admin/api-contract', permission: 'system:diagnostics:view', level: 'warning', group: 'diagnostics' },
  { title: '请求追踪', description: '输入 API 路径后分析 Vite 代理、Gateway 路由、目标服务、鉴权策略和 401/403/404 原因。', path: '/admin/request-trace', permission: 'system:diagnostics:view', level: 'warning', group: 'diagnostics' },
  { title: '部署清单', description: '根据本次变更类型生成构建命令、SQL 清单、重启服务和上线验证步骤。', path: '/admin/deploy-checklist', permission: 'system:diagnostics:view', level: 'warning', group: 'diagnostics' },
  { title: '变更影响', description: '输入变更文件自动分析影响服务、构建命令、SQL 风险、重启范围和上线验证步骤。', path: '/admin/change-impact', permission: 'system:diagnostics:view', level: 'warning', group: 'diagnostics' },
  { title: '权限 SQL', description: '根据权限码、路径、组件和角色生成可重复执行的 sys_permission/sys_role_permission 初始化脚本。', path: '/admin/permission-sql', permission: 'system:diagnostics:view', level: 'warning', group: 'diagnostics' },
  { title: '运维命令', description: '按服务和场景生成 Maven 编译、健康探测、端口排查、服务重启和前端开发命令。', path: '/admin/ops-commands', permission: 'system:diagnostics:view', level: 'info', group: 'diagnostics' },
  { title: '错误手册', description: '粘贴前端 Console、Network 或后端异常栈，自动匹配 401、403、请求头过大、Vite fallback 和编译错误处理方案。', path: '/admin/error-playbook', permission: 'system:diagnostics:view', level: 'warning', group: 'diagnostics' },
  { title: '错误码目录', description: '统一维护 HTTP 状态、业务 code、异常类型、前端提示和后端错误码建议。', path: '/admin/error-code-catalog', permission: 'system:diagnostics:view', level: 'info', group: 'diagnostics' },

  { title: '转码任务', description: '转码状态机、分发、重试、重跑和本地执行。', path: '/admin/transcode-tasks', permission: 'video:transcode:view', level: 'warning', group: 'transcode' },
  { title: '播放就绪', description: '批量修复 HLS 已生成但播放地址未同步的问题。', path: '/admin/playback-readiness-batch', permission: 'video:playback:readiness:view', level: 'danger', group: 'playback' },
  { title: '上传配额', description: '查看用户上传配额、计划容量和上传守卫命中情况。', path: '/admin/video-upload-quota', permission: 'video:upload:quota:view', level: 'warning', group: 'storage' },
  { title: '用户空间', description: '按用户维度查看容量占用、文件数量和清理建议。', path: '/admin/user-space', permission: 'video:upload:space:view', level: 'info', group: 'storage' },
  { title: '存储运维', description: '存储扫描、告警、对象一致性和运维指标。', path: '/admin/storage-ops', permission: 'video:storage:ops:view', level: 'info', group: 'storage' },
  { title: '存储看板', description: '查看对象存储容量、增长趋势、分桶统计和异常指标。', path: '/admin/storage-dashboard', permission: 'video:storage:dashboard:view', level: 'success', group: 'storage' },
  { title: '文件一致性', description: '巡检视频文件、对象存储和数据库记录的一致性。', path: '/admin/video-file-consistency', permission: 'video:file:consistency:view', level: 'warning', group: 'storage' },
  { title: '存储告警', description: '维护容量、失败率和异常对象告警策略。', path: '/admin/storage-alerts', permission: 'video:storage:alert:view', level: 'danger', group: 'storage' },
  { title: '告警通知', description: '查询存储告警通知发送记录和失败重试。', path: '/admin/storage-alert-notifications', permission: 'video:storage:alert:notification:view', level: 'warning', group: 'storage' },
  { title: 'HLS 完整性', description: '检查播放清单、分片文件和播放链路完整性。', path: '/admin/hls-integrity', permission: 'video:hls:integrity:view', level: 'warning', group: 'repair' },
  { title: 'HLS 修复', description: '处理 HLS 缺片、manifest 异常、修复执行与复检。', path: '/admin/hls-repair', permission: 'video:hls:repair:view', level: 'warning', group: 'repair' },
  { title: '对象清理', description: '孤儿对象扫描、审批、执行和审计。', path: '/admin/object-cleanup', permission: 'video:object:cleanup:view', level: 'info', group: 'cleanup' },

  { title: '操作审计', description: '查看 retry、rerun、sync、cleanup 等运维动作记录。', path: '/admin/operation-audit', permission: 'video:operation:audit:view', level: 'info', group: 'audit' },
  { title: '审计日志', description: '查看后台操作日志、失败原因、慢操作、CSV 导出和审计留存清理。', path: '/admin/operation-logs', permission: 'operation:log:view', level: 'warning', group: 'audit' },
  { title: '系统审计', description: '查看系统级操作审计、风险事件、证据链和处理状态。', path: '/admin/operation-audit-logs', permission: 'system:audit:view', level: 'warning', group: 'audit' },
  { title: '异常日志', description: '集中查看系统异常、traceId、影响服务、处理状态和清理策略。', path: '/admin/exception-logs', permission: 'system:exception:view', level: 'danger', group: 'audit' }
]
