<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  scanPlaybackReadinessBatch,
  syncPlaybackReadinessBatch
} from '../../api/playbackReadinessBatch'
import DangerActionConfirmModal from '../../components/common/DangerActionConfirmModal.vue'
import { useDangerActionConfirm } from '../../composables/useDangerActionConfirm'

const loading = ref(false)
const operating = ref(false)
const message = ref('')
const result = ref<any>(null)
const dangerConfirm = useDangerActionConfirm()

const form = ref({
  limit: 100,
  onlyProblem: true,
  reason: 'batch playback readiness sync'
})

async function scan() {
  loading.value = true
  message.value = ''

  try {
    const res: any = await scanPlaybackReadinessBatch({
      limit: Number(form.value.limit),
      onlyProblem: form.value.onlyProblem
    })

    if (res.code === 0) {
      result.value = res.data
      message.value = `扫描完成：scanned=${res.data.scannedCount}, problem=${res.data.problemCount}`
    } else {
      message.value = res.message || '扫描失败'
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '扫描失败'
  } finally {
    loading.value = false
  }
}

async function dryRun() {
  await doSync(true, form.value.reason)
}

async function syncNow() {
  const payload = await dangerConfirm.open({
    title: '确认正式批量同步播放就绪状态',
    message: '该操作会批量更新 video 表已有状态和播放地址字段。',
    targetName: `最近 ${form.value.limit} 个视频，onlyProblem=${form.value.onlyProblem}`,
    actionLabel: '正式同步',
    level: 'danger',
    confirmText: 'SYNC',
    defaultReason: form.value.reason || 'batch sync playback readiness',
    impacts: [
      '会修改 video.status',
      '会写入 video 表已有 HLS 播放地址字段',
      '会影响播放页可播放判断',
      '建议先 dryRun 预览'
    ]
  })

  if (!payload) return
  form.value.reason = payload.reason
  await doSync(false, payload.reason)
}

async function doSync(dryRunValue: boolean, reasonText: string) {
  operating.value = true
  message.value = ''

  try {
    const res: any = await syncPlaybackReadinessBatch({
      dryRun: dryRunValue,
      limit: Number(form.value.limit),
      onlyProblem: form.value.onlyProblem,
      reason: reasonText
    })

    if (res.code === 0) {
      result.value = res.data
      message.value = dryRunValue
        ? `dryRun 完成：success=${res.data.successCount}, failed=${res.data.failedCount}`
        : `同步完成：success=${res.data.successCount}, failed=${res.data.failedCount}`
    } else {
      message.value = res.message || '操作失败'
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '操作失败'
  } finally {
    operating.value = false
  }
}

function statusClass(item: any) {
  if (item.playable) return 'status success'
  if (item.hlsReady && !item.playable) return 'status warning'
  return 'status failed'
}

onMounted(scan)
</script>

<template>
  <section class="card">
    <div class="top">
      <div>
        <h2>播放就绪批量自愈</h2>
        <p>批量扫描有 HLS 但 video 状态/播放地址未同步的视频，并支持 dryRun 与正式同步。</p>
      </div>
      <button class="button" :disabled="loading" @click="scan">
        {{ loading ? '扫描中...' : '扫描' }}
      </button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="panel">
      <h3>参数</h3>
      <div class="form-grid">
        <label>
          <span>扫描数量</span>
          <input v-model="form.limit" class="input" type="number" min="1" max="500" />
        </label>
        <label>
          <span>只处理问题视频</span>
          <select v-model="form.onlyProblem" class="input">
            <option :value="true">是</option>
            <option :value="false">否</option>
          </select>
        </label>
        <label>
          <span>操作原因</span>
          <input v-model="form.reason" class="input" />
        </label>
      </div>

      <div class="actions">
        <button class="button secondary" :disabled="operating" @click="dryRun">dryRun 批量预览</button>
        <button class="button danger" :disabled="operating" @click="syncNow">正式批量同步</button>
      </div>
    </div>

    <div v-if="result" class="stats">
      <div>
        <small>scanned</small>
        <strong>{{ result.scannedCount }}</strong>
      </div>
      <div>
        <small>problem</small>
        <strong>{{ result.problemCount }}</strong>
      </div>
      <div>
        <small>success</small>
        <strong>{{ result.successCount }}</strong>
      </div>
      <div>
        <small>failed</small>
        <strong>{{ result.failedCount }}</strong>
      </div>
      <div>
        <small>dryRun</small>
        <strong>{{ result.dryRun ? 'YES' : 'NO' }}</strong>
      </div>
    </div>

    <div v-if="result?.readinessList?.length" class="panel">
      <h3>问题 / 扫描列表</h3>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>videoId</th>
              <th>状态</th>
              <th>videoStatus</th>
              <th>HLS</th>
              <th>playable</th>
              <th>playbackUrl</th>
              <th>建议</th>
              <th>manifest</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in result.readinessList" :key="item.videoId">
              <td>{{ item.videoId }}</td>
              <td><span :class="statusClass(item)">{{ item.playable ? 'READY' : 'PROBLEM' }}</span></td>
              <td>{{ item.videoStatus || '-' }}</td>
              <td>{{ item.hlsReady ? 'READY' : 'NO' }}</td>
              <td>{{ item.playable ? 'YES' : 'NO' }}</td>
              <td class="path">{{ item.playbackUrl || '-' }}</td>
              <td>{{ item.suggestedAction }}</td>
              <td class="path">{{ item.hlsManifestKey || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="result?.syncResults?.length" class="panel">
      <h3>同步结果</h3>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>videoId</th>
              <th>success</th>
              <th>dryRun</th>
              <th>before</th>
              <th>after</th>
              <th>columnsToUpdate</th>
              <th>columnsUpdated</th>
              <th>message</th>
              <th>error</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in result.syncResults" :key="item.videoId">
              <td>{{ item.videoId }}</td>
              <td>{{ item.success ? 'YES' : 'NO' }}</td>
              <td>{{ item.dryRun ? 'YES' : 'NO' }}</td>
              <td>{{ item.videoStatusBefore || '-' }}</td>
              <td>{{ item.videoStatusAfter || '-' }}</td>
              <td class="path">{{ item.columnsToUpdate?.join(', ') || '-' }}</td>
              <td class="path">{{ item.columnsUpdated?.join(', ') || '-' }}</td>
              <td>{{ item.message }}</td>
              <td class="error">{{ item.errorMessage || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <DangerActionConfirmModal
      v-bind="dangerConfirm.modalProps.value"
      @cancel="dangerConfirm.cancel"
      @confirm="dangerConfirm.confirm"
    />
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
  color: #374151;
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
  grid-template-columns: 160px 180px minmax(220px, 1fr);
  gap: 12px;
}

label span {
  display: block;
  margin-bottom: 6px;
  color: #6b7280;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.secondary {
  background: #374151;
}

.danger {
  background: #dc2626;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.stats > div {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 14px;
  background: #fff;
}

.stats small {
  display: block;
  color: #6b7280;
}

.stats strong {
  display: block;
  font-size: 26px;
  margin-top: 6px;
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

.path {
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.error {
  color: #991b1b;
}

.status {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 12px;
}

.status.success {
  background: #dcfce7;
  color: #166534;
}

.status.warning {
  background: #fef3c7;
  color: #92400e;
}

.status.failed {
  background: #fee2e2;
  color: #991b1b;
}

@media (max-width: 760px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
