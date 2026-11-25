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
 * | enterSelectMode | 进入勾选模式按钮 | AdvButton / el-button-group |
 * | getSelectedRows | 获取勾选行按钮（存在时列表固定进入勾选模式） | AdvButton |
 * | openMoreSearch | 更多搜索按钮（自动生成弹窗） | AdvButton + AdvModal |
 * | button | 统一按钮（confirm/download/modal 由配置描述） | AdvButton |
 * | searchButton | 搜索按钮 | AdvButton / el-button-group |
 * | import | 导入按钮 | el-upload + AdvButton |
 *
 * 【核心特性】
 * 1. 布局形式：config.layout 支持 inline（左右两栏，默认）和 grid（网格）
 * 2. 响应式布局：实现自适应布局
 * 3. 动态渲染：根据配置动态渲染不同类型的工具栏项
 * 4. 插槽支持：支持自定义工具栏项内容
 */

import { defineComponent, withModifiers, computed } from 'vue';
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
     * 布局形式：inline（默认）| grid
     */
    const layout = computed(() => props.config?.layout || 'inline');

    /**
     * grid 布局的网格配置（参考 AdvForm 的 grid 实现）
     */
    const gridConfig = computed(() => ({
      cols: props.config?.grid?.cols || 'repeat(1, 1fr)',
      rows: props.config?.grid?.rows || 'auto',
      gap: props.config?.grid?.gap || '16px',
    }));

    /**
     * 计算单个工具栏项在 grid 布局中的位置样式
     * @param {Object} tooBarItemConfig - 工具栏项配置
     * @returns {Object} 行内样式
     */
    const getGridItemStyle = (tooBarItemConfig) => ({
      ...(tooBarItemConfig?.grid?.col ? { 'grid-column': tooBarItemConfig.grid.col } : {}),
      ...(tooBarItemConfig?.grid?.row ? { 'grid-row': tooBarItemConfig.grid.row } : {}),
    });

    /**
     * 使用工具栏核心 hook，获取状态和方法
     */
    const {
      toolBarItemlist,
      formData,
      activeSelectionKey,
      buttonLoadingInfo,
      buttonDisableInfo,
      itemShowInfo,
      formItemOptionsInfo,
      toolBarFormItemFocusHandler,
      toolBarFormItemBlurHandler,
      toolBarButtonClickEventHandler,
      enterSelection,
      confirmSelection,
      cancelSelection,
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
     * @param {string} tooBarItemConfig.inline - inline 布局下的位置（left | right）
     * @param {Object} tooBarItemConfig.grid - grid 布局下的占位配置（col / row）
     * @param {Object} tooBarItemConfig.UiProps - UI 属性配置
     * @param {Object} tooBarItemConfig.UiEvents - UI 事件配置
     * @param {Array} tooBarItemConfig.options - 选项列表（select/treeSelect/checkbox类型）
     * @param {string} tooBarItemConfig.placeholder - 占位符
     * @param {string} tooBarItemConfig.text - 按钮文本
     * @param {boolean} tooBarItemConfig.range - 是否为范围选择（date/time类型）
     * @param {Object} tooBarItemConfig.ok - 确认按钮配置（enterSelectMode类型）
     * @param {Object} tooBarItemConfig.cancel - 取消按钮配置（enterSelectMode类型）
     * @returns {VNode|null} 渲染的 Vue 节点
     */
    const renderToolBarItem = (tooBarItemConfig) => {
      const {
        key,
        type,
        show,
        UiProps,
        UiEvents,
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
        ...UiProps,
        ...UiEvents,
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
              {...UiProps}
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
              {...UiProps}
              {...UiEvents}
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

        // 进入勾选模式：未激活时显示入口按钮，激活后显示确认/取消
        case 'enterSelectMode':
          if (activeSelectionKey.value && activeSelectionKey.value !== key) {
            // 已有其他勾选按钮处于激活状态时隐藏入口（与原有交互一致）
            return null;
          }
          if (activeSelectionKey.value === key) {
            return (
              <el-button-group>
                <AdvButton
                  type="primary"
                  onClick={() => confirmSelection(tooBarItemConfig)}
                  {...(ok?.UiProps ?? {})}
                >
                  {ok?.text}
                </AdvButton>
                <AdvButton
                  onClick={() => cancelSelection(tooBarItemConfig)}
                  {...(cancel?.UiProps ?? {})}
                >
                  {cancel?.text}
                </AdvButton>
              </el-button-group>
            );
          }
          return (
            <AdvButton
              onClick={() => enterSelection(tooBarItemConfig)}
              {...UiProps}
            >
              {slots[`toolBar-item-${key}`]?.() ?? text}
            </AdvButton>
          );

        // 获取勾选行：点击时由记录管理器取出勾选行并执行 onClick
        case 'getSelectedRows':
          return (
            <AdvButton
              onClick={() => emit('getSelectedRows', tooBarItemConfig)}
              {...UiProps}
            >
              {icon && (
                <el-icon>
                  <icon {...iconAttrs} />
                </el-icon>
              )}
              {slots[`toolBar-item-${key}`]?.() ?? text}
            </AdvButton>
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
              {...UiProps}
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
                  {...UiProps}
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
                  {...UiProps}
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
              {...UiProps}
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

          {layout.value === 'grid' ? (
            /* grid 布局：参考 AdvForm，容器使用 CSS 变量控制网格 */
            <div
              class={classes['tool_bar_grid']}
              style={{
                '--tool-bar-grid-cols': gridConfig.value.cols,
                '--tool-bar-grid-rows': gridConfig.value.rows,
                '--tool-bar-grid-gap': gridConfig.value.gap,
              }}
            >
              {toolBarItemlist.value
                .filter((tooBarItemConfig) => itemShowInfo.value[tooBarItemConfig.key])
                .map((tooBarItemConfig) => (
                  <div
                    key={tooBarItemConfig.key}
                    style={getGridItemStyle(tooBarItemConfig)}
                  >
                    {renderToolBarItem(tooBarItemConfig)}
                  </div>
                ))}
            </div>
          ) : (
            /* inline 布局：左右两栏，根据工具栏项的 inline 属性区分 */
            <div class={classes['tool_bar_main']}>
              {sideType.map((side) => (
                <div
                  key={side}
                  class={
                    side === 'left' ? classes['tool_bar_side_left'] : classes['tool_bar_side_right']
                  }
                >
                  {toolBarItemlist.value
                    .filter((tooBarItemConfig) => {
                      const { key, inline } = tooBarItemConfig;
                      const shouldShow = itemShowInfo.value[key];
                      return shouldShow && (side === 'left' ? inline !== 'right' : inline === 'right');
                    })
                    .map((tooBarItemConfig) => renderToolBarItem(tooBarItemConfig))}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null;
  },
});
