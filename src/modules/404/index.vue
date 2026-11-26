<template>
  <a-result status="404" title="404"></a-result>
  <div class="back_home">
    <a-button type="primary" @click="back">返回首页</a-button>
  </div>
</template>

<script name="404Page" setup>
  const router = useRouter();

  // 项目没有登录流程，404 统一回到首页
  function back() {
    router.push({ name: 'home' });
  }
</script>

<style lang="scss" scoped>
  .back_home {
    display: flex;
    justify-content: center;
  }
</style>
