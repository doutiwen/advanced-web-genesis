/**
 * UI 能力门面（Ant Design Vue 实现）
 *
 * 【作用】
 * 与 ele.js 导出完全相同的形状，由 vite.config.js 中的 `@ui-kit` 别名按
 * VITE_UI_LIB 二选一。业务代码只写 `import ui from '@ui-kit'`，
 * 因此切换到 antd 时无需改动任何调用点。
 *
 * 【调用语义】
 * 对外统一对齐 Element Plus 的写法（common 层的 hook 即按此编写），
 * 差异全部在本文件内部消化，这是刻意的设计——让 common 层保持零改动。
 *
 * 【扩展方式】
 * 需要新增 UI 能力时，在本文件和 ele.js 中同步补充同名方法即可。
 */

import { message, Modal } from 'ant-design-vue';

/**
 * Ant Design Vue Modal.confirm 适配为 Promise 接口
 * 与 Element Plus ElMessageBox.confirm 保持一致的调用方式
 *
 * 【为什么需要适配】
 * antd 的 Modal.confirm 是回调式 API，返回 { destroy, update } 而非 Promise，
 * 取消操作也只通过 onCancel 回调表达，没有 reject 语义。
 * 而 common 层的 hook 以 await uiMsgBox(...) + catch(err === 'cancel') 的方式消费，
 * 若直接把 Modal.confirm 传进去，await 会立即拿到 { destroy, update } 对象，
 * 导致确认弹窗形同虚设、onClick 被直接执行。
 * 因此这里包装为 Promise：确认时 resolve，取消时 reject('cancel')，
 * 以匹配 hook 中 err === 'cancel' 的分支判断。
 *
 * @param {String} content - 提示正文
 * @param {String} title - 弹窗标题
 * @param {Object} options - 按钮文案与图标类型，如 { confirmButtonText, cancelButtonText, type }
 * @returns {Promise} 确认 resolve，取消 reject('cancel')
 */
const confirm = (content, title, options = {}) => {
  return new Promise((resolve, reject) => {
    Modal.confirm({
      title: title || '提示',
      content: content || '是否确认执行此操作？',
      okText: options.confirmButtonText || options.okText || '确认',
      cancelText: options.cancelButtonText || '取消',
      type: options.type || 'warning',
      onOk: () => resolve(),
      onCancel: () => reject('cancel'),
    });
  });
};

export default {
  /**
   * 轻提示集合，与 ele.js 保持同名同参
   * antd 的 message.warning 由内部闭包创建、不依赖 this，可安全地脱离对象传递
   */
  message: {
    success: message.success,
    warning: message.warning,
    error: message.error,
  },

  confirm,
};
