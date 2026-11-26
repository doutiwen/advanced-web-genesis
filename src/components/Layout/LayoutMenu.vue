<template>
  <template v-for="item in items" :key="item.path">
    <!-- 有子项时渲染子菜单，并递归自身 -->
    <el-sub-menu v-if="item.children?.length" :index="item.path">
      <template #title>
        <span>{{ item.title }}</span>
      </template>
      <LayoutMenu :items="item.children" />
    </el-sub-menu>

    <el-menu-item v-else :index="item.path">
      <span>{{ item.title }}</span>
    </el-menu-item>
  </template>
</template>

<script setup>
  // 递归菜单组件：数据来自路由自动生成的菜单树，不依赖接口或权限
  defineOptions({ name: 'LayoutMenu' });

  defineProps({
    items: {
      type: Array,
      default: () => [],
    },
  });
</script>
