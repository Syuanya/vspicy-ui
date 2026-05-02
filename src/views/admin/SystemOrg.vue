<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  assignUserOrg,
  createDepartment,
  createPost,
  deleteDepartment,
  deletePost,
  disableDepartment,
  disablePost,
  enableDepartment,
  enablePost,
  getOrgOverview,
  getUserOrg,
  listDepartments,
  listPosts,
  updateDepartment,
  updatePost,
  type DeptCommand,
  type PostCommand
} from '../../api/adminOrg'

type DeptItem = {
  id: number
  parentId: number
  deptCode: string
  deptName: string
  leaderName?: string
  leaderPhone?: string
  sortNo?: number
  status: number
  editable: boolean
  remark?: string
  children?: DeptItem[]
}

type PostItem = {
  id: number
  postCode: string
  postName: string
  sortNo?: number
  status: number
  editable: boolean
  remark?: string
}

type Overview = {
  deptCount: number
  enabledDeptCount: number
  disabledDeptCount: number
  postCount: number
  enabledPostCount: number
  disabledPostCount: number
  userDeptRelationCount: number
  userPostRelationCount: number
}

const loading = ref(false)
const saving = ref(false)
const message = ref('')
const error = ref('')
const activeTab = ref<'dept' | 'post' | 'user'>('dept')
const departments = ref<DeptItem[]>([])
const posts = ref<PostItem[]>([])
const overview = ref<Overview>({
  deptCount: 0,
  enabledDeptCount: 0,
  disabledDeptCount: 0,
  postCount: 0,
  enabledPostCount: 0,
  disabledPostCount: 0,
  userDeptRelationCount: 0,
  userPostRelationCount: 0
})

const query = ref({ keyword: '', status: '' })
const postQuery = ref({ keyword: '', status: '' })
const deptForm = ref<DeptCommand & { id: number }>({
  id: 0,
  parentId: 0,
  deptCode: '',
  deptName: '',
  leaderName: '',
  leaderPhone: '',
  sortNo: 0,
  status: 1,
  editable: true,
  remark: ''
})
const postForm = ref<PostCommand & { id: number }>({
  id: 0,
  postCode: '',
  postName: '',
  sortNo: 0,
  status: 1,
  editable: true,
  remark: ''
})

const userId = ref<number | ''>('')
const userOrg = ref<any>(null)
const selectedDeptIds = ref<number[]>([])
const primaryDeptId = ref<number | ''>('')
const selectedPostIds = ref<number[]>([])

const flatDepartments = computed(() => {
  const rows: Array<DeptItem & { level: number; label: string }> = []
  const walk = (items: DeptItem[], level: number) => {
    items.forEach((item) => {
      rows.push({ ...item, level, label: `${'　'.repeat(level)}${level > 0 ? '└ ' : ''}${item.deptName}` })
      if (item.children?.length) walk(item.children, level + 1)
    })
  }
  walk(departments.value, 0)
  return rows
})

const parentOptions = computed(() => flatDepartments.value.filter((item) => item.id !== deptForm.value.id))
const enabledDepartments = computed(() => flatDepartments.value.filter((item) => item.status !== 0))
const enabledPosts = computed(() => posts.value.filter((item) => item.status !== 0))

function normalizeResponse(res: any) {
  if (res?.code === 0) return res.data
  throw new Error(res?.message || '接口返回异常')
}

function resetMessage() {
  message.value = ''
  error.value = ''
}

async function load() {
  loading.value = true
  resetMessage()
  try {
    const deptParams: any = {}
    if (query.value.keyword) deptParams.keyword = query.value.keyword
    if (query.value.status !== '') deptParams.status = Number(query.value.status)
    const postParams: any = {}
    if (postQuery.value.keyword) postParams.keyword = postQuery.value.keyword
    if (postQuery.value.status !== '') postParams.status = Number(postQuery.value.status)
    const [overviewRes, deptRes, postRes]: any[] = await Promise.all([
      getOrgOverview(),
      listDepartments(deptParams),
      listPosts(postParams)
    ])
    overview.value = normalizeResponse(overviewRes) || overview.value
    departments.value = normalizeResponse(deptRes) || []
    posts.value = normalizeResponse(postRes) || []
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '加载组织架构失败'
  } finally {
    loading.value = false
  }
}

function resetDeptForm() {
  deptForm.value = {
    id: 0,
    parentId: 0,
    deptCode: '',
    deptName: '',
    leaderName: '',
    leaderPhone: '',
    sortNo: 0,
    status: 1,
    editable: true,
    remark: ''
  }
}

function editDept(item: DeptItem) {
  activeTab.value = 'dept'
  deptForm.value = {
    id: item.id,
    parentId: item.parentId || 0,
    deptCode: item.deptCode,
    deptName: item.deptName,
    leaderName: item.leaderName || '',
    leaderPhone: item.leaderPhone || '',
    sortNo: item.sortNo || 0,
    status: item.status,
    editable: item.editable,
    remark: item.remark || ''
  }
}

async function saveDept() {
  saving.value = true
  resetMessage()
  try {
    const payload: DeptCommand = { ...deptForm.value }
    if (deptForm.value.id) await updateDepartment(deptForm.value.id, payload)
    else await createDepartment(payload)
    message.value = deptForm.value.id ? '部门已更新' : '部门已创建'
    resetDeptForm()
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '保存部门失败'
  } finally {
    saving.value = false
  }
}

async function toggleDept(item: DeptItem) {
  if (!item.editable && item.status !== 0) {
    error.value = '系统内置部门不能停用'
    return
  }
  try {
    if (item.status === 0) await enableDepartment(item.id)
    else await disableDepartment(item.id)
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '切换部门状态失败'
  }
}

async function removeDept(item: DeptItem) {
  if (!window.confirm(`确认删除部门「${item.deptName}」？`)) return
  try {
    await deleteDepartment(item.id)
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '删除部门失败'
  }
}

function resetPostForm() {
  postForm.value = { id: 0, postCode: '', postName: '', sortNo: 0, status: 1, editable: true, remark: '' }
}

function editPost(item: PostItem) {
  activeTab.value = 'post'
  postForm.value = { ...item, remark: item.remark || '' }
}

async function savePost() {
  saving.value = true
  resetMessage()
  try {
    const payload: PostCommand = { ...postForm.value }
    if (postForm.value.id) await updatePost(postForm.value.id, payload)
    else await createPost(payload)
    message.value = postForm.value.id ? '岗位已更新' : '岗位已创建'
    resetPostForm()
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '保存岗位失败'
  } finally {
    saving.value = false
  }
}

async function togglePost(item: PostItem) {
  if (!item.editable && item.status !== 0) {
    error.value = '系统内置岗位不能停用'
    return
  }
  try {
    if (item.status === 0) await enablePost(item.id)
    else await disablePost(item.id)
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '切换岗位状态失败'
  }
}

async function removePost(item: PostItem) {
  if (!window.confirm(`确认删除岗位「${item.postName}」？`)) return
  try {
    await deletePost(item.id)
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '删除岗位失败'
  }
}

async function loadUserOrg() {
  if (!userId.value) {
    error.value = '请输入用户 ID'
    return
  }
  resetMessage()
  try {
    const res: any = await getUserOrg(Number(userId.value))
    userOrg.value = normalizeResponse(res)
    selectedDeptIds.value = [...(userOrg.value?.deptIds || [])]
    primaryDeptId.value = userOrg.value?.primaryDeptId || ''
    selectedPostIds.value = [...(userOrg.value?.postIds || [])]
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '加载用户组织失败'
  }
}

function toggleId(target: number[], id: number) {
  const index = target.indexOf(id)
  if (index >= 0) target.splice(index, 1)
  else target.push(id)
}

async function saveUserOrg() {
  if (!userId.value) {
    error.value = '请输入用户 ID'
    return
  }
  saving.value = true
  resetMessage()
  try {
    const res: any = await assignUserOrg(Number(userId.value), {
      deptIds: selectedDeptIds.value,
      primaryDeptId: primaryDeptId.value ? Number(primaryDeptId.value) : undefined,
      postIds: selectedPostIds.value
    })
    userOrg.value = normalizeResponse(res)
    message.value = '用户组织岗位已保存'
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '保存用户组织失败'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="org-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">System Organization</p>
        <h1>组织架构</h1>
        <p>维护部门树、岗位和用户组织关系，为数据权限、审核分派和运营管理打基础。</p>
      </div>
      <button type="button" @click="load" :disabled="loading">刷新</button>
    </header>

    <div v-if="message" class="notice success">{{ message }}</div>
    <div v-if="error" class="notice error">{{ error }}</div>

    <div class="metrics">
      <article><span>部门总数</span><strong>{{ overview.deptCount }}</strong><small>启用 {{ overview.enabledDeptCount }} / 停用 {{ overview.disabledDeptCount }}</small></article>
      <article><span>岗位总数</span><strong>{{ overview.postCount }}</strong><small>启用 {{ overview.enabledPostCount }} / 停用 {{ overview.disabledPostCount }}</small></article>
      <article><span>用户部门关系</span><strong>{{ overview.userDeptRelationCount }}</strong><small>已绑定主部门和兼职部门</small></article>
      <article><span>用户岗位关系</span><strong>{{ overview.userPostRelationCount }}</strong><small>支持一人多岗</small></article>
    </div>

    <nav class="tabs">
      <button :class="{ active: activeTab === 'dept' }" @click="activeTab = 'dept'">部门管理</button>
      <button :class="{ active: activeTab === 'post' }" @click="activeTab = 'post'">岗位管理</button>
      <button :class="{ active: activeTab === 'user' }" @click="activeTab = 'user'">用户组织分配</button>
    </nav>

    <div v-if="activeTab === 'dept'" class="grid two">
      <section class="card">
        <div class="toolbar">
          <input v-model="query.keyword" placeholder="搜索部门编码、名称、负责人" />
          <select v-model="query.status">
            <option value="">全部状态</option>
            <option value="1">启用</option>
            <option value="0">停用</option>
          </select>
          <button @click="load">查询</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>部门</th><th>编码</th><th>负责人</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="dept in flatDepartments" :key="dept.id">
                <td>{{ dept.label }}</td>
                <td><code>{{ dept.deptCode }}</code></td>
                <td>{{ dept.leaderName || '-' }}</td>
                <td><span :class="['tag', dept.status === 1 ? 'ok' : 'off']">{{ dept.status === 1 ? '启用' : '停用' }}</span></td>
                <td class="actions">
                  <button @click="editDept(dept)">编辑</button>
                  <button @click="toggleDept(dept)">{{ dept.status === 1 ? '停用' : '启用' }}</button>
                  <button @click="removeDept(dept)" :disabled="!dept.editable">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card form-card">
        <h2>{{ deptForm.id ? '编辑部门' : '新增部门' }}</h2>
        <label>父级部门<select v-model.number="deptForm.parentId"><option :value="0">根部门</option><option v-for="item in parentOptions" :key="item.id" :value="item.id">{{ item.label }}</option></select></label>
        <label>部门编码<input v-model="deptForm.deptCode" placeholder="TECH" /></label>
        <label>部门名称<input v-model="deptForm.deptName" placeholder="技术研发部" /></label>
        <label>负责人<input v-model="deptForm.leaderName" /></label>
        <label>负责人电话<input v-model="deptForm.leaderPhone" /></label>
        <label>排序<input v-model.number="deptForm.sortNo" type="number" /></label>
        <label>状态<select v-model.number="deptForm.status"><option :value="1">启用</option><option :value="0">停用</option></select></label>
        <label>备注<textarea v-model="deptForm.remark" rows="3" /></label>
        <div class="button-row"><button @click="saveDept" :disabled="saving">保存</button><button class="secondary" @click="resetDeptForm">清空</button></div>
      </section>
    </div>

    <div v-if="activeTab === 'post'" class="grid two">
      <section class="card">
        <div class="toolbar">
          <input v-model="postQuery.keyword" placeholder="搜索岗位编码、名称" />
          <select v-model="postQuery.status"><option value="">全部状态</option><option value="1">启用</option><option value="0">停用</option></select>
          <button @click="load">查询</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>岗位</th><th>编码</th><th>排序</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="post in posts" :key="post.id">
                <td>{{ post.postName }}</td>
                <td><code>{{ post.postCode }}</code></td>
                <td>{{ post.sortNo }}</td>
                <td><span :class="['tag', post.status === 1 ? 'ok' : 'off']">{{ post.status === 1 ? '启用' : '停用' }}</span></td>
                <td class="actions"><button @click="editPost(post)">编辑</button><button @click="togglePost(post)">{{ post.status === 1 ? '停用' : '启用' }}</button><button @click="removePost(post)" :disabled="!post.editable">删除</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card form-card">
        <h2>{{ postForm.id ? '编辑岗位' : '新增岗位' }}</h2>
        <label>岗位编码<input v-model="postForm.postCode" placeholder="AUDITOR" /></label>
        <label>岗位名称<input v-model="postForm.postName" placeholder="审核专员" /></label>
        <label>排序<input v-model.number="postForm.sortNo" type="number" /></label>
        <label>状态<select v-model.number="postForm.status"><option :value="1">启用</option><option :value="0">停用</option></select></label>
        <label>备注<textarea v-model="postForm.remark" rows="3" /></label>
        <div class="button-row"><button @click="savePost" :disabled="saving">保存</button><button class="secondary" @click="resetPostForm">清空</button></div>
      </section>
    </div>

    <section v-if="activeTab === 'user'" class="card">
      <div class="toolbar">
        <input v-model.number="userId" type="number" placeholder="输入用户 ID" />
        <button @click="loadUserOrg">加载用户组织</button>
        <button @click="saveUserOrg" :disabled="saving">保存分配</button>
      </div>
      <div class="assign-grid">
        <div>
          <h3>部门</h3>
          <label v-for="dept in enabledDepartments" :key="dept.id" class="check-row">
            <input type="checkbox" :checked="selectedDeptIds.includes(dept.id)" @change="toggleId(selectedDeptIds, dept.id)" />
            {{ dept.label }}
          </label>
          <label>主部门<select v-model="primaryDeptId"><option value="">不指定</option><option v-for="dept in enabledDepartments" :key="dept.id" :value="dept.id">{{ dept.label }}</option></select></label>
        </div>
        <div>
          <h3>岗位</h3>
          <label v-for="post in enabledPosts" :key="post.id" class="check-row">
            <input type="checkbox" :checked="selectedPostIds.includes(post.id)" @change="toggleId(selectedPostIds, post.id)" />
            {{ post.postName }}（{{ post.postCode }}）
          </label>
        </div>
        <pre>{{ userOrg || '尚未加载用户组织关系' }}</pre>
      </div>
    </section>
  </section>
</template>

<style scoped>
.org-page { display: grid; gap: 16px; }
.page-header, .card, .metrics article { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: center; }
.eyebrow { margin: 0 0 4px; color: #2563eb; font-size: 12px; font-weight: 700; text-transform: uppercase; }
h1, h2, h3, p { margin-top: 0; }
.metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.metrics span, .metrics small { display: block; color: #64748b; }
.metrics strong { display: block; margin: 6px 0; font-size: 28px; }
.tabs { display: flex; gap: 8px; }
.tabs button { border: 1px solid #cbd5e1; border-radius: 999px; padding: 8px 14px; background: #fff; cursor: pointer; }
.tabs button.active { background: #111827; color: #fff; border-color: #111827; }
.grid.two { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.55fr); gap: 16px; align-items: start; }
.toolbar { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
input, select, textarea { border: 1px solid #cbd5e1; border-radius: 10px; padding: 8px 10px; }
button { border: none; border-radius: 10px; padding: 8px 12px; background: #2563eb; color: #fff; cursor: pointer; }
button.secondary { background: #e5e7eb; color: #111827; }
button:disabled { opacity: .55; cursor: not-allowed; }
.table-wrap { overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { border-bottom: 1px solid #e5e7eb; padding: 10px; text-align: left; vertical-align: top; }
.actions { display: flex; gap: 6px; flex-wrap: wrap; }
.actions button { padding: 6px 8px; background: #0f172a; }
.tag { border-radius: 999px; padding: 3px 8px; font-size: 12px; }
.tag.ok { background: #dcfce7; color: #166534; }
.tag.off { background: #fee2e2; color: #991b1b; }
.form-card { display: grid; gap: 10px; }
.form-card label { display: grid; gap: 6px; color: #334155; }
.button-row { display: flex; gap: 8px; }
.notice { border-radius: 12px; padding: 10px 12px; }
.notice.success { background: #dcfce7; color: #166534; }
.notice.error { background: #fee2e2; color: #991b1b; }
.assign-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.check-row { display: block; margin: 8px 0; }
pre { white-space: pre-wrap; background: #0f172a; color: #e5e7eb; border-radius: 12px; padding: 12px; max-height: 420px; overflow: auto; }
@media (max-width: 1100px) { .metrics, .grid.two, .assign-grid { grid-template-columns: 1fr; } }
</style>
