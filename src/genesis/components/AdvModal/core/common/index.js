/**
 * AdvModalItem 弹窗项逻辑 Hook
 *
 * 【功能说明】
 * 管理单个弹窗的状态、数据获取、表单处理和按钮事件。
 *
 * 【状态管理】
 * | 状态名 | 类型 | 说明 |
 * |--------|------|------|
 * | show | Boolean | 弹窗显示状态 |
 * | data | Any | 弹窗数据 |
 * | loading | Boolean | 数据加载状态 |
 * | okButtonLoading | Boolean | 确认按钮加载状态 |
 * | cancelButtonLoading | Boolean | 取消按钮加载状态 |
 * | formRef | Object | 表单引用 |
 * | formData | Any | 表单数据 |
 *
 * 【核心方法】
 * | 方法名 | 说明 | 参数 |
 * |--------|------|------|
 * | openModal | 打开弹窗 | payload (数据), validateFn (验证方法) |
 * | closeModal | 关闭弹窗 | refreshRecordList, resetFormData |
 * | modalButtonEventHandler | 按钮事件处理 | type ('ok' | 'cancel') |
 * | handleCancel | 取消处理（取消按钮/关闭图标共用） | 无 |
 * | getModalData | 获取弹窗数据 | 无 |
 *
 * 【按钮文案】
 * okButton.text 支持两种形式：
 * - 字符串：初始化即解析
 * - 方法 (modalData) => String：按弹窗数据计算文案（如"提交"/"暂存"）
 * 解析统一由 refreshOkButtonText 完成，结果缓存在 state.okButtonText 供渲染读取，
 * 方法不在渲染期执行（原因见 getOkButtonText 注释）
 */

import { ref, nextTick } from 'vue';

/**
 * 解析确认按钮文案
 *
 * okButton.text 支持两种形式：
 * - 字符串：固定文案，初始化即落库
 * - 方法 (modalData) => String：按弹窗数据计算文案（如"提交"/"暂存"）
 *
 * 【方法形式不在渲染期执行】弹窗内容渲染在 Element Plus Overlay 的渲染副作用内
 * （footer 由 ElOverlay 的 default 插槽渲染，见 drawer/dialog 源码的 withCtx 结构），
 * 在渲染期执行用户方法，一旦抛错就会中断并反复触发该副作用，最终以
 * "Maximum recursive updates exceeded in component <ElOverlay>" 的形式爆出来。
 * 因此方法统一由 refreshOkButtonText 在「数据落库后」调用一次，结果缓存到 state.okButtonText，
 * 渲染只读缓存值；同时缓存值本身是响应式的，数据变化后重新解析即可自动刷新文案。
 *
 * 这里仍保留 try/catch 兜底：调用点之一位于 getData 的 promise 回调中，
 * 用户方法抛错若不拦截会变成未处理的 promise 拒绝；控制台保留告警便于定位。
 *
 * @param {Object} okButton - 确认按钮配置对象（config.okButton）
 * @param {Any} modalData - 当前弹窗数据（getData / payload 的结果）
 * @returns {String|undefined} 解析后的文案；未配置、方法返回空值或方法执行出错时返回 undefined，由调用方决定兜底文案
 */
const getOkButtonText = (okButton, modalData) => {
  const { text } = okButton || {};
  if (typeof text === 'function') {
    try {
      return text(modalData) || undefined;
    } catch (err) {
      // 方法内取值失败（如异步 getData 未返回时对 null 取属性）：降级为默认文案，不向上抛
      console.warn('[AdvModal] okButton.text 方法执行失败，本次回退默认文案：', err);
      return undefined;
    }
  }
  return text || undefined;
};

/**
 * AdvModalItem 属性定义
 */
const advModalItemProps = {
  /**
   * 弹窗配置对象
   */
  config: {
    type: Object,
    required: true,
  },
};

/**
 * AdvModalItem 事件定义
 */
const advModalItemEmits = ['modalOpen', 'modalClose', 'refreshRecordList', 'modalOpenFail'];

/**
 * 使用 AdvModalItem Hook
 * @param {Object} props - 组件属性
 * @param {Object} emits - 事件发射器
 * @param {Function} message - 消息提示方法
 * @param {Object} messageBox - ElMessageBox 对象，用于确认弹窗
 * @returns {Object} 状态和方法
 */
const useAdvModalItem = (props, emits, message, messageBox) => {
  /**
   * 状态对象
   */
  const state = {
    show: ref(false),
    data: ref(null),
    loading: ref(false),
    okButtonLoading: ref(false),
    okButtonDisable: ref(false),
    // 确认按钮文案的解析结果（渲染期只读此缓存值，不执行用户的 text 方法，见 getOkButtonText 注释）
    okButtonText: ref(undefined),
    cancelButtonLoading: ref(false),
    formRef: null,
    bindFormData: ref(null),
    watchManager: new WatchManager(),
  };

  /**
   * 设置表单引用
   * @param {Object} ref - 表单组件引用
   */
  const setFormRef = (ref) => {
    state.formRef = ref;
  };

  /**
   * 显式调用表单的 setFormData()，触发 encrypt 字段的 set 解密（还原明文）
   * AdvForm 的 set 变换仅在显式调用 setFormData() 时触发，modelValue 绑定不会触发；
   * 弹窗以原样数据（密文）打开时，需显式调用 setFormData() 才能在表单中展示明文。
   * 传入的是 getData / openModal payload 的载入数据，不是 bindFormData
   * （bindFormData 仅作组件内部 watch 的实时镜像，不作载入载体）
   * @param {Object} formData - 弹窗表单载入数据
   */
  const applyFormDataToForm = (formData) => {
    if (!formData || typeof state.formRef?.setFormData !== 'function') return;
    state.formRef.setFormData(formData);
  };

  /**
   * 解析确认按钮文案并缓存到 state.okButtonText
   * 调用时机只有「弹窗数据已落库」两处：openModal 的非异步 getData 分支、
   * 异步 getData 的 then 回调（详见 getOkButtonText 注释，方法不放在渲染期执行）
   */
  const refreshOkButtonText = () => {
    state.okButtonText.value = getOkButtonText(props.config?.okButton, state.data.value);
  };

  const init = () => {
    if (
      props.config?.okButton?.disabled?.watch?.keys &&
      props.config?.okButton?.disabled?.watch?.handle
    ) {
      const watchHandle = props.config.okButton.disabled.watch.handle;
      let watchSetting;
      if (getVarType(watchHandle) === 'asyncFunction') {
        watchSetting = [
          () =>
            props.config.okButton.disabled.watch.keys.map((key) => state.bindFormData.value?.[key]),
          (n, o) => {
            watchHandle(n, o).then((res) => {
              state.okButtonDisable.value = res;
            });
          },
          { immediate: true },
        ];
      } else if (typeof watchHandle === 'function') {
        watchSetting = [
          () =>
            props.config.okButton.disabled.watch.keys.map((key) => state.bindFormData.value?.[key]),
          (n, o) => {
            state.okButtonDisable.value = watchHandle(n, o);
          },
          { immediate: true },
        ];
      }
      state.watchManager.setWatchInfo('okButtonDisable', watchSetting);
      state.watchManager.registerWatch('okButtonDisable');
    } else if (props.config?.okButton?.disabled?.watch) {
      const [watchSource, watchHandle, watchOptions] = props.config.okButton.disabled.watch;
      state.watchManager.setWatchInfo('okButtonDisable', [
        watchSource,
        (n, o) => {
          state.okButtonDisable.value = watchHandle(n, o);
        },
        watchOptions,
      ]);
      state.watchManager.registerWatch('okButtonDisable');
    }
    // 字符串文案与数据无关，初始化即落库（此后不再变更），避免关闭态 DOM 首帧显示默认文案；
    // 方法形式必须等数据落库后才能解析（异步 getData 未返回时 modalData 为 null，不能提前调用）
    if (typeof props.config?.okButton?.text !== 'function') {
      refreshOkButtonText();
    }
  };

  /**
   * 打开弹窗
   * @param {Any} payload - 传入的数据
   */
  const openModal = (payload) => {
    const validateFn = props.config.openModalValidate;
    if (typeof validateFn === 'function' && !validateFn(payload)) {
      emits('modalOpenFail', { key: props.config.key, data: payload });
    } else {
      if (props.config?.form) {
        // bindFormData 仅作组件内部 watch 的实时镜像：每次打开重置为空对象，
        // 其值只由用户编辑经 v-model 回写累积，不承载 getData / payload 的载入数据。
        // 表单载入统一走 setFormData（下方），以触发 encrypt 字段的 set 解密
        state.bindFormData.value = {};
        if (getVarType(props.config.getData) === 'asyncFunction') {
          state.loading.value = true;
          const getDataFnParams = payload;
          props.config
            .getData(getDataFnParams)
            .then((res) => {
              state.data.value = res;
              // 异步数据已落库，此刻才能解析按钮文案（见 getOkButtonText 注释）
              refreshOkButtonText();
              // getData 结果直接作为表单载入数据，不写入 bindFormData；
              // 异步取数返回后，等表单挂载完成再显式调用 setFormData，触发 encrypt 字段的 set 解密
              const formPayload = { ...res };
              nextTick(() => {
                nextTick(() => {
                  applyFormDataToForm(formPayload);
                });
              });
            })
            .finally(() => {
              state.loading.value = false;
            });
        } else {
          let formPayload;
          if (typeof props.config.getData === 'function') {
            const getDataFnParams = payload;
            const data = props.config.getData(getDataFnParams);
            state.data.value = data;
            formPayload = { ...data };
          } else if (payload) {
            state.data.value = payload;
            formPayload = JSON.parse(JSON.stringify(payload));
          }
          // 弹窗展示后表单才挂载，nextTick 后 formRef 可用；显式调用 setFormData 触发 encrypt 字段的 set 解密
          nextTick(() => {
            nextTick(() => {
              applyFormDataToForm(formPayload);
            });
          });
        }
      } else {
        if (getVarType(props.config.getData) === 'asyncFunction') {
          state.loading.value = true;
          const getDataFnParams = payload;
          props.config
            .getData(getDataFnParams)
            .then((res) => {
              state.data.value = res;
              // 异步数据已落库，此刻才能解析按钮文案（见 getOkButtonText 注释）
              refreshOkButtonText();
            })
            .finally(() => {
              state.loading.value = false;
            });
        } else {
          if (typeof props.config.getData === 'function') {
            const getDataFnParams = payload;
            state.data.value = props.config.getData(getDataFnParams);
            console.log('state.data.value:', state.data.value);
          } else if (payload) {
            state.data.value = JSON.parse(JSON.stringify(payload));
          }
        }
      }
      // 重新打开时恢复 okButtonDisable 监听，确保确认按钮禁用状态随最新数据重新计算
      state.watchManager.resumeWatch('okButtonDisable');
      // 确认按钮文案：非异步 getData 的数据此刻已落库，直接解析；
      // 异步 getData 的数据要等接口返回（此刻 state.data 还是上次打开的值），
      // 先清空缓存让按钮回退默认文案，待数据在 then 回调中落库后再解析
      if (getVarType(props.config?.getData) === 'asyncFunction') {
        state.okButtonText.value = undefined;
      } else {
        refreshOkButtonText();
      }
      state.show.value = true;

      emits('modalOpen', { key: props.config.key, data: state.data.value });
    }
  };

  /**
   * 关闭弹窗
   * @param {Boolean} refreshRecordList - 是否刷新列表
   * @param {Boolean} resetFormData - 是否重置表单数据
   */
  const closeModal = (refreshRecordList = false, resetFormData = true) => {
    state.show.value = false;
    // 关闭时不销毁 okButtonDisable 监听，仅暂停；重新打开时恢复，避免监听失效后确认按钮状态无法重新计算
    state.watchManager.pauseWatch('okButtonDisable');
    // 注意：此处不再重置 okButtonDisable，暂停期间若 watch 源发生变化，恢复时会用最新值重新计算；
    // 若源未变化，保留上次计算结果即为正确状态
    if (props.config.form && resetFormData) {
      // bindFormData 仅作内部 watch 的实时镜像，关闭后重置为空对象，避免下次打开残留上次编辑值
      state.bindFormData.value = {};
    }
    if (refreshRecordList) {
      emits('refreshRecordList');
    }
    emits('modalClose', { key: props.config.key, data: state.data.value });
  };

  /**
   * 取消处理（底部取消按钮 / 右上角关闭图标共用）
   * cancelButton.fn 未返回任何值时，直接关闭弹窗
   * @returns {Boolean} 是否已关闭弹窗
   */
  const handleCancel = () => {
    if (props.config?.cancelButton?.fn) {
      const result = props.config.cancelButton.fn(state.data.value, state.bindFormData.value);
      if (result == null) {
        // cancelButton.fn 未返回任何值，视为允许关闭
        closeModal();
        return true;
      }
      const { close, refreshRecordList, resetFormData, message: msg } = result;
      if (msg && typeof message === 'function') {
        message(msg);
      }
      if (close) {
        closeModal(refreshRecordList, resetFormData);
        return true;
      }
      return false;
    }
    closeModal();
    return true;
  };

  /**
   * 弹窗按钮事件处理
   * @param {String} type - 按钮类型 'ok' | 'cancel'
   */
  const modalButtonEventHandler = async (type) => {
    switch (type) {
      case 'ok': {
        // 检查是否需要二次确认
        const confirmConfig = props.config?.okButton?.confirm;
        if (confirmConfig && messageBox) {
          // 支持 confirm: true 或 confirm: { text, okText, ... }
          const confirmOptions = typeof confirmConfig === 'boolean' ? {} : confirmConfig;
          try {
            await messageBox.confirm(confirmOptions.text || '是否确认执行此操作？', '提示', {
              // 二次确认框的确认按钮文案同样取已解析的按钮文案（okButton.text 支持方法形式）
              confirmButtonText: confirmOptions.okText || state.okButtonText.value || '确认',
              cancelButtonText: confirmOptions.cancelText || '取消',
              type: 'warning',
              ...(confirmOptions.attrs || {}),
            });
          } catch (err) {
            if (err !== 'cancel') {
              throw err;
            }
            return;
          }
        }

        if (state.formRef) {
          state.formRef
            .submit()
            .then((res) => {
              if (getVarType(props.config?.okButton?.fn) === 'asyncFunction') {
                state.okButtonLoading.value = true;
                props.config.okButton
                  .fn(state.data.value, res)
                  .then((result) => {
                    const { refreshRecordList, resetFormData, message: msg } = result || {};
                    if (msg && typeof message === 'function') {
                      message(msg);
                    }
                    closeModal(refreshRecordList, resetFormData);
                  })
                  .finally(() => {
                    state.okButtonLoading.value = false;
                  });
              } else if (typeof props.config?.okButton?.fn === 'function') {
                const result = props.config.okButton.fn(state.data.value, res);
                if (result == null) {
                  // okButton.fn 未返回任何值，视为允许关闭
                  closeModal();
                } else {
                  const { close, refreshRecordList, resetFormData, message: msg } = result;
                  if (msg && typeof message === 'function') {
                    message(msg);
                  }
                  if (close) {
                    closeModal(refreshRecordList, resetFormData);
                  }
                }
              } else {
                closeModal();
              }
            })
            .catch(() => {});
        } else {
          if (getVarType(props.config?.okButton?.fn) === 'asyncFunction') {
            state.okButtonLoading.value = true;
            props.config.okButton
              .fn(state.data.value)
              .then((result) => {
                if (result == null) {
                  // okButton.fn 未返回任何值，视为允许关闭
                  closeModal();
                  return;
                }
                const { close, refreshRecordList, message: msg } = result;
                if (msg && typeof message === 'function') {
                  message(msg);
                }
                if (close) {
                  closeModal(refreshRecordList);
                }
              })
              .finally(() => {
                state.okButtonLoading.value = false;
              });
          } else if (typeof props.config?.okButton?.fn === 'function') {
            const result = props.config.okButton.fn(state.data.value);
            if (result == null) {
              // okButton.fn 未返回任何值，视为允许关闭
              closeModal();
            } else {
              const { close, refreshRecordList, message: msg } = result;
              if (msg && typeof message === 'function') {
                message(msg);
              }
              if (close) {
                closeModal(refreshRecordList);
              }
            }
          } else {
            closeModal();
          }
        }
        break;
      }
      case 'cancel': {
        handleCancel();
        break;
      }
    }
  };

  /**
   * 获取弹窗数据
   * @returns {Any} 弹窗数据
   */
  const getModalData = () => {
    return state.data.value;
  };

  /**
   * 暴露给父组件的方法配置
   */
  const defineExposeConfig = {
    openModal,
    closeModal,
    getModalData,
  };

  init();

  return {
    state,
    setFormRef,
    modalButtonEventHandler,
    handleCancel,
    defineExposeConfig,
  };
};

export { useAdvModalItem, advModalItemProps, advModalItemEmits };
