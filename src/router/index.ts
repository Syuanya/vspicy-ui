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
const Dashboard = () => import('../views/admin/Dashboard.vue')
const Users = () => import('../views/admin/Users.vue')
const ContentManager = () => import('../views/admin/ContentManager.vue')
const NotificationEvents = () => import('../views/admin/NotificationEvents.vue')
const NotificationOverview = () => import('../views/admin/NotificationOverview.vue')
const NotificationTemplates = () => import('../views/admin/NotificationTemplates.vue')
const NotificationInbox = () => import('../views/admin/NotificationInbox.vue')
const SystemConfigs = () => import('../views/admin/SystemConfigs.vue')
const Dictionaries = () => import('../views/admin/Dictionaries.vue')
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
        { path: 'api-diagnostics', component: AdminApiDiagnostics, meta: { permissionCode: 'video:ops:hub:view' } },
        { path: 'route-diagnostics', component: AdminRouteDiagnostics },
        { path: 'dashboard', component: Dashboard, meta: { permissionCode: 'dashboard:view' } },
        { path: 'users', component: Users, meta: { permissionCode: 'user:view' } },
        { path: 'content', component: ContentManager, meta: { permissionCode: 'content:manage' } },
        { path: 'notification-overview', component: NotificationOverview, meta: { permissionCode: 'notification:overview:view' } },
        { path: 'notification-events', component: NotificationEvents, meta: { permissionCode: 'notification:event:view' } },
        { path: 'notification-templates', component: NotificationTemplates, meta: { permissionCode: 'notification:template:view' } },
        { path: 'notification-inbox', component: NotificationInbox, meta: { permissionCode: 'notification:inbox:admin:view' } },
        { path: 'system-configs', component: SystemConfigs, meta: { permissionCode: 'system:config:view' } },
        { path: 'dictionaries', component: Dictionaries, meta: { permissionCode: 'system:dict:view' } },
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
        { path: ':pathMatch(.*)*', component: NotFound }
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
