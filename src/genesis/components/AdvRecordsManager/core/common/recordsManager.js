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
 * - mergedModalConfig: 合并后的弹窗配置（包含工具栏和操作列的弹窗）
 *
 * 【事件通信】
 * - toolBarEventsHandler: 工具栏事件处理器
 * - recordListEventsHandler: 表格列表事件处理器
 * - modalEventsHandler: 弹窗事件处理器
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
  /**
   * 弹窗配置列表
   */
  modalConfigList: {
    type: Array,
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

const recordsManagerEmits = ['selectRows', 'modalOpen', 'modalClose'];

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

  const modalRef = shallowRef(null);
  const setModalRef = (ref) => {
    modalRef.value = ref;
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
     * 打开弹窗
     * @param {Object} params - 弹窗参数
     * @param {string} params.key - 弹窗标识
     * @param {Object} params.data - 弹窗数据
     * @param {string} params.title - 弹窗标题
     */
    openModal: ({ key, data, title }) => {
      modalRef.value.openModal(key, data, title);
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
     * 打开弹窗
     * @param {Object} params - 弹窗参数
     */
    openModal: ({ key, data, title }) => {
      modalRef.value?.openModal(key, data, title);
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
   * 弹窗事件处理器
   */
  const modalEventsHandler = {
    /**
     * 刷新列表（弹窗操作完成后调用，保持当前页码不变）
     */
    refreshRecordList: () => {
      // 调用 refreshList 而非 search，避免页码被重置为 1
      recordListRef.value.refreshList();
      toolBarRef.value.clearBatchModeState();
      emits('selectRows', toolBarRef.value.getBatchSelectList());
    },
    /**
     * 弹窗打开事件
     * @param {Object} params - 弹窗参数
     */
    modalOpen: ({ key, data }) => {
      emits('modalOpen', { key, data });
    },
    /**
     * 弹窗关闭事件
     * @param {Object} params - 弹窗参数
     */
    modalClose: ({ key, data }) => {
      emits('modalClose', { key, data });
    },
  };

  /**
   * 合并弹窗配置
   * 合并规则：
   * 1. 从操作列(operater)中提取带有 form 配置的项，生成为弹窗配置
   * 2. 从工具栏(toolBar)中提取带有 form 配置的项，生成为弹窗配置
   * 3. 与用户传入的 modalConfigList 合并（相同 key 的配置会被覆盖）
   */
  const mergedModalConfig = computed(() => {
    // 获取工具栏列表
    const toolBarList = toValue(props.toolBarConfig?.list) || [];
    // 列弹窗项集合（包含操作列和普通列）
    const columnModalItems = [];
    // 获取表格列表配置
    const recordListConfig = toValue(props.recordListConfig);
    // 获取用户传入的弹窗配置列表
    const modalConfigList = toValue(props?.modalConfigList)
      ? [...toValue(props?.modalConfigList)]
      : [];

    // 遍历表格列配置，提取操作列和普通列中的弹窗配置
    for (const col of recordListConfig.columnsConfig) {
      if (col.type === 'operater') {
        for (const operaterItem of col.list) {
          if (operaterItem?.modal || (operaterItem.type === 'confirm' && operaterItem.isMsgBox)) {
            const key = operaterItem.key;
            const defaultModalItem = {
              ...(operaterItem?.modal || {}),
              key: key,
            };
            columnModalItems.push(defaultModalItem);
          }
        }
      } else if (col.type === 'openModal' && col?.modal) {
        // 普通列的 openModal 类型，提取弹窗配置
        const key = col.key;
        const defaultModalItem = {
          ...(col?.modal || {}),
          key: key,
        };
        columnModalItems.push(defaultModalItem);
      }
    }
    // 合并列弹窗配置
    for (const columnModalItem of columnModalItems) {
      const sourceModalItem = modalConfigList.find((i) => i.key === columnModalItem.key);
      if (sourceModalItem) {
        // 已有相同 key 的配置，合并覆盖
        Object.assign(sourceModalItem, columnModalItem);
      } else {
        // 没有相同 key 的配置，添加新配置
        modalConfigList.push(columnModalItem);
      }
    }

    // 遍历工具栏列表，提取弹窗配置
    for (const toolBarItem of toolBarList) {
      if (['openModal', 'openMoreSearch'].includes(toolBarItem.type) && toolBarItem?.modal) {
        const key = toolBarItem.key;
        const defaultModalItem = {
          ...(toolBarItem?.modal || {}),
          key,
        };

        // 更多搜索类型的弹窗特殊处理
        if (toolBarItem.type === 'openMoreSearch') {
          Object.assign(defaultModalItem, {
            title: '更多搜索',
            getData(modalData) {
              return modalData;
            },
            okButton: {
              text: '搜索',
              fn(modalData, formData) {
                toolBarEventsHandler.search({ toolBarParams: formData });
                return {
                  close: true,
                  refreshRecordList: false,
                  resetFormData: false,
                };
              },
            },
            cancelButton: {
              text: '重置',
              fn(modalData, formData) {
                // 清空表单数据
                Object.keys(formData).forEach((key) => {
                  formData[key] = undefined;
                });
                toolBarEventsHandler.search({ toolBarParams: formData });
                return {
                  close: true,
                  refreshRecordList: false,
                  resetFormData: false,
                };
              },
            },
          });
        }

        // 合并工具栏弹窗配置
        const sourceModalItem = modalConfigList.find((i) => i.key === key);
        if (sourceModalItem) {
          Object.assign(sourceModalItem, defaultModalItem);
        } else {
          modalConfigList.push(defaultModalItem);
        }
      }
    }

    // 返回合并后的弹窗配置（如果有配置项）
    if (modalConfigList.length) {
      return modalConfigList;
    } else {
      return null;
    }
  });

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
     * 打开弹窗
     * @param {Object} params - 弹窗参数
     * @param {string} params.key - 弹窗标识
     * @param {any} params.data - 弹窗数据
     * @param {string} params.title - 弹窗标题
     */
    openModal: ({ key, data, title }) => {
      return modalRef.value.openModal(key, data, title);
    },
    /**
     * 关闭弹窗
     * @param {Object} params - 弹窗参数
     * @param {string} params.key - 弹窗标识
     * @param {boolean} params.refreshRecordList - 是否刷新列表
     * @param {boolean} params.resetFormData - 是否重置表单数据
     */
    closeModal: ({ key, refreshRecordList, resetFormData }) => {
      return modalRef.value.closeModal(key, refreshRecordList, resetFormData);
    },
    /**
     * 获取弹窗数据
     * @param {string} key - 弹窗标识
     * @returns {Object} 弹窗数据
     */
    getModalData: (key) => {
      return modalRef.value.getModalData(key);
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
    selectMode,
    mergedModalConfig,
    setToolBarRef,
    setRecordListRef,
    setModalRef,
    toolBarEventsHandler,
    recordListEventsHandler,
    modalEventsHandler,
    defineExposeConfig,
  };
};

// 导出属性和方法
export { recordsManagerProps, recordsManagerEmits, useRecordsManager };
