<template>
  <!-- 主布局容器 -->
  <div class="layout-container">
    <!-- 顶部导航栏 -->
    <Header
      :collapse="collapse"
      :user-info="userStore.userInfo"
      @toggle-sidebar="toggleSidebar"
    />

    <!-- 主内容区域 -->
    <div class="main-container">
      <Sidebar
        :collapse="collapse"
        :menu-list="permissionStore.visibleMenuList"
      />
      <!-- 页面内容区域 -->
      <main class="content-container">
        <Breadcrumb />
        <div class="container">
          <div :class="route.fullPath === '/dashboard' ? '' : 'containerBg'">
            <router-view />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue';
  import { useRouter, useRoute } from 'vue-router';
  import { useUserStore } from '@/stores/user';
  import { usePermissionStore } from '@/stores/permission';
  import Sidebar from './Sidebar.vue';
  import Header from './Header.vue';
  import Breadcrumb from '@/components/Breadcrumb.vue';
  const route = useRoute();
  const router = useRouter();
  const userStore = useUserStore();
  const permissionStore = usePermissionStore();
  const collapse = ref(false);
  console.log(permissionStore, ' =======');
  function toggleSidebar() {
    collapse.value = !collapse.value;
  }
</script>

<style scoped lang="scss">
  /* 主布局容器：全屏Flex布局 */
  .layout-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    /* 主内容区：占据剩余空间 */
    .main-container {
      flex: 1;
      display: flex;
      background-color: #f0f2f5;
      overflow: hidden;
    }
    /* 页面内容区：可滚动 */
    .content-container {
      flex: 1;
      // 内边距
      overflow-y: auto;
      .container {
        padding: 16px;
        height: calc(100% - 36px);
        overflow-y: auto;
        .containerBg {
          width: 100%;
          height: 100%;
        }
      }
    }
  }
</style>
