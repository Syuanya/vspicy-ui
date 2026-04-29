<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminOpsMenuItems } from '../../config/adminOpsMenu'

const props = withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false
})

const route = useRoute()
const router = useRouter()

const items = computed(() => adminOpsMenuItems)

function go(path: string) {
  if (!path) return
  router.push(path)
}

function active(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

function itemClass(level: string, path: string) {
  return [
    'ops-nav-item',
    `level-${level || 'info'}`,
    active(path) ? 'active' : '',
    props.compact ? 'compact' : ''
  ].filter(Boolean).join(' ')
}
</script>

<template>
  <nav class="ops-nav">
    <div class="ops-nav-scroll">
      <button
        v-for="item in items"
        :key="item.path"
        :class="itemClass(item.level, item.path)"
        :title="item.description"
        @click="go(item.path)"
      >
        <strong>{{ item.title }}</strong>
        <span v-if="!props.compact">{{ item.description }}</span>
      </button>
    </div>

    <div class="ops-nav-extra">
      <slot name="extra"></slot>
    </div>
  </nav>
</template>

<style scoped>
.ops-nav {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: stretch;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 18px;
  padding: 12px;
  margin-bottom: 18px;
}

.ops-nav-scroll {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  overflow-x: auto;
  min-width: 0;
}

.ops-nav-item {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 14px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  min-width: 180px;
  max-width: 260px;
}

.ops-nav-item.compact {
  min-width: auto;
  max-width: none;
}

.ops-nav-item strong {
  display: block;
  color: #111827;
  white-space: nowrap;
}

.ops-nav-item span {
  display: block;
  margin-top: 5px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.4;
}

.ops-nav-item:hover,
.ops-nav-item.active {
  border-color: #93c5fd;
  background: #eff6ff;
}

.ops-nav-item.level-success {
  border-color: #bbf7d0;
}

.ops-nav-item.level-warning {
  border-color: #fde68a;
}

.ops-nav-item.level-danger {
  border-color: #fecaca;
}

.ops-nav-item.level-success.active {
  background: #f0fdf4;
}

.ops-nav-item.level-warning.active {
  background: #fffbeb;
}

.ops-nav-item.level-danger.active {
  background: #fef2f2;
}

.ops-nav-extra {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}

@media (max-width: 900px) {
  .ops-nav {
    display: block;
  }

  .ops-nav-extra {
    margin-top: 10px;
  }

  .ops-nav-scroll {
    flex-wrap: nowrap;
  }

  .ops-nav-item {
    min-width: 190px;
  }
}
</style>
