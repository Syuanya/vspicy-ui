<script setup lang="ts">
import AdminOpsNav from '../../components/admin/AdminOpsNav.vue'
</script>

<template>
  <section class="admin-ops-shell">
    <AdminOpsNav>
      <template #extra>
        <slot name="extra"></slot>
      </template>
    </AdminOpsNav>

    <div class="admin-ops-body">
      <slot></slot>
    </div>
  </section>
</template>

<style scoped>
.admin-ops-shell {
  width: 100%;
}

.admin-ops-body {
  width: 100%;
}
</style>
