<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { checkHdPlay, checkUpload, getMyMembership, listMemberPlans, refreshMemberCache } from '../../api/member'

const plans = ref<any[]>([])
const userId = ref(1)
const sizeMb = ref(500)
const membership = ref<any>(null)
const hdCheck = ref<any>(null)
const uploadCheck = ref<any>(null)
const message = ref('')

async function loadPlans() {
  const res: any = await listMemberPlans()
  if (res.code === 0) plans.value = res.data || []
}

async function inspectUser() {
  message.value = ''
  const [memberRes, hdRes, uploadRes]: any[] = await Promise.all([
    getMyMembership(Number(userId.value)),
    checkHdPlay(Number(userId.value)),
    checkUpload(Number(sizeMb.value), Number(userId.value))
  ])
  if (memberRes.code === 0) membership.value = memberRes.data
  if (hdRes.code === 0) hdCheck.value = hdRes.data
  if (uploadRes.code === 0) uploadCheck.value = uploadRes.data
}

async function refreshCache() {
  const res: any = await refreshMemberCache(Number(userId.value))
  message.value = res.code === 0 ? '会员缓存已刷新' : (res.message || '刷新失败')
  await inspectUser()
}

onMounted(async () => {
  await loadPlans()
  await inspectUser()
})
</script>

<template>
  <section class="card">
    <div class="page-head">
      <div>
        <h2>会员管理</h2>
        <p>查看会员套餐、用户权益和上传/高清播放校验结果。</p>
      </div>
      <button class="button" @click="loadPlans">刷新套餐</button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div class="panel">
      <h3>用户权益检查</h3>
      <div class="filters">
        <input v-model="userId" class="input" type="number" placeholder="用户ID" />
        <input v-model="sizeMb" class="input" type="number" placeholder="上传大小 MB" />
        <button class="button" @click="inspectUser">检查</button>
        <button class="button muted" @click="refreshCache">刷新缓存</button>
      </div>
      <div class="summary-grid">
        <div class="summary-card">
          <span>套餐</span>
          <strong>{{ membership?.planName || '-' }}</strong>
          <small>{{ membership?.status || '-' }}</small>
        </div>
        <div class="summary-card">
          <span>高清播放</span>
          <strong>{{ hdCheck?.allowed ? '允许' : '不允许' }}</strong>
          <small>{{ hdCheck?.reason || '-' }}</small>
        </div>
        <div class="summary-card">
          <span>上传校验</span>
          <strong>{{ uploadCheck?.allowed ? '允许' : '不允许' }}</strong>
          <small>{{ uploadCheck?.reason || '-' }}</small>
        </div>
      </div>
    </div>

    <div class="plan-grid">
      <div v-for="plan in plans" :key="plan.planCode" class="plan-card">
        <h3>{{ plan.planName }}</h3>
        <p>{{ plan.description }}</p>
        <strong>{{ plan.priceCent ? `¥${(plan.priceCent / 100).toFixed(2)}` : '免费' }}</strong>
        <small>{{ plan.planCode }} / 上传 {{ plan.maxUploadMb }}MB</small>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page-head,
.filters {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.page-head {
  justify-content: space-between;
}

.filters .input {
  max-width: 180px;
}

.muted {
  background: #6b7280;
}

.panel,
.plan-card,
.summary-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px;
  background: #fff;
}

.panel {
  margin-top: 16px;
}

.plan-grid,
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.summary-card span,
.summary-card small,
.plan-card small {
  color: #6b7280;
}

.summary-card strong,
.plan-card strong {
  display: block;
  margin: 8px 0;
  font-size: 22px;
}

.message {
  color: #dc2626;
}
</style>
