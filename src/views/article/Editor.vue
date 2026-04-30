<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createArticleDraft, submitArticle, updateArticle } from '../../api/article'
import { formatApiError, isSuccessResponse } from '../../api/apiError'
import { getCurrentUserId } from '../../api/http'
import ApiErrorBanner from '../../components/common/ApiErrorBanner.vue'

const router = useRouter()
const articleId = ref<number | null>(null)
const title = ref('')
const summary = ref('')
const coverUrl = ref('')
const editorRef = ref<HTMLElement | null>(null)
const message = ref('')
const error = ref<unknown | null>(null)
const saving = ref(false)
const submitting = ref(false)

function getContent() {
  return editorRef.value?.innerHTML || ''
}

function validate() {
  if (!title.value.trim()) {
    error.value = '请输入文章标题'
    return false
  }
  if (!getContent().trim()) {
    error.value = '请输入正文内容'
    return false
  }
  return true
}

async function saveDraft() {
  if (!validate()) return

  saving.value = true
  message.value = ''
  error.value = null
  try {
    const payload = {
      userId: getCurrentUserId() || 1,
      title: title.value.trim(),
      summary: summary.value.trim(),
      coverUrl: coverUrl.value.trim(),
      content: getContent()
    }

    const res: any = articleId.value
      ? await updateArticle(articleId.value, payload)
      : await createArticleDraft(payload)

    if (isSuccessResponse(res)) {
      articleId.value = res.data.article.id
      message.value = `草稿已保存，articleId=${articleId.value}，version=${res.data.versionNo}`
    } else {
      error.value = res
    }
  } catch (e) {
    error.value = e
  } finally {
    saving.value = false
  }
}

async function submit() {
  if (!articleId.value) {
    await saveDraft()
  }
  if (!articleId.value) {
    return
  }

  submitting.value = true
  error.value = null
  try {
    const res: any = await submitArticle(articleId.value)
    if (isSuccessResponse(res)) {
      message.value = `已提交审核，当前状态：${res.data.article.status}`
      await router.push(`/article/${articleId.value}`)
    } else {
      error.value = res
    }
  } catch (e) {
    error.value = e
  } finally {
    submitting.value = false
  }
}

function exec(command: string) {
  document.execCommand(command)
}

function insertHeading() {
  document.execCommand('formatBlock', false, 'h2')
}

function insertParagraph() {
  document.execCommand('formatBlock', false, 'p')
}
</script>

<template>
  <section class="editor-page">
    <div class="hero">
      <span class="eyebrow">文章创作</span>
      <h1>文章编辑器</h1>
      <p>支持草稿保存、富文本排版和提交审核。</p>
    </div>

    <ApiErrorBanner :error="error" @close="error = null" />
    <p v-if="message" class="message">{{ message }}</p>

    <section class="panel">
      <input v-model="title" class="input title-input" placeholder="文章标题" />
      <input v-model="summary" class="input" placeholder="文章摘要" />
      <input v-model="coverUrl" class="input" placeholder="封面 URL，可选" />

      <div class="toolbar">
        <button class="tool-button" type="button" @click="exec('bold')">B</button>
        <button class="tool-button" type="button" @click="exec('italic')">I</button>
        <button class="tool-button" type="button" @click="exec('insertUnorderedList')">列表</button>
        <button class="tool-button" type="button" @click="exec('insertOrderedList')">编号</button>
        <button class="tool-button" type="button" @click="insertHeading">H2</button>
        <button class="tool-button" type="button" @click="insertParagraph">正文</button>
      </div>

      <div
        ref="editorRef"
        contenteditable="true"
        class="editor"
        data-placeholder="请输入正文内容..."
      ></div>

      <div class="actions">
        <button class="button" :disabled="saving || submitting" @click="saveDraft">
          {{ saving ? '保存中...' : '保存草稿' }}
        </button>
        <button class="button secondary" :disabled="saving || submitting" @click="submit">
          {{ submitting ? '提交中...' : '提交审核' }}
        </button>
      </div>
    </section>
  </section>
</template>

<style scoped>
.editor-page {
  display: grid;
  gap: 16px;
}

.hero,
.panel {
  border-radius: 8px;
}

.hero {
  padding: 24px;
  background: #111827;
  color: #fff;
}

.hero h1 {
  margin: 8px 0;
  font-size: 30px;
}

.hero p {
  color: #d1d5db;
}

.eyebrow {
  color: #93c5fd;
  font-weight: 700;
}

.panel {
  padding: 18px;
  border: 1px solid #e5e7eb;
  background: #fff;
}

.title-input {
  font-size: 20px;
  font-weight: 700;
}

.toolbar,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}

.tool-button {
  min-width: 38px;
  min-height: 34px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.tool-button:hover {
  background: #eff6ff;
  color: #1d4ed8;
}

.editor {
  min-height: 360px;
  padding: 18px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  line-height: 1.8;
  outline: none;
}

.editor:empty::before {
  content: attr(data-placeholder);
  color: #9ca3af;
}

.button.secondary {
  background: #2563eb;
}

.message {
  margin: 0;
  color: #166534;
  font-weight: 700;
}
</style>
