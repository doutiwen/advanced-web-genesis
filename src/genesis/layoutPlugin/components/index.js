import { LayoutHandle } from '../common.js';

//组件版本，建议使用
export default {
  name: 'layout',
  props: {
    type: {
      //card,list-card
      type: String,
    },
    itemSize: {
      type: String,
    },
    itemMargin: {
      //未声明itemSize时，各个子元素之间的外边距
      type: String,
    },
    gap: {
      //list-card布局时各子项之间的间距
      type: String,
    },
    direction: {
      //排列方向,x（水平）或者y（竖直）
      type: String,
      default: 'x',
    },
    xStyle: {
      type: String,
    },
    yStyle: {
      type: String,
    },
    pd: {
      type: String,
    },
    mb: {
      type: String,
    },
    layoutClass: {
      type: String,
    },
    class: {
      type: String,
    },
    style: {
      type: String,
    },
    tag: {
      type: String,
    },
  },
  setup(props, { slots }) {
    let layoutTagName = 'div';
    if (!props?.tag) {
      if (props?.type === 'list-card') {
        layoutTagName = 'ul';
      }
    } else {
      layoutTagName = props.tag;
    }
    function getLayoutItemNum(slots) {
      return slots.default().length;
    }
    let layoutContainerClassName;
    function addLayoutContainerClassName() {
      return (layoutContainerGeneralClassName, layoutName) => {
        layoutContainerClassName = `${layoutName} ${layoutContainerGeneralClassName}`;
      };
    }
    const layoutHandle = new LayoutHandle(
      props,
      getLayoutItemNum(slots),
      addLayoutContainerClassName()
    );
    layoutHandle.created();
    onUnmounted(() => {
      layoutHandle.unmounted();
    });

    return () => {
      const layoutAttrs = {
        class: '',
      };
      if (props.class) {
        layoutAttrs.class = `${props.class} ${layoutContainerClassName}`;
      } else {
        layoutAttrs.class = layoutContainerClassName;
      }
      return h(layoutTagName, layoutAttrs, slots.default());
    };
  },
};
