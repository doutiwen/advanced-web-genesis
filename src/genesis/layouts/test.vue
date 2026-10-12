<template>
  <div class="test_main_page">
    <router-link class="m-b-md" :to="{ name: 'home' }">返回主界面</router-link>
    <slot></slot>
  </div>
</template>

<script setup name="test-main-page"></script>

<style lang="scss" scoped></style>
