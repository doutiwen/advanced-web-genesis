<template>
  <div class="demo_main_page">
    <div class="back">
      <router-link :to="{ name: 'home' }">返回主界面</router-link>
    </div>
    <el-scrollbar class="demo_page_content">
      <router-view></router-view>
    </el-scrollbar>
  </div>
</template>

<script setup name="demo-main-page"></script>

<style lang="scss" scoped>
  .demo_main_page {
    padding: $pd-md-size;
    $backBarHeight: 24px;
    height: 100%;
    .back {
      line-height: $backBarHeight;
      a {
        color: #409eff;
      }
    }
    .demo_page_content {
      height: calc(100% - $backBarHeight);
      overflow-y: auto;
    }
  }
</style>
