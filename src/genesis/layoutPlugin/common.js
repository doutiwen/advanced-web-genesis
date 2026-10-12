import classes from './layout.module.scss';
import scssVars from './vars.module.scss';

//预定义好的内外边距值名称，配合vars.module.scss使用
const preDefineScssSizeNameList = ['xs', 'sm', 'md', 'lg', 'xlg'];
function getMarginOrPaddingSize(cssType, sourceCssSizeValue) {
  if (preDefineScssSizeNameList.includes(sourceCssSizeValue)) {
    if (cssType === 'margin') {
      return scssVars[`m-${sourceCssSizeValue}-size`];
    } else if (cssType === 'padding') {
      return scssVars[`pd-${sourceCssSizeValue}-size`];
    } else {
      return '0';
    }
  } else {
    return sourceCssSizeValue;
  }
}
//没有预定义内外边距值的情况下改为使用以下函数
// function getMarginOrPaddingSize(cssType, sourceCssSizeValue) {
//   return sourceCssSizeValue;
// }

//传入一个类less\scss的对象，转化为挂载在页面的样式表
class CssStyleBlock {
  constructor(cssDescription, cssBlockClassName = 'css_style_block') {
    this.cssDescription = cssDescription;
    this.cssStyle = CssStyleBlock.cssDescriptionToStyleString(this.cssDescription);
    this.cssStyleEl = null;
    this.className = cssBlockClassName;
  }
  append = () => {
    if (this.cssStyle) {
      this.cssStyleEl = document.createElement('style');
      this.cssStyleEl.setAttribute('class', this.className);
      this.cssStyleEl.innerHTML = this.cssStyle;
      document.head.appendChild(this.cssStyleEl);
    }
  };
  remove = () => {
    if (this.cssStyleEl) {
      document.head.removeChild(this.cssStyleEl);
    }
  };
  static getOneCssRuleBlock = (cssPropertyInfo) => {
    let cssBlockString = '';
    if (cssPropertyInfo) {
      for (const cssName of Object.keys(cssPropertyInfo)) {
        if (typeof cssPropertyInfo[cssName] === 'string') {
          const cssValue = cssPropertyInfo[cssName];
          cssBlockString += `${cssName}:${cssValue};`;
        } else if (typeof cssPropertyInfo[cssName] === 'number') {
          const cssValue = String(cssPropertyInfo[cssName]);
          cssBlockString += `${cssName}:${cssValue};`;
        }
      }
    }
    return cssBlockString;
  };
  static getOneSelectorCssRuleBlock = (cssPropertyInfo) => {
    const cssBlockString = CssStyleBlock.getOneCssRuleBlock(cssPropertyInfo);
    if (cssBlockString) {
      let parentLevelCssDesc = cssPropertyInfo;
      const allLevelSelectorList = [];
      do {
        const sourceParentLevelSelectorList = parentLevelCssDesc[Symbol.for('selector')].split(',');
        const parentLevelSelectorItemList = [];
        for (const parentLevelSelectorItem of sourceParentLevelSelectorList) {
          if (parentLevelSelectorItem.startsWith('&')) {
            parentLevelSelectorItemList.push(parentLevelSelectorItem.replace(/^&/g, ''));
          } else {
            parentLevelSelectorItemList.push(` ${parentLevelSelectorItem}`);
          }
        }
        allLevelSelectorList.unshift(parentLevelSelectorItemList);
        parentLevelCssDesc = parentLevelCssDesc[Symbol.for('parent')];
      } while (parentLevelCssDesc);
      let allSelectorList = [];
      for (let i = allLevelSelectorList.length - 1; i >= 0; i--) {
        const currentLevelSelectorItemList = allLevelSelectorList[i];
        if (i === allLevelSelectorList.length - 1) {
          allSelectorList.push(...currentLevelSelectorItemList);
        } else {
          const allSelectorListTemp = [];
          for (const lastLevelSelectorItem of allSelectorList) {
            for (const currentLevelSelectorItem of currentLevelSelectorItemList) {
              allSelectorListTemp.push(`${currentLevelSelectorItem}${lastLevelSelectorItem}`);
            }
          }
          allSelectorList = allSelectorListTemp;
        }
      }
      return `${allSelectorList.join(',')}{${cssBlockString}}`;
    } else {
      return '';
    }
  };
  static cssDescriptionToStyleString = (styleDescription) => {
    const rootSelector = Object.keys(styleDescription)[0];
    const rootCssDesc = styleDescription[rootSelector];
    let styleString = '';
    const stackNameList = ['notComplete', 'completed'];
    const stack = new StackList(stackNameList);
    stack.notComplete.add(rootCssDesc);
    rootCssDesc[Symbol.for('selector')] = rootSelector;
    do {
      const currentCssDesc = stack.notComplete.get(1, true);
      for (let i = Object.keys(currentCssDesc).length - 1; i >= 0; i--) {
        const currentCssDescKey = Object.keys(currentCssDesc)[i];
        if (typeof currentCssDesc[currentCssDescKey] === 'object') {
          currentCssDesc[currentCssDescKey][Symbol.for('parent')] = currentCssDesc;
          currentCssDesc[currentCssDescKey][Symbol.for('selector')] = currentCssDescKey;
          stack.notComplete.add(currentCssDesc[currentCssDescKey]);
        }
      }
      styleString += CssStyleBlock.getOneSelectorCssRuleBlock(currentCssDesc);
    } while (stack.notComplete.length);
    return styleString;
  };
}

//布局样式表管理
class LayoutStyleManager extends Singleton {
  constructor() {
    const name = 'layoutPubilcStyleManger';
    function create() {
      this.name = name;
      this.keyToLayoutStyleMap = new Map();
    }
    super(name, create);
  }
  has = (key) => {
    return this.keyToLayoutStyleMap.has(key);
  };
  set = (key, containerGeneralClassName, layoutCssStyleBlock) => {
    if (!this.has(key)) {
      layoutCssStyleBlock.append();
      this.keyToLayoutStyleMap.set(key, {
        useNum: 1,
        style: layoutCssStyleBlock,
        GeneralClassName: containerGeneralClassName,
      });
    } else {
      const delayDeleteHandler = new DelayHandle(key);
      delayDeleteHandler.breakOff();
    }
  };
  get = (key) => {
    if (this.has(key)) {
      const targetLayoutStyleDescription = this.keyToLayoutStyleMap.get(key);
      //样式表的使用数已经为零，但是样式表本身仍未删除的情况下
      if (targetLayoutStyleDescription.useNum === 0) {
        const delayDeleteHandler = new DelayHandle(key);
        delayDeleteHandler.breakOff();
      }
      targetLayoutStyleDescription.useNum++;
      return targetLayoutStyleDescription;
    } else {
      return null;
    }
  };
  getGeneralClassName = (key) => {
    if (this.has(key)) {
      return this.get(key, false)?.GeneralClassName;
    } else {
      return null;
    }
  };
  delete = (key) => {
    console.log('删除样式', key);
    if (this.has(key)) {
      const targetLayoutStyleDescription = this.keyToLayoutStyleMap.get(key);
      targetLayoutStyleDescription.useNum--;
      if (targetLayoutStyleDescription.useNum === 0) {
        const delayDeleteHandler = new DelayHandle(key);
        delayDeleteHandler.exceFn(() => {
          this.keyToLayoutStyleMap.delete(key);
          targetLayoutStyleDescription.style.remove();
          if (!this.keyToLayoutStyleMap.size) {
            this.deleteSingleClass(this.name);
          }
        });
      }
    }
  };
}

//布局处理，完成转化布局设置、添加HTML类名等工作
export class LayoutHandle {
  constructor(layoutSetting, layoutItemNum, addLayoutContainerClassNameFn) {
    this.layoutSetting = layoutSetting;
    this.layoutItemNum = layoutItemNum;
    this.layoutName = '';
    this.addLayoutContainerClassNameFn = addLayoutContainerClassNameFn;
  }
  //获取布局子块的样式尺寸
  static getLayoutItemSizeCssDescription(itemSize, itemSizeCssName) {
    const layoutItemSizeCssDescription = {};
    const flexGrowRegex = itemSize.match(/^grow(-(\d+))?$/);
    const basicSizeAndflexGrowRegex = itemSize.match(/^(\d+px)\sgrow(-(\d+))?$/);
    if (flexGrowRegex) {
      let flexGrowValue = '1';
      flexGrowRegex[2] && (flexGrowValue = flexGrowRegex[2]);
      layoutItemSizeCssDescription[itemSizeCssName] = '1px';
      layoutItemSizeCssDescription['flex-grow'] = flexGrowValue;
    } else if (basicSizeAndflexGrowRegex) {
      let flexGrowValue = '1';
      basicSizeAndflexGrowRegex[3] && (flexGrowValue = basicSizeAndflexGrowRegex[3]);
      layoutItemSizeCssDescription[itemSizeCssName] = basicSizeAndflexGrowRegex[1];
      layoutItemSizeCssDescription['flex-grow'] = flexGrowValue;
    } else {
      layoutItemSizeCssDescription[itemSizeCssName] = itemSize;
    }
    return layoutItemSizeCssDescription;
  }
  static getLayoutItemHTMLTagsWithCssSelector(prefixCssSelector = '', suffixCssSelector = '') {
    //const layoutItemHTMLTags = ['div', 'li', 'button', 'input', 'a'];
    const layoutItemHTMLTags = ['*'];
    const LayoutItemHTMLTagsWithCssSelectorList = [];
    for (const tags of layoutItemHTMLTags) {
      LayoutItemHTMLTagsWithCssSelectorList.push(`${prefixCssSelector}${tags}${suffixCssSelector}`);
    }
    return LayoutItemHTMLTagsWithCssSelectorList.join();
  }
  static layoutSettingToCssDescriptionDetailTransform(layoutSetting, itemNum) {
    const layoutCssDescriptionDetail = {};
    let layoutContainerGeneralClassName = classes['layout_container'];

    //单行卡片模式
    if (!layoutSetting.type || layoutSetting.type === 'card') {
      const itemSizeList = layoutSetting?.itemSize ? layoutSetting.itemSize.split(',') : [];
      let itemSizeCssName = 'width';
      let marginCssName = 'margin-right';
      let xStyleCssName = 'justify-content';
      let yStyleCssName = 'align-items';

      //布局方向为竖直方向
      if (layoutSetting?.direction === 'y') {
        itemSizeCssName = 'height';
        marginCssName = 'margin-bottom';
        xStyleCssName = 'align-items';
        yStyleCssName = 'justify-content';
        layoutContainerGeneralClassName += ` ${classes['direction_y']}`;
      }
      let itemStyle = '';
      if (itemSizeList.length) {
        if (itemNum >= itemSizeList.length) {
          itemSizeList.map((itemSize, index) => {
            layoutCssDescriptionDetail[
              `${LayoutHandle.getLayoutItemHTMLTagsWithCssSelector(
                '>',
                `:nth-child(${index + 1})`
              )}`
            ] = LayoutHandle.getLayoutItemSizeCssDescription(itemSize, itemSizeCssName);
          });
        } else {
          //itemSize设置值的个数大于子块数量时，中间的一些值是子项之间的外边距值
          itemSizeList.map((itemSize, index) => {
            if (index % 2 === 0) {
              layoutCssDescriptionDetail[
                `${LayoutHandle.getLayoutItemHTMLTagsWithCssSelector(
                  '>',
                  `:nth-child(${index / 2 + 1})`
                )}`
              ] = Object.assign(
                LayoutHandle.getLayoutItemSizeCssDescription(itemSize, itemSizeCssName),
                itemSizeList[index + 1]
                  ? {
                      [marginCssName]: getMarginOrPaddingSize('margin', itemSizeList[index + 1]),
                    }
                  : {}
              );
            }
          });
        }
      } else if (layoutSetting.itemMargin) {
        let marginType, marginValue;
        if (layoutSetting.itemMargin.includes(',')) {
          const marginSetting = layoutSetting.itemMargin.split(',');
          marginType = marginSetting[0];
          marginValue = marginSetting[1];
        } else {
          marginValue = layoutSetting.itemMargin;
        }
        if (!marginType) {
          marginType = 'right';
        }
        if (!marginValue) {
          marginValue = '0';
        }
        if (marginType === 'left') {
          layoutCssDescriptionDetail[
            `${LayoutHandle.getLayoutItemHTMLTagsWithCssSelector('>', ':not(:first-child)')}`
          ] = {
            [`margin-${marginType}`]: getMarginOrPaddingSize('margin', marginValue),
          };
        } else if (marginType === 'right') {
          layoutCssDescriptionDetail[
            `${LayoutHandle.getLayoutItemHTMLTagsWithCssSelector('>', ':not(:last-child)')}`
          ] = {
            [`margin-${marginType}`]: getMarginOrPaddingSize('margin', marginValue),
          };
        }
      }

      if (layoutSetting.xStyle) {
        Object.assign(layoutCssDescriptionDetail, {
          [xStyleCssName]: layoutSetting.xStyle,
        });
      }
      if (layoutSetting.yStyle) {
        Object.assign(layoutCssDescriptionDetail, {
          [yStyleCssName]: layoutSetting.yStyle,
        });
      }
    } else if (layoutSetting.type === 'list-card') {
      layoutContainerGeneralClassName += ` ${classes['layout_list_container']}`;
      const listItemSizes = layoutSetting.itemSize.split(',');
      let listItemWidth = 'auto',
        listItemHeight = 'auto';
      if (listItemSizes.length === 1) {
        listItemWidth = listItemHeight = listItemSizes[0];
      } else if (listItemSizes.length > 1) {
        listItemWidth = listItemSizes[0];
        listItemHeight = listItemSizes[1];
      }
      const gaps = layoutSetting.gap.split(',');
      let columnGap = '0',
        rowGap = '0';
      if (gaps.length === 1) {
        columnGap = rowGap = gaps[0];
      } else if (gaps.length > 1) {
        columnGap = gaps[0];
        rowGap = gaps[1];
      }
      Object.assign(layoutCssDescriptionDetail, {
        'grid-template-columns': `repeat(auto-fill, minmax(${listItemWidth}, 1fr))`,
        'grid-auto-rows': listItemHeight,
        'grid-gap': `${rowGap} ${columnGap}`,
      });
    }
    if (layoutSetting.mb) {
      Object.assign(layoutCssDescriptionDetail, {
        'margin-bottom': getMarginOrPaddingSize('margin', layoutSetting.mb),
      });
    }
    if (layoutSetting.pd) {
      Object.assign(layoutCssDescriptionDetail, {
        padding: getMarginOrPaddingSize('padding', layoutSetting.pd),
      });
    }
    if (layoutSetting.style) {
      const cssItemList = layoutSetting.style.split(';');
      for (const cssItem of cssItemList) {
        const [cssName, cssValue] = cssItem.split(':');
        layoutCssDescriptionDetail[cssName] = cssValue;
      }
    }
    return {
      layoutCssDescriptionDetail,
      layoutContainerGeneralClassName,
    };
  }
  created = () => {
    const layoutStyleManager = new LayoutStyleManager();
    if (this.layoutSetting?.layoutClass) {
      this.layoutName = this.layoutSetting.layoutClass;
      if (layoutStyleManager.has(this.layoutName)) {
        const layoutContainerGeneralClassName = layoutStyleManager.getGeneralClassName(
          this.layoutName
        );
        this.addLayoutContainerClassNameFn(layoutContainerGeneralClassName, this.layoutName);
      } else {
        const { layoutCssDescriptionDetail, layoutContainerGeneralClassName } =
          LayoutHandle.layoutSettingToCssDescriptionDetailTransform(
            this.layoutSetting,
            this.layoutItemNum
          );
        const layoutCssDescription = {
          [`.${this.layoutName}`]: layoutCssDescriptionDetail,
        };
        const layoutCssStyleBlock = new CssStyleBlock(layoutCssDescription);
        layoutStyleManager.set(
          this.layoutName,
          layoutContainerGeneralClassName,
          layoutCssStyleBlock
        );
        this.addLayoutContainerClassNameFn(layoutContainerGeneralClassName, this.layoutName);
      }
    } else {
      this.layoutName = `layout_key_${new UUId().getNewId()}`;
      const { layoutCssDescriptionDetail, layoutContainerGeneralClassName } =
        LayoutHandle.layoutSettingToCssDescriptionDetailTransform(
          this.layoutSetting,
          this.layoutItemNum
        );
      this.addLayoutContainerClassNameFn(layoutContainerGeneralClassName, this.layoutName);
      const layoutCssDescription = {
        [`.${this.layoutName}`]: layoutCssDescriptionDetail,
      };
      const layoutCssStyleBlock = new CssStyleBlock(layoutCssDescription);
      layoutStyleManager.set(this.layoutName, layoutContainerGeneralClassName, layoutCssStyleBlock);
    }
  };
  unmounted = () => {
    const layoutStyleManager = new LayoutStyleManager();
    layoutStyleManager.delete(this.layoutName);
  };
}
