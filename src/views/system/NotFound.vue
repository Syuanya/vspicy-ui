<template>
  <section class="state-page">
    <div class="state-card">
      <span>404</span>
      <h1>页面不存在</h1>
      <p>你访问的地址不存在，可能是链接已调整，或功能入口已经移动。</p>
      <div class="actions">
        <RouterLink class="button" to="/">返回首页</RouterLink>
        <RouterLink class="button secondary" to="/admin">管理后台</RouterLink>
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
  color: #2563eb;
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
