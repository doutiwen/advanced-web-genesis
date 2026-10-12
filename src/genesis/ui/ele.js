/**
 * UI 能力门面（Element Plus 实现）
 *
 * 【作用】
 * 收敛业务层对 UI 库的依赖：组件实现（core/ele、core/ant）不再各自直接 import
 * element-plus / ant-design-vue 的交互反馈类组件，而是统一从这里取。
 * 由 vite.config.js 中的 `@ui-kit` 别名按 VITE_UI_LIB 指向本文件或 ant.js，
 * 因此业务代码永远只写 `import ui from '@ui-kit'`，不需要关心底层是哪个库。
 *
 * 【调用语义】
 * 统一对齐 Element Plus 的写法（common 层的 hook 本就是按此编写的），
 * 切换到 antd 时由 ant.js 单方面适配，common 层零改动：
 * - confirm(content, title, options) 返回 Promise，确认时 resolve，取消时 reject('cancel')
 * - options 支持 confirmButtonText / cancelButtonText / type
 *
 * 【扩展方式】
 * 需要新增 UI 能力（如 loading 遮罩、notification）时，在本文件和 ant.js 中
 * 同步补充同名方法即可，调用方无需改动。
 */

import { ElMessage, ElMessageBox } from 'element-plus';

export default {
  /**
   * 轻提示集合，与 ElMessage 的同名方法签名保持一致
   */
  message: {
    success: ElMessage.success,
    warning: ElMessage.warning,
    error: ElMessage.error,
  },

  /**
   * 确认弹窗
   * ElMessageBox.confirm 本身即返回 Promise：确认时 resolve，取消时 reject('cancel')
   *
   * @param {String} content - 提示正文
   * @param {String} title - 弹窗标题
   * @param {Object} options - 按钮文案与图标类型，如 { confirmButtonText, cancelButtonText, type }
   * @returns {Promise} 确认 resolve，取消 reject('cancel')
   */
  confirm: (content, title, options = {}) => ElMessageBox.confirm(content, title, options),
};
