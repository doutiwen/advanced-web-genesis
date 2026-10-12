<template>
  <div class="login_page">
    <div class="login">
      <el-button @click="login" type="primary">进入主界面</el-button>
    </div>
  </div>
</template>

<script setup>
  import dynamicRouterManager from '@/router';
  import { useUserStore } from '@/store';

  const route = useRoute();
  const login = async () => {
    const res = await openApi({ api: 'login/login' });
    const userInfo = res.data;
    const userStore = useUserStore();
    userStore.setUser(userInfo);
    const advStorage = new AdvStorage();
    advStorage.set('userInfo', userInfo);
    const permissionList = userStore.getPermissionList();
    dynamicRouterManager.createDynamicRoutes(permissionList);
    if (route?.query?.loginBack) {
      const routeQuery = { ...route.query };
      Reflect.deleteProperty(routeQuery, 'loginBack');
      dynamicRouterManager.router.push({
        name: route.query.loginBack,
        ...(Object.keys(routeQuery).length ? { query: routeQuery } : {}),
      });
    } else {
      dynamicRouterManager.router.push({ name: 'home' });
    }
  };
</script>

<style lang="scss" scoped>
  .login_page {
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    .login {
      width: 30vw;
      height: 40vh;
      background-color: palegoldenrod;
      border-radius: 8px;
      padding: $pd-md-size;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
</style>
