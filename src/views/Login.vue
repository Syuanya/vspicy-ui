<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { devToken, login, logout, register, saveLoginResult } from '../api/auth'
import { clearPermissionCache } from '../utils/permission'

const router = useRouter()
const route = useRoute()
const mode = ref<'login' | 'register'>('login')
const username = ref('admin')
const password = ref('admin123456')
const nickname = ref('')
const email = ref('')
const phone = ref('')
const loading = ref(false)
const message = ref('')

const submitText = computed(() => mode.value === 'login' ? '登录' : '注册并登录')
const redirectPath = computed(() => {
  const value = route.query.redirect
  return typeof value === 'string' && value.startsWith('/') ? value : '/me'
})

function resetMessage() {
  message.value = ''
}

async function submit() {
  loading.value = true
  resetMessage()
  try {
    const res: any = mode.value === 'login'
      ? await login({ username: username.value, password: password.value })
      : await register({
          username: username.value,
          password: password.value,
          nickname: nickname.value,
          email: email.value,
          phone: phone.value
        })

    if (res.code === 0) {
      saveLoginResult(res.data)
      clearPermissionCache()
      message.value = mode.value === 'login' ? '登录成功' : '注册成功，已自动登录'
      await router.push(redirectPath.value)
    } else {
      message.value = res.message || `${submitText.value}失败`
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || `${submitText.value}失败`
  } finally {
    loading.value = false
  }
}

async function getDevToken() {
  loading.value = true
  resetMessage()
  try {
    const res: any = await devToken()
    if (res.code === 0) {
      saveLoginResult(res.data)
      clearPermissionCache()
      message.value = '开发 Token 已写入'
      await router.push(route.query.redirect ? redirectPath.value : '/admin/dashboard')
    } else {
      message.value = res.message || '获取开发 Token 失败'
    }
  } catch (error: any) {
    message.value = error?.response?.data?.message || '获取开发 Token 失败'
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
  <section class="card auth-card">
    <div class="auth-head">
      <div>
        <h2>{{ mode === 'login' ? '登录 VSpicy' : '注册 VSpicy' }}</h2>
        <p>{{ mode === 'login' ? '使用账号进入用户端和管理端。' : '创建普通用户账号，注册后自动登录。' }}</p>
      </div>
      <div class="mode-tabs">
        <button :class="{ active: mode === 'login' }" @click="mode = 'login'">登录</button>
        <button :class="{ active: mode === 'register' }" @click="mode = 'register'">注册</button>
      </div>
    </div>

    <label>用户名</label>
    <input v-model="username" class="input" placeholder="username" @input="resetMessage" />

    <label>密码</label>
    <input v-model="password" type="password" class="input" placeholder="password" @input="resetMessage" />

    <template v-if="mode === 'register'">
      <label>昵称</label>
      <input v-model="nickname" class="input" placeholder="可选，默认使用用户名" @input="resetMessage" />

      <label>邮箱</label>
      <input v-model="email" class="input" placeholder="可选" @input="resetMessage" />

      <label>手机号</label>
      <input v-model="phone" class="input" placeholder="可选" @input="resetMessage" />
    </template>

    <div class="actions">
      <button class="button" :disabled="loading" @click="submit">
        {{ loading ? '处理中...' : submitText }}
      </button>
      <button class="button secondary" :disabled="loading" @click="getDevToken">
        获取开发 Token
      </button>
      <button class="button danger" @click="doLogout">
        退出
      </button>
    </div>

    <p class="hint">默认开发账号：admin / admin123456</p>
    <p v-if="message" class="message">{{ message }}</p>
  </section>
</template>

<style scoped>
.auth-card {
  max-width: 560px;
  margin: 40px auto;
}

.auth-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.mode-tabs {
  display: inline-flex;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
  flex: none;
}

.mode-tabs button {
  border: 0;
  background: #fff;
  padding: 8px 12px;
  cursor: pointer;
}

.mode-tabs button.active {
  background: #111827;
  color: #fff;
}

label {
  display: block;
  margin-top: 12px;
  color: #374151;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 18px;
}

.secondary {
  background: #2563eb;
}

.danger {
  background: #991b1b;
}

.hint {
  color: #6b7280;
  margin-top: 14px;
}

.message {
  color: #ef4444;
  margin-top: 12px;
}

@media (max-width: 640px) {
  .auth-head {
    display: grid;
  }
}
</style>
