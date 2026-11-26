/**
 * forwardExpose 模块 - 组件实例方法透传
 *
 * 【解决的问题】
 * 组件被多层包装时，每层都要把内层 defineExpose 的方法逐条重写一遍，
 * 但这些重写只是转发、没有任何自己的逻辑，内层新增方法还要逐层同步。
 * 使用 useForwardExpose 后，包装层只需 expose 一个代理对象，转发自动完成。
 *
 * 【使用方式】
 * const innerRef = shallowRef(null);
 * defineExpose(useForwardExpose(innerRef));
 *
 * 包装层需要叠加自有方法时，通过第二个参数传入：
 * defineExpose(useForwardExpose(innerRef, { ownMethod }));
 * （不能用对象展开，展开是立即求值，而转发是惰性的）
 *
 * 【实现说明】
 * 返回一个只读代理：任何属性访问都实时转发到内层组件实例。
 * 必须同时实现 has 拦截 —— Vue 3 取组件实例时用 `key in exposed` 判断方法是否存在
 * （见 @vue/runtime-core 的 getComponentPublicInstance），
 * 只实现 get 会导致方法取不到，这是本方案的关键点。
 *
 * 【注意】
 * 代理是惰性求值的，内层组件未挂载时访问属性会得到 undefined，
 * 因此不要在 setup 阶段提前调用，需等挂载后由父组件通过 ref 调用。
 */

import { unref } from 'vue';

/**
 * 创建用于透传内层组件实例方法的代理对象
 * @param {Object} innerRef - 内层组件实例的 ref（ref / shallowRef 均可）
 * @param {Object} [extraExpose] - 本层自有方法，优先级高于内层同名方法
 * @returns {Object} 可直接传给 defineExpose 的代理对象
 */
export function useForwardExpose(innerRef, extraExpose) {
  // 实时读取内层实例，避免挂载先后顺序影响结果
  const getInner = () => (innerRef ? unref(innerRef) : null);
  // 判断是否为本层自有方法
  const hasExtra = (key) => !!extraExpose && Object.prototype.hasOwnProperty.call(extraExpose, key);

  return new Proxy(
    {},
    {
      // 读取：本层自有方法优先，其次转发到内层实例
      get(_target, key) {
        if (hasExtra(key)) return extraExpose[key];
        const inner = getInner();
        return inner ? inner[key] : undefined;
      },
      // 存在性判断：Vue 用 `key in exposed` 决定能否取到方法，必须转发
      has(_target, key) {
        if (hasExtra(key)) return true;
        const inner = getInner();
        return !!inner && key in inner;
      },
    }
  );
}
