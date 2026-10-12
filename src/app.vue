<template>
  <a-config-provider :locale="zhCN">
    <div class="dtw-person">
      <router-view></router-view>
    </div>
  </a-config-provider>
</template>

<script setup>
  import zhCN from 'ant-design-vue/es/locale/zh_CN';
  import dynamicRouterManager from './router';
  import { useUserStore } from './store';

  const advStorage = new AdvStorage();
  if (advStorage.has('userInfo')) {
    const userInfo = advStorage.get('userInfo');
    const userStore = useUserStore();
    userStore.setUser(userInfo);
    const permissionList = userStore.getPermissionList();
    dynamicRouterManager.createDynamicRoutes(permissionList);
    if (window.location.pathname === '/login' || window.location.pathname === '/') {
      dynamicRouterManager.router.push({ name: 'home' });
    } else {
      dynamicRouterManager.router.push(window.location.pathname);
    }
  }
</script>

<style lang="scss" src="@/styles/all.scss"></style>
<style lang="scss" scoped>
  .dtw-person {
    height: 100vh;
    width: 100vw;
  }
</style>
