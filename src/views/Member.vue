<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  cancelMembership,
  checkHdPlay,
  checkUpload,
  evictMemberCache,
  getMyMembership,
  listMemberPlans,
  refreshMemberCache,
  subscribeMember
} from '../api/member'
import { checkVideoUpload } from '../api/videoUploadCheck'

const plans = ref<any[]>([])
const membership = ref<any>(null)
const message = ref('')
const loading = ref(false)
const operating = ref('')
const uploadSizeMb = ref(500)
const hdCheck = ref<any>(null)
const uploadCheck = ref<any>(null)
const videoUploadCheck = ref<any>(null)

function priceText(priceCent: number) {
  if (!priceCent) return '免费'
  return `¥${(priceCent / 100).toFixed(2)} / 月`
}

async function load() {
  loading.value = true
  message.value = ''
  try {
    const [plansRes, membershipRes]: any[] = await Promise.all([
      listMemberPlans(),
      getMyMembership()
    ])

    if (plansRes.code === 0) plans.value = plansRes.data || []
    if (membershipRes.code === 0) membership.value = membershipRes.data
  } catch (error: any) {
    message.value = error?.response?.data?.message || error?.message || '会员数据加载失败'
  } finally {
    loading.value = false
  }
}

async function subscribe(planCode: string) {
  operating.value = planCode
  message.value = ''
  try {
    const res: any = await subscribeMember({ planCode, months: 1 })
    message.value = res.code === 0 ? `已开通 ${planCode}，会员缓存已自动失效` : (res.message || '开通失败')
    await load()
  } finally {
    operating.value = ''
  }
}

async function cancel() {
  if (!confirm('确认取消会员？')) return
  operating.value = 'cancel'
  try {
    const res: any = await cancelMembership()
    message.value = res.code === 0 ? '会员已取消，会员缓存已自动失效' : (res.message || '取消失败')
    await load()
  } finally {
    operating.value = ''
  }
}

async function refreshCache() {
  const res: any = await refreshMemberCache()
  message.value = res.code === 0 ? '会员缓存已刷新' : (res.message || '刷新失败')
  await load()
}

async function evictCache() {
  const res: any = await evictMemberCache()
  message.value = res.code === 0 ? '会员缓存已删除，下次查询会重新生成' : (res.message || '删除失败')
}

async function checkHd() {
  const res: any = await checkHdPlay()
  if (res.code === 0) hdCheck.value = res.data
}

async function checkUploadSize() {
  const res: any = await checkUpload(Number(uploadSizeMb.value))
  if (res.code === 0) uploadCheck.value = res.data
}

async function checkVideoUploadSize() {
  const res: any = await checkVideoUpload(Number(uploadSizeMb.value))
  if (res.code === 0) videoUploadCheck.value = res.data
}
</script>

<template>
  <section class="card">
    <div class="top">
      <div>
        <h2>会员中心</h2>
        <p>管理会员等级、权益、上传容量、高清播放权限和会员缓存。</p>
      </div>
      <button class="button" :disabled="loading" @click="load">{{ loading ? '加载中...' : '刷新' }}</button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>

    <div v-if="membership" class="panel current">
      <h3>当前会员</h3>
      <div class="current-grid">
        <div>
          <span>套餐</span>
          <strong>{{ membership.planName || '-' }}</strong>
          <p>{{ membership.planCode || '-' }} / {{ membership.status || '-' }}</p>
        </div>
        <div>
          <span>上传上限</span>
          <strong>{{ membership.maxUploadMb || 0 }}MB</strong>
          <p>单文件上传容量</p>
        </div>
        <div>
          <span>有效期</span>
          <strong>{{ membership.active ? '有效' : '无效' }}</strong>
          <p>{{ membership.startAt || '-' }} ~ {{ membership.endAt || '-' }}</p>
        </div>
      </div>

      <div class="benefits">
        <span v-for="item in membership.benefits || []" :key="item.benefitCode">
          {{ item.benefitName }}
        </span>
      </div>

      <div class="actions">
        <button v-if="membership.planCode !== 'FREE'" class="button danger" :disabled="operating === 'cancel'" @click="cancel">
          取消会员
        </button>
        <button class="button secondary" @click="refreshCache">刷新会员缓存</button>
        <button class="button muted" @click="evictCache">删除会员缓存</button>
      </div>
    </div>

    <div class="panel">
      <h3>会员套餐</h3>
      <div class="plan-grid">
        <div v-for="plan in plans" :key="plan.planCode" class="plan-card">
          <h4>{{ plan.planName }}</h4>
          <strong>{{ priceText(plan.priceCent) }}</strong>
          <p>{{ plan.description || '暂无描述' }}</p>
          <p>上传上限：{{ plan.maxUploadMb }}MB</p>
          <p>等级：{{ plan.levelNo }}</p>
          <button
            class="button"
            :disabled="plan.planCode === 'FREE' || operating === plan.planCode"
            @click="subscribe(plan.planCode)"
          >
            {{ plan.planCode === 'FREE' ? '默认套餐' : '开通 1 个月' }}
          </button>
        </div>
      </div>
    </div>

    <div class="panel">
      <h3>权益校验</h3>
      <div class="check-grid">
        <div class="check-card">
          <h4>高清播放权限</h4>
          <button class="button" @click="checkHd">检查高清播放</button>
          <p v-if="hdCheck">
            {{ hdCheck.allowed ? '允许' : '不允许' }}：{{ hdCheck.reason }}
          </p>
        </div>

        <div class="check-card">
          <h4>会员服务上传校验</h4>
          <input v-model="uploadSizeMb" class="input" type="number" placeholder="上传文件大小 MB" />
          <button class="button" @click="checkUploadSize">检查会员上传权限</button>
          <p v-if="uploadCheck">
            {{ uploadCheck.allowed ? '允许' : '不允许' }}：{{ uploadCheck.reason }}
          </p>
        </div>

        <div class="check-card">
          <h4>视频服务上传前校验</h4>
          <input v-model="uploadSizeMb" class="input" type="number" placeholder="上传文件大小 MB" />
          <button class="button" @click="checkVideoUploadSize">通过视频服务校验</button>
          <p v-if="videoUploadCheck">
            {{ videoUploadCheck.allowed ? '允许' : '不允许' }}：{{ videoUploadCheck.reason }}
          </p>
        </div>
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
  flex-wrap: wrap;
}

.panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 18px;
  background: #fff;
  margin-top: 18px;
}

.current {
  background: #f8fafc;
}

.current-grid,
.check-grid,
.plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.current-grid span {
  color: #6b7280;
}

.current-grid strong {
  display: block;
  margin-top: 6px;
  font-size: 24px;
}

.plan-card,
.check-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f9fafb;
}

.plan-card h4,
.check-card h4 {
  margin-top: 0;
}

.benefits {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0;
}

.benefits span {
  background: #eef2ff;
  color: #3730a3;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 13px;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.danger {
  background: #991b1b;
}

.secondary {
  background: #2563eb;
}

.muted {
  background: #6b7280;
}

.message {
  color: #ef4444;
}
</style>
