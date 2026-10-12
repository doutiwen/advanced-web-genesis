<template>
  <a-result status="404" title="404"></a-result>
  <div class="back_login">
    <a-button v-if="isLogin" type="primary" @click="back('home')">返回首页</a-button>
    <a-button v-else type="primary" @click="back('login')">返回登陆页面</a-button>
  </div>
</template>

<script name="404Page" setup>
  const router = useRouter();
  const isLogin = ref(false);
  if (checkAuthState()) {
    isLogin.value = true;
  }
  function back(name) {
    router.push({ name });
  }
</script>

<style lang="scss" scoped>
  .back_login {
    display: flex;
    justify-content: center;
  }
</style>
