/**
 * 表格列表组件属性定义
 */
const recordListProps = {
  getList: {
    type: Function,
    required: true,
  },
  /**
   * 列配置列表（必填）
   */
  columns: {
    type: Array,
    required: true,
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
   * 表单元素激活状态（用于可编辑列）
   */
  formItemActive: {
    type: Boolean,
    default: false,
  },
  /**
   * 列表容器额外样式类名
   */
  wrapperClassName: {
    type: String,
  },
  /**
   * 已选中的行唯一标识列表（根据 rowKeyName 生成）
   */
  selectedRowsKey: {
    type: Array,
    default: () => [],
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
  'update:selectedRowsKey', // 更新选中行列表
];

const formItemTypes = ['input', 'select', 'treeSelect'];

// 列配置格式化
const columnCfgFormat = (sourceColCfg) => {
  const formatColCfg = { ...sourceColCfg };

  if (!sourceColCfg?.attrs) {
    formatColCfg.attrs = {};
  }

  switch (sourceColCfg.type) {
    case 'confirm':
      if (!sourceColCfg?.confirm?.text) {
        formatColCfg.confirm.text = '确认';
      }
      if (!sourceColCfg?.title) {
        formatColCfg.title = `是否确认该操作？`;
      }
      if (!sourceColCfg?.cancel) {
        formatColCfg.cancel = {
          text: '取消',
        };
      } else if (!sourceColCfg.cancel?.text) {
        formatColCfg.cancel.text = '取消';
      }
      break;
  }
  if (formatColCfg.getFilterList) {
    // 设置筛选列表
    setFilterList(formatColCfg, _columns);
  }
  return formatColCfg;
};

/**
 * 表格列表核心 hook
 *
 * @param {Object} props - 组件属性
 * @param {Function} emits - 事件发射函数
 * @param {Function} setFilterList - 设置筛选列表函数
 * @param {Function} uiMessage - 消息提示方法
 * @returns {Object} 状态和方法集合
 */
const useRecordList = ({
  props,
  emits,
  setFilterList,
  uiMessage,
  uiMessageBox,
  renderSelectedRowCallback,
}) => {
  const { getList, columns, rowKeyName, formItemActive } = props;

  // 表格数据列表（列配置）
  const _columns = columns.map((sourceCol) => columnCfgFormat(sourceCol));
  const colKeyToCfgMap = Object.fromEntries(_columns.map((i) => [i.key, i]));
  // 表格数据列表
  const list = ref([]);
  const rowKeyToRowMap = computed(() => {
    const map = {};
    for (const item of list.value) {
      map[item[_rowKeyName]] = item;
    }
    return map;
  });
  const hasFormItemColumn = computed(() => {
    return _columns.value.some((colItem) => formItemTypes.includes(colItem.type));
  });

  /**
   * 拉取列表数据相关的参数（分页 / 工具栏 / 筛选 / 排序 / 其他参数）
   * 统一收敛到 getListFnParams，_getList 直接把它作为 getList 的入参
   */
  const getListFnParams = {
    // 分页参数
    pageParams: {
      pageNum,
      pageSize,
    },
    // 工具栏参数
    toolBarParams: null,
    // 筛选参数
    filterParams: null,
    // 排序参数
    sorterParams: null,
    // 其他参数（由 search 的 extraParams 更新）
    extraParams: null,
  };

  const _rowKeyName = toValue(rowKeyName);
  // 加载状态
  const loading = ref(false);
  // 表单数据（用于可编辑列）
  const formData = ref({});
  // 是否有表单操作列
  let formItemHasOperater = false;

  const selectMode = ref(false);
  const selectedRowsKey = new Set();
  let isUserSelect = false;

  emits('getToolBarParams', (toolBarParams) => {
    if (toolBarParams) {
      getListFnParams.toolBarParams = toolBarParams;
    }
  });

  // 进入选择模式
  const entrySelectMode = () => {
    selectMode.value = true;
  };

  // 退出选择模式(清空所有选中行状态)
  const exitSelectMode = () => {
    selectedRowsKey.clear();
    emits('update:selectedRowsKey', []);
    selectMode.value = false;
  };

  // 获取所有页码的选中行唯一标识
  const getAllSelectedRowsKey = () => {
    return [...selectedRowsKey];
  };

  const selectRowHandle = (currentPageSelectedRows, currentToggleRow) => {
    const currentRowChecked = currentPageSelectedRows.find(
      (row) => row[_rowKeyName] === currentToggleRow[_rowKeyName]
    );
    if (currentRowChecked) {
      selectedRowsKey.add(currentToggleRow[_rowKeyName]);
    } else {
      selectedRowsKey.delete(currentToggleRow[_rowKeyName]);
    }
    isUserSelect = true;
    emits('update:selectedRowsKey', getAllSelectedRowsKey());
  };

  const selectAllRowsHandle = (currentPageToggleRows) => {
    if (currentPageToggleRows?.length) {
      for (const row of currentPageToggleRows) {
        selectedRowsKey.add(row[_rowKeyName]);
      }
    } else {
      for (const row of list.value) {
        selectedRowsKey.delete(row[_rowKeyName]);
      }
    }
    isUserSelect = true;
    emits('update:selectedRowsKey', getAllSelectedRowsKey());
  };

  /**
   * 数据加载完成后恢复选中行状态
   * 通过 rowKeyName(id) 对比缓存中的选中行与当前列表数据，
   * 匹配成功后调用 renderSelectedRowCallback 勾选对应行
   */
  const restoreSelectedRows = () => {
    if (selectMode.value) {
      const matchedRows = list.value.filter((row) => selectedRowsKey.has(row[_rowKeyName]));
      if (matchedRows.length) {
        nextTick(() => {
          renderSelectedRowCallback(matchedRows);
        });
      }
    }
  };

  watch(
    () => props.selectedRowsKey,
    (newV, oldV) => {
      if (selectMode.value && !isUserSelect) {
        if (newV?.length) {
          selectedRowsKey.clear();
          for (const row of newV) {
            selectedRowsKey.add(row[_rowKeyName]);
          }
        } else {
          selectedRowsKey.clear();
        }
        restoreSelectedRows();
      }
      isUserSelect = false;
    }
  );

  /**
   * 监听列配置变化，更新列列表
   */
  watchEffect(() => {
    _columns.value = columns.map((sourceCol) => {
      const targetCol = { ...sourceCol };
      if (targetCol.getFilterList) {
        // 设置筛选列表
        setFilterList(targetCol, _columns);
      }
      return targetCol;
    });
  });

  /**
   * 设置筛选参数
   * @param {Object} filterParams - 筛选参数
   */
  const setFilterParams = (filterParams) => {
    getListFnParams.filterParams = filterParams;
  };

  /**
   * 清空筛选参数
   */
  const clearFilterParams = () => {
    getListFnParams.filterParams = null;
  };

  /**
   * 设置排序参数
   * @param {Object} sorterParams - 排序参数
   */
  const setSorterParams = (sorterParams) => {
    getListFnParams.sorterParams = sorterParams;
  };

  /**
   * 清空排序参数
   */
  const clearSorterParams = () => {
    getListFnParams.sorterParams = null;
  };

  /**
   * 设置当前页需要回显的选中行（由 recordsManager 在切换分页时调用）
   * @param {Array} rows - 选中行列表
   */
  const setCurrentPageSelectedRows = (rows) => {
    currentPageSelectedRows.value = rows || [];
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
  const setFormData = (key, sourceRowData) => {
    const data = sourceRowData[key];
    const rowKey = sourceRowData[_rowKeyName];
    if (!formData.value[rowKey]) {
      formData.value[rowKey] = { [key]: data };
    } else {
      formData.value[rowKey][key] = data;
    }
  };

  /**
   * 单个节点格式化
   * @param {Object} sourceRowData - 原始行数据
   * @param {number} rowIndex - 全局行号（原始遍历序号）
   * @param {number} siblingIndex - 兄弟节点序号（0 起，树形结构下为当前节点在兄弟节点中的位置）
   * @param {number} level - 节点层级（根节点为 1）
   * @returns {Object} 格式化后的节点数据
   */
  const rowFormat = (sourceRowData, rowIndex, siblingIndex, level) => {
    const targetItem = JSON.parse(JSON.stringify(sourceRowData));
    // 保留源数据中的 Symbol 属性（如 isRoot、isLeaf 等）
    const allSymbols = Object.getOwnPropertySymbols(sourceRowData);
    for (const sym of allSymbols) {
      targetItem[sym] = sourceRowData[sym];
    }
    targetItem[Symbol.for('index')] = siblingIndex + 1;
    targetItem[Symbol.for('level')] = level;
    targetItem[Symbol.for('sourceData')] = sourceRowData;
    targetItem[Symbol.for('formItemDebounceTimer')] = {};

    Reflect.deleteProperty(targetItem, 'children');
    let operaterCol;

    for (const colItem of _columns.value) {
      const key = colItem.key;
      const sourceValue = sourceRowData[key];

      if (colItem.get) {
        if (getVarType(colItem.get) === 'asyncFunction') {
          colItem.get(sourceValue, rowIndex, sourceRowData).then((res) => {
            targetItem[key] = res;
          });
        } else {
          targetItem[key] = colItem.get(sourceValue, rowIndex, sourceRowData);
        }
      }

      if (formItemTypes.includes(colItem.type)) {
        setFormData(key, sourceRowData);
        targetItem[Symbol.for('formItemDisable')] = !formItemActive;
        targetItem[Symbol.for('formItemDebounceTimer')][key] = null;
      }

      if (colItem.type === 'operater') {
        operaterCol = colItem;
      }
    }

    if (operaterCol) {
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
              sourceRowData,
              rowIndex
            );
          } else {
            targetItem[Symbol.for(`operater-${operaterItem.key}-show`)] = true;
          }
        } else {
          targetItem[Symbol.for(`operater-${operaterItem.key}-show`)] = true;
          formItemHasOperater = true;
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
      const rowFormatted = rowFormat(node, rowIndex, siblingIndex, level);
      rowIndex++;

      if (parent) {
        parent.children.push(rowFormatted);
      } else {
        result.push(rowFormatted);
      }

      if (node.children && Array.isArray(node.children)) {
        for (let i = node.children.length - 1; i >= 0; i--) {
          stack.push({ node: node.children[i], parent: rowFormatted, level: level + 1 });
        }
      }
    }

    return result;
  };

  /**
   * 获取列表数据
   */
  const _getList = async () => {
    const getListFn = toValue(getList);
    if (getVarType(getListFn) === 'asyncFunction') {
      loading.value = true;
      getListFn(getListFnParams)
        .then(({ list: resList, total }) => {
          list.value = listFormat(resList);
          restoreSelectedRows();
        })
        .finally(() => {
          loading.value = false;
        });
    } else {
      const { list: resList, total } = getListFn(getListFnParams);
      list.value = listFormat(resList);
      restoreSelectedRows();
    }
  };

  /**
   * 编辑行数据
   * @param {*} keyValue - 行唯一标识值
   * @param {Object} data - 更新的数据
   */
  const editRowData = (rowKey, data) => {
    const targetRow = rowKeyToRowMap.value[rowKey];
    if (targetRow) {
      Object.assign(targetRow, data);
    }
  };

  /**
   * 执行表单项函数
   * @param {Object} columnItem - 列配置
   * @param {Object} rowData - 行数据
   */
  const exceformItemFn = (columnItem, rowKey) => {
    const index = list.value.findIndex((i) => i[_rowKeyName] === rowKey);
    const targetRow = rowKeyToRowMap.value[rowKey];
    if (getVarType(columnItem.fn) === 'asyncFunction') {
      columnItem
        .fn(rowData)
        .then((res) => {
          if (columnItem.get) {
            list.value[index][columnItem.key] = columnItem.get(
              formData.value[rowData[_rowKeyName]][columnItem.key],
              index,
              rowData
            );
          } else {
            list.value[index][columnItem.key] =
              formData.value[rowData[_rowKeyName]][columnItem.key];
          }
          if (res?.refreshRecordList) {
            _getList();
          }
        })
        .catch(() => {
          // 恢复原始数据
          setFormData(
            columnItem.key,
            rowData[columnItem.key],
            rowData[_rowKeyName],
            columnItem.formItemConfig
          );
        });
    } else {
      const res = columnItem.fn(rowData);
      if (res?.refreshRecordList) {
        _getList();
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
    if (!formItemHasOperater && columnItem.fn && !rowData[Symbol.for('formItemDisable')]) {
      if (columnItem.debounce || formItemConfig.type === 'input') {
        // 防抖处理
        const rowkeyValue = rowData[_rowKeyName];
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

  const excuteClickFnBackParams = (backParams) => {
    if (backParams?.message) {
      uiMessage(backParams.message);
    }
    if (backParams?.reloadList) {
      _getList();
    }
  };

  const buttonClickHandle = (itemCfg, sourceRowData) => {
    if (itemCfg?.onClick) {
      if (getVarType(itemCfg.onClick) === 'asyncFunction') {
        itemCfg.onClick(sourceRowData).then((res) => {
          excuteClickFnBackParams(res);
        });
      } else if (getVarType(itemCfg.onClick) === 'function') {
        const res = itemCfg.onClick(sourceRowData);
        excuteClickFnBackParams(res);
      }
    }
  };

  const openModalHandle = (itemCfg, sourceRowData) => {
    emits('openModal', {
      key: itemCfg.key,
      data: sourceRowData,
    });
  };

  const confirmHandle = (itemCfg, sourceRowData, confirmType) => {
    if (itemCfg.isPopconfirm) {
      // 使用 popconfirm 方式
      switch (payload) {
        case 'confirm': {
          if (itemCfg?.confirm?.onClick) {
            if (getVarType(itemCfg.confirm.onClick) === 'asyncFunction') {
              itemCfg.confirm.onClick(sourceRowData).then((res) => {
                excuteClickFnBackParams(res);
              });
            } else {
              const res = itemCfg.confirm.onClick(sourceRowData);
              excuteClickFnBackParams(res);
            }
          }
          break;
        }
        case 'cancel': {
          if (itemCfg?.cancel?.onClick) {
            itemCfg.cancel.onClick(sourceRowData);
          }
          break;
        }
      }
    } else {
      // 使用 MessageBox 方式
      uiMessageBox({
        title: itemCfg,
        okButtonText: itemCfg.okButton.text,
        okButtonClick() {
          if (getVarType(itemCfg.confirm.onClick) === 'asyncFunction') {
            itemCfg.confirm.onClick(sourceRowData).then((res) => {
              excuteClickFnBackParams(res);
            });
          } else {
            const res = itemCfg.confirm.onClick(sourceRowData);
            excuteClickFnBackParams(res);
          }
        },
        cancelButtonText: itemCfg.cancelButton.text,
        cancelButtonClick() {
          itemCfg?.cancel?.onClick?.(sourceRowData);
        },
      });
    }
  };

  const downloadHandle = (itemCfg, sourceRowData) => {
    itemCfg.fn(sourceRowData).then((res) => {
      download(res);
    });
  };

  /**
   * 操作项事件处理器
   * @param {Object} operaterItem - 操作项配置
   * @param {Object} rowData - 行数据
   * @param {*} payload - 附加参数
   */
  const operaterItemEventHandler = (operaterItem, rowData, payload) => {
    const sourceRowData = rowData[Symbol.for('sourceData')];
    switch (operaterItem.type) {
      case 'openModal': {
        // 打开弹窗
        openModalHandle(operaterItem, sourceRowData);
        break;
      }
      case 'button': {
        // 普通按钮
        buttonClickHandle(operaterItem, sourceRowData);
        break;
      }
      case 'confirm': {
        // 确认操作 - 支持两种方式：popconfirm 和 messageBox
        confirmHandle(operaterItem, sourceRowData, payload);
        break;
      }
      case 'download': {
        // 下载操作
        downloadHandle(operaterItem, sourceRowData);
        break;
      }
      case 'formItemOperater': {
        // 表单操作器
        const operateType = payload;
        if (operateType === 'entry') {
          // 进入编辑模式
          editRowData(rowData[_rowKeyName], {
            [Symbol.for('formItemDisable')]: false,
          });
        } else if (operateType === 'exit') {
          // 退出编辑模式
          editRowData(rowData[_rowKeyName], {
            [Symbol.for('formItemDisable')]: true,
          });
          // 恢复原始数据
          for (const formItemKey of Object.keys(formData.value[rowData[_rowKeyName]])) {
            setFormData(
              formItemKey,
              rowData[formItemKey],
              rowData[_rowKeyName],
              _columns.value.find((i) => i.key === formItemKey).formItemConfig
            );
          }
        } else if (operateType === 'submit') {
          // 提交表单
          editRowData(rowData[_rowKeyName], {
            [Symbol.for('operater-formItemOperater-loading')]: true,
          });
          operaterItem
            .fn(sourceRowData)
            .then((resetList) => {
              const newRowData = {};
              for (const formItemKey of Object.keys(formData.value[rowData[_rowKeyName]])) {
                newRowData[formItemKey] = formData.value[rowData[_rowKeyName]][formItemKey];
              }
              resetList ? _getList() : editRowData(rowData[_rowKeyName], newRowData);
            })
            .catch(() => {
              // 恢复原始数据
              for (const formItemKey of Object.keys(formData.value[rowData[_rowKeyName]])) {
                setFormData(
                  formItemKey,
                  rowData[formItemKey],
                  rowData[_rowKeyName],
                  _columns.value.find((i) => i.key === formItemKey).formItemConfig
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
  const columnEventHandler = (columnConfig, rowData, payload) => {
    const sourceRowData = rowData[Symbol.for('sourceData')];
    switch (columnConfig.type) {
      case 'button': {
        // 普通按钮
        buttonClickHandle(operaterItem, sourceRowData);
        break;
      }
      case 'confirm': {
        // 确认操作 - 支持两种方式：popconfirm 和 messageBox
        confirmHandle(operaterItem, sourceRowData, payload);
        break;
      }
      case 'download': {
        // 下载文件
        downloadHandle(columnConfig, sourceRowData);
        break;
      }
      case 'openModal': {
        // 打开弹窗（仿照 operaterItem 中的 openModal 类型，传递原样数据）
        openModalHandle(columnConfig, sourceRowData);
        break;
      }
    }
  };

  const clearSelectRows = () => {};

  /**
   * 用搜索传入的参数更新 getListFnParams
   * 规则：参数对象中存在该键则更新；值为 null 则清空；不存在该键则保持原值
   * @param {Object} params - 搜索参数
   */
  const updateGetListFnParams = (params) => {
    for (const key of Object.keys(getListFnParams)) {
      // 未传入该参数时不处理，保留上一次的取值
      if (!(key in params)) {
        continue;
      }
      const value = params[key];
      if (key !== 'pageParams') {
        // 其余参数直接覆盖，传 null 即为清空
        getListFnParams[key] = value;
      } else if (value == null) {
        // 分页参数传 null：清空并恢复默认分页
        pageNum.value = 1;
        pageSize.value = 20;
      } else {
        // 分页参数只更新传入的字段，未传入的字段保持原值
        if (value.pageNum !== undefined) {
          pageNum.value = value.pageNum;
        }
        if (value.pageSize !== undefined) {
          pageSize.value = value.pageSize;
        }
      }
    }
  };

  /**
   * 搜索函数
   * @param {Object} params - 搜索参数
   * @param {Object} [params.pageParams] - 分页参数 { pageNum, pageSize }，传 null 恢复默认分页
   * @param {Object} [params.toolBarParams] - 工具栏参数，传 null 清空
   * @param {Object} [params.filterParams] - 筛选参数，传 null 清空
   * @param {Object} [params.sorterParams] - 排序参数，传 null 清空
   * @param {Object} [params.extraParams] - 额外参数（持久化），传 null 清空
   */
  const getListBySearchParams = async (searchParams) => {
    if (searchParams) {
      updateGetListFnParams(searchParams);
    }
    getListFnParams.pageParams.pageNum = 1;
    toValue(selectMode) && emits('clearBatch');
    await _getList();
  };

  const getListByPageParams = async (papeParams) => {
    if (papeParams) {
      if (pageParams?.pageNum) {
        getListFnParams.pageParams.pageNum = pageParams.pageNum;
      }
      if (pageParams?.pageSize) {
        if (pageParams.pageSize != getListFnParams.pageParams.pageSize) {
          getListFnParams.pageParams.pageSize = pageParams.pageSize;
          toValue(selectMode) && emits('clearBatch');
        }
      }
    }
    await _getList();
  };

  /**
   * 监听页码变化
   */
  watch(pageNum, (newVal) => {
    if (toValue(selectMode)) {
      emits('getPageBatchList', newVal);
    }
    _getList();
  });

  /**
   * 监听每页条数变化
   */
  watch(pageSize, () => {
    toValue(selectMode) && emits('clearBatch');
    if (pageNum.value !== 1) {
      pageNum.value = 1;
    } else {
      _getList();
    }
  });

  /**
   * 初始化：加载数据
   */
  _getList();

  /**
   * 暴露给父组件的方法配置
   */
  const defineExposeConfig = {
    search,
    setCurrentPageSelectedRows,
    /**
     * 刷新列表（保持当前页码不变）
     */
    refreshList: _getList,
  };

  // 返回状态和方法集合
  return {
    list,
    _columns,
    formData,
    formItemInputEventHandler,
    operaterItemEventHandler,
    columnEventHandler,
    setFilterParams,
    clearFilterParams,
    setSorterParams,
    clearSorterParams,
    setCurrentPageSelectedRows,
    search,
    defineExposeConfig,
  };
};

// 导出属性、事件和方法
export { recordListProps, recordListEmits, useRecordList };
