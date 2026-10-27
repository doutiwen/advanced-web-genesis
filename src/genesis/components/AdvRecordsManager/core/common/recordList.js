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
   * 批量选择模式
   */
  selectMode: {
    type: Boolean,
    default: false,
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
    showPagination,
  },
  emits,
  setFilterList,
  message,
  renderSelectedRowCallback
) => {
  /**
   * 拉取列表数据相关的参数（分页 / 工具栏 / 筛选 / 排序 / 其他参数）
   * 统一收敛到 getListFnParams，_getList 直接把它作为 getList 的入参
   */
  // 当前页码（默认 1，由 search 的 pageParams 更新；分页组件通过该 ref 双向绑定）
  const pageNum = ref(1);
  // 每页条数（默认 20，由 search 的 pageParams 更新；分页组件通过该 ref 双向绑定）
  const pageSize = ref(20);
  // 用 reactive 包裹：内部 ref 经代理访问时自动解包，传给 getList 时即为普通数值
  const getListFnParams = reactive({
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
  });

  /**
   * 其他状态变量
   */
  // 表格数据列表（列配置）
  const columns = ref([]);
  // 表格数据列表
  const list = ref([]);
  // 总条数
  const totalNum = ref(0);
  // 加载状态
  const loading = ref(false);
  // 表单数据（用于可编辑列）
  const formData = ref({});
  // 是否有表单操作列
  let formItemHasOperater = false;
  // 当前页需要回显的选中行（跨页切换时缓存，_getList 完成后消费）
  const currentPageSelectedRows = ref([]);

  emits('getToolBarParams', (toolBarParams) => {
    if (toolBarParams) {
      getListFnParams.toolBarParams = toolBarParams;
    }
  });

  /**
   * 监听列配置变化，更新列列表
   */
  watchEffect(() => {
    columns.value = toValue(columnsConfig).map((sourceCol) => {
      const targetCol = { ...sourceCol };
      if (targetCol.getFilterList) {
        // 设置筛选列表
        setFilterList(targetCol, columns);
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
   * 数据加载完成后恢复选中行状态
   * 通过 rowKeyName(id) 对比缓存中的选中行与当前列表数据，
   * 匹配成功后调用 renderSelectedRowCallback 勾选对应行
   */
  const restoreSelectedRows = () => {
    if (currentPageSelectedRows.value.length > 0 && renderSelectedRowCallback) {
      nextTick(() => {
        const selectedIds = new Set(
          currentPageSelectedRows.value.map((row) => row[toValue(rowKeyName)])
        );
        const matchedRows = list.value.filter((row) =>
          selectedIds.has(row[toValue(rowKeyName)])
        );
        if (matchedRows.length > 0) {
          renderSelectedRowCallback(matchedRows);
        }
        currentPageSelectedRows.value = [];
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
    if (!formData.value[rowKeyValue]) {
      formData.value[rowKeyValue] = { [key]: value };
    } else {
      formData.value[rowKeyValue][key] = value;
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

    for (const colItem of columns.value) {
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
   */
  const _getList = async () => {
    loading.value = true;

    // 直接使用拉取参数对象作为 getList 入参
    // getListFnParams 为 reactive，其中 pageNum/pageSize 访问时已解包为普通数值
    if (getVarType(toValue(getList)) === 'asyncFunction') {
      toValue(getList)(getListFnParams)
        // 返回的 list 与状态变量 list 重名会遮蔽，故解构时重命名为 responseList
        .then(({ list: responseList, total }) => {
          list.value = listFormat(responseList);
          totalNum.value = total;
          emits('listDataGet', { list: responseList, total });
          restoreSelectedRows();
        })
        .catch(() => {
          emits('listDataGet', { list: [], total: 0 });
        })
        .finally(() => {
          loading.value = false;
        });
    } else {
      const { list: responseList, total } = toValue(getList)(getListFnParams);
      list.value = listFormat(responseList);
      totalNum.value = total;
      loading.value = false;
      emits('listDataGet', { list: responseList, total });
      restoreSelectedRows();
    }
  };

  /**
   * 编辑行数据
   * @param {*} keyValue - 行唯一标识值
   * @param {Object} data - 更新的数据
   */
  const editRowData = (keyValue, data) => {
    const targetRow = list.value.find((i) => i[toValue(rowKeyName)] === keyValue);
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
    const index = list.value.findIndex(
      (i) => i[toValue(rowKeyName)] === rowData[toValue(rowKeyName)]
    );

    if (getVarType(columnItem.fn) === 'asyncFunction') {
      columnItem
        .fn(rowData)
        .then((res) => {
          if (columnItem.get) {
            list.value[index][columnItem.key] = columnItem.get(
              formData.value[rowData[toValue(rowKeyName)]][columnItem.key],
              index,
              rowData
            );
          } else {
            list.value[index][columnItem.key] =
              formData.value[rowData[toValue(rowKeyName)]][columnItem.key];
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
            rowData[toValue(rowKeyName)],
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
              refreshRecordList && _getList();
            });
          } else if (getVarType(operaterItem.fn) === 'function') {
            const res = operaterItem.fn(originalRowData);
            if (res?.message && typeof message === 'function') {
              message(res.message);
            }
            res?.refreshRecordList && _getList();
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
                  refreshRecordList && _getList();
                } else {
                  const { refreshRecordList, message: msg } = operaterItem.confirm.fn(rowData);
                  if (msg && typeof message === 'function') {
                    message(msg);
                  }
                  refreshRecordList && _getList();
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
                      refreshRecordList && _getList();
                    });
                } else {
                  const { refreshRecordList, message: msg } = operaterItem.confirm.fn(rowData);
                  if (msg && typeof message === 'function') {
                    message(msg);
                  }
                  refreshRecordList && _getList();
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
            formData.value[rowData[toValue(rowKeyName)]]
          )) {
            setFormData(
              formItemKey,
              rowData[formItemKey],
              rowData[toValue(rowKeyName)],
              columns.value.find((i) => i.key === formItemKey).formItemConfig
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
                formData.value[rowData[toValue(rowKeyName)]]
              )) {
                newRowData[formItemKey] =
                  formData.value[rowData[toValue(rowKeyName)]][formItemKey];
              }
              resetList ? _getList() : editRowData(rowData[toValue(rowKeyName)], newRowData);
            })
            .catch(() => {
              // 恢复原始数据
              for (const formItemKey of Object.keys(
                formData.value[rowData[toValue(rowKeyName)]]
              )) {
                setFormData(
                  formItemKey,
                  rowData[formItemKey],
                  rowData[toValue(rowKeyName)],
                  columns.value.find((i) => i.key === formItemKey).formItemConfig
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
  const search = async (params = {}) => {
    toValue(selectMode) && emits('clearBatch');
    // 只更新本次传入的参数，未传入的参数保持原值
    updateGetListFnParams(params);
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
    columns,
    pageNum,
    pageSize,
    totalNum,
    loading,
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
