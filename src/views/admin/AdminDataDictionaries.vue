<template>
  <div class="dict-page">
    <section class="page-header">
      <div>
        <p class="eyebrow">DATA DICTIONARY</p>
        <h1>系统数据字典中心</h1>
        <p class="subtitle">统一维护状态、分类、风险等级和页面枚举，减少前后端硬编码和重复定义。</p>
      </div>
      <div class="header-actions">
        <button class="secondary" @click="loadAll">刷新</button>
        <button class="primary" @click="openTypeCreate">新增字典类型</button>
        <button class="primary ghost" @click="openItemCreate">新增字典项</button>
      </div>
    </section>

    <section class="metrics" v-if="overview">
      <article class="metric-card"><span>字典类型</span><strong>{{ overview.totalTypes }}</strong></article>
      <article class="metric-card ok"><span>启用类型</span><strong>{{ overview.enabledTypes }}</strong></article>
      <article class="metric-card"><span>字典项</span><strong>{{ overview.totalItems }}</strong></article>
      <article class="metric-card ok"><span>启用字典项</span><strong>{{ overview.enabledItems }}</strong></article>
      <article class="metric-card warn"><span>内置类型</span><strong>{{ overview.builtInTypes }}</strong></article>
      <article class="metric-card warn"><span>内置字典项</span><strong>{{ overview.builtInItems }}</strong></article>
    </section>

    <section class="layout-grid">
      <section class="content-card">
        <div class="card-title">
          <div>
            <h2>字典类型</h2>
            <p>建议按模块命名，例如 video.status、audit.status、risk.level。</p>
          </div>
          <button class="secondary" @click="loadTypes">查询</button>
        </div>
        <div class="filters">
          <input v-model.trim="typeQuery.keyword" placeholder="搜索编码 / 名称 / 描述" @keyup.enter="loadTypes" />
          <select v-model="typeQuery.category" @change="loadTypes">
            <option value="">全部分类</option>
            <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
          </select>
          <select v-model="typeQuery.status" @change="loadTypes">
            <option value="">全部状态</option>
            <option value="ENABLED">启用</option>
            <option value="DISABLED">禁用</option>
          </select>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>类型</th>
                <th>分类</th>
                <th>字典项</th>
                <th>排序</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in dictTypes" :key="item.id" :class="{ active: selectedTypeCode === item.typeCode }" @click="selectType(item.typeCode)">
                <td>
                  <strong>{{ item.typeName }}</strong>
                  <small>{{ item.typeCode }}</small>
                  <small v-if="item.description">{{ item.description }}</small>
                </td>
                <td><span class="pill">{{ item.category }}</span></td>
                <td>{{ item.itemCount }}</td>
                <td>{{ item.sortNo }}</td>
                <td><span :class="['status', item.status === 'ENABLED' ? 'ok' : 'off']">{{ item.status }}</span></td>
                <td class="actions" @click.stop>
                  <button @click="openTypeEdit(item)">编辑</button>
                  <button v-if="item.status === 'ENABLED'" @click="toggleType(item, 'disable')">禁用</button>
                  <button v-else @click="toggleType(item, 'enable')">启用</button>
                  <button class="danger" :disabled="item.builtIn" @click="removeType(item)">删除</button>
                </td>
              </tr>
              <tr v-if="!dictTypes.length && !loadingTypes">
                <td colspan="6" class="empty">暂无字典类型</td>
              </tr>
            </tbody>
          </table>
          <div v-if="loadingTypes" class="loading">加载中...</div>
        </div>
      </section>

      <section class="content-card">
        <div class="card-title">
          <div>
            <h2>字典项</h2>
            <p>当前类型：<code>{{ selectedTypeCode || '未选择' }}</code></p>
          </div>
          <button class="secondary" @click="loadItems">查询</button>
        </div>
        <div class="filters item-filters">
          <input v-model.trim="itemQuery.keyword" placeholder="搜索展示文本 / 存储值 / 描述" @keyup.enter="loadItems" />
          <select v-model="itemQuery.status" @change="loadItems">
            <option value="">全部状态</option>
            <option value="ENABLED">启用</option>
            <option value="DISABLED">禁用</option>
          </select>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>展示文本</th>
                <th>存储值</th>
                <th>颜色</th>
                <th>排序</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in dictItems" :key="item.id">
                <td>
                  <strong>{{ item.itemLabel }}</strong>
                  <small>{{ item.typeCode }}</small>
                  <small v-if="item.description">{{ item.description }}</small>
                </td>
                <td><code>{{ item.itemValue }}</code></td>
                <td><span class="color-tag">{{ item.itemColor || '-' }}</span></td>
                <td>{{ item.sortNo }}</td>
                <td><span :class="['status', item.status === 'ENABLED' ? 'ok' : 'off']">{{ item.status }}</span></td>
                <td class="actions">
                  <button @click="openItemEdit(item)">编辑</button>
                  <button v-if="item.status === 'ENABLED'" @click="toggleItem(item, 'disable')">禁用</button>
                  <button v-else @click="toggleItem(item, 'enable')">启用</button>
                  <button class="danger" :disabled="item.builtIn" @click="removeItem(item)">删除</button>
                </td>
              </tr>
              <tr v-if="!dictItems.length && !loadingItems">
                <td colspan="6" class="empty">暂无字典项</td>
              </tr>
            </tbody>
          </table>
          <div v-if="loadingItems" class="loading">加载中...</div>
        </div>
      </section>
    </section>

    <section class="content-card charts" v-if="overview">
      <div>
        <h2>分类分布</h2>
        <div class="chips">
          <span v-for="item in overview.categoryStats" :key="item.name">{{ item.name }}：{{ item.value }}</span>
        </div>
      </div>
      <div>
        <h2>字典项最多的类型</h2>
        <div class="chips">
          <span v-for="item in overview.hotTypeStats" :key="item.name">{{ item.name }}：{{ item.value }}</span>
        </div>
      </div>
    </section>

    <div v-if="typeDialogVisible" class="dialog-mask">
      <div class="dialog">
        <h3>{{ editingType?.id ? '编辑字典类型' : '新增字典类型' }}</h3>
        <label>类型编码<input v-model.trim="typeForm.typeCode" placeholder="video.status" /></label>
        <label>类型名称<input v-model.trim="typeForm.typeName" placeholder="视频状态" /></label>
        <label>分类
          <select v-model="typeForm.category">
            <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
        <label>状态
          <select v-model="typeForm.status">
            <option value="ENABLED">启用</option>
            <option value="DISABLED">禁用</option>
          </select>
        </label>
        <label>排序<input v-model.number="typeForm.sortNo" type="number" /></label>
        <label>说明<textarea v-model.trim="typeForm.description" rows="3" /></label>
        <label class="check"><input v-model="typeForm.builtIn" type="checkbox" /> 内置类型</label>
        <div class="dialog-actions">
          <button class="secondary" @click="typeDialogVisible = false">取消</button>
          <button class="primary" @click="saveType">保存</button>
        </div>
      </div>
    </div>

    <div v-if="itemDialogVisible" class="dialog-mask">
      <div class="dialog">
        <h3>{{ editingItem?.id ? '编辑字典项' : '新增字典项' }}</h3>
        <label>类型编码
          <select v-model="itemForm.typeCode">
            <option v-for="item in dictTypes" :key="item.typeCode" :value="item.typeCode">{{ item.typeCode }} - {{ item.typeName }}</option>
          </select>
        </label>
        <label>展示文本<input v-model.trim="itemForm.itemLabel" placeholder="已发布" /></label>
        <label>存储值<input v-model.trim="itemForm.itemValue" placeholder="PUBLISHED" /></label>
        <label>展示颜色<input v-model.trim="itemForm.itemColor" placeholder="green / red / blue" /></label>
        <label>图标<input v-model.trim="itemForm.itemIcon" placeholder="可选" /></label>
        <label>状态
          <select v-model="itemForm.status">
            <option value="ENABLED">启用</option>
            <option value="DISABLED">禁用</option>
          </select>
        </label>
        <label>排序<input v-model.number="itemForm.sortNo" type="number" /></label>
        <label>说明<textarea v-model.trim="itemForm.description" rows="3" /></label>
        <label class="check"><input v-model="itemForm.builtIn" type="checkbox" /> 内置字典项</label>
        <div class="dialog-actions">
          <button class="secondary" @click="itemDialogVisible = false">取消</button>
          <button class="primary" @click="saveItem">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  createDictItem,
  createDictType,
  deleteDictItem,
  deleteDictType,
  disableDictItem,
  disableDictType,
  enableDictItem,
  enableDictType,
  getDataDictionaryOverview,
  listDictItems,
  listDictTypes,
  updateDictItem,
  updateDictType
} from '../../api/dataDictionary'

const categories = ['SYSTEM', 'VIDEO', 'CONTENT', 'USER', 'ADMIN', 'OPERATION', 'OTHER']
const overview = ref<any>(null)
const dictTypes = ref<any[]>([])
const dictItems = ref<any[]>([])
const selectedTypeCode = ref('')
const loadingTypes = ref(false)
const loadingItems = ref(false)
const typeDialogVisible = ref(false)
const itemDialogVisible = ref(false)
const editingType = ref<any>(null)
const editingItem = ref<any>(null)

const typeQuery = reactive({ category: '', status: '', keyword: '', limit: 200 })
const itemQuery = reactive({ status: '', keyword: '', limit: 500 })
const typeForm = reactive<any>({ typeCode: '', typeName: '', category: 'SYSTEM', description: '', status: 'ENABLED', builtIn: false, sortNo: 100 })
const itemForm = reactive<any>({ typeCode: '', itemLabel: '', itemValue: '', itemColor: '', itemIcon: '', description: '', status: 'ENABLED', builtIn: false, sortNo: 100 })

async function loadOverview() {
  overview.value = await getDataDictionaryOverview()
}

async function loadTypes() {
  loadingTypes.value = true
  try {
    dictTypes.value = await listDictTypes(typeQuery)
    if (!selectedTypeCode.value && dictTypes.value.length) {
      selectedTypeCode.value = dictTypes.value[0].typeCode
    }
  } finally {
    loadingTypes.value = false
  }
}

async function loadItems() {
  loadingItems.value = true
  try {
    dictItems.value = await listDictItems({ ...itemQuery, typeCode: selectedTypeCode.value || undefined })
  } finally {
    loadingItems.value = false
  }
}

async function loadAll() {
  await Promise.all([loadOverview(), loadTypes()])
  await loadItems()
}

async function selectType(typeCode: string) {
  selectedTypeCode.value = typeCode
  await loadItems()
}

function openTypeCreate() {
  editingType.value = null
  Object.assign(typeForm, { typeCode: '', typeName: '', category: 'SYSTEM', description: '', status: 'ENABLED', builtIn: false, sortNo: 100 })
  typeDialogVisible.value = true
}

function openTypeEdit(item: any) {
  editingType.value = item
  Object.assign(typeForm, item)
  typeDialogVisible.value = true
}

async function saveType() {
  if (editingType.value?.id) {
    await updateDictType(editingType.value.id, typeForm)
  } else {
    await createDictType(typeForm)
  }
  typeDialogVisible.value = false
  await loadAll()
}

async function toggleType(item: any, action: 'enable' | 'disable') {
  if (action === 'enable') await enableDictType(item.id)
  else await disableDictType(item.id)
  await loadAll()
}

async function removeType(item: any) {
  if (!window.confirm(`确定删除字典类型 ${item.typeName}？关联字典项也会逻辑删除。`)) return
  await deleteDictType(item.id)
  if (selectedTypeCode.value === item.typeCode) selectedTypeCode.value = ''
  await loadAll()
}

function openItemCreate() {
  editingItem.value = null
  Object.assign(itemForm, { typeCode: selectedTypeCode.value || '', itemLabel: '', itemValue: '', itemColor: '', itemIcon: '', description: '', status: 'ENABLED', builtIn: false, sortNo: 100 })
  itemDialogVisible.value = true
}

function openItemEdit(item: any) {
  editingItem.value = item
  Object.assign(itemForm, item)
  itemDialogVisible.value = true
}

async function saveItem() {
  if (editingItem.value?.id) {
    await updateDictItem(editingItem.value.id, itemForm)
  } else {
    await createDictItem(itemForm)
  }
  itemDialogVisible.value = false
  selectedTypeCode.value = itemForm.typeCode
  await Promise.all([loadOverview(), loadTypes(), loadItems()])
}

async function toggleItem(item: any, action: 'enable' | 'disable') {
  if (action === 'enable') await enableDictItem(item.id)
  else await disableDictItem(item.id)
  await Promise.all([loadOverview(), loadItems()])
}

async function removeItem(item: any) {
  if (!window.confirm(`确定删除字典项 ${item.itemLabel}？`)) return
  await deleteDictItem(item.id)
  await Promise.all([loadOverview(), loadItems()])
}

onMounted(loadAll)
</script>

<style scoped>
.dict-page { padding: 24px; color: #1f2937; }
.page-header, .card-title { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
.eyebrow { margin: 0 0 6px; color: #64748b; font-size: 12px; letter-spacing: 0.16em; }
h1 { margin: 0; font-size: 28px; }
h2 { margin: 0 0 6px; font-size: 18px; }
.subtitle, .card-title p { margin: 8px 0 0; color: #64748b; }
.header-actions, .actions, .dialog-actions { display: flex; gap: 8px; flex-wrap: wrap; }
button { border: 1px solid #cbd5e1; background: #fff; border-radius: 10px; padding: 7px 10px; cursor: pointer; }
button:disabled { opacity: .45; cursor: not-allowed; }
button.primary { background: #111827; color: #fff; border-color: #111827; }
button.ghost { background: #334155; }
button.secondary { background: #f8fafc; }
button.danger { color: #b91c1c; border-color: #fecaca; }
.metrics { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin: 18px 0; }
.metric-card, .content-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 16px; box-shadow: 0 10px 30px rgba(15,23,42,.05); }
.metric-card span { display: block; color: #64748b; font-size: 13px; }
.metric-card strong { display: block; margin-top: 8px; font-size: 26px; }
.metric-card.ok strong { color: #047857; }
.metric-card.warn strong { color: #b45309; }
.layout-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.filters { display: grid; grid-template-columns: 1fr 140px 120px; gap: 10px; margin: 14px 0; }
.item-filters { grid-template-columns: 1fr 120px; }
input, select, textarea { width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 10px; padding: 8px 10px; font: inherit; }
.table-wrap { overflow: auto; position: relative; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { border-bottom: 1px solid #e2e8f0; text-align: left; padding: 10px; vertical-align: top; }
th { color: #64748b; font-weight: 600; background: #f8fafc; }
tr.active { background: #f0f9ff; }
td strong { display: block; }
td small { display: block; color: #64748b; margin-top: 4px; }
code { background: #f1f5f9; padding: 2px 6px; border-radius: 6px; }
.pill, .status, .color-tag { display: inline-flex; border-radius: 999px; padding: 3px 8px; background: #f1f5f9; font-size: 12px; }
.status.ok { color: #047857; background: #ecfdf5; }
.status.off { color: #64748b; background: #f1f5f9; }
.empty, .loading { text-align: center; color: #94a3b8; padding: 18px; }
.charts { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 16px; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.chips span { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 999px; padding: 6px 10px; }
.dialog-mask { position: fixed; inset: 0; background: rgba(15,23,42,.45); display: flex; align-items: center; justify-content: center; z-index: 50; }
.dialog { width: min(560px, calc(100vw - 48px)); background: #fff; border-radius: 20px; padding: 20px; box-shadow: 0 30px 80px rgba(0,0,0,.25); }
.dialog label { display: block; margin: 10px 0; color: #334155; }
.dialog label.check { display: flex; align-items: center; gap: 8px; }
.dialog label.check input { width: auto; }
.dialog-actions { justify-content: flex-end; margin-top: 14px; }
@media (max-width: 1200px) { .metrics, .layout-grid, .charts { grid-template-columns: 1fr; } }
</style>
