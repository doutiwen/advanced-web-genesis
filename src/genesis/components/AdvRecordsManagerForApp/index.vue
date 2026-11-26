<template>
  <!-- 透传所有属性到原始组件 -->
  <AdvRecordsManager
    v-bind="$attrs"
    ref="originalAdvRecordsManagerRef"
  >
    <!-- 将所有 AdvRecordsManager 相关插槽透传 -->
    <template
      v-for="(_, slotName) in $slots"
      #[slotName]="slotProps"
    >
      <slot
        :name="slotName"
        v-bind="slotProps || {}"
      ></slot>
    </template>
  </AdvRecordsManager>
</template>

<script setup>
  import AdvRecordsManager from '@common/components/AdvRecordsManager';
  import { computed, shallowRef, useCssModule, useAttrs, markRaw } from 'vue';
  import { useForwardExpose } from '@common/utils/forwardExpose';

  /**
   * 原始记录管理器组件引用
   */
  const originalAdvRecordsManagerRef = shallowRef(null);

  /**
   * 暴露给父组件的方法
   * 由 useForwardExpose 代理转发到 AdvRecordsManager 实例，
   * 应用层后续要追加自有方法时，通过第二个参数传入：useForwardExpose(ref, { ownMethod })
   */
  defineExpose(useForwardExpose(originalAdvRecordsManagerRef));
</script>
