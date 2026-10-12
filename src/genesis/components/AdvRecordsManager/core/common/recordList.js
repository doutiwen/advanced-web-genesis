/**
 * recordList 模块 - 表格列表核心逻辑
 *
 * 【模块功能】
 * 提供表格列表组件的属性定义、事件定义和核心 hook，负责表格数据的获取、渲染、排序、筛选和交互。
 *
 * 【核心组件】
 * 1. recordListProps: 组件属性定义
 * 2. recordListEmits: 组件事件定义
 * 3. useRecordList: 核心 hook，管理表格状态和交互逻辑
 *
 * 【列类型】
 * | 类型 | 说明 | 示例 |
 * |------|------|------|
 * | default | 默认文本列 | 姓名、编号 |
 * | index | 序号列 | 自动生成序号 |
 * | custom | 自定义渲染列 | 状态标签、操作按钮 |
 * | link | 链接列 | 点击跳转 |
 * | openModal | 弹窗列 | 点击打开弹窗 |
 * | formItem | 可编辑表单项列 | 开关、输入框 |
 * | operater | 操作列 | 查看、编辑、删除按钮 |
 * | fileList | 文件列表列 | 附件列表 |
 *
 * 【状态管理】
 * - list: 表格数据列表
 * - listDict: 表格数据字典（按 rowKeyName 索引）
 * - pageNum: 当前页码
 * - pageSize: 每页条数
 * - totalNum: 总条数
 * - loading: 加载状态
 * - formData: 表单数据（用于可编辑列）
 * - filterParams: 筛选参数
 * - sorterParams: 排序参数
 * - toolBarParams: 工具栏参数
 * - extraParams: 额外参数（持久化）
 */

/**
 * 表格列表组件属性定义
 */
const recordListProps = {
  /**
   * 获取列表数据的函数（必填）
   * @param {Object} params - 查询参数
   * @param {Object} params.pageParams - 分页参数
   * @param {Object} params.toolBarParams - 工具栏参数
   * @param {Object} params.sorterParams - 排序参数
   * @param {Object} params.filterParams - 筛选参数
   * @param {Object} params.extraParams - 额外参数（持久化，每次请求都会携带）
   * @param {Object} params.tempParams - 临时参数（仅单次调用有效，调用后不保留）
   * @returns {Object|Promise<Object>} 数据对象 { list, total }
   */
  getList: {
    type: Function,
    required: true,
  },
  /**
   * 列配置列表（必填）
   */
  columnsConfig: {
    type: Array,
    required: true,
  },
  /**
   * 批量选择模式
   */
  selectMode: {
    type: Boolean,
    default: false,
  },
  selectable: {
    type: Function,
  },
  /**
   * 已选中的行列表
   */
  selectedRows: {
    type: Array,
    default: () => [],
  },
  /**
   * 行唯一标识字段名
   */
  rowKeyName: {
    type: String,
    default: 'id',
  },
  /**
   * 表格属性
   */
  attrs: {
    type: Object,
    default: () => ({}),
  },
  /**
   * 表格事件
   */
  events: {
    type: Object,
    default: () => ({}),
  },
  /**
   * 分页配置
   */
  paginationConfig: {
    type: Object,
    default: () => ({}),
  },
  /**
   * 表单元素激活状态（用于可编辑列）
   */
  formItemActive: {
    type: Boolean,
    default: false,
  },
  /**
   * 是否显示分页
   */
  showPagination: {
    type: Boolean,
    default: true,
  },
  /**
   * 表格样式
   */
  style: {
    type: String,
  },
  /**
   * 额外参数（持久化，每次请求都会携带）
   */
  extraParams: {
    type: Object,
  },
  /**
   * 当前页码（支持双向绑定）
   */
  pageNum: {
    type: Number,
  },
  /**
   * 每页条数（支持双向绑定）
   */
  pageSize: {
    type: Number,
  },
  /**
   * 列表容器额外样式类名
   */
  recordListWrapClass: {
    type: String,
  },
};

/**
 * 表格列表组件事件定义
 */
const recordListEmits = [
  'getPageBatchList', // 获取批量列表（切换分页时）
  'selectRows', // 选中行事件
  'clearBatch', // 清除批量选择
  'openModal', // 打开弹窗
  'getToolBarParams', // 获取工具栏参数
  'listDataGet', // 列表数据获取完成
  'update:pageNum', // 更新页码（双向绑定）
  'update:pageSize', // 更新每页条数（双向绑定）
];

/**
 * 获取行的原始数据（后端返回的原样数据）
 * formatNode 中通过 Symbol.for('originalData') 保留原始行数据，
 * openModal 传递原样数据，由弹窗内表单/内容组件按需处理（如解密）。
 * @param {Object} rowData - 格式化后的行节点
 * @returns {Object} 原始行数据
 */
const getOriginalRowData = (rowData) => rowData?.[Symbol.for('originalData')] ?? rowData;

/**
 * 表格列表核心 hook
 *
 * @param {Object} props - 组件属性
 * @param {Function} emits - 事件发射函数
 * @param {Function} setFilterList - 设置筛选列表函数
 * @param {Function} message - 消息提示方法
 * @returns {Object} 状态和方法集合
 */
const useRecordList = (
  {
    getList,
    columnsConfig,
    selectMode,
    rowKeyName,
    formItemActive,
    extraParams,
    showPagination,
    pageNum: propsPageNum,
    pageSize: propsPageSize,
  },
  emits,
  setFilterList,
  message,
  renderSelectedRowCallback
) => {
  /**
   * 状态管理对象
   */
  const state = {
    // 表格数据列表
    columns: ref([]),
    // 表格数据列表
    list: ref([]),
    // 表格数据字典（按 rowKeyName 索引）
    listDict: computed(() => {
      const dictInfo = {};
      for (const rowItem of state.list.value) {
        dictInfo[rowItem[toValue(rowKeyName)]] = rowItem;
      }
      return dictInfo;
    }),
    // 当前页码（优先使用 props 值）
    pageNum: ref(toValue(propsPageNum) ?? 1),
    // 每页条数（优先使用 props 值）
    pageSize: ref(toValue(propsPageSize) ?? 20),
    // 总条数
    totalNum: ref(0),
    // 加载状态
    loading: ref(false),
    // 表单数据（用于可编辑列）
    formData: ref({}),
    // 筛选参数
    filterParams: null,
    // 排序参数
    sorterParams: null,
    // 工具栏参数
    toolBarParams: null,
    // 其他参数
    extraParams: toValue(extraParams) || null,
    // 是否有表单操作列
    formItemHasOperater: false,
    // 当前页需要回显的选中行（跨页切换时缓存，getListData 完成后消费）
    currentPageSelectedRows: ref([]),
  };

  emits('getToolBarParams', (toolBarParams) => {
    if (toolBarParams) {
      state.toolBarParams = toolBarParams;
    }
  });

  /**
   * 监听列配置变化，更新列列表
   */
  watchEffect(() => {
    state.columns.value = toValue(columnsConfig).map((sourceCol) => {
      const targetCol = { ...sourceCol };
      if (targetCol.getFilterList) {
        // 设置筛选列表
        setFilterList(targetCol, state.columns);
      }
      return targetCol;
    });
  });

  /**
   * 监听外部 pageNum 变化，同步到内部状态
   */
  watch(
    () => toValue(propsPageNum),
    (val) => {
      if (val !== undefined && val !== state.pageNum.value) {
        state.pageNum.value = val;
      }
    }
  );

  /**
   * 监听外部 pageSize 变化，同步到内部状态
   */
  watch(
    () => toValue(propsPageSize),
    (val) => {
      if (val !== undefined && val !== state.pageSize.value) {
        state.pageSize.value = val;
      }
    }
  );

  /**
   * 设置筛选参数
   * @param {Object} filterParams - 筛选参数
   */
  const setFilterParams = (filterParams) => {
    state.filterParams = filterParams;
  };

  /**
   * 清空筛选参数
   */
  const clearFilterParams = () => {
    state.filterParams = null;
  };

  /**
   * 设置排序参数
   * @param {Object} sorterParams - 排序参数
   */
  const setSorterParams = (sorterParams) => {
    state.sorterParams = sorterParams;
  };

  /**
   * 清空排序参数
   */
  const clearSorterParams = () => {
    state.sorterParams = null;
  };

  /**
   * 获取当前列表数据
   * @returns {Object} 列表数据对象 { list, total }
   */
  const getRecordList = () => {
    return {
      list: state.list.value,
      total: state.totalNum.value,
    };
  };

  /**
   * 设置当前页需要回显的选中行（由 recordsManager 在切换分页时调用）
   * @param {Array} rows - 选中行列表
   */
  const setCurrentPageSelectedRows = (rows) => {
    state.currentPageSelectedRows.value = rows || [];
  };

  /**
   * 数据加载完成后恢复选中行状态
   * 通过 rowKeyName(id) 对比缓存中的选中行与当前列表数据，
   * 匹配成功后调用 renderSelectedRowCallback 勾选对应行
   */
  const restoreSelectedRows = () => {
    if (state.currentPageSelectedRows.value.length > 0 && renderSelectedRowCallback) {
      nextTick(() => {
        const selectedIds = new Set(
          state.currentPageSelectedRows.value.map((row) => row[toValue(rowKeyName)])
        );
        const matchedRows = state.list.value.filter((row) =>
          selectedIds.has(row[toValue(rowKeyName)])
        );
        if (matchedRows.length > 0) {
          renderSelectedRowCallback(matchedRows);
        }
        state.currentPageSelectedRows.value = [];
      });
    }
  };

  /**
   * 下载文件
   * @param {Object} params - 下载参数
   * @param {string} params.url - 文件URL
   * @param {string} params.name - 文件名
   */
  const download = ({ url, name }) => {
    const aEle = document.createElement('a');
    aEle.href = url;
    aEle.download = name;
    aEle.style.display = 'none';
    document.body.appendChild(aEle);
    aEle.click();
    aEle.parentNode.removeChild(aEle);
  };

  /**
   * 设置表单数据
   * @param {string} key - 字段名
   * @param {*} sourceValue - 原始值
   * @param {*} rowKeyValue - 行唯一标识值
   * @param {Object} formConfig - 表单配置
   */
  const setFormData = (key, sourceValue, rowKeyValue, formConfig) => {
    let value = sourceValue;
    if (formConfig.set) {
      value = formConfig.set(sourceValue, key);
    }
    if (!state.formData.value[rowKeyValue]) {
      state.formData.value[rowKeyValue] = { [key]: value };
    } else {
      state.formData.value[rowKeyValue][key] = value;
    }
  };

  /**
   * 单个节点格式化
   * @param {Object} sourceRowItem - 原始行数据
   * @param {number} rowIndex - 全局行号（原始遍历序号）
   * @param {number} siblingIndex - 兄弟节点序号（0 起，树形结构下为当前节点在兄弟节点中的位置）
   * @param {number} level - 节点层级（根节点为 1）
   * @returns {Object} 格式化后的节点数据
   */
  const formatNode = (sourceRowItem, rowIndex, siblingIndex, level) => {
    const targetItem = JSON.parse(JSON.stringify(sourceRowItem));
    // 保留源数据中的 Symbol 属性（如 isRoot、isLeaf 等）
    const allSymbols = Object.getOwnPropertySymbols(sourceRowItem);
    for (const sym of allSymbols) {
      targetItem[sym] = sourceRowItem[sym];
    }
    targetItem[Symbol.for('index')] = siblingIndex + 1;
    targetItem[Symbol.for('level')] = level;
    targetItem[Symbol.for('originalData')] = sourceRowItem;
    delete targetItem.children;
    let operaterCol;

    for (const colItem of state.columns.value) {
      const key = colItem.key;
      const sourceValue = sourceRowItem[key];

      if (colItem.get) {
        if (getVarType(colItem.get) === 'asyncFunction') {
          colItem.get(sourceValue, rowIndex, sourceRowItem).then((res) => {
            targetItem[key] = res;
          });
        } else {
          targetItem[key] = colItem.get(sourceValue, rowIndex, sourceRowItem);
        }
      }

      if (colItem.type === 'formItem') {
        setFormData(key, sourceValue, sourceRowItem[toValue(rowKeyName)], colItem.formItemConfig);
        targetItem[Symbol.for('formItemDisable')] = toValue(toValue(formItemActive)) ? false : true;

        if (!targetItem[Symbol.for('formItemDebounceTimer')]) {
          targetItem[Symbol.for('formItemDebounceTimer')] = { [key]: null };
        } else {
          Object.assign(targetItem[Symbol.for('formItemDebounceTimer')], {
            [key]: null,
          });
        }
      }

      if (colItem.type === 'operater') {
        operaterCol = colItem;
      }
    }

    if (operaterCol?.list) {
      for (const operaterItem of operaterCol.list) {
        if (operaterItem.type !== 'formItemOperater') {
          if (operaterItem.show) {
            let showFn;
            if (typeof operaterItem.show === 'string') {
              if (/[><=]/.test(operaterItem.show)) {
                const codeString = `return ${operaterItem.show.replace(
                  /(\w+)(<=?|>=?|==)/g,
                  'rowData.$1$2'
                )}`;
                showFn = new Function('rowData', codeString);
              } else {
                const codeString = `return !!rowData.${operaterItem.show}`;
                const showFn = new Function('rowData', codeString);
              }
            } else if (typeof operaterItem.show === 'function') {
              showFn = operaterItem.show;
            }
            targetItem[Symbol.for(`operater-${operaterItem.key}-show`)] = showFn(
              sourceRowItem,
              rowIndex
            );
          } else {
            targetItem[Symbol.for(`operater-${operaterItem.key}-show`)] = true;
          }
        } else {
          targetItem[Symbol.for(`operater-${operaterItem.key}-show`)] = true;
          state.formItemHasOperater = true;
          targetItem[Symbol.for('operater-formItemOperater-loading')] = false;
        }
      }
    }
    return targetItem;
  };

  /**
   * 列表数据格式化（支持树形结构）
   * @param {Array} sourceList - 原始数据列表（支持扁平列表和树形结构）
   * @returns {Array} 格式化后的数据列表
   */
  const listFormat = (sourceList) => {
    const result = [];
    const stack = [];
    let rowIndex = 0;

    for (let i = sourceList.length - 1; i >= 0; i--) {
      stack.push({ node: sourceList[i], parent: null, level: 1 });
    }

    while (stack.length > 0) {
      const { node, parent, level } = stack.pop();
      let siblingIndex;
      if (parent) {
        // 先确保父节点的 children 数组存在，再取其长度作为兄弟序号
        if (!parent.children) {
          parent.children = [];
        }
        siblingIndex = parent.children.length;
      } else {
        // 根节点按顶层顺序
        siblingIndex = result.length;
      }
      const formattedNode = formatNode(node, rowIndex, siblingIndex, level);
      rowIndex++;

      if (parent) {
        parent.children.push(formattedNode);
      } else {
        result.push(formattedNode);
      }

      if (node.children && Array.isArray(node.children)) {
        for (let i = node.children.length - 1; i >= 0; i--) {
          stack.push({ node: node.children[i], parent: formattedNode, level: level + 1 });
        }
      }
    }

    return result;
  };

  /**
   * 获取列表数据
   * @param {Object} tempParams - 临时参数（仅单次调用有效）
   */
  const getListData = async (tempParams) => {
    state.loading.value = true;
    const getListFnParams = {};

    // 组装分页参数
    getListFnParams.pageParams = {
      pageNum: state.pageNum.value,
      pageSize: state.pageSize.value,
    };

    // 组装其他参数
    state.toolBarParams && (getListFnParams.toolBarParams = state.toolBarParams);
    state.sorterParams && (getListFnParams.sorterParams = state.sorterParams);
    state.filterParams && (getListFnParams.filterParams = state.filterParams);
    toValue(extraParams) && (getListFnParams.extraParams = toValue(extraParams));
    tempParams && (getListFnParams.tempParams = tempParams);

    // 清理空值参数
    for (const paramsType of Object.keys(getListFnParams)) {
      for (const key of Object.keys(getListFnParams[paramsType])) {
        if (!notEmptyValue(getListFnParams[paramsType][key])) {
          Reflect.deleteProperty(getListFnParams[paramsType], key);
        }
      }
      if (!Object.keys(getListFnParams[paramsType]).length) {
        Reflect.deleteProperty(getListFnParams, paramsType);
      }
    }

    // 调用获取数据函数
    if (getVarType(toValue(getList)) === 'asyncFunction') {
      toValue(getList)(getListFnParams)
        .then(({ list, total }) => {
          state.list.value = listFormat(list);
          state.totalNum.value = total;
          emits('listDataGet', { list, total });
          restoreSelectedRows();
        })
        .catch(() => {
          emits('listDataGet', { list: [], total: 0 });
        })
        .finally(() => {
          state.loading.value = false;
        });
    } else {
      const { list, total } = toValue(getList)(getListFnParams);
      state.list.value = listFormat(list);
      state.totalNum.value = total;
      state.loading.value = false;
      emits('listDataGet', { list, total });
      restoreSelectedRows();
    }
  };

  /**
   * 编辑行数据
   * @param {*} keyValue - 行唯一标识值
   * @param {Object} data - 更新的数据
   */
  const editRowData = (keyValue, data) => {
    const targetRow = state.list.value.find((i) => i[toValue(rowKeyName)] === keyValue);
    if (targetRow) {
      Object.assign(targetRow, data);
    }
  };

  /**
   * 执行表单项函数
   * @param {Object} columnItem - 列配置
   * @param {Object} rowData - 行数据
   */
  const exceformItemFn = (columnItem, rowData) => {
    const index = state.list.value.findIndex(
      (i) => i[toValue(rowKeyName)] === rowData[toValue(rowKeyName)]
    );

    if (getVarType(columnItem.fn) === 'asyncFunction') {
      columnItem
        .fn(rowData)
        .then((res) => {
          if (columnItem.get) {
            state.list.value[index][columnItem.key] = columnItem.get(
              state.formData.value[rowData[toValue(rowKeyName)]][columnItem.key],
              index,
              rowData
            );
          } else {
            state.list.value[index][columnItem.key] =
              state.formData.value[rowData[toValue(rowKeyName)]][columnItem.key];
          }
          if (res?.refreshRecordList) {
            getListData();
          }
        })
        .catch(() => {
          // 恢复原始数据
          setFormData(
            columnItem.key,
            rowData[columnItem.key],
            rowData[toValue(rowKeyName)],
            columnItem.formItemConfig
          );
        });
    } else {
      const res = columnItem.fn(rowData);
      if (res?.refreshRecordList) {
        getListData();
      }
    }
  };

  /**
   * 表单项输入事件处理器
   * @param {Object} columnItem - 列配置
   * @param {Object} rowData - 行数据
   * @param {*} sourceEvent - 事件对象
   */
  const formItemInputEventHandler = (columnItem, rowData, sourceEvent) => {
    const formItemConfig = columnItem.formItemConfig;
    if (!state.formItemHasOperater && columnItem.fn && !rowData[Symbol.for('formItemDisable')]) {
      if (columnItem.debounce || formItemConfig.type === 'input') {
        // 防抖处理
        const rowkeyValue = rowData[toValue(rowKeyName)];
        const time = columnItem.debounce || 2000;
        if (rowData[Symbol.for('formItemDebounceTimer')][columnItem.key]) {
          clearTimeout(rowData[Symbol.for('formItemDebounceTimer')][columnItem.key]);
        }
        rowData[Symbol.for('formItemDebounceTimer')][columnItem.key] = setTimeout(() => {
          exceformItemFn(columnItem, rowData);
          rowData[Symbol.for('formItemDebounceTimer')][columnItem.key] = null;
        }, time);
      } else {
        // 立即执行
        exceformItemFn(columnItem, rowData);
      }
    }
  };

  /**
   * 操作项事件处理器
   * @param {Object} operaterItem - 操作项配置
   * @param {Object} rowData - 行数据
   * @param {*} payload - 附加参数
   */
  const operaterItemEventHandler = (operaterItem, rowData, payload) => {
    const originalRowData = getOriginalRowData(rowData);
    switch (operaterItem.type) {
      case 'openModal': {
        // 打开弹窗（传递原样数据，由弹窗内表单解密展示）
        emits('openModal', {
          key: operaterItem.key,
          data: originalRowData,
        });
        break;
      }
      case 'button': {
        // 普通按钮
        if (operaterItem?.fn) {
          if (getVarType(operaterItem.fn) === 'asyncFunction') {
            operaterItem.fn(originalRowData).then(({ refreshRecordList, message: msg } = {}) => {
              if (msg && typeof message === 'function') {
                message(msg);
              }
              refreshRecordList && getListData();
            });
          } else if (getVarType(operaterItem.fn) === 'function') {
            const res = operaterItem.fn(originalRowData);
            if (res?.message && typeof message === 'function') {
              message(res.message);
            }
            res?.refreshRecordList && getListData();
          }
        }
        break;
      }
      case 'confirm': {
        // 确认操作 - 支持两种方式：el-popconfirm 和 ElMessageBox
        if (operaterItem.isMsgBox) {
          // 使用 ElMessageBox 方式
          const noticeMsg = operaterItem?.confirm?.title
            ? operaterItem?.confirm?.title
            : `是否确认${operaterItem.text}？`;
          ElMessageBox.confirm(noticeMsg, '提示', {
            confirmButtonText: operaterItem.confirm?.text || '确认',
            cancelButtonText: operaterItem?.cancel?.text || '取消',
            type: 'warning',
          })
            .then(async () => {
              if (operaterItem?.confirm?.fn) {
                if (getVarType(operaterItem.confirm.fn) === 'asyncFunction') {
                  const { refreshRecordList, message: msg } =
                    await operaterItem.confirm.fn(originalRowData);
                  if (msg && typeof message === 'function') {
                    message(msg);
                  }
                  refreshRecordList && getListData();
                } else {
                  const { refreshRecordList, message: msg } = operaterItem.confirm.fn(rowData);
                  if (msg && typeof message === 'function') {
                    message(msg);
                  }
                  refreshRecordList && getListData();
                }
              }
            })
            .catch((err) => {
              if (err === 'cancel') {
                operaterItem?.cancel?.fn?.(originalRowData);
              }
            });
        } else {
          // 使用 el-popconfirm 方式（通过 payload 区分 confirm/cancel）
          switch (payload) {
            case 'confirm': {
              if (operaterItem?.confirm.fn) {
                if (getVarType(operaterItem.confirm.fn) === 'asyncFunction') {
                  operaterItem.confirm
                    .fn(originalRowData)
                    .then(({ refreshRecordList, message: msg }) => {
                      if (msg && typeof message === 'function') {
                        message(msg);
                      }
                      refreshRecordList && getListData();
                    });
                } else {
                  const { refreshRecordList, message: msg } = operaterItem.confirm.fn(rowData);
                  if (msg && typeof message === 'function') {
                    message(msg);
                  }
                  refreshRecordList && getListData();
                }
              }
              break;
            }
            case 'cancel': {
              if (operaterItem?.cancel?.fn) {
                operaterItem.cancel.fn(originalRowData);
              }
              break;
            }
          }
        }
        break;
      }
      case 'download': {
        // 下载操作
        operaterItem.fn(originalRowData).then(({ url, name }) => {
          download({ url, name });
        });
        break;
      }
      case 'formItemOperater': {
        // 表单操作器
        const operateType = payload;
        if (operateType === 'entry') {
          // 进入编辑模式
          editRowData(rowData[toValue(rowKeyName)], {
            [Symbol.for('formItemDisable')]: false,
          });
        } else if (operateType === 'exit') {
          // 退出编辑模式
          editRowData(rowData[toValue(rowKeyName)], {
            [Symbol.for('formItemDisable')]: true,
          });
          // 恢复原始数据
          for (const formItemKey of Object.keys(
            state.formData.value[rowData[toValue(rowKeyName)]]
          )) {
            setFormData(
              formItemKey,
              rowData[formItemKey],
              rowData[toValue(rowKeyName)],
              state.columns.value.find((i) => i.key === formItemKey).formItemConfig
            );
          }
        } else if (operateType === 'submit') {
          // 提交表单
          editRowData(rowData[toValue(rowKeyName)], {
            [Symbol.for('operater-formItemOperater-loading')]: true,
          });
          operaterItem
            .fn(originalRowData)
            .then((resetList) => {
              const newRowData = {};
              for (const formItemKey of Object.keys(
                state.formData.value[rowData[toValue(rowKeyName)]]
              )) {
                newRowData[formItemKey] =
                  state.formData.value[rowData[toValue(rowKeyName)]][formItemKey];
              }
              resetList ? getListData() : editRowData(rowData[toValue(rowKeyName)], newRowData);
            })
            .catch(() => {
              // 恢复原始数据
              for (const formItemKey of Object.keys(
                state.formData.value[rowData[toValue(rowKeyName)]]
              )) {
                setFormData(
                  formItemKey,
                  rowData[formItemKey],
                  rowData[toValue(rowKeyName)],
                  state.columns.value.find((i) => i.key === formItemKey).formItemConfig
                );
              }
            })
            .finally(() => {
              rowData[Symbol.for('formItemDisable')] = true;
              rowData[Symbol.for('operater-formItemOperater-loading')] = false;
            });
        }
        break;
      }
    }
  };

  /**
   * 列事件处理器
   * @param {Object} columnConfig - 列配置
   * @param {Object} rowData - 行数据
   */
  const columnEventHandler = (columnConfig, rowData) => {
    switch (columnConfig.type) {
      case 'viewDetail': {
        // 查看详情
        if (!columnConfig.openType || columnConfig.openType === 'modal') {
          emits('openModal', {
            key: columnConfig.modalKey,
            data: getOriginalRowData(rowData),
          });
        } else if (columnConfig.openType === 'window') {
          columnConfig.fn(rowData).then(({ url, name, param }) => {
            window.open(url, name, param);
          });
        }
        break;
      }
      case 'download': {
        // 下载文件
        columnConfig.fn(rowData).then(({ url, name }) => {
          download({ url, name });
        });
        break;
      }
      case 'openModal': {
        // 打开弹窗（仿照 operaterItem 中的 openModal 类型，传递原样数据）
        emits('openModal', {
          key: columnConfig.key,
          data: getOriginalRowData(rowData),
        });
        break;
      }
    }
  };

  /**
   * 搜索函数
   * @param {Object} params - 搜索参数
   * @param {Object} params.tempParams - 临时参数（仅单次调用有效）
   * @param {Object} params.extraParams - 额外参数（持久化）
   * @param {Object} params.toolBarParams - 工具栏参数
   */
  const search = async ({ tempParams, extraParams, toolBarParams } = {}) => {
    toValue(selectMode) && emits('clearBatch');
    state.pageNum.value = 1;
    toolBarParams && (state.toolBarParams = toolBarParams);
    extraParams && (state.extraParams = extraParams);
    await getListData(tempParams);
  };

  /**
   * 监听页码变化
   */
  watch(state.pageNum, (newVal) => {
    if (newVal !== toValue(propsPageNum)) {
      emits('update:pageNum', newVal);
    }
    if (toValue(selectMode)) {
      emits('getPageBatchList', newVal);
    }
    getListData();
  });

  /**
   * 监听每页条数变化
   */
  watch(state.pageSize, (newVal) => {
    if (newVal !== toValue(propsPageSize)) {
      emits('update:pageSize', newVal);
    }
    toValue(selectMode) && emits('clearBatch');
    if (state.pageNum.value !== 1) {
      state.pageNum.value = 1;
    } else {
      getListData();
    }
  });

  /**
   * 初始化：加载数据
   */
  getListData();

  /**
   * 暴露给父组件的方法配置
   */
  const defineExposeConfig = {
    search,
    getRecordList,
    setCurrentPageSelectedRows,
    /**
     * 刷新列表（保持当前页码不变）
     * @param {Object} tempParams - 临时参数（仅单次调用有效）
     */
    refreshList: getListData,
  };

  // 返回状态和方法集合
  return {
    list: state.list,
    columns: state.columns,
    pageNum: state.pageNum,
    pageSize: state.pageSize,
    totalNum: state.totalNum,
    loading: state.loading,
    formData: state.formData,
    formItemInputEventHandler,
    operaterItemEventHandler,
    columnEventHandler,
    setFilterParams,
    clearFilterParams,
    setSorterParams,
    clearSorterParams,
    setCurrentPageSelectedRows,
    getListData,
    search,
    getRecordList,
    defineExposeConfig,
  };
};

// 导出属性、事件和方法
export { recordListProps, recordListEmits, useRecordList };
