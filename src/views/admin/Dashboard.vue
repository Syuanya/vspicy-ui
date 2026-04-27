<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  getDashboardContentRank,
  getDashboardOverview,
  getDashboardTrends
} from '../../api/dashboard'

const metrics = ref<any[]>([])
const trends = ref<any[]>([])
const rank = ref<any[]>([])
const loading = ref(false)
const message = ref('')

async function load() {
  loading.value = true
  message.value = ''
  try {
    const [overviewRes, trendRes, rankRes]: any[] = await Promise.all([
      getDashboardOverview(),
      getDashboardTrends(7),
      getDashboardContentRank(20)
    ])

    if (overviewRes.code === 0) {
      metrics.value = overviewRes.data.metrics || []
    } else {
      message.value = overviewRes.message || '概览加载失败'
    }

    if (trendRes.code === 0) {
      trends.value = trendRes.data || []
    }

    if (rankRes.code === 0) {
      rank.value = rankRes.data || []
    }
  } finally {
    loading.value = false
  }
}

function maxTrendValue() {
  const values = trends.value.flatMap((x) => [
    x.viewCount,
    x.playCount,
    x.likeCount,
    x.favoriteCount,
    x.commentCount,
    x.exposureCount
  ])
  return Math.max(...values, 1)
}

function barHeight(value: number) {
  return `${Math.max(4, Math.round((value / maxTrendValue()) * 120))}px`
}

function detailUrl(item: any) {
  if (item.targetType === 'VIDEO') return `/video/${item.targetId}`
  if (item.targetType === 'ARTICLE') return `/article/${item.targetId}`
  return '/'
}

onMounted(load)
</script>

<template>
  <section class="card">
    <div class="top">
      <div>
        <h2>数据大屏</h2>
        <p>汇总用户、内容、互动、审核、转码和推荐曝光指标。</p>
      </div>
      <button class="button" :disabled="loading" @click="load">
        {{ loading ? '刷新中...' : '刷新' }}
      </button>
    </div>

    <p v-if="message" style="color: #ef4444;">{{ message }}</p>

    <div class="metric-grid">
      <div v-for="metric in metrics" :key="metric.key" class="metric-card">
        <div class="metric-name">{{ metric.name }}</div>
        <div class="metric-value">{{ metric.value }}<span>{{ metric.unit }}</span></div>
        <div class="metric-desc">{{ metric.description }}</div>
      </div>
    </div>

    <div class="panel">
      <h3>最近 7 天行为趋势</h3>
      <div class="legend">
        <span>浏览</span>
        <span>播放</span>
        <span>点赞</span>
        <span>收藏</span>
        <span>评论</span>
        <span>曝光</span>
      </div>

      <div class="trend">
        <div v-for="item in trends" :key="item.date" class="trend-day">
          <div class="bars">
            <div class="bar" :style="{ height: barHeight(item.viewCount) }" title="浏览"></div>
            <div class="bar" :style="{ height: barHeight(item.playCount) }" title="播放"></div>
            <div class="bar" :style="{ height: barHeight(item.likeCount) }" title="点赞"></div>
            <div class="bar" :style="{ height: barHeight(item.favoriteCount) }" title="收藏"></div>
            <div class="bar" :style="{ height: barHeight(item.commentCount) }" title="评论"></div>
            <div class="bar" :style="{ height: barHeight(item.exposureCount) }" title="曝光"></div>
          </div>
          <div class="date">{{ item.date.slice(5) }}</div>
        </div>
      </div>
    </div>

    <div class="panel">
      <h3>内容热度排行</h3>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th>排名</th>
              <th>内容</th>
              <th>状态</th>
              <th>浏览</th>
              <th>播放</th>
              <th>点赞</th>
              <th>收藏</th>
              <th>评论</th>
              <th>热度</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in rank" :key="`${item.targetType}-${item.targetId}`">
              <td>{{ index + 1 }}</td>
              <td>
                <RouterLink :to="detailUrl(item)">
                  {{ item.targetType }}#{{ item.targetId }} {{ item.title }}
                </RouterLink>
              </td>
              <td>{{ item.status }}</td>
              <td>{{ item.viewCount }}</td>
              <td>{{ item.playCount }}</td>
              <td>{{ item.likeCount }}</td>
              <td>{{ item.favoriteCount }}</td>
              <td>{{ item.commentCount }}</td>
              <td><strong>{{ item.hotScore }}</strong></td>
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

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.metric-card {
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  background: linear-gradient(180deg, #ffffff, #f9fafb);
}

.metric-name {
  color: #6b7280;
  font-size: 14px;
}

.metric-value {
  font-size: 30px;
  font-weight: 800;
  margin-top: 8px;
}

.metric-value span {
  font-size: 14px;
  margin-left: 4px;
  color: #6b7280;
}

.metric-desc {
  color: #6b7280;
  font-size: 13px;
  margin-top: 8px;
}

.panel {
  margin-top: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  background: #fff;
}

.legend {
  display: flex;
  gap: 16px;
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.trend {
  display: flex;
  gap: 18px;
  align-items: flex-end;
  min-height: 170px;
  overflow-x: auto;
}

.trend-day {
  min-width: 82px;
  text-align: center;
}

.bars {
  height: 130px;
  display: flex;
  gap: 4px;
  align-items: flex-end;
  justify-content: center;
  border-bottom: 1px solid #e5e7eb;
}

.bar {
  width: 8px;
  border-radius: 8px 8px 0 0;
  background: #111827;
}

.date {
  color: #6b7280;
  font-size: 12px;
  margin-top: 8px;
}

th, td {
  border-bottom: 1px solid #e5e7eb;
  padding: 10px;
  text-align: left;
  font-size: 14px;
}
</style>
