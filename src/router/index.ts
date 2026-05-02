import { createRouter, createWebHistory } from 'vue-router'
import { getAccessToken } from '../api/http'
import UserLayout from '../layouts/UserLayout.vue'
import AdminLayout from '../layouts/AdminLayout.vue'
import { hasPermission, loadPermissionView } from '../utils/permission'

const Home = () => import('../views/Home.vue')
const Videos = () => import('../views/Videos.vue')
const Articles = () => import('../views/Articles.vue')
const UserCenter = () => import('../views/UserCenter.vue')
const Login = () => import('../views/Login.vue')
const VideoUpload = () => import('../views/video/Upload.vue')
const VideoPlayer = () => import('../views/video/Player.vue')
const ArticleEditor = () => import('../views/article/Editor.vue')
const ArticleDetail = () => import('../views/article/Detail.vue')
const Hot = () => import('../views/Hot.vue')
const Recommend = () => import('../views/Recommend.vue')
const Notifications = () => import('../views/Notifications.vue')
const Member = () => import('../views/Member.vue')
const Forbidden = () => import('../views/system/Forbidden.vue')
const NotFound = () => import('../views/system/NotFound.vue')

const AdminOpsHub = () => import('../views/admin/AdminOpsHub.vue')
const AdminServiceHealth = () => import('../views/admin/AdminServiceHealth.vue')
const AdminApiDiagnostics = () => import('../views/admin/AdminApiDiagnostics.vue')
const AdminRouteDiagnostics = () => import('../views/admin/AdminRouteDiagnostics.vue')
const AdminPermissionDiagnostics = () => import('../views/admin/AdminPermissionDiagnostics.vue')
const AdminPreflightCheck = () => import('../views/admin/AdminPreflightCheck.vue')
const AdminTroubleshooting = () => import('../views/admin/AdminTroubleshooting.vue')
const AdminEnvironmentCheck = () => import('../views/admin/AdminEnvironmentCheck.vue')
const AdminFunctionMap = () => import('../views/admin/AdminFunctionMap.vue')
const AdminServiceCatalog = () => import('../views/admin/AdminServiceCatalog.vue')
const AdminClientCache = () => import('../views/admin/AdminClientCache.vue')
const AdminApiContract = () => import('../views/admin/AdminApiContract.vue')
const AdminRequestTrace = () => import('../views/admin/AdminRequestTrace.vue')
const AdminDeployChecklist = () => import('../views/admin/AdminDeployChecklist.vue')
const AdminChangeImpact = () => import('../views/admin/AdminChangeImpact.vue')
const AdminPermissionSql = () => import('../views/admin/AdminPermissionSql.vue')
const AdminOpsCommands = () => import('../views/admin/AdminOpsCommands.vue')
const AdminErrorPlaybook = () => import('../views/admin/AdminErrorPlaybook.vue')
const AdminErrorCodeCatalog = () => import('../views/admin/AdminErrorCodeCatalog.vue')
const Dashboard = () => import('../views/admin/Dashboard.vue')
const Users = () => import('../views/admin/Users.vue')
const ContentManager = () => import('../views/admin/ContentManager.vue')
const NotificationEvents = () => import('../views/admin/NotificationEvents.vue')
const NotificationOverview = () => import('../views/admin/NotificationOverview.vue')
const NotificationTemplates = () => import('../views/admin/NotificationTemplates.vue')
const NotificationInbox = () => import('../views/admin/NotificationInbox.vue')
const AdminAnnouncements = () => import("../views/admin/AdminAnnouncements.vue")
const AdminSystemConfigs = () => import('../views/admin/AdminSystemConfigs.vue')
const SystemMenus = () => import('../views/admin/SystemMenus.vue')
const SystemOrg = () => import('../views/admin/SystemOrg.vue')
const MemberAdmin = () => import('../views/admin/MemberAdmin.vue')
const TranscodeTasks = () => import('../views/admin/TranscodeTasks.vue')
const PlaybackReadinessBatch = () => import('../views/admin/PlaybackReadinessBatch.vue')
const OperationAudit = () => import('../views/admin/OperationAudit.vue')
const VideoUploadQuota = () => import('../views/admin/VideoUploadQuota.vue')
const UserSpace = () => import('../views/admin/UserSpace.vue')
const StorageOpsConsole = () => import('../views/admin/StorageOpsConsole.vue')
const StorageDashboard = () => import('../views/admin/StorageDashboard.vue')
const VideoFileConsistency = () => import('../views/admin/VideoFileConsistency.vue')
const HlsIntegrity = () => import('../views/admin/HlsIntegrity.vue')
const StorageAlerts = () => import('../views/admin/StorageAlerts.vue')
const StorageAlertNotifications = () => import('../views/admin/StorageAlertNotifications.vue')
const HlsRepair = () => import('../views/admin/HlsRepair.vue')
const ObjectCleanup = () => import('../views/admin/ObjectCleanup.vue')
const AuditTasks = () => import('../views/admin/AuditTasks.vue')
const SensitiveWords = () => import('../views/admin/SensitiveWords.vue')
const Profiles = () => import('../views/admin/Profiles.vue')
const Permissions = () => import('../views/admin/Permissions.vue')
const OperationLogs = () => import('../views/admin/OperationLogs.vue')
const SystemMonitor = () => import('../views/admin/SystemMonitor.vue')
const SystemJobs = () => import('../views/admin/SystemJobs.vue')
const ServiceDiagnostics = () => import('../views/admin/ServiceDiagnostics.vue')
const LoginSecurity = () => import('../views/admin/LoginSecurity.vue')
const ExceptionLogs = () => import('../views/admin/ExceptionLogs.vue')
const AdminSupportTickets = () => import('../views/admin/AdminSupportTickets.vue')
const AdminOperationAuditLogs = () => import('../views/admin/AdminOperationAuditLogs.vue')
const AdminFeatureGovernance = () => import('../views/admin/AdminFeatureGovernance.vue')
const AdminSystemDicts = () => import('../views/admin/AdminSystemDicts.vue')
const AdminReleases = () => import('../views/admin/AdminReleases.vue')


export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: UserLayout,
      children: [
        { path: '', component: Home },
        { path: 'videos', component: Videos },
        { path: 'articles', component: Articles },
        { path: 'hot', component: Hot },
        { path: 'recommend', component: Recommend, meta: { permissionCode: 'recommend:view' } },
        { path: 'notifications', component: Notifications, meta: { permissionCode: 'notification:view' } },
        { path: 'member', component: Member, meta: { permissionCode: 'member:view' } },
        { path: 'me', component: UserCenter },
        { path: 'login', component: Login },
        { path: '403', component: Forbidden },
        { path: '404', component: NotFound },
        { path: 'video/upload', component: VideoUpload },
        { path: 'video/:id', component: VideoPlayer },
        { path: 'article/editor', component: ArticleEditor, meta: { permissionCode: 'article:create' } },
        { path: 'article/:id', component: ArticleDetail },
        { path: ':pathMatch(.*)*', component: NotFound }
      ]
    },
    {
      path: '/admin',
      component: AdminLayout,
      redirect: '/admin/ops-hub',
      children: [
        { path: 'ops-hub', component: AdminOpsHub, meta: { permissionCode: 'video:ops:hub:view' } },
        { path: 'service-health', component: AdminServiceHealth, meta: { permissionCode: 'video:service:health:view' } },
        { path: 'api-diagnostics', component: AdminApiDiagnostics, meta: { permissionCode: 'system:api-diagnostics:view' } },
        { path: 'route-diagnostics', component: AdminRouteDiagnostics, meta: { permissionCode: 'system:feature:view' } },
        { path: 'permission-diagnostics', component: AdminPermissionDiagnostics, meta: { permissionCode: 'permission:view' } },
        { path: 'preflight-check', component: AdminPreflightCheck, meta: { permissionCode: 'system:diagnostics:view' } },
        { path: 'troubleshooting', component: AdminTroubleshooting, meta: { permissionCode: 'system:diagnostics:view' } },
        { path: 'environment-check', component: AdminEnvironmentCheck, meta: { permissionCode: 'system:diagnostics:view' } },
        { path: 'function-map', component: AdminFunctionMap, meta: { permissionCode: 'system:diagnostics:view' } },
        { path: 'service-catalog', component: AdminServiceCatalog, meta: { permissionCode: 'system:diagnostics:view' } },
        { path: 'client-cache', component: AdminClientCache, meta: { permissionCode: 'system:diagnostics:view' } },
        { path: 'api-contract', component: AdminApiContract, meta: { permissionCode: 'system:diagnostics:view' } },
        { path: 'request-trace', component: AdminRequestTrace, meta: { permissionCode: 'system:diagnostics:view' } },
        { path: 'deploy-checklist', component: AdminDeployChecklist, meta: { permissionCode: 'system:diagnostics:view' } },
        { path: 'change-impact', component: AdminChangeImpact, meta: { permissionCode: 'system:diagnostics:view' } },
        { path: 'permission-sql', component: AdminPermissionSql, meta: { permissionCode: 'system:diagnostics:view' } },
        { path: 'ops-commands', component: AdminOpsCommands, meta: { permissionCode: 'system:diagnostics:view' } },
        { path: 'error-playbook', component: AdminErrorPlaybook, meta: { permissionCode: 'system:diagnostics:view' } },
        { path: 'error-code-catalog', component: AdminErrorCodeCatalog, meta: { permissionCode: 'system:diagnostics:view' } },
        { path: 'dashboard', component: Dashboard, meta: { permissionCode: 'dashboard:view' } },
        { path: 'users', component: Users, meta: { permissionCode: 'user:view' } },
        { path: 'content', component: ContentManager, meta: { permissionCode: 'content:manage' } },
        { path: 'notification-overview', component: NotificationOverview, meta: { permissionCode: 'notification:overview:view' } },
        { path: 'notification-events', component: NotificationEvents, meta: { permissionCode: 'notification:event:view' } },
        { path: 'notification-templates', component: NotificationTemplates, meta: { permissionCode: 'notification:template:view' } },
        { path: 'announcements', component: AdminAnnouncements, meta: { permissionCode: 'notification:announcement:view' } },
        { path: 'notification-inbox', component: NotificationInbox, meta: { permissionCode: 'notification:inbox:admin:view' } },
        { path: 'system-configs', component: AdminSystemConfigs, meta: { permissionCode: 'system:config:view' } },
        { path: 'dictionaries', redirect: '/admin/system-dicts' },
        { path: 'menus', component: SystemMenus, meta: { permissionCode: 'system:menu:view' } },
        { path: 'org', component: SystemOrg, meta: { permissionCode: 'system:org:view' } },
        { path: 'members', component: MemberAdmin, meta: { permissionCode: 'member:manage' } },
        { path: 'transcode-tasks', component: TranscodeTasks, meta: { permissionCode: 'video:transcode:view' } },
        { path: 'playback-readiness-batch', component: PlaybackReadinessBatch, meta: { permissionCode: 'video:playback:readiness:view' } },
        { path: 'operation-audit', component: OperationAudit, meta: { permissionCode: 'video:operation:audit:view' } },
        { path: 'video-upload-quota', component: VideoUploadQuota, meta: { permissionCode: 'video:upload:quota:view' } },
        { path: 'user-space', component: UserSpace, meta: { permissionCode: 'video:upload:space:view' } },
        { path: 'storage-ops', component: StorageOpsConsole, meta: { permissionCode: 'video:storage:ops:view' } },
        { path: 'storage-dashboard', component: StorageDashboard, meta: { permissionCode: 'video:storage:dashboard:view' } },
        { path: 'video-file-consistency', component: VideoFileConsistency, meta: { permissionCode: 'video:file:consistency:view' } },
        { path: 'hls-integrity', component: HlsIntegrity, meta: { permissionCode: 'video:hls:integrity:view' } },
        { path: 'storage-alerts', component: StorageAlerts, meta: { permissionCode: 'video:storage:alert:view' } },
        { path: 'storage-alert-notifications', component: StorageAlertNotifications, meta: { permissionCode: 'video:storage:alert:notification:view' } },
        { path: 'hls-repair', component: HlsRepair, meta: { permissionCode: 'video:hls:repair:view' } },
        { path: 'object-cleanup', component: ObjectCleanup, meta: { permissionCode: 'video:object:cleanup:view' } },
        { path: 'audit-tasks', component: AuditTasks, meta: { permissionCode: 'content:audit:view' } },
        { path: 'sensitive-words', component: SensitiveWords, meta: { permissionCode: 'content:sensitive:view' } },
        { path: 'profiles', component: Profiles, meta: { permissionCode: 'profile:view' } },
        { path: 'permissions', component: Permissions, meta: { permissionCode: 'permission:view' } },
        { path: 'operation-logs', component: OperationLogs, meta: { permissionCode: 'operation:log:view' } },
        { path: 'system-monitor', component: SystemMonitor, meta: { permissionCode: 'system:monitor:view' } },
        { path: 'jobs', component: SystemJobs, meta: { permissionCode: 'system:job:view' } },
        { path: 'service-diagnostics', component: ServiceDiagnostics, meta: { permissionCode: 'system:diagnostics:view' } },
        { path: 'login-security', component: LoginSecurity, meta: { permissionCode: 'login:security:view' } },
        { path: 'exception-logs', component: ExceptionLogs, meta: { permissionCode: 'system:exception:view' } },
        { path: 'support-tickets', component: AdminSupportTickets, meta: { permissionCode: 'support:ticket:view' } },
        { path: 'operation-audit-logs', component: AdminOperationAuditLogs, meta: { permissionCode: 'system:audit:view' } },
        { path: 'feature-governance', component: AdminFeatureGovernance, meta: { permissionCode: 'system:feature:view' } },
        { path: 'system-dicts', component: AdminSystemDicts, meta: { permissionCode: 'system:dict:view' } },
        { path: 'releases', component: AdminReleases, meta: { permissionCode: 'system:release:view' } },
        { path: ':pathMatch(.*)*', component: NotFound },
      ]
    }
  ]
})

router.beforeEach(async (to) => {
  if (to.path.startsWith('/admin') && !getAccessToken()) {
    return {
      path: '/login',
      query: { redirect: to.fullPath }
    }
  }

  const permissionCode = [...to.matched]
    .reverse()
    .map((record) => record.meta.permissionCode as string | undefined)
    .find(Boolean)

  if (!permissionCode) {
    return true
  }

  const view = await loadPermissionView(false)
  if (hasPermission(permissionCode, view)) {
    return true
  }

  return '/403'
})
