/**
 * AdvButton 高级按钮逻辑 Hook
 *
 * 【功能说明】
 * 基于 Element Plus el-button 封装的按钮逻辑 Hook，支持权限控制和节流点击。
 *
 * 【核心特性】
 * 1. 权限控制：根据 buttonId 和路由元信息控制按钮显示
 * 2. 节流点击：支持配置节流时间，防止重复点击
 * 3. 异步加载：异步点击函数自动显示 loading 状态
 * 4. 再次确认：confirm 支持布尔或对象配置，确认通过后才执行 onClick
 *
 * 【Props 属性】
 * | 属性名 | 类型 | 说明 |
 * |--------|------|------|
 * | buttonId | String | 按钮权限标识 |
 * | throttleTime | Number | 节流时间（毫秒） |
 * | onClick | Function | 点击回调函数 |
 * | confirm | Boolean\|Object | 再次确认配置；true 用默认值，对象见 confirmDefaults |
 * | download | String\|Blob\|Object\|Function | 下载配置；传入后点击执行下载，不再执行 onClick |
 * | modal | Object | 弹窗配置；传入后点击仅打开自动挂载的 AdvModal（优先级最高） |
 * | modalPayload | Any\|Function | 打开 modal 时传给 openModal(payload) 的入参 |
 *
 * 【返回值】
 * | 返回值 | 类型 | 说明 |
 * |--------|------|------|
 * | isLoading | Boolean | 是否加载中 |
 * | throttleClick | Function | 节流点击处理函数 |
 */

import { ref, onBeforeUnmount } from 'vue';
import { triggerDownload, isDownloadConfig } from './download.js';

/**
 * AdvButton 属性定义
 */
const propsConfig = {
  /**
   * 节流时间（毫秒）
   */
  throttleTime: {
    type: [Number, String],
  },
  throttleNotice: {
    type: String,
    default: '您点击过快，请稍后再试',
  },
  /**
   * 再次确认配置
   * Boolean | Object：
   * - true：使用默认配置
   * - Object：{ title, notice, okText, cancelText, type, attrs, beforeConfirm }，与默认值逐项合并
   */
  confirm: {
    type: [Boolean, Object],
    default: false,
  },
  /**
   * 下载配置
   * String | Blob | Object：直链 / 二进制数据 / { url?, blob?, filename?, onSuccess?, onError? }
   * 传入后点击执行下载，不再执行 onClick
   */
  download: {
    // Blob / File 均属 object，可直接通过 Object 类型校验；函数形态在点击时取数
    type: [String, Object, Function],
  },
  /**
   * 弹窗配置（单个配置对象）
   * 传入后按钮会自动挂载 AdvModal，点击仅打开该弹窗，不再执行 onClick
   */
  modal: {
    type: Object,
  },
  /**
   * 弹窗打开入参
   * Any | (event) => Any：点击打开 modal 时作为 openModal(payload) 的参数（支持返回 Promise）
   */
  modalPayload: {
    type: null,
    default: undefined,
  },
};

/**
 * 再次确认默认配置
 * notice 支持字符串或 (event) => string | Promise<string>，动态文案在执行时解析
 */
const confirmDefaults = {
  title: '提示',
  notice: '是否确认执行此操作？',
  okText: '确认',
  cancelText: '取消',
  type: 'warning',
  attrs: {},
};

/**
 * 归一化 confirm 配置
 * @param {Boolean|Object} confirm - 组件 confirm 属性
 * @returns {Object|null} 归一化后的确认配置；未开启或类型非法时返回 null
 */
const normalizeConfirmConfig = (confirm) => {
  if (!confirm) return null;
  if (confirm === true) return { ...confirmDefaults, attrs: {} };
  if (typeof confirm === 'object') {
    return { ...confirmDefaults, ...confirm, attrs: { ...(confirm.attrs || {}) } };
  }
  return null;
};

/**
 * 使用 AdvButton Hook
 * @param {Object} props - 组件属性
 * @param {Object} route - 路由信息对象
 * @param {Object} ui - UI 能力门面（@ui-kit），提供 confirm / message
 * @param {Ref} modalRef - 自动挂载的 AdvModal 组件引用（仅 ele 版传入）
 * @returns {Object} 状态和方法
 */
const useAdvButton = (props, attrs, route, ui, modalRef) => {
  /**
   * 按钮加载状态
   */
  const isLoading = ref(false);

  // 再次确认配置：仅由 props.confirm 决定是否开启
  const confirmConfig = normalizeConfirmConfig(props?.confirm);
  const needConfirm = !!confirmConfig;
  const hasDownload = !!props?.download;
  const hasAction = hasDownload || typeof attrs?.onClick === 'function';
  //点击事件运行类型，如果需要确认、下载或原始点击方法为异步函数，为异步；否则为同步
  const clickType =
    needConfirm || hasDownload || getVarType(attrs.onClick) === 'asyncFunction' ? 'async' : 'sync';

  /**
   * 执行下载
   * 组件内不发起请求，只消费调用方给的 URL / 二进制数据；
   * 失败不向事件层抛出，统一错误提示并交给 onError
   */
  const runDownload = async () => {
    // 函数形态：点击时取数（支持异步），返回值可为 url / Blob / 配置对象
    const fallbackConfig = isDownloadConfig(props.download) ? props.download : {};
    let downloadConfig = fallbackConfig;
    try {
      const source = typeof props.download === 'function' ? await props.download() : props.download;
      downloadConfig = isDownloadConfig(source) ? source : fallbackConfig;
      const { filename } = await triggerDownload(source);
      if (typeof downloadConfig.onSuccess === 'function') {
        downloadConfig.onSuccess({ filename });
      }
      return { filename };
    } catch (err) {
      if (typeof downloadConfig.onError === 'function') {
        downloadConfig.onError(err);
      }
      ui.message.error(err?.message || '下载失败');
      return {};
    }
  };

  const executeOnClickAsync = async (...e) => {
    if (confirmConfig) {
      const {
        beforeConfirm,
        onCancel,
        notice,
        title,
        okText,
        cancelText,
        type,
        attrs: confirmAttrs,
      } = confirmConfig;
      // 条件确认：beforeConfirm 返回 false 时跳过确认，直接执行 onClick
      const shouldConfirm =
        typeof beforeConfirm !== 'function' ? true : (await beforeConfirm(...e)) !== false;
      if (shouldConfirm) {
        // 正文支持方法形式，按点击事件动态计算
        const noticeText = typeof notice === 'function' ? await notice(...e) : notice;
        try {
          await ui.confirm(noticeText, title, {
            confirmButtonText: okText,
            cancelButtonText: cancelText,
            type,
            ...confirmAttrs,
          });
        } catch (err) {
          // 取消或关闭确认框：触发 onCancel 回调，不执行 onClick
          if (typeof onCancel === 'function') {
            onCancel(...e);
          }
          return {};
        }
      }
    }
    isLoading.value = true;
    try {
      console.log('throttleClick 执行了2');
      // 传入 download 时执行下载，不再执行 onClick
      if (hasDownload) {
        return await runDownload();
      }
      return await attrs.onClick(...e);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 节流定时器
   */
  let throttleTimer = null;
  let throttleTime = 0;
  if (props?.throttleTime) {
    throttleTime = Number(props.throttleTime);
  }
  const throttleClickSync = (...e) => {
    if (attrs?.onClick) {
      if (throttleTime > 0) {
        if (!throttleTimer) {
          attrs.onClick(...e);
          throttleTimer = setTimeout(() => {
            console.log('throttleClick 执行了4');
            throttleTimer = null;
          }, throttleTime);
        } else {
          ui.message.warning(props.throttleNotice);
        }
      } else {
        attrs.onClick(...e);
      }
    }
  };
  const throttleClickAsync = async (...e) => {
    // 下载场景下可能只传 download、没有 onClick，动作存在即可进入异步点击
    if (hasAction) {
      if (throttleTime > 0) {
        if (!throttleTimer && !isLoading.value) {
          console.log('throttleClick 执行了1');
          await executeOnClickAsync(...e);
          console.log('throttleClick 执行了3');
          throttleTimer = setTimeout(() => {
            console.log('throttleClick 执行了4');
            throttleTimer = null;
          }, throttleTime);
        } else {
          ui.message.warning(props.throttleNotice);
        }
      } else {
        await executeOnClickAsync(...e);
      }
    }
  };
  const originThrottleClick = clickType === 'async' ? throttleClickAsync : throttleClickSync;

  /**
   * 按钮点击入口
   * 传入 modal 配置时仅打开自动挂载的弹窗（提交逻辑由弹窗 okButton.onClick 处理），
   * 否则沿用原有的节流/确认/异步点击逻辑
   */
  const throttleClick = async (...e) => {
    if (props?.modal) {
      // 打开入参支持函数形态，可返回 Promise
      const modalPayload =
        typeof props.modalPayload === 'function'
          ? await props.modalPayload(...e)
          : props.modalPayload;
      modalRef?.value?.openModal(modalPayload);
      return;
    }
    return originThrottleClick(...e);
  };

  /**
   * 组件卸载时清理定时器，防止内存泄漏
   */
  onBeforeUnmount(() => {
    if (throttleTimer) {
      clearTimeout(throttleTimer);
    }
  });

  return {
    isLoading,
    throttleClick,
  };
};

export { useAdvButton, propsConfig };
