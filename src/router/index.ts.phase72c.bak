import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import VideoUpload from '../views/video/Upload.vue'
import VideoPlayer from '../views/video/Player.vue'
import ArticleEditor from '../views/article/Editor.vue'
import ArticleDetail from '../views/article/Detail.vue'
import TranscodeTasks from '../views/admin/TranscodeTasks.vue'
import AuditTasks from '../views/admin/AuditTasks.vue'
import SensitiveWords from '../views/admin/SensitiveWords.vue'
import Hot from '../views/Hot.vue'
import Recommend from '../views/Recommend.vue'
import Profiles from '../views/admin/Profiles.vue'
import Dashboard from '../views/admin/Dashboard.vue'
import Permissions from '../views/admin/Permissions.vue'
import OperationLogs from '../views/admin/OperationLogs.vue'
import Notifications from '../views/Notifications.vue'
import Member from '../views/Member.vue'
import VideoUploadQuota from '../views/admin/VideoUploadQuota.vue'
import UserSpace from '../views/admin/UserSpace.vue'
import StorageDashboard from '../views/admin/StorageDashboard.vue'
import VideoFileConsistency from '../views/admin/VideoFileConsistency.vue'
import HlsIntegrity from '../views/admin/HlsIntegrity.vue'
import StorageAlerts from '../views/admin/StorageAlerts.vue'
import StorageAlertNotifications from '../views/admin/StorageAlertNotifications.vue'
import HlsRepair from '../views/admin/HlsRepair.vue'
import ObjectCleanup from '../views/admin/ObjectCleanup.vue'
import StorageOpsConsole from '../views/admin/StorageOpsConsole.vue'
import { hasPermission, loadPermissionView } from '../utils/permission'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/hot', component: Hot },
    { path: '/recommend', component: Recommend, meta: { permissionCode: 'recommend:view' } },
    { path: '/notifications', component: Notifications, meta: { permissionCode: 'notification:view' } },
    { path: '/member', component: Member, meta: { permissionCode: 'member:view' } },
    { path: '/login', component: Login },
    { path: '/video/upload', component: VideoUpload },
    { path: '/video/:id', component: VideoPlayer },
    { path: '/article/editor', component: ArticleEditor, meta: { permissionCode: 'article:create' } },
    { path: '/article/:id', component: ArticleDetail },
    { path: '/admin/dashboard', component: Dashboard, meta: { permissionCode: 'dashboard:view' } },
    { path: '/admin/transcode-tasks', component: TranscodeTasks, meta: { permissionCode: 'video:transcode:view' } },
    { path: '/admin/video-upload-quota', component: VideoUploadQuota, meta: { permissionCode: 'video:upload:quota:view' } },
    { path: '/admin/user-space', component: UserSpace, meta: { permissionCode: 'video:upload:space:view' } },
    { path: '/admin/storage-ops', component: StorageOpsConsole, meta: { permissionCode: 'video:storage:ops:view' } },
    { path: '/admin/storage-dashboard', component: StorageDashboard, meta: { permissionCode: 'video:storage:dashboard:view' } },
    { path: '/admin/video-file-consistency', component: VideoFileConsistency, meta: { permissionCode: 'video:file:consistency:view' } },
    { path: '/admin/hls-integrity', component: HlsIntegrity, meta: { permissionCode: 'video:hls:integrity:view' } },
    { path: '/admin/storage-alerts', component: StorageAlerts, meta: { permissionCode: 'video:storage:alert:view' } },
    { path: '/admin/storage-alert-notifications', component: StorageAlertNotifications, meta: { permissionCode: 'video:storage:alert:notification:view' } },
    { path: '/admin/hls-repair', component: HlsRepair, meta: { permissionCode: 'video:hls:repair:view' } },
    { path: '/admin/object-cleanup', component: ObjectCleanup, meta: { permissionCode: 'video:object:cleanup:view' } },
    { path: '/admin/audit-tasks', component: AuditTasks, meta: { permissionCode: 'content:audit:view' } },
    { path: '/admin/sensitive-words', component: SensitiveWords, meta: { permissionCode: 'content:sensitive:view' } },
    { path: '/admin/profiles', component: Profiles, meta: { permissionCode: 'profile:view' } },
    { path: '/admin/permissions', component: Permissions, meta: { permissionCode: 'permission:view' } },
    { path: '/admin/operation-logs', component: OperationLogs, meta: { permissionCode: 'operation:log:view' } }
  ]
})

router.beforeEach(async (to) => {
  const permissionCode = to.meta.permissionCode as string | undefined
  if (!permissionCode) {
    return true
  }

  const view = await loadPermissionView(false)
  if (hasPermission(permissionCode, view)) {
    return true
  }

  alert(`无前端路由权限：${permissionCode}`)
  return '/'
})
