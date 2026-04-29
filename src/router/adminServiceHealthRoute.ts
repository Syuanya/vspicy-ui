export const adminServiceHealthRoute = {
  path: '/admin/service-health',
  name: 'AdminServiceHealth',
  component: () => import('../views/admin/AdminServiceHealth.vue'),
  meta: {
    title: '服务健康检查',
    requiresAuth: true,
    permission: 'video:service:health:view'
  }
}
