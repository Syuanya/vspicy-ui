import { http } from './http'

export type SystemMonitorMemoryView = {
  used: number
  committed: number
  max: number
  usageRate: number
  usedText: string
  committedText: string
  maxText: string
}

export type SystemMonitorDiskView = {
  path: string
  total: number
  free: number
  usable: number
  used: number
  usageRate: number
  totalText: string
  freeText: string
  usableText: string
  usedText: string
}

export type SystemMonitorThreadView = {
  liveThreadCount: number
  daemonThreadCount: number
  peakThreadCount: number
  totalStartedThreadCount: number
}

export type SystemMonitorRuntimeProperty = {
  name: string
  value: string
}

export type SystemMonitorOverviewView = {
  hostName: string
  osName: string
  osArch: string
  osVersion: string
  availableProcessors: number
  javaVersion: string
  javaVendor: string
  vmName: string
  userName: string
  workDir: string
  uptimeMillis: number
  uptimeText: string
  processCpuLoad: number
  systemCpuLoad: number
  systemLoadAverage: number
  heapMemory: SystemMonitorMemoryView
  nonHeapMemory: SystemMonitorMemoryView
  thread: SystemMonitorThreadView
  disks: SystemMonitorDiskView[]
  runtimeProperties: SystemMonitorRuntimeProperty[]
  collectedAt: number
}

export function getSystemMonitorOverview() {
  return http.get('/admin/system-monitor/overview')
}
