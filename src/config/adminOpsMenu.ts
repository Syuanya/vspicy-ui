export type AdminOpsMenuLevel = 'info' | 'success' | 'warning' | 'danger'

export interface AdminOpsMenuItem {
  title: string
  description: string
  path: string
  permission: string
  level: AdminOpsMenuLevel
  group: string
}

export const adminOpsMenuItems: AdminOpsMenuItem[] = [
  {
    title: '运维中心',
    description: '统一查看转码、HLS、对象清理、播放就绪、服务健康和存储告警。',
    path: '/admin/ops-hub',
    permission: 'video:ops:hub:view',
    level: 'info',
    group: 'overview'
  },
  {
    title: '服务健康',
    description: '检查 MySQL、Redis、MinIO、RocketMQ、FFmpeg 和存储目录。',
    path: '/admin/service-health',
    permission: 'video:service:health:view',
    level: 'danger',
    group: 'health'
  },
  {
    title: '存储运维',
    description: '存储扫描、告警、对象一致性和运维指标。',
    path: '/admin/storage-ops',
    permission: 'video:storage:ops:view',
    level: 'info',
    group: 'storage'
  },
  {
    title: '转码任务',
    description: '转码状态机、分发、重试、重跑、本地执行。',
    path: '/admin/transcode-tasks',
    permission: 'video:transcode:state:view',
    level: 'warning',
    group: 'transcode'
  },
  {
    title: '播放就绪批量自愈',
    description: '批量修复 HLS 已生成但 video 状态/播放地址未同步的问题。',
    path: '/admin/playback-readiness-batch',
    permission: 'video:playback:readiness:view',
    level: 'danger',
    group: 'playback'
  },
  {
    title: 'HLS 修复',
    description: 'HLS 缺片、manifest 异常、修复执行与复检。',
    path: '/admin/hls-repair',
    permission: 'video:hls:repair:view',
    level: 'warning',
    group: 'repair'
  },
  {
    title: '对象清理',
    description: '孤儿对象扫描、审批、执行和审计。',
    path: '/admin/object-cleanup',
    permission: 'video:object:cleanup:view',
    level: 'info',
    group: 'cleanup'
  },
  {
    title: '操作审计',
    description: '查看 retry、rerun、sync、cleanup 等运维动作记录。',
    path: '/admin/operation-audit',
    permission: 'video:operation:audit:view',
    level: 'info',
    group: 'audit'
  },
  {
    title: 'API 诊断',
    description: '验证前端网关、后端运维接口与统一错误处理。',
    path: '/admin/api-diagnostics',
    permission: 'video:ops:hub:view',
    level: 'info',
    group: 'diagnostics'
  }
]
