<template>
  <div class="home">首页</div>
  <router-link :to="{ name: 'test' }" style="margin-right: 15px">跳转测试页</router-link>
  <router-link :to="{ name: 'routeTest1' }" style="margin-right: 15px">
    跳转嵌套路由测试页
  </router-link>
  <router-link :to="{ name: 'example' }">跳转实例页</router-link>
</template>

<script setup name="home">
  const a = new UUId();
  const b = new UUId();

  console.log(114, a === b);
</script>

<style lang="scss" scoped>
  .home {
    padding: $pd-md-size;
  }
</style>
