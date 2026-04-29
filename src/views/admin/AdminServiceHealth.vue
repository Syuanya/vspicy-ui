<script setup lang="ts">
import ServiceHealthPanel from '../../components/admin/ServiceHealthPanel.vue'
</script>

<template>
  <section class="card">
    <h2>服务健康检查</h2>
    <p>统一检查上传、转码、播放依赖的基础服务状态。</p>

    <ServiceHealthPanel />
  </section>
</template>
