<script setup lang="ts">
import HoverDropdown from '../common/HoverDropdown.vue'

const contentItems = [
  {
    label: '视频上传',
    path: '/video/upload',
    description: '上传视频并查看转码状态'
  },
  {
    label: '视频列表',
    path: '/videos',
    description: '查看公开视频和内容列表'
  },
  {
    label: '转码任务',
    path: '/admin/transcode-tasks',
    description: '重试、重跑、取消转码任务'
  },
  {
    label: '播放就绪自愈',
    path: '/admin/playback-readiness-batch',
    description: '修复 HLS 已生成但播放地址未同步'
  }
]

const storageItems = [
  {
    label: '存储运维',
    path: '/admin/storage-ops',
    description: '存储扫描、告警和一致性检查'
  },
  {
    label: 'HLS 修复',
    path: '/admin/hls-repair',
    description: '修复缺片、manifest 异常和 HLS 产物'
  },
  {
    label: '对象清理',
    path: '/admin/object-cleanup',
    description: '审批并清理孤儿对象'
  },
  {
    label: '服务健康',
    path: '/admin/service-health',
    description: '检查 MinIO、FFmpeg、RocketMQ 和目录权限'
  }
]
</script>

<template>
  <nav class="content-storage-hover-nav">
    <HoverDropdown label="内容管理" :items="contentItems" />
    <HoverDropdown label="存储" :items="storageItems" />
  </nav>
</template>

<style scoped>
.content-storage-hover-nav {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
