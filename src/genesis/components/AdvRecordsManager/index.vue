<template>
  <!-- 核心记录管理器组件 -->
  <div>
    <RecordsManager
      :config="config"
      :selectedRowKeys="selectedRowKeys"
      :pageNum="pageNum"
      :pageSize="pageSize"
      :total="total"
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
   * | config | Object | 是 | 合并配置对象：{ toolBar: 工具栏配置对象, ...列表配置对象 } |
   * | selectedRowKeys | Array | 否 | 已勾选行的 key 列表（支持 v-model） |
   * | pageNum | Number | 否 | 当前页码（支持 v-model:pageNum） |
   * | pageSize | Number | 否 | 每页条数（支持 v-model:pageSize） |
   * | total | Number | 否 | 总条数（支持 v-model:total） |
   *
   * 【暴露方法】
   * | 方法名 | 说明 | 参数 |
   * |--------|------|------|
   * | getRecordListRef | 获取列表实例（逃生舱） | 无 |
   * | getToolBarRef | 获取工具栏实例（逃生舱） | 无 |
   * | getSelectedRowKeys | 获取勾选的 key 列表 | 无 |
   * | getSelectedRows | 获取勾选的行对象（缓存缺失时仅含 key） | 无 |
   * | enterSelectMode | 进入勾选模式 | keys? |
   * | exitSelectMode | 退出勾选模式并清空 | 无 |
   * | setSelectedRowKeys | 覆盖式设置勾选 key | keys |
   * | clearSelection | 只清空勾选 | 无 |
   * | setPage | 设置当前页码 | pageNum |
   * | setPageSize | 设置每页条数（回到第 1 页） | pageSize |
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
     * 合并配置对象
     * 结构：{ toolBar: 工具栏配置对象, ...列表配置对象 }
     */
    config: {
      type: Object,
      required: true,
    },
    /**
     * 已勾选行的 key 列表（支持 v-model:selectedRowKeys）
     */
    selectedRowKeys: {
      type: Array,
      default: () => [],
    },
    /**
     * 当前页码（支持 v-model:pageNum）
     */
    pageNum: {
      type: Number,
    },
    /**
     * 每页条数（支持 v-model:pageSize）
     */
    pageSize: {
      type: Number,
    },
    /**
     * 总条数（支持 v-model:total）
     */
    total: {
      type: Number,
    },
  });

  // RecordsManager 组件引用
  const recordsManagerRef = shallowRef();

  /**
   * 暴露给父组件的方法
   */
  defineExpose({
    /**
     * 获取列表组件实例（逃生舱）
     */
    getRecordListRef: () => {
      return recordsManagerRef.value.getRecordListRef();
    },
    /**
     * 获取工具栏组件实例（逃生舱）
     */
    getToolBarRef: () => {
      return recordsManagerRef.value.getToolBarRef();
    },
    /**
     * 获取勾选的 key 列表
     */
    getSelectedRowKeys: () => {
      return recordsManagerRef.value.getSelectedRowKeys();
    },
    /**
     * 获取勾选的行对象（缓存缺失时仅含 key）
     */
    getSelectedRows: () => {
      return recordsManagerRef.value.getSelectedRows();
    },
    /**
     * 进入勾选模式
     */
    enterSelectMode: (keys) => {
      return recordsManagerRef.value.enterSelectMode(keys);
    },
    /**
     * 退出勾选模式并清空
     */
    exitSelectMode: () => {
      return recordsManagerRef.value.exitSelectMode();
    },
    /**
     * 覆盖式设置勾选 key
     */
    setSelectedRowKeys: (keys) => {
      return recordsManagerRef.value.setSelectedRowKeys(keys);
    },
    /**
     * 只清空勾选
     */
    clearSelection: () => {
      return recordsManagerRef.value.clearSelection();
    },
    /**
     * 设置当前页码
     * @param {number} pageNum - 页码（从 1 开始）
     */
    setPage: (pageNum) => {
      return recordsManagerRef.value.setPage(pageNum);
    },
    /**
     * 设置每页条数（会自动回到第 1 页）
     * @param {number} pageSize - 每页条数
     */
    setPageSize: (pageSize) => {
      return recordsManagerRef.value.setPageSize(pageSize);
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
