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
 * - selectionFixed: 由工具栏配置派生的固定勾选模式标记
 *
 * 【勾选模式说明】
 * 勾选状态（是否进入勾选模式、勾选了哪些 key）由表格列表模块维护；
 * 工具栏自身的按钮形态（入口 / 确认取消）由工具栏内部维护。
 * 本模块只负责把工具栏事件转成列表动作，并在列表自动退出勾选时复位工具栏按钮。
 *
 * 【通信链路】
 * 对外（组件使用方）：
 * - props 输入：config、selectedRowKeys、pageNum、pageSize、total（由视图层 defineModel 承接）
 * - 事件输出：update:selectedRowKeys、update:pageNum、update:pageSize、update:total
 * - 插槽：toolBar-*、recordList-*
 * - 实例方法：见 defineExposeConfig（含 getRecordListRef / getToolBarRef 逃生舱）
 *
 * 内部（本模块作为容器统一编排）：
 * - ToolBar -> RecordList：search、refreshList、selectionEnter/selectionConfirm/selectionCancel、getSelectedRows
 * - RecordList -> ToolBar：getToolBarParams（拉取搜索参数）、selectModeExit（复位激活按钮）
 * - RecordList -> 使用方：update:selectedRowKeys、update:pageNum/pageSize/total
 * - 配置派生：selectionFixed（工具栏存在 getSelectedRows 项时，列表固定进入勾选模式）
 *
 * 约定：子组件之间不直接互相引用；defineExpose 的方法只面向组件使用方，不作为内部通信接口。
 *
 * 【弹窗说明】
 * 弹窗由按钮自带的 AdvButton.modal 渲染，本模块不再维护集中式弹窗配置。
 */

/**
 * recordsManager 组件属性定义
 * 双向绑定属性（selectedRowKeys / pageNum / pageSize / total）由视图层通过 defineModel 声明
 */
const recordsManagerProps = {
  /**
   * 合并配置对象（必填）
   * 结构：{ toolBar: 工具栏配置对象, ...列表配置对象 }
   */
  config: {
    type: Object,
    required: true,
  },
};

/**
 * 记录管理器核心 hook
 *
 * @param {Object} props - 组件属性
 * @returns {Object} 状态和方法集合
 */
const useRecordsManager = (props) => {
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
   * 合并配置拆分
   * toolBar 字段为工具栏配置，其余字段为表格列表配置
   */
  const toolBarConfig = computed(() => props.config?.toolBar);
  const recordListConfig = computed(() => {
    const { toolBar, ...listConfig } = props.config || {};
    return listConfig;
  });

  /**
   * 工具栏存在 getSelectedRows 项时，列表固定进入勾选模式
   * 以 prop 形式下发给 RecordList，由其在内部保持勾选模式
   */
  const selectionFixed = computed(() => {
    const toolBarItems = props.config?.toolBar?.items;
    return Array.isArray(toolBarItems) && toolBarItems.some((item) => item.type === 'getSelectedRows');
  });

  /**
   * 复位工具栏勾选按钮形态
   */
  const resetToolBarSelection = () => {
    toolBarRef.value?.resetActiveSelection?.();
  };

  /**
   * 工具栏事件处理器
   */
  const toolBarEventsHandler = {
    /**
     * 进入勾选模式
     */
    selectionEnter: () => {
      recordListRef.value?.enterSelectMode();
    },
    /**
     * 确认当前勾选
     * @param {Object} selectionItem - enterSelectMode 工具栏项配置
     */
    selectionConfirm: (selectionItem) => {
      try {
        const selectedRows = recordListRef.value?.getSelectedRows() || [];
        selectionItem.ok?.onClick?.(selectedRows);
      } finally {
        // 无论回调是否抛错，都退出勾选模式，避免工具栏卡在确认/取消态
        recordListRef.value?.exitSelectMode();
      }
    },
    /**
     * 取消当前勾选
     * @param {Object} selectionItem - enterSelectMode 工具栏项配置
     */
    selectionCancel: (selectionItem) => {
      try {
        selectionItem.cancel?.onClick?.();
      } finally {
        recordListRef.value?.exitSelectMode();
      }
    },
    /**
     * 获取当前勾选的行数据
     * @param {Object} selectionItem - getSelectedRows 工具栏项配置
     */
    getSelectedRows: (selectionItem) => {
      const selectedRows = recordListRef.value?.getSelectedRows() || [];
      selectionItem.onClick?.(selectedRows);
    },
    /**
     * 触发搜索
     * @param {Object} params - 搜索参数
     * @param {Function} params.callback - 搜索完成回调
     * @param {Object} params.toolBarParams - 工具栏参数
     */
    search: ({ callback, toolBarParams } = {}) => {
      const searchResult = recordListRef.value?.search({ toolBarParams });
      if (searchResult && typeof searchResult.finally === 'function') {
        searchResult.finally(() => {
          callback && callback();
        });
      } else {
        callback && callback();
      }
    },
    /**
     * 原地刷新列表（保持当前页码）
     * 用于按钮自带弹窗完成操作后的刷新
     */
    refreshList: () => {
      recordListRef.value?.refreshList();
    },
  };

  /**
   * 表格列表事件处理器
   * 勾选与分页的双向绑定由视图层 v-model 处理，这里只处理工具栏相关联动
   */
  const recordListEventsHandler = {
    /**
     * 表格内部退出勾选模式（搜索 / 修改每页条数）
     */
    selectModeExit: () => {
      resetToolBarSelection();
    },
    /**
     * 获取工具栏参数（无工具栏时回调 null）
     * @param {Function} callback - 设置工具栏参数回调
     */
    getToolBarParams: (callback) => {
      callback?.(toolBarRef.value ? toolBarRef.value.getToolBarParams() : null);
    },
  };

  /**
   * 暴露给父组件的方法配置
   */
  const defineExposeConfig = {
    /**
     * 获取列表组件实例（逃生舱，低频能力可直接调用）
     * @returns {Object} RecordList 实例
     */
    getRecordListRef: () => {
      return recordListRef.value;
    },
    /**
     * 获取工具栏组件实例（逃生舱，低频能力可直接调用）
     * @returns {Object} ToolBar 实例
     */
    getToolBarRef: () => {
      return toolBarRef.value;
    },
    /**
     * 获取勾选的 key 列表
     * @returns {Array} key 列表
     */
    getSelectedRowKeys: () => {
      return recordListRef.value.getSelectedRowKeys();
    },
    /**
     * 获取勾选的行对象（缓存中没有时仅返回 key 对象）
     * @returns {Array} 行对象列表
     */
    getSelectedRows: () => {
      return recordListRef.value.getSelectedRows();
    },
    /**
     * 进入勾选模式
     * @param {Array} [keys] - 进入后的初始勾选 key 列表
     */
    enterSelectMode: (keys) => {
      resetToolBarSelection();
      return recordListRef.value.enterSelectMode(keys);
    },
    /**
     * 退出勾选模式并清空勾选
     */
    exitSelectMode: () => {
      resetToolBarSelection();
      return recordListRef.value.exitSelectMode();
    },
    /**
     * 覆盖式设置勾选 key
     * @param {Array} keys - 勾选 key 列表
     */
    setSelectedRowKeys: (keys) => {
      return recordListRef.value.setSelectedRowKeys(keys);
    },
    /**
     * 设置当前页码
     * @param {number} pageNum - 页码（从 1 开始）
     */
    setPage: (pageNum) => {
      return recordListRef.value.setPage(pageNum);
    },
    /**
     * 设置每页条数（会自动回到第 1 页）
     * @param {number} pageSize - 每页条数
     */
    setPageSize: (pageSize) => {
      return recordListRef.value.setPageSize(pageSize);
    },
    /**
     * 只清空勾选，不退出勾选模式
     */
    clearSelection: () => {
      return recordListRef.value.clearSelection();
    },
    /**
     * 获取工具栏参数（无工具栏时返回 null）
     * @returns {Object|null} 工具栏参数
     */
    getToolBarParams: () => {
      return toolBarRef.value ? toolBarRef.value.getToolBarParams() : null;
    },
    /**
     * 获取当前列表数据
     * @returns {Object} 列表数据对象 { list, total }
     */
    getRecordList: () => {
      return recordListRef.value.getRecordList();
    },
    /**
     * 清空搜索参数（无工具栏时为空操作）
     */
    searchParamsClear: () => {
      toolBarRef.value?.searchParamsClear?.();
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
  };

  // 返回状态和方法集合
  return {
    selectionFixed,
    toolBarConfig,
    recordListConfig,
    setToolBarRef,
    setRecordListRef,
    toolBarEventsHandler,
    recordListEventsHandler,
    defineExposeConfig,
  };
};

// 导出属性和方法
export { recordsManagerProps, useRecordsManager };
