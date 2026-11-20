<template>
  <!-- 核心记录管理器组件 -->
  <div>
    <RecordsManager
      :recordListConfig="recordListConfig"
      :toolBarConfig="toolBarConfig"
      ref="recordsManagerRef"
      v-bind="$attrs"
    >
      <!-- 将所有插槽透传给 RecordsManager -->
      <template
        v-for="(_, slotName) in $slots"
        #[slotName]="slotProps"
      >
        <slot
          :name="slotName"
          v-bind="slotProps || {}"
        ></slot>
      </template>
    </RecordsManager>
  </div>
</template>

<script setup>
  /**
   * OriginalAdvRecordsManager 原始记录管理器组件
   *
   * 【组件功能】
   * 基于 RecordsManager 封装的应用层记录管理器，负责方法透传。
   *
   * 【组件架构】
   * OriginalAdvRecordsManager (当前组件)
   *   └── RecordsManager (核心记录管理器，包含工具栏、表格)
   *
   * 【核心特性】
   * 1. 方法透传：将 RecordsManager 的方法暴露给父组件
   * 2. 按钮可见性：由配置中的 show 控制，组件不做权限过滤
   *
   * 【Props 属性】
   * | 属性名 | 类型 | 必填 | 说明 |
   * |--------|------|------|------|
   * | toolBarConfig | Object | 否 | 工具栏配置对象 |
   * | recordListConfig | Object | 是 | 表格列表配置对象 |
   *
   * 【暴露方法】
   * | 方法名 | 说明 | 参数 |
   * |--------|------|------|
   * | getBatchSelectList | 获取批量选中列表 | 无 |
   * | getToolBarParams | 获取工具栏参数 | 无 |
   * | getRecordList | 获取当前列表数据 | 无 |
   * | searchParamsClear | 清空搜索参数 | 无 |
   * | search | 触发搜索 | {...args} |
   * | refreshList | 刷新列表（保持当前页码不变） | { tempParams } |
   */

  // 导入核心记录管理器组件：@ui 由 vite.config.js 中的别名按 VITE_UI_LIB 重定向到 core/ele 或 core/ant
  import RecordsManager from './core/@ui/index.vue';
  import { shallowRef } from 'vue';

  /**
   * 组件属性定义
   * 按钮可见性由配置中的 show 控制，组件不内置权限过滤
   */
  defineProps({
    /**
     * 工具栏配置对象
     */
    toolBarConfig: {
      type: Object,
    },
    /**
     * 表格列表配置对象（必填）
     */
    recordListConfig: {
      type: Object,
      required: true,
    },
  });

  // RecordsManager 组件引用
  const recordsManagerRef = shallowRef();

  /**
   * 暴露给父组件的方法
   */
  defineExpose({
    /**
     * 获取批量选中列表
     */
    getBatchSelectList: () => {
      return recordsManagerRef.value.getBatchSelectList();
    },
    /**
     * 获取工具栏参数
     */
    getToolBarParams: () => {
      return recordsManagerRef.value.getToolBarParams();
    },
    /**
     * 获取当前列表数据
     */
    getRecordList: () => {
      return recordsManagerRef.value.getRecordList();
    },
    /**
     * 清空搜索参数
     */
    searchParamsClear: () => {
      return recordsManagerRef.value.searchParamsClear();
    },
    /**
     * 触发搜索
     */
    search: (...args) => {
      return recordsManagerRef.value.search(...args);
    },
    /**
     * 刷新列表（保持当前页码不变）
     * @param {Object} [tempParams] - 临时参数（仅单次调用有效，调用后不保留）
     */
    refreshList: (tempParams) => {
      return recordsManagerRef.value.refreshList(tempParams);
    },
  });
</script>
