<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  checkVideoUploadQuota,
  confirmVideoUploadQuota,
  getVideoUploadQuota,
  listVideoUploadQuotaRecords,
  releaseVideoUploadQuota
} from '../../api/videoQuota'

const quota = ref<any>(null)
const records = ref<any[]>([])
const checkResult = ref<any>(null)
const loading = ref(false)
const message = ref('')

const checkSizeMb = ref(500)

const confirmForm = ref({
  videoId: 1001,
  fileName: 'demo.mp4',
  sizeMb: 100
})

const releaseForm = ref({
  recordId: '',
  videoId: '',
  reason: 'ADMIN_RELEASE'
})

function percent(used: number, limit: number) {
  if (!limit || limit <= 0) return 0
  return Math.min(100, Math.round((Number(used || 0) / Number(limit)) * 100))
}

async function loadAll() {
  loading.value = true
  message.value = ''
  try {
    const [quotaRes, recordsRes]: any[] = await Promise.all([
      getVideoUploadQuota(),
      listVideoUploadQuotaRecords(100)
    ])

    if (quotaRes.code === 0) {
      quota.value = quotaRes.data
    } else {
      message.value = quotaRes.message || '加载配额失败'
    }

    if (recordsRes.code === 0) {
      records.value = recordsRes.data || []
    }
  } finally {
    loading.value = false
  }
}

async function checkUpload() {
  const res: any = await checkVideoUploadQuota(Number(checkSizeMb.value))
  if (res.code === 0) {
    checkResult.value = res.data
    message.value = res.data.allowed ? '检查通过：允许上传' : `检查不通过：${res.data.reason}`
  } else {
    message.value = res.message || '检查失败'
  }
}

async function confirmUpload() {
  const res: any = await confirmVideoUploadQuota({
    videoId: Number(confirmForm.value.videoId),
    fileName: confirmForm.value.fileName,
    sizeMb: Number(confirmForm.value.sizeMb)
  })

  if (res.code === 0) {
    message.value = '已确认上传用量'
    await loadAll()
  } else {
    message.value = res.message || '确认失败'
  }
}

async function releaseByRecord(item: any) {
  if (!confirm(`确认释放 recordId=${item.id} 的 ${item.sizeMb}MB 配额？`)) return

  const res: any = await releaseVideoUploadQuota({
    recordId: Number(item.id),
    reason: 'ADMIN_RELEASE_RECORD'
  })

  if (res.code === 0) {
    message.value = '已释放配额'
    await loadAll()
  } else {
    message.value = res.message || '释放失败'
  }
}

async function releaseManual() {
  const recordId = releaseForm.value.recordId ? Number(releaseForm.value.recordId) : undefined
  const videoId = releaseForm.value.videoId ? Number(releaseForm.value.videoId) : undefined

  if (!recordId && !videoId) {
    message.value = 'recordId 和 videoId 至少填一个'
    return
  }

  const res: any = await releaseVideoUploadQuota({
    recordId,
    videoId,
    reason: releaseForm.value.reason || 'ADMIN_RELEASE'
  })

  if (res.code === 0) {
    message.value = '已释放配额'
    releaseForm.value.recordId = ''
    releaseForm.value.videoId = ''
    await loadAll()
  } else {
    message.value = res.message || '释放失败'
  }
}

function statusClass(status: string) {
  if (status === 'CONFIRMED') return 'status confirmed'
  if (status === 'RELEASED') return 'status released'
  if (status === 'DELETED') return 'status deleted'
  return 'status'
}

onMounted(loadAll)
</script>

<template>
  <section class="card">
    <div class="top">
      <div>
        <h2>上传配额</h2>
        <p>查看用户上传空间、每日/月度用量，并支持模拟确认和释放上传配额。</p>
      </div>
      <button class="button" :disabled="loading" @click="loadAll">
        {{ loading ? '加载中...' : '刷新配额' }}
      </button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div v-if="quota" class="panel">
      <h3>当前配额</h3>
      <div class="quota-grid">
        <div class="quota-card">
          <small>当前等级</small>
          <strong>{{ quota.planCode }}</strong>
          <p>单文件上限：{{ quota.maxFileMb }}MB</p>
        </div>

        <div class="quota-card">
          <small>今日上传</small>
          <strong>{{ quota.dailyUsedMb }} / {{ quota.dailyLimitMb }}MB</strong>
          <div class="bar"><span :style="{ width: percent(quota.dailyUsedMb, quota.dailyLimitMb) + '%' }"></span></div>
          <p>剩余 {{ quota.dailyRemainingMb }}MB</p>
        </div>

        <div class="quota-card">
          <small>本月上传</small>
          <strong>{{ quota.monthlyUsedMb }} / {{ quota.monthlyLimitMb }}MB</strong>
          <div class="bar"><span :style="{ width: percent(quota.monthlyUsedMb, quota.monthlyLimitMb) + '%' }"></span></div>
          <p>剩余 {{ quota.monthlyRemainingMb }}MB</p>
        </div>

        <div class="quota-card">
          <small>总空间</small>
          <strong>{{ quota.totalUsedMb }} / {{ quota.totalLimitMb }}MB</strong>
          <div class="bar"><span :style="{ width: percent(quota.totalUsedMb, quota.totalLimitMb) + '%' }"></span></div>
          <p>剩余 {{ quota.totalRemainingMb }}MB</p>
        </div>
      </div>
    </div>

    <div class="panel">
      <h3>上传前检查</h3>
      <div class="inline-form">
        <input v-model="checkSizeMb" class="input" type="number" placeholder="文件大小 MB" />
        <button class="button" @click="checkUpload">检查上传</button>
      </div>

      <div v-if="checkResult" class="result" :class="{ denied: !checkResult.allowed }">
        <strong>{{ checkResult.allowed ? '允许上传' : '不允许上传' }}</strong>
        <p>{{ checkResult.reason }}</p>
        <p>
          等级：{{ checkResult.planCode }} /
          文件：{{ checkResult.fileSizeMb }}MB /
          单文件上限：{{ checkResult.maxFileMb }}MB
        </p>
      </div>
    </div>

    <div class="panel">
      <h3>模拟确认上传</h3>
      <p>用于测试 Phase31 的 confirm 接口。真实上传接入后，应由上传合并成功逻辑调用。</p>
      <div class="form-grid">
        <input v-model="confirmForm.videoId" class="input" type="number" placeholder="videoId" />
        <input v-model="confirmForm.fileName" class="input" placeholder="fileName" />
        <input v-model="confirmForm.sizeMb" class="input" type="number" placeholder="sizeMb" />
      </div>
      <button class="button" @click="confirmUpload">确认上传用量</button>
    </div>

    <div class="panel">
      <h3>手动释放配额</h3>
      <p>用于测试 Phase32 的 release 接口。可按 recordId 或 videoId 释放。</p>
      <div class="form-grid">
        <input v-model="releaseForm.recordId" class="input" placeholder="recordId，可选" />
        <input v-model="releaseForm.videoId" class="input" placeholder="videoId，可选" />
        <input v-model="releaseForm.reason" class="input" placeholder="reason" />
      </div>
      <button class="button danger" @click="releaseManual">释放配额</button>
    </div>

    <div class="panel">
      <h3>上传记录</h3>
      <div v-if="records.length === 0">暂无上传记录</div>

      <div style="overflow-x: auto;">
        <table v-if="records.length > 0">
          <thead>
            <tr>
              <th>ID</th>
              <th>videoId</th>
              <th>文件名</th>
              <th>大小</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>释放时间</th>
              <th>释放原因</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in records" :key="item.id">
              <td>{{ item.id }}</td>
              <td>{{ item.videoId || '-' }}</td>
              <td>{{ item.fileName || '-' }}</td>
              <td>{{ item.sizeMb }}MB</td>
              <td><span :class="statusClass(item.status)">{{ item.status }}</span></td>
              <td>{{ item.createdAt }}</td>
              <td>{{ item.releasedAt || '-' }}</td>
              <td>{{ item.releaseReason || '-' }}</td>
              <td>
                <button
                  v-if="item.status === 'CONFIRMED'"
                  class="plain danger-text"
                  @click="releaseByRecord(item)"
                >
                  释放
                </button>
                <span v-else>-</span>
              </td>
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

.quota-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
}

.quota-card {
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 16px;
  padding: 14px;
}

.quota-card small {
  color: #6b7280;
}

.quota-card strong {
  display: block;
  font-size: 20px;
  margin-top: 8px;
}

.bar {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
  margin: 10px 0;
}

.bar span {
  display: block;
  height: 100%;
  background: #2563eb;
}

.inline-form {
  display: flex;
  gap: 12px;
  align-items: center;
}

.inline-form .input {
  max-width: 220px;
  margin: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.result {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #166534;
  border-radius: 14px;
  padding: 12px;
  margin-top: 12px;
}

.result.denied {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
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

.status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #374151;
  font-size: 12px;
}

.status.confirmed {
  background: #dbeafe;
  color: #1d4ed8;
}

.status.released {
  background: #dcfce7;
  color: #166534;
}

.status.deleted {
  background: #fee2e2;
  color: #991b1b;
}

.plain {
  border: none;
  background: transparent;
  cursor: pointer;
}

.danger {
  background: #991b1b;
}

.danger-text {
  color: #991b1b;
}
</style>
