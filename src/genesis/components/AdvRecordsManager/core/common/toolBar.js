/**
 * toolBar 模块 - 工具栏核心逻辑
 *
 * 【模块功能】
 * 提供工具栏组件的属性定义、事件定义和核心 hook，负责工具栏的渲染、交互和状态管理。
 *
 * 【核心组件】
 * 1. toolBarProps: 组件属性定义
 * 2. toolBarEmits: 组件事件定义
 * 3. useToolBar: 核心 hook，管理工具栏状态和交互逻辑
 *
 * 【工具栏项类型】
 * | 类型 | 说明 | 示例 |
 * |------|------|------|
 * | input | 输入框 | 搜索框 |
 * | select | 下拉选择 | 状态筛选 |
 * | treeSelect | 树形选择 | 部门选择 |
 * | checkbox | 多选框 | 批量筛选 |
 * | date | 日期选择 | 时间范围 |
 * | time | 时间选择 | 时间段 |
 * | batch | 批量操作按钮 | 批量删除 |
 * | openModal | 打开弹窗按钮 | 添加按钮 |
 * | openMoreSearch | 更多搜索按钮 | 高级搜索 |
 * | button | 普通按钮 | 导出按钮 |
 * | searchButton | 搜索按钮 | 搜索/清空 |
 * | import | 导入按钮 | Excel导入 |
 * | download | 下载按钮 | 导出Excel |
 *
 * 【状态管理】
 * - toolBarItemlist: 工具栏项列表
 * - toolBarItemDict: 工具栏项字典（按 key 索引）
 * - formData: 表单数据
 * - batchInfo: 批量选择信息
 * - currentBatchInfo: 当前批量选择信息
 * - buttonLoadingInfo: 按钮加载状态
 * - toolBarFormItemFocus: 表单焦点状态
 */

/**
 * 工具栏组件属性定义
 */
const toolBarProps = {
  /**
   * 工具栏配置对象（必填）
   */
  config: {
    type: Object,
    required: true,
  },
};

/**
 * 工具栏组件事件定义
 */
const toolBarEmits = [
  'enterBatchMode', // 进入批量选择模式
  'exitBatchMode', // 退出批量选择模式
  'openModal', // 打开弹窗
  'focus', // 表单聚焦
  'blur', // 表单失焦
  'search', // 触发搜索
];

/**
 * 工具栏核心 hook
 *
 * @param {Object} params - 参数对象
 * @param {Object} params.config - 工具栏配置
 * @param {Function} emits - 事件发射函数
 * @param {Function} UIAttrsTransform - UI 属性转换函数
 * @returns {Object} 状态和方法集合
 */
const useToolBar = ({ config }, emits, UIAttrsTransform, message) => {
  /**
   * 状态管理对象
   */
  const state = {
    // 工具栏项列表
    toolBarItemlist: ref([]),
    // 工具栏项字典（按 key 索引）
    toolBarItemDict: computed(() => {
      const dictInfo = {};
      for (const item of state.toolBarItemlist.value) {
        dictInfo[item.key] = item;
      }
      return dictInfo;
    }),
    // 表单数据
    formData: ref({}),
    // 批量选择信息
    batchInfo: ref({}),
    // 当前批量选择信息
    currentBatchInfo: ref(),
    // 按钮加载状态
    buttonLoadingInfo: ref({}),
    // 按钮禁用状态
    buttonDisableInfo: ref({}),
    // 工具栏项显隐状态
    itemShowInfo: ref({}),
    // 表单项选项状态（普通对象，属性值为 shallowRef，提高性能）
    formItemOptionsInfo: {},
    // 搜索防抖定时器（按 key 索引）
    searchTimeDebounceTimer: {},
    // 表单焦点状态
    toolBarFormItemFocus: ref(false),
    // 监听器管理器
    watchManager: new WatchManager(),
    // 当前处理的工具栏项
    currentProcessItem: null,
    // 旧工具栏项信息（用于差异比较）
    oldToolBarItemsInfo: null,
    // UI 属性转换函数
    UIAttrsTransform: UIAttrsTransform,
  };

  /**
   * 判断是否为表单输入类型
   * @param {string} type - 工具栏项类型
   * @returns {boolean} 是否为表单输入类型
   */
  const isFormItemType = (type) => {
    return ['input', 'select', 'date', 'dateTime', 'radio', 'checkbox'].includes(type);
  };

  /**
   * 判断是否为自定义选项类型
   * @param {string} type - 工具栏项类型
   * @returns {boolean} 是否为自定义选项类型
   */
  const isOwnOptionsType = (type) => {
    return ['select', 'treeSelect', 'radio', 'checkbox'].includes(type);
  };

  /**
   * 判断是否为按钮类型
   * @param {string} type - 工具栏项类型
   * @returns {boolean} 是否为按钮类型
   */
  const isButtonType = (type) => {
    return ['button', 'searchButton', 'import', 'confirm'].includes(type);
  };

  /**
   * 设置工具栏项显隐状态
   * @param {string} key - 工具栏项 key
   * @param {boolean} show - 是否显示
   */
  const setItemShowState = (key, show) => {
    state.itemShowInfo.value[key] = show;
  };

  /**
   * 设置表单项选项状态
   * @param {string} key - 表单项 key
   * @param {Array} options - 选项列表
   */
  const setFormItemOptions = (key, options) => {
    if (state.formItemOptionsInfo[key]) {
      state.formItemOptionsInfo[key].value = options;
    }
  };

  /**
   * 工具栏项配置格式化
   * @param {Object} sourceItem - 原始工具栏项配置
   */
  const toolBarItemConfigFormat = (sourceItem) => {
    if (!Reflect.has(state.currentProcessItem, 'show')) {
      state.currentProcessItem.show = true;
    }

    // UI 属性转换
    if (state.UIAttrsTransform) {
      state.currentProcessItem.attrs = state.UIAttrsTransform(sourceItem.attrs);
    } else if (!sourceItem.attrs) {
      // 默认属性设置
      state.currentProcessItem.attrs = {};
    }
    // 默认事件对象
    !sourceItem.events && (state.currentProcessItem.events = {});
  };

  // 设置工具栏项显隐状态（没有watch时生效)
  const setToolBarItemShow = (sourceItem) => {
    if (sourceItem?.show && !sourceItem.show.watch) {
      if (getVarType(sourceItem.show) === 'asyncFunction') {
        setItemShowState(sourceItem.key, false);
        sourceItem.show().then((res) => {
          setItemShowState(sourceItem.key, res);
        });
      } else if (getVarType(sourceItem.show) === 'function') {
        setItemShowState(sourceItem.key, sourceItem.show());
      }
    }
  };

  const getWatchHandleArgs = (watchKeys) => {
    const watchHandleArgs = {};
    for (const key of watchKeys) {
      watchHandleArgs[key] = state.formData.value[key];
    }
    return watchHandleArgs;
  };

  /**
   * 设置工具栏项监听
   * @param {Object} sourceItem - 工具栏项配置
   */
  const setToolBarItemWatch = (sourceItem) => {
    // 显示条件监听
    if (sourceItem?.show?.watch) {
      if (sourceItem.show.watch?.keys && sourceItem.show.watch?.handle) {
        // 对象形式（包含 watch.keys 和 watch.handle）
        const watchSetting = [
          () => {
            const watchValues = sourceItem.show.watch.keys.map((key) => state.formData.value[key]);
            setItemShowState(sourceItem.key, sourceItem.show.watch.handle(watchValues));
          },
        ];
        state.watchManager.setWatchInfo(sourceItem.key, watchSetting);
      } else if (Array.isArray(sourceItem.show.watch)) {
        const [watchSource, watchHandle, watchOptions] = sourceItem.show.watch;
        state.watchManager.setWatchInfo(sourceItem.key, [
          watchSource,
          (n, o) => {
            setItemShowState(sourceItem.key, watchHandle(getWatchHandleArgs(watchSource)));
          },
          watchOptions,
        ]);
      }
    }

    // options 监听
    if (sourceItem?.options?.watch?.keys && sourceItem?.options?.watch?.handle) {
      const watchHandle = sourceItem.options.watch.handle;
      let watchSetting;
      if (getVarType(watchHandle) === 'asyncFunction') {
        watchSetting = [
          () => sourceItem.options.watch.keys.map((key) => state.formData.value[key]),
          (n, o) => {
            watchHandle(n, o).then((res) => {
              state.formItemOptionsInfo[sourceItem.key].value = res;
            });
          },
          { immediate: true },
        ];
      } else if (typeof watchHandle === 'function') {
        watchSetting = [
          () => sourceItem.options.watch.keys.map((key) => state.formData.value[key]),
          (n, o) => {
            state.formItemOptionsInfo[sourceItem.key].value = watchHandle(n, o);
          },
          { immediate: true },
        ];
      }
      state.watchManager.setWatchInfo(sourceItem.key, watchSetting);
    } else if (sourceItem?.options?.watch && getVarType(sourceItem.options.watch) === 'array') {
      const [watchSource, watchHandle, watchOptions] = sourceItem.options.watch;
      state.watchManager.setWatchInfo(sourceItem.key, [
        watchSource,
        (n, o) => {
          state.formItemOptionsInfo[sourceItem.key].value = watchHandle(n, o);
        },
        watchOptions,
      ]);
    }

    // searchTime 监听（表单输入类型）
    if (isFormItemType(sourceItem.type) && sourceItem.searchTime) {
      const searchTime = sourceItem.searchTime;
      let watchSetting;

      // 获取搜索按钮
      const getSearchButton = () => {
        return state.toolBarItemlist.value.find((i) => i.type === 'searchButton');
      };

      // 立即搜索（searchTime === 'now'）
      if (searchTime === 'now') {
        watchSetting = [
          () => state.formData.value[sourceItem.key],
          () => {
            const searchButtonItem = getSearchButton();
            if (searchButtonItem) {
              toolBarButtonClickEventHandler(searchButtonItem, 'search');
            }
          },
        ];
      } else if (typeof searchTime === 'number') {
        // 防抖搜索（searchTime 为数字，作为防抖时间）
        watchSetting = [
          () => state.formData.value[sourceItem.key],
          () => {
            // 清除之前的定时器
            if (state.searchTimeDebounceTimer[sourceItem.key]) {
              clearTimeout(state.searchTimeDebounceTimer[sourceItem.key]);
            }
            state.searchTimeDebounceTimer[sourceItem.key] = setTimeout(() => {
              const searchButtonItem = getSearchButton();
              if (searchButtonItem) {
                toolBarButtonClickEventHandler(searchButtonItem, 'search');
              }
            }, searchTime);
          },
        ];
      }

      if (watchSetting) {
        // 使用 sourceItem.key 作为监听 key，确保删除时能正确清理
        state.watchManager.setWatchInfo(sourceItem.key, watchSetting);
      }
    }

    // disabled 监听（openModal、button 和 confirm 类型）
    if (['openModal', 'button', 'confirm'].includes(sourceItem.type)) {
      if (sourceItem?.disabled?.watch?.keys && sourceItem?.disabled?.watch?.handle) {
        const watchHandle = sourceItem.disabled.watch.handle;
        let watchSetting;
        if (getVarType(watchHandle) === 'asyncFunction') {
          watchSetting = [
            () => sourceItem.disabled.watch.keys.map((key) => state.formData.value[key]),
            (n, o) => {
              watchHandle(getWatchHandleArgs(sourceItem?.disabled?.watch?.keys)).then((res) => {
                state.buttonDisableInfo.value[sourceItem.key] = res;
              });
            },
            { immediate: true },
          ];
        } else if (typeof watchHandle === 'function') {
          watchSetting = [
            () => sourceItem.disabled.watch.keys.map((key) => state.formData.value[key]),
            (n, o) => {
              state.buttonDisableInfo.value[sourceItem.key] = watchHandle(
                getWatchHandleArgs(sourceItem?.disabled?.watch?.keys)
              );
            },
            { immediate: true },
          ];
        }
        state.watchManager.setWatchInfo(sourceItem.key, watchSetting);
      } else if (sourceItem?.disabled?.watch) {
        const [watchSource, watchHandle, watchOptions] = sourceItem.disabled.watch;
        state.watchManager.setWatchInfo(sourceItem.key, [
          watchSource,
          (n, o) => {
            state.buttonDisableInfo.value[sourceItem.key] = watchHandle(n, o);
          },
          watchOptions,
        ]);
      }
    }
  };

  /**
   * 工具栏状态差异处理
   * @param {Array} sourceToolBarItemList - 新工具栏项列表
   */
  const toolBarStateDiff = (sourceToolBarItemList) => {
    const newToolBarItemsInfo = {};
    if (sourceToolBarItemList) {
      sourceToolBarItemList.forEach((i) => {
        newToolBarItemsInfo[i.key] = i;
      });
    }

    // 差异处理回调
    const diffHandler = (diffType, key) => {
      switch (diffType) {
        case 'add': {
          const targetItem = state.toolBarItemDict.value[key];
          // 初始化工具栏项显隐状态（覆盖所有类型）
          state.itemShowInfo.value[key] = true;
          if (isFormItemType(targetItem.type)) {
            // 表单元素：设置默认值
            let realDefaultValue;
            if (getVarType(targetItem.getDefaultValue) === 'function') {
              realDefaultValue = targetItem.getDefaultValue();
            } else if (Reflect.has(targetItem, 'defaultValue')) {
              realDefaultValue = targetItem.defaultValue;
            } else {
              realDefaultValue = undefined;
            }
            state.formData.value[key] = realDefaultValue;
            // 初始化表单项选项状态
            if (isOwnOptionsType(targetItem.type)) {
              let optionsState = shallowRef([]);
              if (targetItem?.options) {
                if (Array.isArray(targetItem.options)) {
                  console.log(
                    '113',
                    targetItem.options,
                    isRef(targetItem.options),
                    isReactive(targetItem.options)
                  );
                  if (isRef(targetItem.options) || isReactive(targetItem.options)) {
                    console.log('114', targetItem.options);
                    optionsState = targetItem.options;
                  } else {
                    optionsState.value = targetItem.options;
                  }
                } else if (getVarType(targetItem.options) === 'asyncFunction') {
                  const getOptionsFn = targetItem.options;
                  getOptionsFn().then((res) => {
                    optionsState.value = res;
                  });
                } else if (getVarType(targetItem.options) === 'function') {
                  const getOptionsFn = targetItem.options;
                  const options = getOptionsFn();
                  optionsState.value = options;
                }
              }
              state.formItemOptionsInfo[key] = optionsState;
            }
          } else if (targetItem.type === 'openMoreSearch' && targetItem.form) {
            // 更多搜索：设置表单默认值
            for (const formItem of targetItem.form.list) {
              let realDefaultValue;
              if (getVarType(formItem.getDefaultValue) === 'function') {
                realDefaultValue = formItem.getDefaultValue();
              } else if (Reflect.has(formItem, 'defaultValue')) {
                realDefaultValue = formItem.defaultValue;
              } else {
                realDefaultValue = undefined;
              }
              state.formData.value[formItem.key] = realDefaultValue;
            }
          } else if (targetItem.type === 'batch' && !toValue(config).batchFixed) {
            // 批量操作按钮（非固定批量勾选模式）
            state.batchInfo.value[key] = {
              key,
              everyPageSelectedListInfo: {},
              config: targetItem,
            };
          } else if (isButtonType(targetItem.type)) {
            // 按钮类：设置加载状态
            if (targetItem.type === 'searchButton') {
              state.buttonLoadingInfo.value[`${key}-search`] = false;
              state.buttonLoadingInfo.value[`${key}-clear`] = false;
            } else {
              state.buttonLoadingInfo.value[key] = false;
            }
            // confirm 类型：初始化禁用状态
            if (targetItem.type === 'confirm') {
              state.buttonDisableInfo.value[key] = false;
            }
          } else if (['openModal', 'button'].includes(targetItem.type)) {
            // openModal 和 button 类型：初始化禁用状态
            state.buttonDisableInfo.value[key] = false;
          }
          setToolBarItemShow(targetItem);
          // 设置监听
          setToolBarItemWatch(targetItem);
          break;
        }
        case 'delete': {
          // 删除：清理状态
          Reflect.deleteProperty(state.formData.value, key);
          Reflect.deleteProperty(state.batchInfo.value, key);
          Reflect.deleteProperty(state.buttonLoadingInfo.value, key);
          Reflect.deleteProperty(state.buttonDisableInfo.value, key);
          Reflect.deleteProperty(state.itemShowInfo.value, key);
          Reflect.deleteProperty(state.formItemOptionsInfo, key);
          // 清理搜索防抖定时器
          if (state.searchTimeDebounceTimer[key]) {
            clearTimeout(state.searchTimeDebounceTimer[key]);
            Reflect.deleteProperty(state.searchTimeDebounceTimer, key);
          }
          state.watchManager.deleteWatch(key);
          break;
        }
      }
    };

    // 执行差异比较
    objectDiff(state.oldToolBarItemsInfo, newToolBarItemsInfo, diffHandler);
    state.oldToolBarItemsInfo = newToolBarItemsInfo;
  };

  /**
   * 创建工具栏
   * @param {Array} sourceToolBarItemList - 工具栏项列表
   */
  const createToolBar = (sourceToolBarItemList) => {
    state.toolBarItemlist.value = [];
    for (const sourceItem of sourceToolBarItemList) {
      state.currentProcessItem = Object.assign({}, sourceItem);
      toolBarItemConfigFormat(sourceItem);
      state.toolBarItemlist.value.push(state.currentProcessItem);
      state.currentProcessItem = null;
    }
    toolBarStateDiff(sourceToolBarItemList);
    state.watchManager.registerWatch();
  };

  /**
   * 设置固定批量模式
   */
  const setBatchFixed = () => {
    if (toValue(config).batchFixed) {
      const key = Symbol.for('fixed');
      state.batchInfo.value[key] = {
        key,
        everyPageSelectedListInfo: {},
        config: {},
      };
      state.currentBatchInfo.value = state.batchInfo.value[key];
      emits('enterBatchMode');
    }
  };

  /**
   * 获取所有页面的选中行列表
   * @param {string} batchKey - 批量操作 key
   * @returns {Array} 所有页面选中的行列表
   */
  const getAllPageSelectedRowList = (batchKey) => {
    const allPageSelected = [];
    let targetBatchDesc;
    if (batchKey) {
      targetBatchDesc = state.batchInfo.value[batchKey];
    } else {
      targetBatchDesc = state.currentBatchInfo.value;
    }
    for (const pageNum of Object.keys(targetBatchDesc.everyPageSelectedListInfo)) {
      for (const selectRowItem of targetBatchDesc.everyPageSelectedListInfo[pageNum]) {
        allPageSelected.push({ ...selectRowItem });
      }
    }
    return allPageSelected;
  };

  /**
   * 清除批量模式状态
   */
  const clearBatchModeState = () => {
    if (!toValue(config).batchFixed && state.currentBatchInfo.value) {
      emits('exitBatchMode');
      state.currentBatchInfo.value.everyPageSelectedListInfo = {};
      state.currentBatchInfo.value = null;
    } else if (toValue(config).batchFixed) {
      state.currentBatchInfo.value.everyPageSelectedListInfo = {};
    }
  };

  /**
   * 编辑批量选中列表
   * @param {Array} selectedRows - 选中行列表
   * @param {number} pageNum - 页码
   */
  const editBatchSelectList = (selectedRows, pageNum) => {
    state.currentBatchInfo.value.everyPageSelectedListInfo[pageNum] = selectedRows;
  };

  /**
   * 获取批量选中列表
   * @param {number} pageNum - 页码
   * @returns {Array} 指定页码的选中行列表
   */
  const getBatchSelectList = (pageNum) => {
    if (state.currentBatchInfo.value) {
      if (pageNum) {
        if (state.currentBatchInfo.value.everyPageSelectedListInfo?.[pageNum]) {
          return state.currentBatchInfo.value.everyPageSelectedListInfo[pageNum];
        } else {
          return [];
        }
      } else {
        return getAllPageSelectedRowList(state.currentBatchInfo.value.key);
      }
    }
  };

  /**
   * 清空搜索参数
   */
  const searchParamsClear = () => {
    for (const key of Object.keys(state.formData.value)) {
      state.formData.value[key] = undefined;
    }
  };

  /**
   * 设置按钮禁用状态
   * @param {string} key - 按钮 key
   * @param {boolean} disabled - 是否禁用
   */
  const setButtonDisable = (key, disabled) => {
    state.buttonDisableInfo.value[key] = disabled;
  };

  /**
   * 工具栏按钮点击事件处理器
   * @param {Object} toolBarItem - 工具栏项配置
   * @param {*} payload - 附加参数
   * @returns {boolean|undefined} 是否阻止默认行为
   */
  const toolBarButtonClickEventHandler = (toolBarItem, payload) => {
    switch (toolBarItem.type) {
      case 'openModal': {
        // 打开弹窗
        const modalKey = toolBarItem.key;
        const data = payload;
        emits('openModal', { key: modalKey, data });
        break;
      }
      case 'openMoreSearch': {
        // 打开更多搜索弹窗
        emits('openModal', {
          key: toolBarItem.key,
          data: state.formData,
        });
        break;
      }
      case 'batch': {
        // 批量操作
        const actionType = payload;
        switch (actionType) {
          case 'entry': {
            // 进入批量模式
            state.currentBatchInfo.value = state.batchInfo.value[toolBarItem.key];
            emits('enterBatchMode');
            break;
          }
          case 'ok': {
            // 确认批量操作
            toolBarItem?.ok?.fn?.(getAllPageSelectedRowList());
            clearBatchModeState();
            break;
          }
          case 'cancel': {
            // 取消批量操作
            toolBarItem?.cancel?.fn?.();
            clearBatchModeState();
            state.currentBatchInfo.value = null;
            break;
          }
        }
        break;
      }
      case 'button': {
        // 普通按钮
        if (toolBarItem?.fn) {
          if (getVarType(toolBarItem.fn) === 'asyncFunction') {
            state.buttonLoadingInfo.value[toolBarItem.key] = true;
            toolBarItem
              .fn(payload)
              .then((res) => {
                const { refreshRecordList, message: msg } = res || {};
                refreshRecordList && emits('search');
                if (msg && typeof message === 'function') {
                  message(msg);
                }
              })
              .finally(() => {
                state.buttonLoadingInfo.value[toolBarItem.key] = false;
              });
          } else {
            const res = toolBarItem.fn(payload);
            const { refreshRecordList, message: msg } = res || {};
            refreshRecordList && emits('search');
            if (msg && typeof message === 'function') {
              message(msg);
            }
          }
        }
        break;
      }
      case 'searchButton': {
        // 搜索按钮
        switch (payload) {
          case 'search': {
            const toolBarParams = getToolBarParams();
            state.buttonLoadingInfo.value[`${toolBarItem.key}-search`] = true;
            emits('search', {
              callback: () => {
                state.buttonLoadingInfo.value[`${toolBarItem.key}-search`] = false;
              },
              toolBarParams: toolBarParams || {},
            });
            break;
          }
          case 'clear': {
            // 清空搜索
            searchParamsClear();
            state.buttonLoadingInfo.value[`${toolBarItem.key}-clear`] = true;
            emits('search', {
              toolBarParams: {},
              callback: () => {
                state.buttonLoadingInfo.value[`${toolBarItem.key}-clear`] = false;
              },
            });
            break;
          }
        }
        break;
      }
      case 'import': {
        // 导入按钮
        const file = payload;
        state.buttonLoadingInfo.value[toolBarItem.key] = true;
        toolBarItem
          .fn(file)
          .then(() => {
            emits('search', {
              toolBarParams: getToolBarParams(),
            });
          })
          .finally(() => {
            state.buttonLoadingInfo.value[toolBarItem.key] = false;
          });
        // 阻止UI库上传组件执行它自己的后续上传步骤
        return false;
      }
      case 'download': {
        // 下载按钮
        toolBarItem.fn().then(({ url, name }) => {
          const aEle = document.createElement('a');
          aEle.href = url;
          aEle.download = name;
          aEle.style.display = 'none';
          document.body.appendChild(aEle);
          aEle.click();
          aEle.parentNode.removeChild(aEle);
        });
        break;
      }
      case 'confirm': {
        if (!state.buttonLoadingInfo.value[toolBarItem.key]) {
          const noticeMsg = toolBarItem?.confirm?.text
            ? toolBarItem?.confirm?.text
            : `是否确认${toolBarItem.text}？`;
          ElMessageBox.confirm(noticeMsg, '提示', {
            confirmButtonText: toolBarItem.confirm?.text || '确认',
            cancelButtonText: toolBarItem?.cancel?.text || '取消',
            type: 'warning',
          })
            .then(async () => {
              if (toolBarItem?.confirm?.fn) {
                if (getVarType(toolBarItem.confirm.fn) === 'asyncFunction') {
                  state.buttonLoadingInfo.value[toolBarItem.key] = true;
                  const res = await toolBarItem.confirm.fn();
                  res?.refreshRecordList && emits('search');
                  if (res?.message && typeof message === 'function') {
                    message(res.message);
                  }
                  state.buttonLoadingInfo.value[toolBarItem.key] = false;
                } else {
                  const res = toolBarItem.confirm.fn();
                  res?.refreshRecordList && emits('search');
                  if (res?.message && typeof message === 'function') {
                    message(res.message);
                  }
                }
              }
            })
            .catch((err) => {
              if (err === 'cancel') {
                toolBarItem?.cancel?.fn?.();
              }
            });
        }
        break;
      }
      default:
        break;
    }
  };

  /**
   * 获取表单项真实绑定值
   * @param {Object} toolBarItem - 工具栏项配置
   * @param {*} bindValue - 绑定值
   * @returns {*} 真实绑定值
   */
  const getRealFormItemBindValue = (toolBarItem, bindValue) => {
    if (toolBarItem.get) {
      return toolBarItem.get(bindValue);
    } else {
      return bindValue;
    }
  };

  /**
   * 获取工具栏参数（用于搜索）
   * @returns {Object|null} 工具栏搜索参数
   */
  const getToolBarParams = () => {
    const toolBarSearchParams = cleanObject(state.formData.value, (sourceData, key) => {
      const targetHeadRowConfigItem = toValue(config).list.find((i) => i.key === key);
      return getRealFormItemBindValue(targetHeadRowConfigItem, sourceData);
    });
    if (Object.keys(toolBarSearchParams).length) {
      return toolBarSearchParams;
    } else {
      return null;
    }
  };

  /**
   * 表单聚焦事件处理器
   */
  const toolBarFormItemFocusHandler = () => {
    state.toolBarFormItemFocus.value = true;
    emits('focus');
  };

  /**
   * 表单失焦事件处理器
   */
  const toolBarFormItemBlurHandler = () => {
    state.toolBarFormItemFocus.value = false;
    emits('blur');
  };

  let toolBarInputEnterHandlerTimer;
  const toolBarInputEnterHandler = () => {
    if (!toolBarInputEnterHandlerTimer) {
      toolBarInputEnterHandlerTimer = setTimeout(() => {
        toolBarInputEnterHandlerTimer = null;
      }, 3000);
      const searchButtonItem = state.toolBarItemlist.value.find((i) => i.type === 'searchButton');
      if (searchButtonItem) {
        toolBarButtonClickEventHandler(searchButtonItem, 'search');
      }
    }
  };

  /**
   * 初始化：创建工具栏和设置固定批量模式
   */
  if (toValue(config).list) {
    createToolBar(toValue(config).list);
  }
  setBatchFixed();

  /**
   * 组件卸载时清理监听
   */
  onUnmounted(() => {
    state.watchManager.clear();
  });

  /**
   * 暴露给父组件的方法配置
   */
  const defineExposeConfig = {
    editBatchSelectList,
    getBatchSelectList,
    clearBatchModeState,
    getToolBarParams,
    searchParamsClear,
    setButtonDisable,
    setItemShowState,
    setFormItemOptions,
  };

  // 返回状态和方法集合
  return {
    toolBarItemlist: state.toolBarItemlist,
    formData: state.formData,
    batchInfo: state.batchInfo,
    buttonLoadingInfo: state.buttonLoadingInfo,
    buttonDisableInfo: state.buttonDisableInfo,
    itemShowInfo: state.itemShowInfo,
    formItemOptionsInfo: state.formItemOptionsInfo,
    currentBatchInfo: state.currentBatchInfo,
    toolBarFormItemFocusHandler,
    toolBarFormItemBlurHandler,
    toolBarButtonClickEventHandler,
    defineExposeConfig,
    toolBarInputEnterHandler,
  };
};

// 导出属性、事件和方法
export { useToolBar, toolBarProps, toolBarEmits };
