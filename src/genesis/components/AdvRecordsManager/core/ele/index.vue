<template>
  <!-- 记录管理器容器 -->
  <div class="adv_records_manager_wrapper">
    <!-- 工具栏组件 -->
    <ToolBar
      v-if="toolBarConfig"
      :config="toolBarConfig"
      v-on="toolBarEventsHandler"
      :ref="setToolBarRef"
    >
      <!-- 工具栏插槽：toolBar-item-* 前缀 -->
      <template
        v-for="(_, name) in toolBarSlots"
        :key="name"
        #[name]="slotProps"
      >
        <slot
          :name="name"
          v-bind="slotProps || {}"
        ></slot>
      </template>
    </ToolBar>
    <!-- 表格列表组件 -->
    <RecordList
      v-model:selectedRowKeys="selectedRowKeys"
      v-model:pageNum="pageNum"
      v-model:pageSize="pageSize"
      v-model:total="total"
      :selectionFixed="selectionFixed"
      v-on="recordListEventsHandler"
      :ref="setRecordListRef"
      v-bind="{ ...recordListConfig, ...attrs }"
    >
      <!-- 表格列表插槽：recordList-* 前缀 -->
      <template
        v-for="(_, name) in recordListSlots"
        :key="name"
        #[name]="slotProps"
      >
        <slot
          :name="name"
          v-bind="slotProps || {}"
        ></slot>
      </template>
    </RecordList>
  </div>
</template>

<script setup>
  /**
   * RecordsManager 核心记录管理器组件
   *
   * 【组件功能】
   * 集成工具栏、表格列表两大模块的核心记录管理组件，
   * 负责协调各模块之间的通信和状态管理。
   *
   * 【组件架构】
   * RecordsManager (当前组件)
   *   ├── ToolBar (工具栏组件)
   *   └── RecordList (表格列表组件)
   *
   * 【弹窗说明】
   * 弹窗由按钮自带（AdvButton 的 modal + modalPayload），组件不再集中渲染 Modal。
   *
   * 【核心特性】
   * 1. 模块解耦：工具栏、表格独立，通过事件通信
   * 2. 插槽分发：根据插槽名称前缀自动分发到对应模块
   * 3. 状态共享：通过 useRecordsManager hook 共享状态和方法
   * 4. 批量选择：支持跨页批量选择功能
   *
   * 【Props 属性】
   * | 属性名 | 类型 | 必填 | 说明 |
   * |--------|------|------|------|
   * | config | Object | 是 | 合并配置对象：{ toolBar, ...列表配置 } |
   * | selectedRowKeys | Array | 否 | 已勾选行的 key 列表（支持 v-model） |
   * | pageNum | Number | 否 | 当前页码（支持 v-model:pageNum） |
   * | pageSize | Number | 否 | 每页条数（支持 v-model:pageSize） |
   * | total | Number | 否 | 总条数（支持 v-model:total） |
   *
   * 【插槽说明】
   * | 插槽名前缀 | 说明 | 示例 |
   * |-----------|------|------|
   * | toolBar-item-* | 工具栏按钮自定义内容 | toolBar-item-searchBtn-search |
   * | recordList-column-* | 表格列自定义渲染 | recordList-column-status |
   *
   * 【事件通信】
   * - ToolBar -> RecordList: 通过 search 事件触发搜索
   * - ToolBar -> RecordList: 通过 selection* / getSelectedRows 事件进入/确认/取消勾选并读取勾选行
   * - RecordList -> 外部: 通过 update:selectedRowKeys / update:pageNum/pageSize/total 同步状态
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
   * | search | 触发搜索 | { extraParams, tempParams } |
   * | refreshList | 刷新列表（保持当前页码不变） | { tempParams } |
   */

  // 导入依赖
  import { useSlots, computed, useAttrs } from 'vue';
  import ToolBar from './toolBar.jsx';
  import RecordList from './recordList.vue';
  import { useRecordsManager, recordsManagerProps } from '../common/recordsManager.js';

  // 定义组件属性（双向绑定属性由 defineModel 声明）
  const props = defineProps(recordsManagerProps);
  // 获取非 props 属性
  const attrs = useAttrs();
  // 获取插槽对象
  const slots = useSlots();

  // 双向绑定属性
  const selectedRowKeys = defineModel('selectedRowKeys', { type: Array, default: () => [] });
  const pageNum = defineModel('pageNum', { type: Number });
  const pageSize = defineModel('pageSize', { type: Number });
  const total = defineModel('total', { type: Number });

  /**
   * 工具栏插槽集合（toolBar-item-* 前缀）
   */
  const toolBarSlots = computed(() => {
    const result = {};
    for (const [name, fn] of Object.entries(slots)) {
      if (name.startsWith('toolBar-')) {
        result[name] = fn;
      }
    }
    return result;
  });

  /**
   * 表格列表插槽集合（recordList-* 前缀）
   */
  const recordListSlots = computed(() => {
    const result = {};
    for (const [name, fn] of Object.entries(slots)) {
      if (name.startsWith('recordList-')) {
        result[name] = fn;
      }
    }
    return result;
  });

  /**
   * 使用记录管理器 hook，获取状态和事件处理器
   */
  const {
    selectionFixed,
    toolBarConfig,
    recordListConfig,
    setToolBarRef,
    setRecordListRef,
    toolBarEventsHandler,
    recordListEventsHandler,
    defineExposeConfig,
  } = useRecordsManager(props);

  // 暴露方法给父组件
  defineExpose(defineExposeConfig);
</script>

<style scoped lang="scss">
  /**
   * 记录管理器容器样式
   */
  .adv_records_manager_wrapper {
    height: 100%;
    flex-direction: column;
    display: flex;
    /* 第二个子元素（表格）占满剩余空间 */
    > *:nth-child(2) {
      height: 1px;
      flex: 1;
    }
  }
</style>
