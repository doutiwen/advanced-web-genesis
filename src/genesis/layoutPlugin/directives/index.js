import { LayoutHandle } from '../common.js';
import classes from '../layout.module.scss';

//自定义指令版本，不能用于组件
const htmlTagNameList = [
  'div',
  'span',
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'label',
  'form',
  'iframe',
  'recordList',
  'ul',
  'li',
  'ol',
  'p',
  'img',
  'video',
];
class LayoutDirectives {
  constructor() {
    this.layoutHandleMap = new Map();
    return {
      mounted: this.mounted,
      unmounted: this.unmounted,
    };
  }
  static getLayoutItemNum(vnode) {
    let layoutItemNum = 0;
    if (vnode.children && vnode.children.length) {
      const notCompleteStack = [];
      notCompleteStack.push(...vnode.children);
      while (notCompleteStack.length) {
        const currentNode = notCompleteStack.pop();
        if (htmlTagNameList.includes(currentNode.type) || currentNode.component) {
          layoutItemNum++;
        } else if (Array.isArray(currentNode.children)) {
          notCompleteStack.push(...currentNode.children);
        }
      }
    }
    return layoutItemNum;
  }
  addLayoutContainerClassName = (el) => {
    return (layoutContainerGeneralClassName, layoutName) => {
      el.classList.add(layoutName);
      layoutContainerGeneralClassName.split(' ').map((className) => {
        el.classList.add(className);
      });
    };
  };
  mounted = (el, binding, vnode) => {
    const layoutHandle = new LayoutHandle(
      binding.value,
      LayoutDirectives.getLayoutItemNum(vnode),
      this.addLayoutContainerClassName(el)
    );
    layoutHandle.created();
    const layoutHandleId = new UUId().getNewId();
    el.setAttribute('layout-handle-id', layoutHandleId);
    this.layoutHandleMap.set(layoutHandleId, layoutHandle);
  };
  unmounted = (el, binding, vnode) => {
    const layoutHandleId = el.getAttribute('layout-handle-id');
    if (this.layoutHandleMap.has(layoutHandleId)) {
      const layoutHandle = this.layoutHandleMap.get(layoutHandleId);
      layoutHandle.unmounted();
      this.layoutHandleMap.delete(layoutHandleId);
    }
  };
}

export default LayoutDirectives;
