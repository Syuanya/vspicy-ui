<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  createSensitiveWord,
  disableSensitiveWord,
  enableSensitiveWord,
  listModerationRecords,
  listSensitiveWords
} from '../../api/safety'

const words = ref<any[]>([])
const records = ref<any[]>([])
const loading = ref(false)
const message = ref('')

const form = ref({
  word: '',
  category: 'GENERAL',
  riskLevel: 'MEDIUM'
})

async function loadWords() {
  loading.value = true
  message.value = ''
  try {
    const res: any = await listSensitiveWords({ limit: 200 })
    if (res.code === 0) {
      words.value = res.data || []
    } else {
      message.value = res.message || '查询失败'
    }
  } finally {
    loading.value = false
  }
}

async function loadRecords() {
  const res: any = await listModerationRecords({ bizType: 'ARTICLE', limit: 50 })
  if (res.code === 0) {
    records.value = res.data || []
  }
}

async function createWord() {
  if (!form.value.word.trim()) {
    alert('请输入敏感词')
    return
  }

  const res: any = await createSensitiveWord(form.value)
  if (res.code === 0) {
    message.value = '已添加'
    form.value.word = ''
    await loadWords()
  } else {
    message.value = res.message || '添加失败'
  }
}

async function toggle(word: any) {
  const res: any = word.status === 1
    ? await disableSensitiveWord(word.id)
    : await enableSensitiveWord(word.id)

  if (res.code === 0) {
    await loadWords()
  } else {
    message.value = res.message || '操作失败'
  }
}

function riskClass(value: string) {
  if (value === 'HIGH') return 'tag danger'
  if (value === 'MEDIUM') return 'tag warning'
  return 'tag success'
}

onMounted(async () => {
  await loadWords()
  await loadRecords()
})
</script>

<template>
  <section class="card">
    <h2>内容安全：敏感词管理</h2>
    <p>文章提交审核时会自动检测敏感词，并生成检测记录和审核风险等级。</p>

    <div class="card" style="background: #f9fafb; margin: 16px 0;">
      <h3>新增敏感词</h3>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <input v-model="form.word" class="input" style="max-width: 220px; margin: 0;" placeholder="敏感词" />
        <select v-model="form.category" class="input" style="max-width: 180px; margin: 0;">
          <option value="GENERAL">GENERAL</option>
          <option value="AD">AD</option>
          <option value="PORN">PORN</option>
          <option value="GAMBLING">GAMBLING</option>
          <option value="ABUSE">ABUSE</option>
          <option value="POLITICS">POLITICS</option>
        </select>
        <select v-model="form.riskLevel" class="input" style="max-width: 160px; margin: 0;">
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
        </select>
        <button class="button" @click="createWord">添加</button>
      </div>
    </div>

    <p v-if="message" style="color: #ef4444;">{{ message }}</p>

    <h3>敏感词列表</h3>
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th>ID</th>
            <th>词</th>
            <th>分类</th>
            <th>风险等级</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="word in words" :key="word.id">
            <td>{{ word.id }}</td>
            <td>{{ word.word }}</td>
            <td>{{ word.category }}</td>
            <td><span :class="riskClass(word.riskLevel)">{{ word.riskLevel }}</span></td>
            <td>{{ word.status === 1 ? '启用' : '停用' }}</td>
            <td>
              <button class="button" @click="toggle(word)">
                {{ word.status === 1 ? '停用' : '启用' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 style="margin-top: 28px;">最近检测记录</h3>
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th>ID</th>
            <th>业务</th>
            <th>业务ID</th>
            <th>结果</th>
            <th>风险</th>
            <th>命中词</th>
            <th>原因</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in records" :key="record.id">
            <td>{{ record.id }}</td>
            <td>{{ record.bizType }}</td>
            <td>{{ record.bizId }}</td>
            <td>{{ record.result }}</td>
            <td><span :class="riskClass(record.riskLevel)">{{ record.riskLevel }}</span></td>
            <td>{{ record.matchedWords || '-' }}</td>
            <td>{{ record.reason }}</td>
            <td>{{ record.createdAt }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
th, td {
  border-bottom: 1px solid #e5e7eb;
  padding: 10px;
  text-align: left;
  font-size: 14px;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e5e7eb;
}

.success {
  background: #dcfce7;
  color: #166534;
}

.warning {
  background: #fef3c7;
  color: #92400e;
}

.danger {
  background: #fee2e2;
  color: #991b1b;
}
</style>
