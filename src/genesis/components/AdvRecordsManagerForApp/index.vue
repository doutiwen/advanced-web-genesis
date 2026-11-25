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
  import AdvRecordsManager from '@common/components/AdvRecordsManager';
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
     * 获取列表组件实例（逃生舱）
     */
    getRecordListRef: () => {
      return originalAdvRecordsManagerRef.value.getRecordListRef();
    },
    /**
     * 获取工具栏组件实例（逃生舱）
     */
    getToolBarRef: () => {
      return originalAdvRecordsManagerRef.value.getToolBarRef();
    },
    /**
     * 获取勾选的 key 列表
     */
    getSelectedRowKeys: () => {
      return originalAdvRecordsManagerRef.value.getSelectedRowKeys();
    },
    /**
     * 获取勾选的行对象（缓存缺失时仅含 key）
     */
    getSelectedRows: () => {
      return originalAdvRecordsManagerRef.value.getSelectedRows();
    },
    /**
     * 进入勾选模式
     */
    enterSelectMode: (keys) => {
      return originalAdvRecordsManagerRef.value.enterSelectMode(keys);
    },
    /**
     * 退出勾选模式并清空
     */
    exitSelectMode: () => {
      return originalAdvRecordsManagerRef.value.exitSelectMode();
    },
    /**
     * 覆盖式设置勾选 key
     */
    setSelectedRowKeys: (keys) => {
      return originalAdvRecordsManagerRef.value.setSelectedRowKeys(keys);
    },
    /**
     * 只清空勾选
     */
    clearSelection: () => {
      return originalAdvRecordsManagerRef.value.clearSelection();
    },
    /**
     * 设置当前页码
     */
    setPage: (pageNum) => {
      return originalAdvRecordsManagerRef.value.setPage(pageNum);
    },
    /**
     * 设置每页条数（会自动回到第 1 页）
     */
    setPageSize: (pageSize) => {
      return originalAdvRecordsManagerRef.value.setPageSize(pageSize);
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
     * 刷新列表（保持当前页码不变）
     * @param {Object} [tempParams] - 临时参数（仅单次调用有效，调用后不保留）
     */
    refreshList: (tempParams) => {
      return originalAdvRecordsManagerRef.value.refreshList(tempParams);
    },
  });
</script>
