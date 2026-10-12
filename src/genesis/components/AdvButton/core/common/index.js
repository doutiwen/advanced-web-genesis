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
 *
 * 【Props 属性】
 * | 属性名 | 类型 | 说明 |
 * |--------|------|------|
 * | buttonId | String | 按钮权限标识 |
 * | throttleTime | Number | 节流时间（毫秒） |
 * | onClick | Function | 点击回调函数 |
 *
 * 【返回值】
 * | 返回值 | 类型 | 说明 |
 * |--------|------|------|
 * | isLoading | Boolean | 是否加载中 |
 * | throttleClick | Function | 节流点击处理函数 |
 */

import { ref, onBeforeUnmount } from 'vue';

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
   * 是否需要确认
   */
  confirm: {
    type: Boolean,
    default: false,
  },
  /**
   * 确认提示消息
   */
  confirmNotice: {
    type: String,
    default: '是否确认执行此操作？',
  },
};

/**
 * 使用 AdvButton Hook
 * @param {Object} props - 组件属性
 * @param {Object} route - 路由信息对象
 * @returns {Object} 状态和方法
 */
const useAdvButton = (props, attrs, route, uiMsgBox, uiMsg) => {
  /**
   * 按钮加载状态
   */
  const isLoading = ref(false);

  const needConfirm = props?.confirm || props?.confirmNotice;
  //点击事件运行类型，如果需要确认或原始点击方法为异步函数，为异步；否则为同步
  const clickType = needConfirm || getVarType(attrs.onClick) === 'asyncFunction' ? 'async' : 'sync';

  const executeOnClickAsync = async (...e) => {
    if (needConfirm) {
      try {
        await uiMsgBox(props.confirmNotice, '提示', {
          confirmButtonText: '确认',
          cancelButtonText: '取消',
          type: 'warning',
        });
      } catch (err) {
        if (err === 'cancel') {
          return {};
        }
        return {};
      }
    }
    isLoading.value = true;
    try {
      console.log('throttleClick 执行了2');
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
          uiMsg(props.throttleNotice);
        }
      } else {
        attrs.onClick(...e);
      }
    }
  };
  const throttleClickAsync = async (...e) => {
    if (attrs?.onClick) {
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
          uiMsg(props.throttleNotice);
        }
      } else {
        await executeOnClickAsync(...e);
      }
    }
  };
  const throttleClick = clickType === 'async' ? throttleClickAsync : throttleClickSync;

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
