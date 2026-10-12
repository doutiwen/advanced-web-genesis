<template>
  <!-- 核心记录管理器组件 -->
  <div>
    <RecordsManager
      :recordListConfig="innerRecordListConfig"
      :toolBarConfig="innerToolBarConfig"
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
   * 基于 RecordsManager 封装的原始记录管理器，主要负责权限过滤和方法暴露。
   *
   * 【组件架构】
   * OriginalAdvRecordsManager (当前组件)
   *   └── RecordsManager (核心记录管理器，包含工具栏、表格、弹窗)
   *
   * 【核心特性】
   * 1. 权限过滤：根据 buttonList 过滤工具栏按钮和操作列按钮
   * 2. 方法透传：将 RecordsManager 的方法暴露给父组件
   *
   * 【Props 属性】
   * | 属性名 | 类型 | 必填 | 说明 |
   * |--------|------|------|------|
   * | toolBarConfig | Object | 否 | 工具栏配置对象 |
   * | recordListConfig | Object | 是 | 表格列表配置对象 |
   * | buttonList | Array/String | 否 | 按钮权限列表，'all'表示显示全部，数组表示只显示指定权限的按钮 |
   *
   * 【权限控制说明】
   * - buttonList 为 'all'：不做权限过滤，显示所有按钮
   * - buttonList 为数组：只显示 permissionId 在数组中的按钮
   * - buttonList 为空或其他：隐藏所有需要权限的按钮（openModal、batch、operater类型）
   *
   * 【暴露方法】
   * | 方法名 | 说明 | 参数 |
   * |--------|------|------|
   * | getBatchSelectList | 获取批量选中列表 | 无 |
   * | getToolBarParams | 获取工具栏参数 | 无 |
   * | getRecordList | 获取当前列表数据 | 无 |
   * | searchParamsClear | 清空搜索参数 | 无 |
   * | search | 触发搜索 | {...args} |
   * | openModal | 打开弹窗 | { key, data, title } |
   * | closeModal | 关闭弹窗 | { key, refreshRecordList, resetFormData } |
   * | getModalData | 获取弹窗数据 | key (弹窗标识) |
   * | refreshList | 刷新列表（保持当前页码不变） | { tempParams } |
   */

  // 导入核心记录管理器组件：@ui 由 vite.config.js 中的别名按 VITE_UI_LIB 重定向到 core/ele 或 core/ant
  import RecordsManager from './core/@ui/index.vue';
  import { computed, shallowRef } from 'vue';

  /**
   * 组件属性定义
   */
  const props = defineProps({
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
    /**
     * 按钮权限列表
     * - 'all': 显示全部按钮
     * - Array: 只显示指定权限的按钮
     */
    buttonList: {
      type: [Array, String],
    },
  });

  /**
   * 内部工具栏配置（经过权限过滤）
   */
  const innerToolBarConfig = computed(() => {
    if (props?.toolBarConfig?.list) {
      if (props?.buttonList && Array.isArray(props.buttonList)) {
        // 按权限列表过滤：只保留 permissionId 在 buttonList 中的按钮
        const target = { ...props.toolBarConfig, list: [] };
        for (const tooBarItem of props.toolBarConfig.list) {
          if (['openModal', 'batch'].includes(tooBarItem.type)) {
            // 需要权限控制的按钮类型
            if (tooBarItem?.permissionId) {
              if (props.buttonList.includes(tooBarItem.permissionId)) {
                target.list.push(tooBarItem);
              }
            } else {
              target.list.push(tooBarItem);
            }
          } else {
            // 不需要权限控制的按钮类型（如搜索框、普通按钮）
            target.list.push(tooBarItem);
          }
        }
        return target;
      } else if (props?.buttonList === 'all') {
        // 显示全部按钮，不做过滤
        return props.toolBarConfig;
      } else {
        // buttonList 为空或其他值：隐藏所有需要权限的按钮
        return { ...props.toolBarConfig, list: [] };
      }
    } else if (props?.toolBarConfig) {
      return props.toolBarConfig;
    } else {
      return null;
    }
  });

  /**
   * 内部表格列表配置（经过权限过滤）
   */
  const innerRecordListConfig = computed(() => {
    if (props?.buttonList && Array.isArray(props.buttonList)) {
      // 按权限列表过滤操作列按钮
      const target = { ...props.recordListConfig, columnsConfig: [] };
      for (const col of props.recordListConfig.columnsConfig) {
        if (col.type === 'operater') {
          // 操作列：过滤按钮
          const taretCol = { ...col, list: [] };
          for (const colBtn of col.list) {
            if (colBtn?.permissionId) {
              if (props.buttonList.includes(colBtn.permissionId)) {
                taretCol.list.push(colBtn);
              }
            } else {
              taretCol.list.push(colBtn);
            }
          }
          target.columnsConfig.push(taretCol);
        } else {
          // 普通列：直接保留
          target.columnsConfig.push(col);
        }
      }
      return target;
    } else if (props?.buttonList === 'all') {
      // 显示全部按钮，不做过滤
      return props.recordListConfig;
    } else {
      // buttonList 为空或其他值：隐藏所有操作列按钮
      return { ...props.recordListConfig, columnsConfig: [] };
    }
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
     * 打开弹窗
     */
    openModal: (...args) => {
      return recordsManagerRef.value.openModal(...args);
    },
    /**
     * 关闭弹窗
     */
    closeModal: (...args) => {
      return recordsManagerRef.value.closeModal(...args);
    },
    /**
     * 获取弹窗数据
     */
    getModalData: (key) => {
      return recordsManagerRef.value.getModalData(key);
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
