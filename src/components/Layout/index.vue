<template>
  <!-- 布局容器：顶部菜单 + 内容区 -->
  <div class="layout">
    <Header />

    <main class="layout-content">
      <!-- 路由组件挂载/切换时的淡入上移动画 -->
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <div :key="route.path" class="page-wrapper">
            <component :is="Component" />
          </div>
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
  import { useRoute } from 'vue-router';
  import Header from './Header.vue';

  const route = useRoute();
</script>

<style scoped lang="scss">
  .layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background-color: #f0f2f5;
  }

  .layout-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .page-wrapper {
    box-sizing: border-box;
    min-height: 100%;
    padding: 16px;
  }

  /* 页面组件挂载/切换动画 */
  .page-fade-enter-active,
  .page-fade-leave-active {
    transition:
      opacity 0.18s ease,
      transform 0.18s ease;
  }

  .page-fade-enter-from {
    opacity: 0;
    transform: translateY(8px);
  }

  .page-fade-leave-to {
    opacity: 0;
    transform: translateY(-4px);
  }
</style>
