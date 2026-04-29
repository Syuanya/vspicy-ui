export const adminApiDiagnosticsRoute = {
  path: '/admin/api-diagnostics',
  name: 'AdminApiDiagnostics',
  component: () => import('../views/admin/AdminApiDiagnostics.vue'),
  meta: {
    title: 'API 诊断',
    requiresAuth: true,
    permission: 'video:ops:hub:view'
  }
}
