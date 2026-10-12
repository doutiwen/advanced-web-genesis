<template>
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
  import AdvRecordsManager from '@/components/AdvRecordsManager';
  import { computed, shallowRef, useCssModule, useAttrs, markRaw } from 'vue';

  /**
   * 原始记录管理器组件引用
   */
  const originalAdvRecordsManagerRef = shallowRef(null);
  /**
   * 暴露给父组件的方法
   */
  defineExpose({
    /**
     * 获取批量选中列表
     */
    getBatchSelectList: () => {
      return originalAdvRecordsManagerRef.value.getBatchSelectList();
    },
    /**
     * 获取工具栏参数
     */
    getToolBarParams: () => {
      return originalAdvRecordsManagerRef.value.getToolBarParams();
    },
    /**
     * 获取当前列表数据
     */
    getRecordList: () => {
      return originalAdvRecordsManagerRef.value.getRecordList();
    },
    /**
     * 清空搜索参数
     */
    searchParamsClear: () => {
      return originalAdvRecordsManagerRef.value.searchParamsClear();
    },
    /**
     * 触发搜索
     */
    search: (...args) => {
      return originalAdvRecordsManagerRef.value.search(...args);
    },
    /**
     * 打开弹窗
     */
    openModal: (...args) => {
      return originalAdvRecordsManagerRef.value.openModal(...args);
    },
    /**
     * 关闭弹窗
     */
    closeModal: (...args) => {
      return originalAdvRecordsManagerRef.value.closeModal(...args);
    },
    /**
     * 获取弹窗数据
     */
    getModalData: (key) => {
      return originalAdvRecordsManagerRef.value.getModalData(key);
    },
    /**
     * 刷新列表（保持当前页码不变）
     * @param {Object} [tempParams] - 临时参数（仅单次调用有效，调用后不保留）
     */
    refreshList: (tempParams) => {
      return originalAdvRecordsManagerRef.value.refreshList(tempParams);
    },
  });
</script>
