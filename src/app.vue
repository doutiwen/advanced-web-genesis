<template>
  <a-config-provider :locale="zhCN">
    <div class="dtw-person">
      <router-view></router-view>
    </div>
  </a-config-provider>
</template>

<script setup>
  import zhCN from 'ant-design-vue/es/locale/zh_CN';
  // 无登录流程：路由守卫会按当前预设自动装载业务路由
</script>

<style lang="scss" src="@/styles/all.scss"></style>
<style lang="scss" scoped>
  .dtw-person {
    height: 100vh;
    width: 100vw;
  }
</style>
