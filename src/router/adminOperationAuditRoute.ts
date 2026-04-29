export const adminOperationAuditRoute = {
  path: '/admin/operation-audit',
  name: 'OperationAudit',
  component: () => import('../views/admin/OperationAudit.vue'),
  meta: {
    title: '操作审计',
    requiresAuth: true,
    permission: 'video:operation:audit:view'
  }
}
