<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

export interface HoverDropdownItem {
  label: string
  path?: string
  description?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  label: string
  items: HoverDropdownItem[]
  align?: 'left' | 'right'
  closeDelayMs?: number
}>(), {
  align: 'left',
  closeDelayMs: 120
})

const emit = defineEmits<{
  select: [item: HoverDropdownItem]
}>()

const router = useRouter()
const open = ref(false)
let timer: number | undefined

function show() {
  clear()
  open.value = true
}

function hide() {
  clear()
  timer = window.setTimeout(() => {
    open.value = false
  }, props.closeDelayMs)
}

function clear() {
  if (timer) {
    window.clearTimeout(timer)
    timer = undefined
  }
}

function close() {
  clear()
  open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close()
  }
}

function select(item: HoverDropdownItem) {
  if (item.disabled) return
  emit('select', item)

  if (item.path) {
    router.push(item.path)
  }

  close()
}
</script>

<template>
  <div
    class="hover-dropdown"
    :class="{ open }"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @keydown="onKeydown"
  >
    <button class="hover-trigger" type="button" @click.prevent="show">
      {{ props.label }}
      <span class="arrow">▾</span>
    </button>

    <div
      v-show="open"
      class="hover-menu"
      :class="props.align === 'right' ? 'align-right' : 'align-left'"
      @mouseenter="show"
      @mouseleave="hide"
    >
      <button
        v-for="item in props.items"
        :key="item.label + item.path"
        class="hover-menu-item"
        :disabled="item.disabled"
        type="button"
        @click="select(item)"
      >
        <strong>{{ item.label }}</strong>
        <span v-if="item.description">{{ item.description }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.hover-dropdown {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.hover-trigger {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 10px 12px;
  border-radius: 10px;
  font: inherit;
  white-space: nowrap;
}

.hover-dropdown.open .hover-trigger,
.hover-trigger:hover {
  background: #f3f4f6;
}

.arrow {
  margin-left: 4px;
  font-size: 12px;
}

.hover-menu {
  position: absolute;
  top: calc(100% + 6px);
  min-width: 220px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14);
  padding: 8px;
  z-index: 1000;
}

.align-left {
  left: 0;
}

.align-right {
  right: 0;
}

.hover-menu-item {
  display: block;
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  border-radius: 10px;
  padding: 10px;
  color: #111827;
}

.hover-menu-item:hover {
  background: #eff6ff;
}

.hover-menu-item:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.hover-menu-item strong,
.hover-menu-item span {
  display: block;
}

.hover-menu-item span {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}
</style>
