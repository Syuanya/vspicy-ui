import { http } from './http'

export type FeatureRegistryQuery = {
  moduleName?: string
  featureType?: string
  status?: string
  riskLevel?: string
  keyword?: string
  limit?: number
}

export type FeatureRegistryPayload = {
  featureCode?: string
  featureName: string
  featureType?: string
  moduleName?: string
  serviceName?: string
  routePath?: string
  apiPath?: string
  apiMethod?: string
  permissionCode?: string
  menuTitle?: string
  menuGroup?: string
  owner?: string
  riskLevel?: string
  status?: string
  description?: string
}

export type FeatureIssueQuery = {
  status?: string
  severity?: string
  issueType?: string
  keyword?: string
  limit?: number
}

export function getFeatureGovernanceOverview() {
  return http.get('/admin/feature-governance/overview')
}

export function listFeatureRegistry(params?: FeatureRegistryQuery) {
  return http.get('/admin/feature-governance/features', { params })
}

export function getFeatureRegistry(id: number) {
  return http.get(`/admin/feature-governance/features/${id}`)
}

export function createFeatureRegistry(data: FeatureRegistryPayload) {
  return http.post('/admin/feature-governance/features', data)
}

export function updateFeatureRegistry(id: number, data: FeatureRegistryPayload) {
  return http.put(`/admin/feature-governance/features/${id}`, data)
}

export function enableFeatureRegistry(id: number) {
  return http.post(`/admin/feature-governance/features/${id}/enable`)
}

export function disableFeatureRegistry(id: number) {
  return http.post(`/admin/feature-governance/features/${id}/disable`)
}

export function deleteFeatureRegistry(id: number) {
  return http.delete(`/admin/feature-governance/features/${id}`)
}

export function runFeatureGovernanceCheck() {
  return http.post('/admin/feature-governance/checks/run')
}

export function listFeatureGovernanceIssues(params?: FeatureIssueQuery) {
  return http.get('/admin/feature-governance/issues', { params })
}

export function resolveFeatureGovernanceIssue(id: number, handleRemark?: string) {
  return http.post(`/admin/feature-governance/issues/${id}/resolve`, { handleRemark })
}

export function ignoreFeatureGovernanceIssue(id: number, handleRemark?: string) {
  return http.post(`/admin/feature-governance/issues/${id}/ignore`, { handleRemark })
}

export function reopenFeatureGovernanceIssue(id: number) {
  return http.post(`/admin/feature-governance/issues/${id}/reopen`)
}
