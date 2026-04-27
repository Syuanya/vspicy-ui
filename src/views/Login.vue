<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { devToken, login, logout, saveLoginResult } from '../api/auth'
import { clearPermissionCache } from '../utils/permission'

const router = useRouter()
const username = ref('admin')
const password = ref('admin123456')
const loading = ref(false)
const message = ref('')

async function submit() {
  loading.value = true
  message.value = ''
  try {
    const res: any = await login({
      username: username.value,
      password: password.value
    })

    if (res.code === 0) {
      saveLoginResult(res.data)
      clearPermissionCache()
      saveLoginResult(res.data)
      message.value = '登录成功'
      await router.push('/admin/dashboard')
    } else {
      message.value = res.message || '登录失败'
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || '登录失败'
  } finally {
    loading.value = false
  }
}

async function getDevToken() {
  loading.value = true
  message.value = ''
  try {
    const res: any = await devToken()
    if (res.code === 0) {
      saveLoginResult(res.data)
      message.value = '开发 token 已写入'
      await router.push('/admin/dashboard')
    } else {
      message.value = res.message || '获取失败'
    }
  } finally {
    loading.value = false
  }
}

function doLogout() {
  logout()
  clearPermissionCache()
  message.value = '已退出'
}
</script>

<template>
  <section class="card" style="max-width: 520px; margin: 40px auto;">
    <h2>登录 VSpicy</h2>
    <p>默认开发账号：admin / admin123456</p>

    <label>用户名</label>
    <input v-model="username" class="input" placeholder="username" />

    <label>密码</label>
    <input v-model="password" type="password" class="input" placeholder="password" />

    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
      <button class="button" :disabled="loading" @click="submit">
        {{ loading ? '登录中...' : '登录' }}
      </button>
      <button class="button" style="background: #2563eb;" :disabled="loading" @click="getDevToken">
        获取开发 Token
      </button>
      <button class="button" style="background: #991b1b;" @click="doLogout">
        退出
      </button>
    </div>

    <p v-if="message" style="color: #ef4444; margin-top: 16px;">{{ message }}</p>
  </section>
</template>
