<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { checkHlsObject, scanHlsIntegrity } from '../../api/hlsIntegrity'

const loading = ref(false)
const message = ref('')
const data = ref<any>(null)

const form = ref({
  prefix: 'videos/',
  limit: 200,
  objectKey: ''
})

async function load() {
  loading.value = true
  message.value = ''
  try {
    const res: any = await scanHlsIntegrity({
      prefix: form.value.prefix,
      limit: Number(form.value.limit)
    })

    if (res.code === 0) {
      data.value = res.data
    } else {
      message.value = res.message || 'HLS 完整性扫描失败'
    }
  } finally {
    loading.value = false
  }
}

async function checkOne() {
  if (!form.value.objectKey) {
    message.value = '请填写 objectKey'
    return
  }

  loading.value = true
  message.value = ''
  try {
    const res: any = await checkHlsObject(form.value.objectKey)
    if (res.code === 0) {
      data.value = res.data
    } else {
      message.value = res.message || 'HLS 单对象检查失败'
    }
  } finally {
    loading.value = false
  }
}

function statusClass(status: string) {
  if (status === 'HLS_OK') return 'status ok'
  if (status === 'HLS_SEGMENT_MISSING') return 'status danger'
  if (status === 'HLS_MANIFEST_MISSING') return 'status danger'
  if (status === 'HLS_MANIFEST_EMPTY') return 'status warning'
  if (status === 'HLS_MANIFEST_READ_FAILED') return 'status warning'
  return 'status'
}

onMounted(load)
</script>

<template>
  <section class="card">
    <div class="top">
      <div>
        <h2>HLS完整性</h2>
        <p>检查 index.m3u8 是否存在，以及 m3u8 引用的 ts/m4s/mp4 分片是否完整。</p>
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
      <button class="button" @click="load">扫描 prefix</button>
    </div>

    <div class="panel">
      <h3>单个 m3u8 检查</h3>
      <div class="form-grid">
        <input v-model="form.objectKey" class="input" placeholder="videos/2/hls/index.m3u8" />
      </div>
      <button class="button" @click="checkOne">检查 objectKey</button>
    </div>

    <div v-if="data" class="panel">
      <h3>总览</h3>
      <div class="metric-grid">
        <div class="metric-card">
          <small>Bucket</small>
          <strong>{{ data.bucket }}</strong>
          <p>{{ data.prefix }}</p>
        </div>
        <div class="metric-card">
          <small>Manifest 数</small>
          <strong>{{ data.manifestCount }}</strong>
          <p>limit: {{ data.limit }}</p>
        </div>
        <div class="metric-card ok">
          <small>完整</small>
          <strong>{{ data.okCount }}</strong>
        </div>
        <div class="metric-card danger">
          <small>m3u8 缺失</small>
          <strong>{{ data.manifestMissingCount }}</strong>
        </div>
        <div class="metric-card warning">
          <small>m3u8 为空/读取失败</small>
          <strong>{{ data.manifestEmptyCount + data.manifestReadFailedCount }}</strong>
        </div>
        <div class="metric-card danger">
          <small>分片缺失</small>
          <strong>{{ data.segmentMissingCount }}</strong>
        </div>
      </div>
    </div>

    <div v-if="data" class="panel">
      <h3>明细</h3>
      <div v-if="!data.items || data.items.length === 0" class="empty">暂无 HLS manifest</div>

      <div style="overflow-x:auto;">
        <table v-if="data.items && data.items.length > 0">
          <thead>
            <tr>
              <th>状态</th>
              <th>manifest</th>
              <th>videoId</th>
              <th>recordId</th>
              <th>traceId</th>
              <th>segments</th>
              <th>missing</th>
              <th>source</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in data.items" :key="index">
              <td><span :class="statusClass(item.status)">{{ item.status }}</span></td>
              <td class="key">{{ item.manifestObjectKey }}</td>
              <td>{{ item.videoId || '-' }}</td>
              <td>{{ item.recordId || '-' }}</td>
              <td>{{ item.traceId || '-' }}</td>
              <td>{{ item.segmentCount }}</td>
              <td>
                <details v-if="item.missingSegmentCount > 0">
                  <summary>{{ item.missingSegmentCount }}</summary>
                  <div class="missing-list">
                    <div v-for="seg in item.missingSegments" :key="seg">{{ seg }}</div>
                  </div>
                </details>
                <span v-else>0</span>
              </td>
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
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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

.metric-card.ok {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.metric-card.danger {
  background: #fef2f2;
  border-color: #fecaca;
}

.metric-card.warning {
  background: #fffbeb;
  border-color: #fde68a;
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

.status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #374151;
  font-size: 12px;
}

.status.ok {
  background: #dcfce7;
  color: #166534;
}

.status.warning {
  background: #fef3c7;
  color: #92400e;
}

.status.danger {
  background: #fee2e2;
  color: #991b1b;
}

.missing-list {
  max-width: 520px;
  white-space: normal;
  color: #991b1b;
}

.empty {
  color: #6b7280;
}
</style>
