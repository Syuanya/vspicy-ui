<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  createDictionaryItem,
  createDictionaryType,
  deleteDictionaryItem,
  deleteDictionaryType,
  disableDictionaryItem,
  disableDictionaryType,
  enableDictionaryItem,
  enableDictionaryType,
  getDictionaryOverview,
  listDictionaryItems,
  listDictionaryTypes,
  updateDictionaryItem,
  updateDictionaryType
} from '../../api/admin'

type DictType = {
  id: number
  typeCode: string
  typeName: string
  description?: string
  status: number
  editable: boolean
  itemCount: number
  createdAt?: string
  updatedAt?: string
}

type DictItem = {
  id: number
  typeCode: string
  itemLabel: string
  itemValue: string
  sortNo: number
  cssClass?: string
  extraJson?: string
  status: number
  editable: boolean
  remark?: string
  createdAt?: string
  updatedAt?: string
}

type DictOverview = {
  typeCount: number
  enabledTypeCount: number
  disabledTypeCount: number
  itemCount: number
  enabledItemCount: number
  disabledItemCount: number
}

const loading = ref(false)
const savingType = ref(false)
const savingItem = ref(false)
const message = ref('')
const error = ref('')
const overview = ref<DictOverview | null>(null)
const types = ref<DictType[]>([])
const items = ref<DictItem[]>([])
const selectedType = ref<DictType | null>(null)

const typeQuery = ref({
  keyword: '',
  status: '',
  limit: 100
})

const itemQuery = ref({
  keyword: '',
  status: '',
  limit: 200
})

const typeForm = ref({
  id: 0,
  typeCode: '',
  typeName: '',
  description: '',
  editable: true,
  status: 1
})

const itemForm = ref({
  id: 0,
  typeCode: '',
  itemLabel: '',
  itemValue: '',
  sortNo: 0,
  cssClass: '',
  extraJson: '',
  editable: true,
  status: 1,
  remark: ''
})

const isTypeEdit = computed(() => typeForm.value.id > 0)
const isItemEdit = computed(() => itemForm.value.id > 0)

function resetMessage() {
  message.value = ''
  error.value = ''
}

function normalizeResponse(res: any) {
  if (res && typeof res === 'object' && 'code' in res) return res
  return { code: 0, data: res }
}

async function loadOverview() {
  const res = normalizeResponse(await getDictionaryOverview())
  if (res.code === 0) {
    overview.value = res.data
  }
}

async function loadTypes() {
  const params: any = { limit: Number(typeQuery.value.limit) || 100 }
  if (typeQuery.value.keyword) params.keyword = typeQuery.value.keyword
  if (typeQuery.value.status !== '') params.status = Number(typeQuery.value.status)
  const res = normalizeResponse(await listDictionaryTypes(params))
  if (res.code === 0) {
    types.value = res.data || []
    if (!selectedType.value && types.value.length > 0) {
      selectType(types.value[0])
    } else if (selectedType.value) {
      const current = types.value.find((item) => item.typeCode === selectedType.value?.typeCode)
      if (current) selectedType.value = current
    }
  } else {
    error.value = res.message || '加载字典类型失败'
  }
}

async function loadItems() {
  const params: any = { limit: Number(itemQuery.value.limit) || 200 }
  if (selectedType.value?.typeCode) params.typeCode = selectedType.value.typeCode
  if (itemQuery.value.keyword) params.keyword = itemQuery.value.keyword
  if (itemQuery.value.status !== '') params.status = Number(itemQuery.value.status)
  const res = normalizeResponse(await listDictionaryItems(params))
  if (res.code === 0) {
    items.value = res.data || []
  } else {
    error.value = res.message || '加载字典项失败'
  }
}

async function load() {
  loading.value = true
  resetMessage()
  try {
    await Promise.all([loadOverview(), loadTypes()])
    await loadItems()
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '加载字典数据失败'
  } finally {
    loading.value = false
  }
}

function selectType(type: DictType) {
  selectedType.value = type
  itemForm.value.typeCode = type.typeCode
  loadItems()
}

function resetTypeFilter() {
  typeQuery.value = { keyword: '', status: '', limit: 100 }
  loadTypes()
}

function resetItemFilter() {
  itemQuery.value = { keyword: '', status: '', limit: 200 }
  loadItems()
}

function resetTypeForm() {
  typeForm.value = {
    id: 0,
    typeCode: '',
    typeName: '',
    description: '',
    editable: true,
    status: 1
  }
}

function resetItemForm() {
  itemForm.value = {
    id: 0,
    typeCode: selectedType.value?.typeCode || '',
    itemLabel: '',
    itemValue: '',
    sortNo: 0,
    cssClass: '',
    extraJson: '',
    editable: true,
    status: 1,
    remark: ''
  }
}

function editType(type: DictType) {
  typeForm.value = {
    id: type.id,
    typeCode: type.typeCode,
    typeName: type.typeName,
    description: type.description || '',
    editable: type.editable !== false,
    status: type.status ?? 1
  }
}

function editItem(item: DictItem) {
  itemForm.value = {
    id: item.id,
    typeCode: item.typeCode,
    itemLabel: item.itemLabel,
    itemValue: item.itemValue,
    sortNo: item.sortNo || 0,
    cssClass: item.cssClass || '',
    extraJson: item.extraJson || '',
    editable: item.editable !== false,
    status: item.status ?? 1,
    remark: item.remark || ''
  }
}

function validateTypeForm() {
  if (!typeForm.value.typeCode.trim()) return '字典类型编码不能为空'
  if (!/^[a-z][a-z0-9_:-]{2,63}$/.test(typeForm.value.typeCode.trim())) {
    return '字典类型编码只能包含小写字母、数字、下划线、冒号和短横线，长度为 3-64'
  }
  if (!typeForm.value.typeName.trim()) return '字典类型名称不能为空'
  return ''
}

function validateItemForm() {
  if (!itemForm.value.typeCode.trim()) return '字典类型编码不能为空'
  if (!itemForm.value.itemLabel.trim()) return '字典项名称不能为空'
  if (!itemForm.value.itemValue.trim()) return '字典项值不能为空'
  if (itemForm.value.extraJson.trim()) {
    try {
      JSON.parse(itemForm.value.extraJson)
    } catch {
      return '扩展 JSON 不是合法 JSON'
    }
  }
  return ''
}

async function saveType() {
  resetMessage()
  const validation = validateTypeForm()
  if (validation) {
    error.value = validation
    return
  }
  savingType.value = true
  try {
    const payload = {
      typeCode: typeForm.value.typeCode.trim(),
      typeName: typeForm.value.typeName.trim(),
      description: typeForm.value.description,
      editable: typeForm.value.editable,
      status: Number(typeForm.value.status) || 0
    }
    const res = normalizeResponse(isTypeEdit.value
      ? await updateDictionaryType(typeForm.value.id, payload)
      : await createDictionaryType(payload))
    if (res.code === 0) {
      message.value = isTypeEdit.value ? '字典类型已更新' : '字典类型已创建'
      resetTypeForm()
      await loadOverview()
      await loadTypes()
    } else {
      error.value = res.message || '保存字典类型失败'
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '保存字典类型失败'
  } finally {
    savingType.value = false
  }
}

async function saveItem() {
  resetMessage()
  const validation = validateItemForm()
  if (validation) {
    error.value = validation
    return
  }
  savingItem.value = true
  try {
    const payload = {
      typeCode: itemForm.value.typeCode.trim(),
      itemLabel: itemForm.value.itemLabel.trim(),
      itemValue: itemForm.value.itemValue.trim(),
      sortNo: Number(itemForm.value.sortNo) || 0,
      cssClass: itemForm.value.cssClass,
      extraJson: itemForm.value.extraJson,
      editable: itemForm.value.editable,
      status: Number(itemForm.value.status) || 0,
      remark: itemForm.value.remark
    }
    const res = normalizeResponse(isItemEdit.value
      ? await updateDictionaryItem(itemForm.value.id, payload)
      : await createDictionaryItem(payload))
    if (res.code === 0) {
      message.value = isItemEdit.value ? '字典项已更新' : '字典项已创建'
      resetItemForm()
      await loadOverview()
      await loadTypes()
      await loadItems()
    } else {
      error.value = res.message || '保存字典项失败'
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '保存字典项失败'
  } finally {
    savingItem.value = false
  }
}

async function switchType(type: DictType) {
  resetMessage()
  try {
    const res = normalizeResponse(type.status === 1 ? await disableDictionaryType(type.id) : await enableDictionaryType(type.id))
    if (res.code === 0) {
      message.value = type.status === 1 ? '字典类型已停用' : '字典类型已启用'
      await loadOverview()
      await loadTypes()
    } else {
      error.value = res.message || '操作失败'
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '操作失败'
  }
}

async function switchItem(item: DictItem) {
  resetMessage()
  try {
    const res = normalizeResponse(item.status === 1 ? await disableDictionaryItem(item.id) : await enableDictionaryItem(item.id))
    if (res.code === 0) {
      message.value = item.status === 1 ? '字典项已停用' : '字典项已启用'
      await loadOverview()
      await loadItems()
    } else {
      error.value = res.message || '操作失败'
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '操作失败'
  }
}

async function removeType(type: DictType) {
  if (!window.confirm(`确认删除字典类型 ${type.typeCode}？字典类型下有字典项时不能删除。`)) return
  resetMessage()
  try {
    const res = normalizeResponse(await deleteDictionaryType(type.id))
    if (res.code === 0) {
      message.value = '字典类型已删除'
      if (selectedType.value?.id === type.id) selectedType.value = null
      resetTypeForm()
      resetItemForm()
      await load()
    } else {
      error.value = res.message || '删除失败'
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '删除失败'
  }
}

async function removeItem(item: DictItem) {
  if (!window.confirm(`确认删除字典项 ${item.itemLabel}？`)) return
  resetMessage()
  try {
    const res = normalizeResponse(await deleteDictionaryItem(item.id))
    if (res.code === 0) {
      message.value = '字典项已删除'
      resetItemForm()
      await loadOverview()
      await loadTypes()
      await loadItems()
    } else {
      error.value = res.message || '删除失败'
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '删除失败'
  }
}

onMounted(load)
</script>

<template>
  <section class="dict-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">System Dictionary</p>
        <h1>系统字典管理</h1>
        <p>统一维护状态、类型、等级和运营枚举，供后台筛选、展示和业务校验使用。</p>
      </div>
      <button :disabled="loading" @click="load">{{ loading ? '刷新中...' : '刷新' }}</button>
    </header>

    <div v-if="message" class="alert success">{{ message }}</div>
    <div v-if="error" class="alert error">{{ error }}</div>

    <div class="metrics" v-if="overview">
      <article>
        <span>字典类型</span>
        <strong>{{ overview.typeCount }}</strong>
        <small>启用 {{ overview.enabledTypeCount }} / 停用 {{ overview.disabledTypeCount }}</small>
      </article>
      <article>
        <span>字典项</span>
        <strong>{{ overview.itemCount }}</strong>
        <small>启用 {{ overview.enabledItemCount }} / 停用 {{ overview.disabledItemCount }}</small>
      </article>
      <article>
        <span>当前类型</span>
        <strong>{{ selectedType?.typeCode || '-' }}</strong>
        <small>{{ selectedType?.typeName || '请选择字典类型' }}</small>
      </article>
    </div>

    <div class="grid two">
      <section class="card">
        <div class="card-title">
          <h2>字典类型</h2>
          <button class="ghost" @click="resetTypeForm">新建类型</button>
        </div>
        <div class="filters">
          <input v-model="typeQuery.keyword" placeholder="类型编码 / 名称" />
          <select v-model="typeQuery.status">
            <option value="">全部状态</option>
            <option value="1">启用</option>
            <option value="0">停用</option>
          </select>
          <button @click="loadTypes">查询</button>
          <button class="ghost" @click="resetTypeFilter">重置</button>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>编码</th>
                <th>名称</th>
                <th>项数</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in types"
                :key="item.id"
                :class="{ active: selectedType?.id === item.id }"
              >
                <td><button class="link" @click="selectType(item)">{{ item.typeCode }}</button></td>
                <td>{{ item.typeName }}</td>
                <td>{{ item.itemCount }}</td>
                <td><span :class="['badge', item.status === 1 ? 'ok' : 'off']">{{ item.status === 1 ? '启用' : '停用' }}</span></td>
                <td class="actions">
                  <button @click="editType(item)">编辑</button>
                  <button @click="switchType(item)">{{ item.status === 1 ? '停用' : '启用' }}</button>
                  <button class="danger" :disabled="!item.editable" @click="removeType(item)">删除</button>
                </td>
              </tr>
              <tr v-if="types.length === 0"><td colspan="5" class="empty">暂无字典类型</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <div class="card-title">
          <h2>{{ isTypeEdit ? '编辑字典类型' : '新建字典类型' }}</h2>
        </div>
        <div class="form-grid">
          <label>类型编码<input v-model="typeForm.typeCode" placeholder="content_status" /></label>
          <label>类型名称<input v-model="typeForm.typeName" placeholder="内容状态" /></label>
          <label>状态
            <select v-model="typeForm.status">
              <option :value="1">启用</option>
              <option :value="0">停用</option>
            </select>
          </label>
          <label>是否可编辑
            <select v-model="typeForm.editable">
              <option :value="true">可编辑</option>
              <option :value="false">系统内置</option>
            </select>
          </label>
          <label class="wide">说明<textarea v-model="typeForm.description" rows="3" /></label>
        </div>
        <div class="form-actions">
          <button :disabled="savingType" @click="saveType">{{ savingType ? '保存中...' : '保存类型' }}</button>
          <button class="ghost" @click="resetTypeForm">清空</button>
        </div>
      </section>
    </div>

    <div class="grid two">
      <section class="card wide-card">
        <div class="card-title">
          <h2>字典项 {{ selectedType ? `- ${selectedType.typeName}` : '' }}</h2>
          <button class="ghost" @click="resetItemForm">新建字典项</button>
        </div>
        <div class="filters">
          <input v-model="itemQuery.keyword" placeholder="项名称 / 值 / 备注" />
          <select v-model="itemQuery.status">
            <option value="">全部状态</option>
            <option value="1">启用</option>
            <option value="0">停用</option>
          </select>
          <button @click="loadItems">查询</button>
          <button class="ghost" @click="resetItemFilter">重置</button>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>排序</th>
                <th>名称</th>
                <th>值</th>
                <th>样式</th>
                <th>状态</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.id">
                <td>{{ item.sortNo }}</td>
                <td>{{ item.itemLabel }}</td>
                <td><code>{{ item.itemValue }}</code></td>
                <td>{{ item.cssClass || '-' }}</td>
                <td><span :class="['badge', item.status === 1 ? 'ok' : 'off']">{{ item.status === 1 ? '启用' : '停用' }}</span></td>
                <td class="muted">{{ item.remark || '-' }}</td>
                <td class="actions">
                  <button @click="editItem(item)">编辑</button>
                  <button @click="switchItem(item)">{{ item.status === 1 ? '停用' : '启用' }}</button>
                  <button class="danger" :disabled="!item.editable" @click="removeItem(item)">删除</button>
                </td>
              </tr>
              <tr v-if="items.length === 0"><td colspan="7" class="empty">暂无字典项</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <div class="card-title">
          <h2>{{ isItemEdit ? '编辑字典项' : '新建字典项' }}</h2>
        </div>
        <div class="form-grid">
          <label>类型编码<input v-model="itemForm.typeCode" placeholder="content_status" /></label>
          <label>项名称<input v-model="itemForm.itemLabel" placeholder="已发布" /></label>
          <label>项值<input v-model="itemForm.itemValue" placeholder="PUBLISHED" /></label>
          <label>排序<input v-model.number="itemForm.sortNo" type="number" /></label>
          <label>样式类<input v-model="itemForm.cssClass" placeholder="success / warning" /></label>
          <label>状态
            <select v-model="itemForm.status">
              <option :value="1">启用</option>
              <option :value="0">停用</option>
            </select>
          </label>
          <label>是否可编辑
            <select v-model="itemForm.editable">
              <option :value="true">可编辑</option>
              <option :value="false">系统内置</option>
            </select>
          </label>
          <label class="wide">扩展 JSON<textarea v-model="itemForm.extraJson" rows="3" placeholder='{"color":"green"}' /></label>
          <label class="wide">备注<textarea v-model="itemForm.remark" rows="3" /></label>
        </div>
        <div class="form-actions">
          <button :disabled="savingItem" @click="saveItem">{{ savingItem ? '保存中...' : '保存字典项' }}</button>
          <button class="ghost" @click="resetItemForm">清空</button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.dict-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.page-header,
.card,
.metrics article {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 18px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
h1,
h2,
p {
  margin: 0;
}
.eyebrow {
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.metrics span,
.metrics small,
.muted {
  color: #64748b;
}
.metrics strong {
  display: block;
  margin: 8px 0;
  font-size: 28px;
}
.grid.two {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(340px, .8fr);
  gap: 18px;
}
.card-title,
.filters,
.form-actions,
.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.card-title {
  justify-content: space-between;
  margin-bottom: 14px;
}
.filters {
  flex-wrap: wrap;
  margin-bottom: 12px;
}
input,
select,
textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 9px 10px;
  font: inherit;
  background: #fff;
}
.filters input {
  max-width: 260px;
}
.filters select {
  max-width: 140px;
}
button {
  border: 0;
  border-radius: 10px;
  padding: 9px 13px;
  background: #2563eb;
  color: white;
  cursor: pointer;
  font-weight: 600;
}
button:disabled {
  opacity: .45;
  cursor: not-allowed;
}
button.ghost {
  color: #334155;
  background: #f1f5f9;
}
button.danger {
  background: #dc2626;
}
button.link {
  padding: 0;
  border-radius: 0;
  color: #2563eb;
  background: transparent;
}
.alert {
  padding: 12px 14px;
  border-radius: 12px;
}
.alert.success {
  color: #166534;
  background: #dcfce7;
}
.alert.error {
  color: #991b1b;
  background: #fee2e2;
}
.table-wrap {
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
th,
td {
  border-bottom: 1px solid #e5e7eb;
  padding: 10px;
  text-align: left;
  white-space: nowrap;
}
tr.active {
  background: #eff6ff;
}
.badge {
  display: inline-flex;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 700;
}
.badge.ok {
  color: #166534;
  background: #dcfce7;
}
.badge.off {
  color: #475569;
  background: #e2e8f0;
}
.empty {
  color: #94a3b8;
  text-align: center;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #334155;
  font-weight: 600;
}
.form-grid .wide {
  grid-column: 1 / -1;
}
.form-actions {
  justify-content: flex-end;
  margin-top: 14px;
}
code {
  color: #0f172a;
  background: #f1f5f9;
  border-radius: 6px;
  padding: 2px 6px;
}
@media (max-width: 1100px) {
  .grid.two,
  .metrics {
    grid-template-columns: 1fr;
  }
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
