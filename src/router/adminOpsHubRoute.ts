export const adminOpsHubRoute = {
  path: '/admin/ops-hub',
  name: 'AdminOpsHub',
  component: () => import('../views/admin/AdminOpsHub.vue'),
  meta: {
    title: '运维中心',
    requiresAuth: true,
    permission: 'video:storage:ops:view'
  }
}
