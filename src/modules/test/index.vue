<template>
  <TestLayout>
    <router-link :to="{ name: 'home' }">跳转首页</router-link>
    <div style="padding: 20px">
      <AdvButton
        @click="handleClick"
        type="primary"
        throttleTime="1000"
        confirmNotice="确认点击吗？"
      >
        点击我
      </AdvButton>
    </div>
  </TestLayout>
</template>
<script setup>
  import TestLayout from '@/layouts/test.vue';
  import AdvButton from '@/components/AdvButton/index.js';
  import { ElMessage } from 'element-plus';

  const handleClick = () => {
    console.log('点击了按钮');
  };
</script>
