<template>
  <section class="state-page">
    <div class="state-card">
      <span>403</span>
      <h1>没有访问权限</h1>
      <p>当前账号没有访问该功能的权限。可以切换账号，或联系管理员分配对应角色与权限。</p>
      <div class="actions">
        <RouterLink class="button" to="/login">去登录</RouterLink>
        <RouterLink class="button secondary" to="/">返回用户端</RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.state-page {
  min-height: 60vh;
  display: grid;
  place-items: center;
}

.state-card {
  max-width: 520px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 28px;
  background: #fff;
  text-align: center;
}

.state-card span {
  color: #ef4444;
  font-weight: 800;
  letter-spacing: 0;
}

h1 {
  margin: 10px 0;
}

p {
  color: #6b7280;
  line-height: 1.7;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 18px;
}

.secondary {
  background: #111827;
}
</style>
