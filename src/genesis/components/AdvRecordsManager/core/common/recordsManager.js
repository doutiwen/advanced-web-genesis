/**
 * recordsManager 模块 - 记录管理器核心逻辑
 *
 * 【模块功能】
 * 提供记录管理器的属性定义和核心 hook，负责协调工具栏、表格、弹窗之间的状态管理和事件通信。
 *
 * 【核心组件】
 * 1. recordsManagerProps: 组件属性定义
 * 2. useRecordsManager: 核心 hook，管理状态和事件处理
 *
 * 【状态管理】
 * - selectMode: 批量选择模式状态
 *
 * 【事件通信】
 * - toolBarEventsHandler: 工具栏事件处理器
 * - recordListEventsHandler: 表格列表事件处理器
 *
 * 【弹窗说明】
 * 弹窗由按钮自带的 AdvButton.modal 渲染，本模块不再维护集中式弹窗配置。
 */

/**
 * recordsManager 组件属性定义
 */
const recordsManagerProps = {
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
  selectedRows: {
    type: Array,
  },
  /**
   * 是否启用虚拟滚动表格
   */
  virtualScroll: {
    type: Boolean,
    default: false,
  },
};

const recordsManagerEmits = ['selectRows'];

/**
 * 记录管理器核心 hook
 *
 * @param {Object} props - 组件属性
 * @param {Object} attrs - 非 props 属性
 * @returns {Object} 状态和方法集合
 */
const useRecordsManager = (props, attrs, emits) => {
  /**
   * 子组件引用
   */
  const toolBarRef = shallowRef(null);
  const setToolBarRef = (ref) => {
    toolBarRef.value = ref;
  };

  const recordListRef = shallowRef(null);
  const setRecordListRef = (ref) => {
    recordListRef.value = ref;
  };

  /**
   * 状态管理
   */
  // 批量选择模式状态
  const selectMode = ref(false);

  /**
   * 工具栏事件处理器
   */
  const toolBarEventsHandler = {
    /**
     * 进入批量选择模式
     */
    enterBatchMode: () => {
      selectMode.value = true;
    },
    /**
     * 退出批量选择模式
     */
    exitBatchMode: () => {
      selectMode.value = false;
    },
    /**
     * 触发搜索
     * @param {Object} params - 搜索参数
     * @param {Function} params.callback - 搜索完成回调
     * @param {Object} params.toolBarParams - 工具栏参数
     */
    search: ({ callback, toolBarParams } = {}) => {
      recordListRef.value.search({ toolBarParams }).finally(() => {
        callback && callback();
      });
    },
    /**
     * 原地刷新列表（保持当前页码）
     * 用于按钮自带弹窗完成操作后的刷新
     */
    refreshList: () => {
      recordListRef.value.refreshList();
    },
  };

  /**
   * 表格列表事件处理器
   */
  const recordListEventsHandler = {
    /**
     * 获取批量列表（切换分页时调用）
     * @param {number} pageNum - 页码
     */
    getPageBatchList: (pageNum) => {
      if (toolBarRef.value) {
        const currentPageSelectedRows = toolBarRef.value.getBatchSelectList(pageNum);
        recordListRef.value.setCurrentPageSelectedRows(currentPageSelectedRows);
      }
    },
    /**
     * 选中行事件
     * @param {Object} params - 选中参数
     * @param {Array} params.rows - 选中行列表
     * @param {number} params.pageNum - 页码
     */
    selectRows: ({ rows, pageNum }) => {
      if (toolBarRef.value) {
        toolBarRef.value.editBatchSelectList(rows, pageNum);
        emits('selectRows', toolBarRef.value.getBatchSelectList());
      }
    },
    /**
     * 清除批量选择状态
     */
    clearBatch: () => {
      toolBarRef.value?.clearBatchModeState();
    },
    /**
     * 获取工具栏参数
     * @param {Function} callback - 设置工具栏参数回调
     */
    getToolBarParams: (callback) => {
      if (toolBarRef.value) {
        callback(toolBarRef.value.getToolBarParams());
      }
    },
  };

  /**
   * 暴露给父组件的方法配置
   */
  const defineExposeConfig = {
    /**
     * 获取批量选中列表
     * @returns {Array} 批量选中的行列表
     */
    getBatchSelectList: () => {
      return toolBarRef.value.getBatchSelectList();
    },
    /**
     * 获取工具栏参数
     * @returns {Object} 工具栏参数
     */
    getToolBarParams: () => {
      return toolBarRef.value.getToolBarParams();
    },
    /**
     * 获取当前列表数据
     * @returns {Object} 列表数据对象 { list, total }
     */
    getRecordList: () => {
      return recordListRef.value.getRecordList();
    },
    /**
     * 清空搜索参数
     */
    searchParamsClear: () => {
      return toolBarRef.value.searchParamsClear();
    },
    /**
     * 触发搜索
     * @param {Object} params - 搜索参数
     * @param {Object} params.extraParams - 额外参数（持久化）
     * @param {Object} params.tempParams - 临时参数（仅单次调用有效）
     */
    search: (params) => {
      return recordListRef.value.search(params);
    },
    /**
     * 刷新列表（保持当前页码不变）
     * 与 search 的区别：search 会把页码重置为 1，本方法直接复用当前分页/筛选/排序参数重新拉取，
     * 适用于外部操作（如弹窗内新增关联数据）完成后原地刷新列表
     * @param {Object} [tempParams] - 临时参数（仅单次调用有效，调用后不保留）
     */
    refreshList: (tempParams) => {
      return recordListRef.value.refreshList(tempParams);
    },
    /**
     * 清除批量选择状态
     */
    clearBatch: () => {
      toolBarRef.value.clearBatchModeState();
      recordListRef.value.clearSelectedRows();
    },
  };

  // 返回状态和方法集合
  return {
    selectMode,
    setToolBarRef,
    setRecordListRef,
    toolBarEventsHandler,
    recordListEventsHandler,
    defineExposeConfig,
  };
};

// 导出属性和方法
export { recordsManagerProps, recordsManagerEmits, useRecordsManager };
