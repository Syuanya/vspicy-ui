export const adminOpsRoutes = [
  {
    path: '/admin/ops-hub',
    name: 'AdminOpsHub',
    component: () => import('../views/admin/AdminOpsHub.vue'),
    meta: {
      title: '运维中心',
      requiresAuth: true,
      permission: 'video:ops:hub:view'
    }
  },
  {
    path: '/admin/notification-overview',
    name: 'AdminNotificationOverview',
    component: () => import('../views/admin/NotificationOverview.vue'),
    meta: {
      title: '通知运营看板',
      requiresAuth: true,
      permission: 'notification:overview:view'
    }
  },

  {
    path: '/admin/notification-templates',
    name: 'AdminNotificationTemplates',
    component: () => import('../views/admin/NotificationTemplates.vue'),
    meta: {
      title: '通知模板',
      requiresAuth: true,
      permission: 'notification:template:view'
    }
  },
  {
    path: '/admin/notification-inbox', 

    name: 'AdminNotificationInbox',
    component: () => import('../views/admin/NotificationInbox.vue'),
    meta: {
      title: '通知投递查询',
      requiresAuth: true,
      permission: 'notification:inbox:admin:view'
    }
  },
  {
    path: '/admin/service-health',
    name: 'AdminServiceHealth',
    component: () => import('../views/admin/AdminServiceHealth.vue'),
    meta: {
      title: '服务健康检查',
      requiresAuth: true,
      permission: 'video:service:health:view'
    }
  },
  {
    path: '/admin/api-diagnostics',
    name: 'AdminApiDiagnostics',
    component: () => import('../views/admin/AdminApiDiagnostics.vue'),
    meta: {
      title: 'API 诊断',
      requiresAuth: true,
      permission: 'video:ops:hub:view'
    }
  },
  {
    path: '/admin/transcode-tasks',
    name: 'TranscodeTasks',
    component: () => import('../views/admin/TranscodeTasks.vue'),
    meta: {
      title: '转码任务',
      requiresAuth: true,
      permission: 'video:transcode:state:view'
    }
  },
  {
    path: '/admin/playback-readiness-batch',
    name: 'PlaybackReadinessBatch',
    component: () => import('../views/admin/PlaybackReadinessBatch.vue'),
    meta: {
      title: '播放就绪批量自愈',
      requiresAuth: true,
      permission: 'video:playback:readiness:view'
    }
  },
  {
    path: '/admin/operation-audit',
    name: 'OperationAudit',
    component: () => import('../views/admin/OperationAudit.vue'),
    meta: {
      title: '操作审计',
      requiresAuth: true,
      permission: 'video:operation:audit:view'
    }
  },
  {
    path: '/admin/route-diagnostics',
    name: 'AdminRouteDiagnostics',
    component: () => import('../views/admin/AdminRouteDiagnostics.vue'),
    meta: {
      title: '路由诊断',
      requiresAuth: false
    }
  }
]
