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
 * | openModal | 弹窗列 | 按钮自带 modal，点击打开 |
 * | formItem | 可编辑表单项列 | 开关、输入框 |
 * | fileList | 文件列表列 | 附件列表 |
 *
 * 【操作列】
 * 操作列不再作为 cols 中的一种列类型，而是由独立的 operater 属性配置，
 * 结构为 { key, title, width, UiProps, buttons }。
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
 * - selectMode: 是否处于勾选模式（由工具栏 enterSelectMode 项驱动）
 * - selectedRowKeys: 已勾选行的 key（唯一数据源，跨页）
 *
 * 【勾选模式】
 * 勾选数据只存 key，勾选变化通过"当前页快照 + 本次选中集合"做 diff，
 * 行对象从缓存（rowObjectCache）按 key 还原，缓存中没有时仅返回 key 对象。
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
  cols: {
    type: Array,
    required: true,
  },
  /**
   * 操作列配置
   * 结构：{ key, title, width, UiProps, buttons: [...] }
   */
  operater: {
    type: Object,
  },
  /**
   * 已选中的行 key 列表（由记录管理器下发，受控）
   */
  selectedRowKeys: {
    type: Array,
    default: () => [],
  },
  /**
   * 是否固定勾选模式（为 true 时列表始终保持勾选模式，不可退出）
   */
  selectionFixed: {
    type: Boolean,
    default: false,
  },
  /**
   * 行唯一标识字段名
   */
  rowKeyName: {
    type: String,
    default: 'id',
  },
  /**
   * 表格 UI 属性
   */
  UiProps: {
    type: Object,
    default: () => ({}),
  },
  /**
   * 表格 UI 事件
   */
  UiEvents: {
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
   * 总条数（支持双向绑定）
   */
  total: {
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
  'update:selectedRowKeys', // 勾选 key 变化（唯一勾选事件）
  'selectModeExit', // 内部退出勾选模式（搜索/改每页条数时）

  'getToolBarParams', // 获取工具栏参数
  'update:pageNum', // 更新页码（双向绑定）
  'update:pageSize', // 更新每页条数（双向绑定）
  'update:total', // 更新总条数（双向绑定）
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
 * 格式化勾选 key 列表：去重并剔除空值，保持原有顺序
 * @param {Array} keys - key 列表
 * @returns {Array} 处理后的 key 列表
 */
const normalizeRowKeys = (keys) => {
  if (!Array.isArray(keys)) return [];
  const seen = new Set();
  const result = [];
  for (const key of keys) {
    if (key === undefined || key === null || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
};

/**
 * 判断两个 key 列表是否等价（忽略顺序）
 * @param {Array} a - key 列表 A
 * @param {Array} b - key 列表 B
 * @returns {boolean} 是否等价
 */
const isSameRowKeys = (a, b) => {
  if (a.length !== b.length) return false;
  const targetSet = new Set(b);
  return a.every((key) => targetSet.has(key));
};

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
    cols,
    operater,
    rowKeyName,
    formItemActive,
    extraParams,
    selectedRowKeys: propsSelectedRowKeys,
    selectionFixed: propsSelectionFixed,
    pageNum: propsPageNum,
    pageSize: propsPageSize,
    total: propsTotal,
  },
  emits,
  setFilterList,
  message,
  renderSelectedRowCallback,
  clearSelectedRowCallback
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
    totalNum: ref(toValue(propsTotal) ?? 0),
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
    // 是否处于勾选模式（由工具栏的 enterSelectMode 项驱动）
    selectMode: ref(false),
    // 是否固定勾选模式（工具栏存在 getSelectedRows 项时为 true，不可退出）
    selectionFixed: ref(!!toValue(propsSelectionFixed)),
    // 已勾选行的 key（唯一数据源，跨页、去重）
    selectedRowKeys: ref(normalizeRowKeys(toValue(propsSelectedRowKeys))),
  };

  /**
   * 行对象缓存：key -> 行数据
   * 仅用于把 key 还原成行对象，不作为勾选数据源
   */
  const rowObjectCache = new Map();

  /**
   * 当前页上一次的勾选 key 快照，用于与本次勾选做 diff
   */
  let pageSelectionSnapshot = [];

  /**
   * 程序化改勾选时的同步锁，防止把内部操作误判为用户取消
   */
  let isSelectionSyncing = false;

  emits('getToolBarParams', (toolBarParams) => {
    if (toolBarParams) {
      state.toolBarParams = toolBarParams;
    }
  });

  /**
   * 操作列配置（响应式）
   */
  const operaterConfig = computed(() => toValue(operater));

  /**
   * 监听列配置变化，更新列列表
   */
  watchEffect(() => {
    state.columns.value = toValue(cols).map((sourceCol) => {
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
   * 监听外部 total 变化，同步到内部状态
   */
  watch(
    () => toValue(propsTotal),
    (val) => {
      if (val !== undefined && val !== state.totalNum.value) {
        state.totalNum.value = val;
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
   * 设置当前页码
   * @param {number} pageNum - 页码（从 1 开始）
   */
  const setPage = (pageNum) => {
    const targetPageNum = Number(pageNum);
    if (!Number.isFinite(targetPageNum) || targetPageNum < 1) return;
    state.pageNum.value = targetPageNum;
  };

  /**
   * 设置每页条数（会自动回到第 1 页）
   * @param {number} pageSize - 每页条数
   */
  const setPageSize = (pageSize) => {
    const targetPageSize = Number(pageSize);
    if (!Number.isFinite(targetPageSize) || targetPageSize < 1) return;
    state.pageSize.value = targetPageSize;
  };

  /**
   * 获取行的 key
   * @param {Object} row - 行数据
   * @returns {*} 行 key
   */
  const getRowKey = (row) => row?.[toValue(rowKeyName)];

  /**
   * 缓存行对象，供 key 还原为行对象使用
   * @param {Array} rows - 行数据列表
   */
  const cacheRows = (rows) => {
    for (const row of rows || []) {
      const key = getRowKey(row);
      if (key !== undefined && key !== null) {
        rowObjectCache.set(key, row);
      }
    }
  };

  /**
   * 通知外部勾选 key 变化
   */
  const emitSelectedRowKeys = () => {
    emits('update:selectedRowKeys', [...state.selectedRowKeys.value]);
  };

  /**
   * 清空表格勾选（加同步锁，避免触发快照 diff）
   */
  const clearTableSelection = () => {
    isSelectionSyncing = true;
    clearSelectedRowCallback?.();
    isSelectionSyncing = false;
  };

  /**
   * 数据加载完成后回显当前页的勾选行
   * 以 selectedRowKeys 与当前页数据按 rowKeyName 求交集
   */
  const restoreSelectedRows = () => {
    if (!state.selectMode.value) return;
    isSelectionSyncing = true;
    nextTick(() => {
      const selectedKeySet = new Set(state.selectedRowKeys.value);
      const matchedRows = state.list.value.filter((row) => selectedKeySet.has(getRowKey(row)));
      if (matchedRows.length > 0) {
        renderSelectedRowCallback?.(matchedRows);
      }
      cacheRows(matchedRows);
      pageSelectionSnapshot = matchedRows.map((row) => getRowKey(row));
      isSelectionSyncing = false;
    });
  };

  /**
   * 覆盖式应用勾选 key
   * @param {Array} keys - 新的勾选 key 列表
   */
  const applySelectedRowKeys = (keys) => {
    state.selectedRowKeys.value = normalizeRowKeys(keys);
    pageSelectionSnapshot = [];
    if (state.selectMode.value) {
      clearTableSelection();
      restoreSelectedRows();
    }
  };

  /**
   * 表格行选择事件处理器
   * 用当前页快照与本次勾选做 diff，得出真正新增/取消的行
   * @param {Array} rows - 当前页选中的行列表
   */
  const recordListSelectEvent = (rows) => {
    if (!state.selectMode.value || isSelectionSyncing) return;
    cacheRows(rows);

    const nextKeys = normalizeRowKeys((rows || []).map((row) => getRowKey(row)));
    const prevKeySet = new Set(pageSelectionSnapshot);
    const nextKeySet = new Set(nextKeys);
    const removedKeys = pageSelectionSnapshot.filter((key) => !nextKeySet.has(key));
    const addedKeys = nextKeys.filter((key) => !prevKeySet.has(key));

    if (removedKeys.length) {
      const removedKeySet = new Set(removedKeys);
      state.selectedRowKeys.value = state.selectedRowKeys.value.filter(
        (key) => !removedKeySet.has(key)
      );
    }
    if (addedKeys.length) {
      const selectedKeySet = new Set(state.selectedRowKeys.value);
      const nextSelectedKeys = [...state.selectedRowKeys.value];
      for (const key of addedKeys) {
        if (!selectedKeySet.has(key)) {
          selectedKeySet.add(key);
          nextSelectedKeys.push(key);
        }
      }
      state.selectedRowKeys.value = nextSelectedKeys;
    }

    pageSelectionSnapshot = nextKeys;
    if (removedKeys.length || addedKeys.length) {
      emitSelectedRowKeys();
    }
  };

  /**
   * 进入勾选模式
   * @param {Array} [keys] - 进入后的初始勾选 key 列表
   */
  const enterSelectMode = (keys) => {
    // 清掉表格中可能残留的勾选
    clearTableSelection();
    state.selectMode.value = true;
    state.selectedRowKeys.value = normalizeRowKeys(keys);
    pageSelectionSnapshot = [];
    restoreSelectedRows();
    emitSelectedRowKeys();
  };

  /**
   * 退出勾选模式并清空勾选
   * 固定勾选模式下只清空勾选，不退出
   */
  const exitSelectMode = () => {
    if (state.selectionFixed.value) {
      clearSelection();
      return;
    }
    clearTableSelection();
    state.selectMode.value = false;
    state.selectedRowKeys.value = [];
    pageSelectionSnapshot = [];
    emitSelectedRowKeys();
    emits('selectModeExit');
  };

  /**
   * 激活勾选模式（保留当前勾选 key，用于固定勾选模式的自动进入）
   */
  const activateSelectionMode = () => {
    if (state.selectMode.value) return;
    state.selectMode.value = true;
    pageSelectionSnapshot = [];
    restoreSelectedRows();
  };

  /**
   * 固定勾选模式 prop 同步
   * 开启时自动进入勾选模式（保留已传入的 key）且不可退出；关闭时若处于勾选模式则退出
   * @param {boolean} fixed - 是否固定勾选模式
   */
  const applySelectionFixed = (fixed) => {
    state.selectionFixed.value = !!fixed;
    if (state.selectionFixed.value) {
      activateSelectionMode();
    } else if (state.selectMode.value) {
      exitSelectMode();
    }
  };

  watch(() => toValue(propsSelectionFixed), applySelectionFixed);

  // 初始即为固定勾选模式时，挂载后进入勾选模式
  onMounted(() => {
    if (state.selectionFixed.value) {
      activateSelectionMode();
    }
  });

  /**
   * 只清空勾选，不退出勾选模式
   */
  const clearSelection = () => {
    clearTableSelection();
    state.selectedRowKeys.value = [];
    pageSelectionSnapshot = [];
    emitSelectedRowKeys();
  };

  /**
   * 覆盖式设置勾选 key（程序化调用）
   * @param {Array} keys - 勾选 key 列表
   */
  const setSelectedRowKeys = (keys) => {
    applySelectedRowKeys(keys);
    emitSelectedRowKeys();
  };

  /**
   * 获取勾选的行对象
   * 缓存中存在返回完整行，否则仅返回包含 key 的对象
   * @returns {Array} 行对象列表
   */
  const getSelectedRows = () => {
    return state.selectedRowKeys.value.map((key) => {
      return rowObjectCache.get(key) ?? { [toValue(rowKeyName)]: key };
    });
  };

  /**
   * 获取勾选的 key 列表
   * @returns {Array} key 列表
   */
  const getSelectedRowKeys = () => [...state.selectedRowKeys.value];

  /**
   * 监听外部 selectedRowKeys 变化，覆盖式同步
   */
  watch(
    () => toValue(propsSelectedRowKeys),
    (val) => {
      const nextKeys = normalizeRowKeys(val);
      if (isSameRowKeys(nextKeys, state.selectedRowKeys.value)) return;
      applySelectedRowKeys(nextKeys);
    },
    { deep: true }
  );

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
    const targetItem = ref(JSON.parse(JSON.stringify(sourceRowItem)));
    // 保留源数据中的 Symbol 属性（如 isRoot、isLeaf 等）
    const allSymbols = Object.getOwnPropertySymbols(sourceRowItem);
    for (const sym of allSymbols) {
      targetItem.value[sym] = sourceRowItem[sym];
    }
    targetItem.value[Symbol.for('index')] = siblingIndex + 1;
    targetItem.value[Symbol.for('level')] = level;
    targetItem.value[Symbol.for('originalData')] = sourceRowItem;
    delete targetItem.value.children;

    for (const colItem of state.columns.value) {
      const key = colItem.key;
      const sourceValue = sourceRowItem[key];

      if (colItem.get) {
        if (getVarType(colItem.get) === 'asyncFunction') {
          colItem.get(sourceValue, rowIndex, sourceRowItem).then((res) => {
            targetItem.value[key] = res;
          });
        } else {
          targetItem.value[key] = colItem.get(sourceValue, rowIndex, sourceRowItem);
        }
      }

      if (colItem.type === 'formItem') {
        setFormData(key, sourceValue, sourceRowItem[toValue(rowKeyName)], colItem.formItemConfig);
        targetItem.value[Symbol.for('formItemDisable')] = toValue(toValue(formItemActive))
          ? false
          : true;

        if (!targetItem.value[Symbol.for('formItemDebounceTimer')]) {
          targetItem.value[Symbol.for('formItemDebounceTimer')] = { [key]: null };
        } else {
          Object.assign(targetItem.value[Symbol.for('formItemDebounceTimer')], {
            [key]: null,
          });
        }
      }
    }

    if (operaterConfig.value?.buttons) {
      for (const operaterItem of operaterConfig.value.buttons) {
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
            targetItem.value[Symbol.for(`operater-${operaterItem.key}-show`)] = showFn(
              sourceRowItem,
              rowIndex
            );
          } else {
            targetItem.value[Symbol.for(`operater-${operaterItem.key}-show`)] = true;
          }
        } else {
          targetItem.value[Symbol.for(`operater-${operaterItem.key}-show`)] = true;
          state.formItemHasOperater = true;
          targetItem.value[Symbol.for('operater-formItemOperater-loading')] = false;
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
      const formattedNode = toValue(formatNode(node, rowIndex, siblingIndex, level));
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
    // 数据即将替换，先作废旧页快照，避免替换过程中的勾选事件误删跨页数据
    pageSelectionSnapshot = [];
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
    state.extraParams && (getListFnParams.extraParams = state.extraParams);
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
          cacheRows(state.list.value);
          state.totalNum.value = total;
          emits('update:total', total);
          restoreSelectedRows();
        })
        .catch(() => {
          // 请求失败时保留当前列表与总数，仅结束加载态
        })
        .finally(() => {
          state.loading.value = false;
        });
    } else {
      const { list, total } = toValue(getList)(getListFnParams);
      state.list.value = listFormat(list);
      cacheRows(state.list.value);
      state.totalNum.value = total;
      state.loading.value = false;
      emits('update:total', total);
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
      case 'button': {
        // 统一按钮：confirm / download / modal 已由 AdvButton 处理，这里只执行动作
        const action = operaterItem?.onClick;
        if (typeof action === 'function') {
          if (getVarType(action) === 'asyncFunction') {
            action(originalRowData).then(({ refreshRecordList, message: msg } = {}) => {
              if (msg && typeof message === 'function') {
                message(msg);
              }
              refreshRecordList && getListData();
            });
          } else if (getVarType(action) === 'function') {
            const res = action(originalRowData);
            if (res?.message && typeof message === 'function') {
              message(res.message);
            }
            res?.refreshRecordList && getListData();
          }
        }
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
            .onClick(originalRowData)
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
   * 解析操作列按钮的 AdvButton 属性
   * 行相关的文案、取消回调与弹窗入参在这里绑定
   * @param {Object} operaterItem - 操作项配置
   * @param {Object} rowData - 格式化后的行数据
   * @returns {Object} AdvButton 属性
   */
  const resolveOperaterButtonProps = (operaterItem, rowData) => {
    const originalRowData = getOriginalRowData(rowData);
    const { confirm, download, modal, modalPayload, UiProps, buttonAttrs } = operaterItem;

    const buttonProps = {
      size: 'small',
      link: true,
      type: 'primary',
      ...(buttonAttrs || {}),
      ...(UiProps || {}),
      onClick: () => operaterItemEventHandler(operaterItem, rowData),
      // 弹窗内操作完成后刷新当前页数据
      onReloadList: () => getListData(),
    };

    // 确认文案与取消回调绑定当前行数据（未配置的字段保持缺省，交给 AdvButton 默认值）
    if (confirm) {
      const mergedConfirm = { ...confirm };
      if (typeof confirm.notice === 'function') {
        mergedConfirm.notice = (event) => confirm.notice(originalRowData, event);
      }
      if (typeof confirm.onCancel === 'function') {
        mergedConfirm.onCancel = (event) => confirm.onCancel(originalRowData, event);
      }
      buttonProps.confirm = mergedConfirm;
    }

    // 下载：函数形态时把行数据交给调用方
    if (download) {
      buttonProps.download =
        typeof download === 'function' ? () => download(originalRowData) : download;
    }

    // 按钮自带弹窗：行数据作为打开入参
    if (modal) {
      buttonProps.modal = modal;
      buttonProps.modalPayload =
        typeof modalPayload === 'function'
          ? () => modalPayload(originalRowData)
          : (modalPayload ?? originalRowData);
    }

    return buttonProps;
  };

  /**
   * 列事件处理器
   * 链接列 / 弹窗列的自定义动作；列表管理器不再集中打开弹窗
   * @param {Object} columnConfig - 列配置
   * @param {Object} rowData - 行数据
   */
  const columnEventHandler = (columnConfig, rowData) => {
    if (typeof columnConfig.onClick === 'function') {
      columnConfig.onClick(getOriginalRowData(rowData));
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
    // 搜索会改变数据范围，退出勾选模式并清空勾选
    state.selectMode.value && exitSelectMode();
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
    getListData();
  });

  /**
   * 监听每页条数变化
   */
  watch(state.pageSize, (newVal) => {
    if (newVal !== toValue(propsPageSize)) {
      emits('update:pageSize', newVal);
    }
    // 每页条数变化会使原有勾选失去意义，退出勾选模式
    state.selectMode.value && exitSelectMode();
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
    refreshList: getListData,
    setPage,
    setPageSize,
    enterSelectMode,
    exitSelectMode,
    clearSelection,
    setSelectedRowKeys,
    getSelectedRowKeys,
    getSelectedRows,
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
    selectMode: state.selectMode,
    selectedRowKeys: state.selectedRowKeys,
    formItemInputEventHandler,
    operaterItemEventHandler,
    resolveOperaterButtonProps,
    columnEventHandler,
    setFilterParams,
    clearFilterParams,
    setSorterParams,
    clearSorterParams,
    getListData,
    search,
    getRecordList,
    defineExposeConfig,
    recordListSelectEvent,
  };
};

// 导出属性、事件和方法
export { recordListProps, recordListEmits, useRecordList };
