<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { checkVideoFileConsistency } from '../../api/videoFileConsistency'

const loading = ref(false)
const message = ref('')
const data = ref<any>(null)

const form = ref({
  prefix: 'videos/',
  limit: 1000
})

async function load() {
  loading.value = true
  message.value = ''
  try {
    const res: any = await checkVideoFileConsistency({
      prefix: form.value.prefix,
      limit: Number(form.value.limit)
    })

    if (res.code === 0) {
      data.value = res.data
    } else {
      message.value = res.message || '加载文件一致性失败'
    }
  } finally {
    loading.value = false
  }
}

function issueClass(type: string) {
  if (type === 'VIDEO_FILE_MISSING_OBJECT') return 'issue danger'
  if (type === 'OBJECT_MISSING_VIDEO_FILE') return 'issue warning'
  if (type === 'VIDEO_FILE_MISSING_TRACE') return 'issue info'
  if (type === 'TRACE_MISSING_VIDEO_FILE') return 'issue info'
  return 'issue'
}

onMounted(load)
</script>

<template>
  <section class="card">
    <div class="top">
      <div>
        <h2>文件一致性</h2>
        <p>检查 video_file、upload_trace 和 MinIO 对象之间的一致性。</p>
      </div>
      <button class="button" :disabled="loading" @click="load">
        {{ loading ? '扫描中...' : '刷新' }}
      </button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="panel">
      <h3>扫描参数</h3>
      <div class="form-grid">
        <input v-model="form.prefix" class="input" placeholder="prefix，例如 videos/" />
        <input v-model="form.limit" class="input" type="number" placeholder="limit" />
      </div>
      <button class="button" @click="load">执行扫描</button>
    </div>

    <div v-if="data" class="panel">
      <h3>总览</h3>
      <div class="metric-grid">
        <div class="metric-card">
          <small>Bucket</small>
          <strong>{{ data.bucket }}</strong>
          <p>prefix: {{ data.prefix }}</p>
        </div>
        <div class="metric-card">
          <small>video_file 表</small>
          <strong>{{ data.videoFileTableExists ? '存在' : '不存在' }}</strong>
          <p>object 列：{{ data.videoFileObjectColumn || '-' }}</p>
        </div>
        <div class="metric-card">
          <small>video_file object</small>
          <strong>{{ data.videoFileObjectCount }}</strong>
        </div>
        <div class="metric-card">
          <small>trace object</small>
          <strong>{{ data.traceObjectCount }}</strong>
        </div>
        <div class="metric-card">
          <small>MinIO object</small>
          <strong>{{ data.minioObjectCount }}</strong>
        </div>
        <div class="metric-card danger">
          <small>file 缺对象</small>
          <strong>{{ data.videoFileMissingObjectCount }}</strong>
        </div>
        <div class="metric-card warning">
          <small>对象缺 file</small>
          <strong>{{ data.objectMissingVideoFileCount }}</strong>
        </div>
        <div class="metric-card info">
          <small>trace/file 不匹配</small>
          <strong>{{ data.videoFileMissingTraceCount + data.traceMissingVideoFileCount }}</strong>
        </div>
      </div>
    </div>

    <div v-if="data" class="panel">
      <h3>异常明细</h3>
      <div v-if="!data.items || data.items.length === 0" class="empty">暂无异常</div>

      <div style="overflow-x:auto;">
        <table v-if="data.items && data.items.length > 0">
          <thead>
            <tr>
              <th>类型</th>
              <th>objectKey</th>
              <th>size</th>
              <th>videoFileId</th>
              <th>videoId</th>
              <th>traceId</th>
              <th>recordId</th>
              <th>source</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in data.items" :key="index">
              <td><span :class="issueClass(item.issueType)">{{ item.issueType }}</span></td>
              <td class="key">{{ item.objectKey }}</td>
              <td>{{ item.objectSize || '-' }}</td>
              <td>{{ item.videoFileId || '-' }}</td>
              <td>{{ item.videoId || '-' }}</td>
              <td>{{ item.traceId || '-' }}</td>
              <td>{{ item.recordId || '-' }}</td>
              <td>{{ item.source }}</td>
              <td>{{ item.message }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.message {
  color: #ef4444;
}

.panel {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
}

.metric-card {
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 16px;
  padding: 14px;
}

.metric-card small {
  color: #6b7280;
}

.metric-card strong {
  display: block;
  font-size: 24px;
  margin-top: 8px;
}

.metric-card.danger {
  background: #fef2f2;
  border-color: #fecaca;
}

.metric-card.warning {
  background: #fffbeb;
  border-color: #fde68a;
}

.metric-card.info {
  background: #eff6ff;
  border-color: #bfdbfe;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  border-bottom: 1px solid #e5e7eb;
  padding: 9px;
  text-align: left;
  white-space: nowrap;
  font-size: 13px;
}

.key {
  max-width: 520px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.issue {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #374151;
  font-size: 12px;
}

.issue.danger {
  background: #fee2e2;
  color: #991b1b;
}

.issue.warning {
  background: #fef3c7;
  color: #92400e;
}

.issue.info {
  background: #dbeafe;
  color: #1d4ed8;
}

.empty {
  color: #6b7280;
}
</style>
