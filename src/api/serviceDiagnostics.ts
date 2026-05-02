import { http } from './http'

export type ServiceProbeStatus = 'UP' | 'DOWN'

export type ServiceProbeView = {
  code: string
  name: string
  category: string
  host: string
  port: number
  endpoint: string
  status: ServiceProbeStatus | string
  latencyMillis: number
  required: boolean
  ownerModule: string
  message: string
  startHint: string
}

export type ServiceDiagnosticsOverviewView = {
  collectedAt: number
  serviceTotal: number
  serviceUp: number
  serviceDown: number
  middlewareTotal: number
  middlewareUp: number
  middlewareDown: number
  services: ServiceProbeView[]
  middlewares: ServiceProbeView[]
  suggestions: string[]
  powershellChecks: string[]
}

export function getServiceDiagnosticsOverview() {
  return http.get<ServiceDiagnosticsOverviewView>('/admin/service-diagnostics/overview') as unknown as Promise<ServiceDiagnosticsOverviewView>
}
