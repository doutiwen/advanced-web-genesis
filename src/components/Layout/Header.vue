<template>
  <header class="layout-header">
    <!-- 左侧品牌区 -->
    <div class="brand">
      <span class="brand-mark"></span>
      <span class="brand-name">{{ appTitle }}</span>
    </div>

    <!-- 右侧菜单：由路由表生成的菜单树驱动 -->
    <el-menu
      class="layout-menu"
      mode="horizontal"
      :default-active="activeMenu"
      :ellipsis="true"
      router
    >
      <LayoutMenu :items="menuItems" />
    </el-menu>
  </header>
</template>

<script setup>
  import { computed } from 'vue';
  import { useRoute } from 'vue-router';
  import routerManager from '@/router';
  import LayoutMenu from './LayoutMenu.vue';

  const route = useRoute();

  const appTitle = import.meta.env.VITE_APP_TITLE || 'DTW 前端资产';

  // 当前激活菜单：取匹配链中最后一个带完整路径的路由
  const activeMenu = computed(() => {
    const matched = route.matched.filter((record) => record.meta?.fullPath || record.path);
    const current = matched[matched.length - 1];
    return current?.meta?.fullPath || current?.path || route.path;
  });

  // 菜单树在动态路由注册前由路由管理器生成，保留真实的父子层级
  const menuItems = computed(() => {
    // 依赖当前路径：路由装载或切换后重新读取菜单
    void route.fullPath;
    return routerManager.getMenuTree();
  });
</script>

<style scoped lang="scss">
  .layout-header {
    display: flex;
    align-items: center;
    height: 56px;
    padding: 0 24px;
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    margin-right: 24px;

    .brand-mark {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      background: linear-gradient(135deg, #1677ff, #0050b3);
    }

    .brand-name {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      white-space: nowrap;
    }
  }

  .layout-menu {
    flex: 1;
    height: 56px;
    border-bottom: none;
    background: transparent;
    justify-content: flex-end;
    --el-menu-text-color: #374151;
    --el-menu-active-color: #1677ff;
    --el-menu-hover-bg-color: #f3f4f6;
  }
</style>
