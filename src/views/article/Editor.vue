<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createArticleDraft, submitArticle, updateArticle } from '../../api/article'

const router = useRouter()
const articleId = ref<number | null>(null)
const title = ref('')
const summary = ref('')
const coverUrl = ref('')
const editorRef = ref<HTMLElement | null>(null)
const message = ref('')
const saving = ref(false)

function getContent() {
  return editorRef.value?.innerHTML || ''
}

async function saveDraft() {
  if (!title.value.trim()) {
    alert('请输入标题')
    return
  }

  saving.value = true
  message.value = ''
  try {
    const payload = {
      userId: 1,
      title: title.value,
      summary: summary.value,
      coverUrl: coverUrl.value,
      content: getContent()
    }

    const res: any = articleId.value
      ? await updateArticle(articleId.value, payload)
      : await createArticleDraft(payload)

    if (res.code === 0) {
      articleId.value = res.data.article.id
      message.value = `草稿已保存，articleId=${articleId.value}，version=${res.data.versionNo}`
    } else {
      message.value = res.message || '保存失败'
    }
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

  const res: any = await submitArticle(articleId.value)
  if (res.code === 0) {
    message.value = `已提交审核，当前状态：${res.data.article.status}`
    await router.push(`/article/${articleId.value}`)
  } else {
    message.value = res.message || '提交失败'
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
  <section class="card">
    <h2>文章编辑器</h2>
    <p>当前版本：轻量富文本。支持标题、加粗、斜体、列表、HTML 内容保存和审核发布。</p>

    <input v-model="title" class="input" placeholder="文章标题" />
    <input v-model="summary" class="input" placeholder="文章摘要" />
    <input v-model="coverUrl" class="input" placeholder="封面 URL，可选" />

    <div style="display: flex; gap: 8px; margin: 12px 0; flex-wrap: wrap;">
      <button class="button" type="button" @click="exec('bold')">加粗</button>
      <button class="button" type="button" @click="exec('italic')">斜体</button>
      <button class="button" type="button" @click="exec('insertUnorderedList')">无序列表</button>
      <button class="button" type="button" @click="exec('insertOrderedList')">有序列表</button>
      <button class="button" type="button" @click="insertHeading">二级标题</button>
      <button class="button" type="button" @click="insertParagraph">正文</button>
    </div>

    <div
      ref="editorRef"
      contenteditable="true"
      class="editor"
      data-placeholder="请输入正文内容..."
    ></div>

    <div style="margin-top: 16px; display: flex; gap: 12px;">
      <button class="button" :disabled="saving" @click="saveDraft">
        {{ saving ? '保存中...' : '保存草稿' }}
      </button>
      <button class="button" style="background: #2563eb;" @click="submit">
        提交审核
      </button>
    </div>

    <p v-if="message" style="color: #ef4444;">{{ message }}</p>
  </section>
</template>

<style scoped>
.editor {
  min-height: 360px;
  padding: 18px;
  border: 1px solid #d1d5db;
  border-radius: 16px;
  background: #fff;
  line-height: 1.8;
  outline: none;
}

.editor:empty::before {
  content: attr(data-placeholder);
  color: #9ca3af;
}
</style>
