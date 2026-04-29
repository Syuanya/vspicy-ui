<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  visible: boolean
  title?: string
  message?: string
  targetName?: string
  actionLabel?: string
  level?: 'warning' | 'danger'
  confirmText?: string
  defaultReason?: string
  impacts?: string[]
  loading?: boolean
}>(), {
  visible: false,
  title: '确认操作',
  message: '该操作可能影响系统状态，请确认后继续。',
  targetName: '',
  actionLabel: '确认',
  level: 'warning',
  confirmText: '',
  defaultReason: '',
  impacts: () => [],
  loading: false
})

const emit = defineEmits<{
  cancel: []
  confirm: [payload: { reason: string; confirmText: string }]
}>()

const reason = ref('')
const inputConfirmText = ref('')

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      reason.value = props.defaultReason || ''
      inputConfirmText.value = ''
    }
  }
)

const reasonValid = computed(() => reason.value.trim().length >= 3)
const confirmTextValid = computed(() => {
  if (!props.confirmText) return true
  return inputConfirmText.value.trim() === props.confirmText
})

const canSubmit = computed(() => reasonValid.value && confirmTextValid.value && !props.loading)

function submit() {
  if (!canSubmit.value) return
  emit('confirm', {
    reason: reason.value.trim(),
    confirmText: inputConfirmText.value.trim()
  })
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('cancel')
  }

  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    submit()
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="props.visible" class="modal-mask" @keydown="onKeydown">
      <div class="modal-card" :class="props.level">
        <div class="modal-head">
          <div>
            <h3>{{ props.title }}</h3>
            <p>{{ props.message }}</p>
          </div>
          <button class="icon-btn" type="button" @click="emit('cancel')">×</button>
        </div>

        <div v-if="props.targetName" class="target">
          <small>目标对象</small>
          <strong>{{ props.targetName }}</strong>
        </div>

        <div v-if="props.impacts.length" class="impact">
          <strong>影响范围</strong>
          <ul>
            <li v-for="item in props.impacts" :key="item">{{ item }}</li>
          </ul>
        </div>

        <label class="field">
          <span>操作原因 <em>*</em></span>
          <textarea
            v-model="reason"
            placeholder="请输入操作原因，至少 3 个字符"
            rows="4"
            autofocus
          ></textarea>
          <small v-if="!reasonValid">reason 必填，至少 3 个字符。</small>
        </label>

        <label v-if="props.confirmText" class="field">
          <span>
            确认短语 <em>*</em>
            <b>请输入 {{ props.confirmText }}</b>
          </span>
          <input
            v-model="inputConfirmText"
            :placeholder="`输入 ${props.confirmText} 后继续`"
          />
          <small v-if="!confirmTextValid">确认短语不匹配。</small>
        </label>

        <div class="modal-actions">
          <button class="ghost" type="button" :disabled="props.loading" @click="emit('cancel')">
            取消
          </button>
          <button
            class="primary"
            :class="props.level"
            type="button"
            :disabled="!canSubmit"
            @click="submit"
          >
            {{ props.loading ? '处理中...' : props.actionLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.48);
  z-index: 5000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
}

.modal-card {
  width: min(560px, 100%);
  background: #fff;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.22);
  padding: 20px;
}

.modal-card.danger {
  border-color: #fecaca;
}

.modal-card.warning {
  border-color: #fde68a;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.modal-head h3 {
  margin: 0;
}

.modal-head p {
  margin: 8px 0 0;
  color: #6b7280;
  line-height: 1.5;
}

.icon-btn {
  width: 34px;
  height: 34px;
  border: none;
  background: #f3f4f6;
  border-radius: 999px;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
}

.target {
  margin-top: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 12px;
  background: #f9fafb;
}

.target small,
.target strong {
  display: block;
}

.target small {
  color: #6b7280;
}

.target strong {
  margin-top: 5px;
}

.impact {
  margin-top: 16px;
  border-radius: 14px;
  padding: 12px;
  background: #fffbeb;
  color: #92400e;
}

.impact ul {
  margin: 8px 0 0;
  padding-left: 20px;
  line-height: 1.7;
}

.field {
  display: block;
  margin-top: 16px;
}

.field span {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  color: #374151;
}

.field em {
  color: #dc2626;
  font-style: normal;
}

.field b {
  color: #991b1b;
  font-weight: 700;
}

.field textarea,
.field input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 10px;
  outline: none;
  font: inherit;
}

.field textarea:focus,
.field input:focus {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.24);
}

.field small {
  display: block;
  margin-top: 6px;
  color: #991b1b;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.modal-actions button {
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  cursor: pointer;
}

.modal-actions button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ghost {
  background: #f3f4f6;
  color: #374151;
}

.primary {
  background: #f59e0b;
  color: #fff;
}

.primary.danger {
  background: #dc2626;
}
</style>
