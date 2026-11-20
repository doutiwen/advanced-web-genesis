/**
 * ToolBar - 工具栏组件（JSX 版本）
 *
 * 【组件功能】
 * 基于 Element Plus 组件封装的高级工具栏组件，
 * 支持多种工具栏项类型的渲染，包括输入框、选择器、按钮、日期选择等。
 *
 * 【组件架构】
 * ToolBar (当前组件，UI层)
 *   ├── el-input (输入框)
 *   ├── el-select (下拉选择)
 *   ├── el-tree-select (树形选择)
 *   ├── el-checkbox-group (多选框)
 *   ├── el-date-picker (日期选择)
 *   ├── el-time-picker (时间选择)
 *   ├── el-button (按钮)
 *   ├── el-upload (文件上传)
 *   └── useToolBar (核心 hook，业务逻辑)
 *
 * 【工具栏项类型】
 * | 类型 | 说明 | 渲染组件 |
 * |------|------|----------|
 * | input | 输入框 | el-input |
 * | select | 下拉选择 | el-select |
 * | treeSelect | 树形选择 | el-tree-select |
 * | checkbox | 多选框 | el-checkbox-group |
 * | date | 日期选择 | el-date-picker |
 * | time | 时间选择 | el-time-picker |
 * | batch | 批量操作按钮 | AdvButton / el-button-group |
 * | openMoreSearch | 更多搜索按钮（自动生成弹窗） | AdvButton + AdvModal |
 * | button | 统一按钮（confirm/download/modal 由配置描述） | AdvButton |
 * | searchButton | 搜索按钮 | AdvButton / el-button-group |
 * | import | 导入按钮 | el-upload + AdvButton |
 *
 * 【核心特性】
 * 1. 左右布局：工具栏项分为左侧和右侧两部分
 * 2. 响应式布局：实现自适应布局
 * 3. 动态渲染：根据配置动态渲染不同类型的工具栏项
 * 4. 插槽支持：支持自定义工具栏项内容
 */

import { defineComponent, withModifiers } from 'vue';
import { useToolBar, toolBarProps, toolBarEmits } from '../common/toolBar.js';
import classes from '../common/toolBar.module.scss';
import { ElMessage } from 'element-plus';
// 按钮统一由 AdvButton 渲染：confirm/download/modal 等行为由配置直接描述
import AdvButton from '@common/components/AdvButton';

export default defineComponent({
  name: 'tool-bar',
  props: toolBarProps,
  emits: toolBarEmits,
  setup(props, { slots, expose, emit }) {
    /**
     * 工具栏两侧类型：左侧和右侧
     */
    const sideType = ['left', 'right'];

    /**
     * 使用工具栏核心 hook，获取状态和方法
     */
    const {
      toolBarItemlist,
      formData,
      batchInfo,
      buttonLoadingInfo,
      buttonDisableInfo,
      itemShowInfo,
      formItemOptionsInfo,
      currentBatchInfo,
      toolBarFormItemFocusHandler,
      toolBarFormItemBlurHandler,
      toolBarButtonClickEventHandler,
      defineExposeConfig,
      toolBarInputEnterHandler,
    } = useToolBar(props, emit, null, ElMessage.success);

    /**
     * 暴露方法给父组件
     */
    expose(defineExposeConfig);

    /**
     * 渲染单个工具栏项
     * @param {Object} tooBarItemConfig - 工具栏项配置
     * @param {string} tooBarItemConfig.key - 工具栏项唯一标识
     * @param {string} tooBarItemConfig.type - 工具栏项类型
     * @param {boolean} tooBarItemConfig.show - 是否显示
     * @param {boolean} tooBarItemConfig.inRight - 是否在右侧
     * @param {Object} tooBarItemConfig.attrs - 属性配置
     * @param {Object} tooBarItemConfig.events - 事件配置
     * @param {Array} tooBarItemConfig.options - 选项列表（select/treeSelect/checkbox类型）
     * @param {string} tooBarItemConfig.placeholder - 占位符
     * @param {string} tooBarItemConfig.text - 按钮文本
     * @param {boolean} tooBarItemConfig.range - 是否为范围选择（date/time类型）
     * @param {Object} tooBarItemConfig.ok - 确认按钮配置（batch类型）
     * @param {Object} tooBarItemConfig.cancel - 取消按钮配置（batch类型）
     * @returns {VNode|null} 渲染的 Vue 节点
     */
    const renderToolBarItem = (tooBarItemConfig) => {
      const {
        key,
        type,
        show,
        inRight,
        attrs,
        events,
        options: configOptions,
        placeholder,
        text,
        range,
        ok,
        cancel,
        icon,
        iconAttrs = {},
      } = tooBarItemConfig;

      const options = ['select', 'treeSelect', 'radio', 'checkbox'].includes(type)
        ? (toValue(formItemOptionsInfo[key]) ?? configOptions)
        : configOptions;

      const commonProps = {
        key,
        modelValue: formData.value[key],
        'onUpdate:modelValue': (val) => {
          formData.value[key] = val;
        },
        placeholder,
        ...attrs,
        ...events,
      };

      switch (type) {
        case 'input':
          return (
            <el-input
              {...commonProps}
              onFocus={toolBarFormItemFocusHandler}
              onBlur={toolBarFormItemBlurHandler}
              clearable={true}
              onKeyup={withModifiers(
                (e) => e.key === 'Enter' && toolBarInputEnterHandler(),
                ['prevent']
              )}
            >
              {slots[`toolBar-input-addonAfter-${key}`] && {
                prefix: () => slots[`toolBar-input-addonAfter-${key}`](),
              }}
            </el-input>
          );

        case 'select':
          return (
            <el-select
              {...commonProps}
              onFocus={toolBarFormItemFocusHandler}
              onBlur={toolBarFormItemBlurHandler}
              clearable={true}
              fit-input-width={true}
              filterable={true}
            >
              {options?.map((optionItem) => (
                <el-option
                  key={optionItem.value}
                  value={optionItem.value}
                  label={optionItem.label}
                  {...(optionItem.optionAttrs ?? {})}
                >
                  <span title={optionItem.label}>{optionItem.label}</span>
                </el-option>
              ))}
            </el-select>
          );

        case 'treeSelect':
          return (
            <el-tree-select
              modelValue={formData.value[key]}
              onUpdate={{
                modelValue: (val) => {
                  formData.value[key] = val;
                },
              }}
              placeholder={placeholder}
              treeData={options}
              dropdownStyle={{ maxHeight: '400px', overflow: 'auto' }}
              {...attrs}
            />
          );

        case 'checkbox':
          return (
            <el-checkbox-group
              modelValue={formData.value[key]}
              onUpdate={{
                modelValue: (val) => {
                  formData.value[key] = val;
                },
              }}
              onFocus={toolBarFormItemFocusHandler}
              onBlur={toolBarFormItemBlurHandler}
              placeholder={placeholder}
              {...attrs}
              {...events}
            >
              {options?.map((checkboxItemConfig) => (
                <el-checkbox
                  key={checkboxItemConfig.value}
                  label={checkboxItemConfig.label}
                  value={checkboxItemConfig.value}
                  {...(checkboxItemConfig.optionAttrs ?? {})}
                />
              ))}
            </el-checkbox-group>
          );

        case 'date':
          return (
            <el-date-picker
              {...commonProps}
              clearable={true}
              valueFormat="YYYY-MM-DD"
              onFocus={toolBarFormItemFocusHandler}
              onBlur={toolBarFormItemBlurHandler}
            />
          );

        case 'time':
          return (
            <el-time-picker
              {...commonProps}
              clearable={true}
              range={range}
              valueFormat="HH:mm:ss"
              onFocus={toolBarFormItemFocusHandler}
              onBlur={toolBarFormItemBlurHandler}
            />
          );

        case 'batch':
          return (
            <>
              {!currentBatchInfo.value && (
                <AdvButton
                  onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig, 'entry')}
                  {...attrs}
                >
                  {slots[`toolBar-item-${key}`]?.() ?? text}
                </AdvButton>
              )}
              {currentBatchInfo.value && currentBatchInfo.value.key === key && (
                <el-button-group>
                  <AdvButton
                    type="primary"
                    onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig, 'ok')}
                    {...(ok?.attrs ?? {})}
                  >
                    {ok?.text}
                  </AdvButton>
                  <AdvButton
                    onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig, 'cancel')}
                    {...(cancel?.attrs ?? {})}
                  >
                    {cancel?.text}
                  </AdvButton>
                </el-button-group>
              )}
            </>
          );

        // 统一按钮：confirm / download / modal 由配置直接描述，行为交给 AdvButton
        case 'button':
        case 'openMoreSearch':
          return (
            <AdvButton
              loading={buttonLoadingInfo.value[key]}
              disabled={buttonDisableInfo.value[key]}
              confirm={tooBarItemConfig.confirm}
              download={tooBarItemConfig.download}
              modal={tooBarItemConfig.modal}
              modalPayload={tooBarItemConfig.modalPayload}
              {...attrs}
              onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig)}
              onReloadList={() => emit('refreshList')}
            >
              {icon && (
                <el-icon>
                  <icon {...iconAttrs} />
                </el-icon>
              )}
              {slots[`toolBar-item-${key}`]?.() ?? text}
            </AdvButton>
          );

        case 'searchButton':
          if (tooBarItemConfig.isGroup) {
            return (
              <el-button-group>
                <AdvButton
                  loading={buttonLoadingInfo.value[`${key}-search`]}
                  disabled={buttonLoadingInfo.value[`${key}-clear`]}
                  onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig, 'search')}
                  type="primary"
                  {...attrs}
                >
                  <el-icon>
                    <Search />
                  </el-icon>
                  {slots[`toolBar-item-${key}-search`]?.() ?? text}
                </AdvButton>
                <AdvButton
                  loading={buttonLoadingInfo.value[`${key}-clear`]}
                  disabled={buttonLoadingInfo.value[`${key}-search`]}
                  onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig, 'clear')}
                >
                  <el-icon>
                    <Refresh />
                  </el-icon>
                  {slots[`toolBar-item-${key}-reset`]?.() ?? '清空'}
                </AdvButton>
              </el-button-group>
            );
          } else {
            return (
              <>
                <AdvButton
                  loading={buttonLoadingInfo.value[`${key}-search`]}
                  disabled={buttonLoadingInfo.value[`${key}-clear`]}
                  onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig, 'search')}
                  type="primary"
                  {...attrs}
                >
                  <el-icon>
                    <Search />
                  </el-icon>
                  {slots[`toolBar-item-${key}-search`]?.() ?? text}
                </AdvButton>
                <AdvButton
                  loading={buttonLoadingInfo.value[`${key}-clear`]}
                  disabled={buttonLoadingInfo.value[`${key}-search`]}
                  onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig, 'clear')}
                >
                  <el-icon>
                    <Refresh />
                  </el-icon>
                  {slots[`toolBar-item-${key}-reset`]?.() ?? '重置'}
                </AdvButton>
              </>
            );
          }
        case 'import':
          return (
            <el-upload
              customRequest={(file) => toolBarButtonClickEventHandler(tooBarItemConfig, file)}
              accept=".xlsx"
              disabled={buttonLoadingInfo.value[key]}
              showUploadList={false}
              {...attrs}
            >
              <AdvButton loading={buttonLoadingInfo.value[key]}>
                {icon && (
                  <el-icon>
                    <icon {...iconAttrs} />
                  </el-icon>
                )}
                {slots[`toolBar-item-${key}`]?.() ?? text}
              </AdvButton>
            </el-upload>
          );

        case 'custom':
          return slots[`toolBar-item-custom-${key}`]?.();
        default:
          return null;
      }
    };

    /**
     * 组件渲染函数
     * 返回工具栏整体布局，分为左侧和右侧两部分
     * @returns {VNode} 渲染的 Vue 节点
     */
    return () =>
      toValue(toolBarItemlist)?.length ? (
        <div
          class={[classes['tool_bar_wrapper'], props.config?.toolBarWrapClass]
            .filter(Boolean)
            .join(' ')}
        >
          {slots?.[`toolBar-header`] && (
            <div class={classes['toolBar_header']}>{slots[`toolBar-header`]?.()}</div>
          )}

          <div class={classes['tool_bar_main']}>
            {sideType.map((side, index) => {
              /**
               * 渲染左侧或右侧内容
               * 根据 tooBarItemConfig.inRight 属性区分左右
               */
              const sideContent = (
                <div
                  key={side}
                  class={
                    side === 'left' ? classes['tool_bar_side_left'] : classes['tool_bar_side_right']
                  }
                >
                  {toolBarItemlist.value
                    .filter((tooBarItemConfig) => {
                      const { key, type, inRight } = tooBarItemConfig;
                      const shouldShow = itemShowInfo.value[key];
                      return shouldShow && (side === 'left' ? !inRight : inRight);
                    })
                    .map((tooBarItemConfig) => renderToolBarItem(tooBarItemConfig))}
                </div>
              );
              return sideContent;
            })}
          </div>
        </div>
      ) : null;
  },
});
