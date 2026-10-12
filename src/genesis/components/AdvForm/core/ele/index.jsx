/**
 * AdvForm 高级表单渲染组件
 *
 * 【组件功能】
 * 基于 Element Plus el-form 封装的表单渲染组件，根据配置自动渲染各种表单控件。
 *
 * 【表单项类型与组件映射】
 * | 类型 | Element Plus 组件 |
 * |------|------------------|
 * | input | el-input |
 * | phone | el-input (手机号 11 位 或 座机 区号-号码) |
 * | textarea | el-input (type="textarea") |
 * | number | el-inputNumber |
 * | select | el-select |
 * | treeSelect | el-tree-select |
 * | radio | el-radio-group |
 * | checkbox | el-checkbox-group |
 * | switch | el-switch |
 * | date | el-date-picker |
 * | dateTime | el-date-picker |
 * | time | el-time-picker |
 * | upload | Upload (自定义) |
 * | custom | 插槽 |
 *
 * 【插槽说明】
 * | 插槽名 | 说明 |
 * |--------|------|
 * | input-addonAfter-{key} | 输入框后缀内容 |
 * | custom-{key} | 自定义表单项组件 |
 * | form-item-after-{key} | 表单项元素后插槽 |
 * | upload-{key}-fileList | 上传文件列表自定义 |
 * | upload-{key}-previewContent | 上传预览内容自定义 |
 * | button | 按钮区域自定义 |
 *
 * 【表单项加解密配置】
 * 表单项配置 encrypt: true 时的加解密包装由入口组件 AdvForm/index.vue 实现（不在本核心组件中）：
 * 入口组件会把该字段的 set/get 包装一层（依托核心组件原有的表单项 set/get 配置项）：
 *   - set：仅在 setFormData() 设置表单数据时调用，用 urlPublicKey 解密（拉取数据时解密）
 *   - get：仅在 submit() 提交时调用，用 sm2Encrypt 加密（表单提交数据时加密）
 * 例：{ key: 'url', label: '报表地址', type: 'textarea', encrypt: true }
 * 说明：加密字段通过 setFormData() 加载（展示明文）、submit() 提交（发出密文）；
 *      用户编辑输入不触发 set/get 变换。set 解密失败时（后端已返回明文）原样透传。
 */

import classes from './index.module.scss';
import { useAdvForm, advFormProps, advFormEmits } from '../common/index.js';
import { defineComponent, ref, computed, toRefs } from 'vue';
import Upload from './upload.vue';
import { createDatePickerDisabledDate, createDatePickerDefaultValue } from './guard/date.js';
import { createTextGuardHandlers } from './guard/text.js';

export default defineComponent({
  name: 'adv-form',
  props: advFormProps,
  emits: advFormEmits,
  setup(props, { attrs, slots, emit, expose }) {
    /**
     * 表单引用
     */
    const eleFormRef = ref();

    /**
     * 使用表单 Hook
     */
    const {
      formItemRowList,
      formItemDict,
      formDataState,
      validateRules,
      getFormEleComponentProps,
      formEleComponentShowInfo,
      formEleComponentOptionsInfo,
      setFormItemRef,
      getFormItemRef,
      submit,
      submitButtonClickHandler,
      clearFormData,
      defineExposeConfig,
      computedGridConfig,
    } = useAdvForm(toRefs(props), emit, eleFormRef, null, 'modelValue');

    /**
     * 验证规则转换（适配 Element Plus 格式）
     */
    const validateRulesEle = computed(() => {
      const targetRulesInfo = {};
      // 构建 key -> type 映射，用于根据控件类型决定验证 trigger
      const formItemTypeInfo = {};
      for (const formItemConfig of formItemRowList.value) {
        formItemTypeInfo[formItemConfig.key] = formItemConfig.type;
      }
      for (const key of Object.keys(validateRules.value)) {
        if (formEleComponentShowInfo.value[key]) {
          const sourceValidateItem = validateRules.value[key];
          const targetValidateRules = [];
          for (const sourceRule of sourceValidateItem) {
            const targetValidateRuleItem = {
              trigger: formItemTypeInfo[key] === 'select' ? 'change' : 'blur',
              message: sourceRule.notice,
            };
            switch (sourceRule.type) {
              case 'required': {
                targetValidateRules.push(
                  Object.assign(targetValidateRuleItem, {
                    required: true,
                  })
                );
                break;
              }
              case 'email':
              case 'phone': {
                targetValidateRules.push(
                  Object.assign(targetValidateRuleItem, {
                    pattern: sourceRule.pattern,
                  })
                );
                break;
              }
              case 'peopleIdNum':
              case 'sameWith':
              case 'number':
              case 'custom': {
                targetValidateRules.push(
                  Object.assign(targetValidateRuleItem, {
                    validator: (rule, value, callback) => {
                      if (sourceRule.validateFn(rule, value, formDataState)) {
                        return true;
                      } else {
                        return false;
                      }
                    },
                  })
                );
                break;
              }
            }
          }
          targetRulesInfo[key] = targetValidateRules;
        }
      }
      return targetRulesInfo;
    });

    /**
     * 暴露方法给父组件
     */
    expose(defineExposeConfig);

    /**
     * 日期表单项（date / dateTime）的面板守卫属性，两处共用：
     * - disabledDate：inputGuard.dateLimit 按配置直接翻译，每次被面板调用时实时读目标字段当前值（联动 targetFieldName）或取固定 date，
     *   同一函数引用永远返回最新判定 —— 规避 EP 面板 setup 冻结首版 disabledDate 导致的联动守卫失效。
     * - defaultValue：字段为空时把面板一次定位到「离今天最近的合法日」所在页（界在很早以前时，EP 默认定位到今天会满屏禁用）；
     *   已有值时不传，面板应定位到该值所在页（EP 内部 parsedValue 优先级高于 defaultValue，传了反而会盖掉它）。
     * 两者都在渲染时求值，故联动源变化会随本次渲染一起生效。
     */
    const datePickerGuardPropsOf = (formItemConfig, formEleComponentProps) => {
      const dateLimit = formItemConfig.inputGuard?.dateLimit;
      const getFieldValue = (fieldKey) => formDataState[fieldKey];
      return {
        disabledDate: createDatePickerDisabledDate(
          dateLimit,
          getFieldValue,
          formEleComponentProps.disabledDate
        ),
        defaultValue: formDataState[formItemConfig.key]
          ? undefined
          : createDatePickerDefaultValue(dateLimit, getFieldValue),
      };
    };

    /**
     * 渲染表单组件
     */
    return () => (
      <div class={props.config?.formWrapClass}>
        <el-form
          model={formDataState}
          rules={validateRulesEle.value}
          {...props.config.attrs}
          ref={eleFormRef}
          validate-on-rule-change={false}
        >
          {/* 表单项容器 */}
          <div
            class={classes['form_item_wrap']}
            style={
              computedGridConfig.value
                ? {
                    '--form-grid-cols': computedGridConfig.value.cols,
                    '--form-grid-rows': computedGridConfig.value.rows,
                    '--form-grid-gap': computedGridConfig.value.gap,
                  }
                : undefined
            }
          >
            {formItemRowList.value.map((formItemConfig) => {
              if (formEleComponentShowInfo.value[formItemConfig.key]) {
                let formEleComponent;
                const formEleComponentProps = getFormEleComponentProps(formItemConfig);
                formEleComponentProps.modelValue = formDataState[formItemConfig.key];
                const formItemComponentProps = {
                  style: {
                    ...(formItemConfig?.style ?? {}),
                    ...(formItemConfig?.grid?.col
                      ? { 'grid-column': formItemConfig.grid.col }
                      : {}),
                    ...(formItemConfig?.grid?.row ? { 'grid-row': formItemConfig.grid.row } : {}),
                  },
                  label: formItemConfig.label,
                  prop: formItemConfig.key,
                  labelWidth: !formItemConfig.label ? '0px' : '120px',
                  ...(formItemConfig.formItemAttrs ?? props.config.formItemAttrs ?? {}),
                };

                /**
                 * 根据类型渲染不同的表单组件
                 */
                switch (formItemConfig.type) {
                  case 'input': {
                    formEleComponent = (
                      <el-input
                        {...formEleComponentProps}
                        clearable={true}
                      >
                        {slots[`input-addonAfter-${formItemConfig.key}`] && {
                          addonAfter: () => slots[`input-addonAfter-${formItemConfig.key}`],
                        }}
                      </el-input>
                    );
                    break;
                  }
                  case 'phone': {
                    // 文本表面守卫：canExtend 按键否决 + normalize 粘贴清洗（真实 preventDefault）
                    const { onKeydown, onPaste, maxlength } = createTextGuardHandlers('phone');
                    formEleComponent = (
                      <el-input
                        {...formEleComponentProps}
                        clearable={true}
                        maxlength={maxlength}
                        onKeydown={onKeydown}
                        onPaste={onPaste}
                      ></el-input>
                    );
                    break;
                  }
                  case 'number':
                  case 'intNumber': {
                    // 文本表面守卫：canExtend 按键否决 + normalize 粘贴清洗（可配 inputGuard.numberLimit 硬位数上限）。
                    // el-input-number 不把 maxlength/监听转发进内部 input，onKeydown/onPaste 靠根节点冒泡生效。
                    const numberLimit = formItemConfig.inputGuard?.numberLimit;
                    const { onKeydown, onPaste } = createTextGuardHandlers(
                      formItemConfig.type,
                      numberLimit
                    );
                    const numberEleComponentProps = {
                      ...formEleComponentProps,
                      clearable: true,
                      onKeydown,
                      onPaste,
                    };
                    // 派生 EP max（溢出收口）：整数与小数上限均有限且字段未自配 attrs.max 时注入，
                    // 使上箭头到顶自动禁用、步进/回填越界被 EP 钳制（逐键仍由上方 guard 拦截）。
                    // intNumber 只给 integer（小数无界）时数字上限无法精确表达，故不注入。
                    const userMax = formItemConfig?.attrs?.max;
                    if (
                      userMax === undefined &&
                      numberLimit &&
                      Number.isFinite(numberLimit.integer) &&
                      Number.isFinite(numberLimit.decimal)
                    ) {
                      numberEleComponentProps.max = Number(
                        '9'.repeat(numberLimit.integer) +
                          (numberLimit.decimal > 0 ? '.' + '9'.repeat(numberLimit.decimal) : '')
                      );
                    }
                    formEleComponent = (
                      <el-input-number {...numberEleComponentProps}></el-input-number>
                    );
                    break;
                  }
                  case 'textarea': {
                    formEleComponent = (
                      <el-input
                        show-word-limit={true}
                        type="textarea"
                        rows={5}
                        resize="none"
                        clearable={true}
                        {...formEleComponentProps}
                      ></el-input>
                    );
                    break;
                  }
                  case 'select': {
                    formEleComponent = (
                      <el-select
                        {...formEleComponentProps}
                        clearable={true}
                        fit-input-width={true}
                        filterable={true}
                      >
                        {formEleComponentOptionsInfo[formItemConfig.key].value.map((optionItem) => (
                          <el-option
                            {...(optionItem.optionAttrs ?? {})}
                            key={optionItem.value}
                            value={optionItem.value}
                            label={optionItem.label}
                          >
                            <span title={optionItem.label}>{optionItem.label}</span>
                          </el-option>
                        ))}
                      </el-select>
                    );
                    break;
                  }
                  case 'radio': {
                    formEleComponent = (
                      <el-radio-group {...formEleComponentProps}>
                        {formEleComponentOptionsInfo[formItemConfig.key].value.map(
                          (radioItemConfig) => (
                            <el-radio
                              key={radioItemConfig.value}
                              value={radioItemConfig.value}
                              {...(radioItemConfig.optionAttrs ?? {})}
                            >
                              {radioItemConfig.label}
                            </el-radio>
                          )
                        )}
                      </el-radio-group>
                    );
                    break;
                  }
                  case 'checkbox': {
                    formEleComponent = (
                      <el-checkbox-group {...formEleComponentProps}>
                        {formEleComponentOptionsInfo[formItemConfig.key].value.map(
                          (radioItemConfig) => (
                            <el-checkbox
                              {...(radioItemConfig.optionAttrs ?? {})}
                              key={radioItemConfig.value}
                              value={radioItemConfig.value}
                              label={radioItemConfig.label}
                            ></el-checkbox>
                          )
                        )}
                      </el-checkbox-group>
                    );
                    break;
                  }
                  case 'treeSelect': {
                    formEleComponent = (
                      <el-tree-select
                        dropdown-style={{ maxHeight: '400px', overflow: 'auto' }}
                        {...formEleComponentProps}
                        check-strictly={true}
                        clearable={true}
                        data={formItemConfig.options}
                      ></el-tree-select>
                    );
                    break;
                  }
                  case 'switch': {
                    formEleComponent = <el-switch {...formEleComponentProps}></el-switch>;
                    break;
                  }
                  case 'time': {
                    formEleComponent = (
                      <el-time-picker
                        clearable={true}
                        format="HH:mm:ss"
                        value-format="HH:mm:ss"
                        {...formEleComponentProps}
                      ></el-time-picker>
                    );
                    break;
                  }
                  case 'date': {
                    // inputGuard.dateLimit 面板守卫：禁用格子 + 打开面板时的默认页，见 datePickerGuardPropsOf
                    const datePickerGuardProps = datePickerGuardPropsOf(
                      formItemConfig,
                      formEleComponentProps
                    );
                    formEleComponent = (
                      <el-date-picker
                        clearable={true}
                        format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD"
                        {...formEleComponentProps}
                        {...datePickerGuardProps}
                      ></el-date-picker>
                    );
                    break;
                  }
                  case 'dateTime': {
                    // dateLimit 面板守卫：同 date
                    const datePickerGuardProps = datePickerGuardPropsOf(
                      formItemConfig,
                      formEleComponentProps
                    );
                    formEleComponent = (
                      <el-date-picker
                        clearable={true}
                        type="datetime"
                        format="YYYY-MM-DD HH:mm:ss"
                        value-format="YYYY-MM-DD HH:mm:ss"
                        {...formEleComponentProps}
                        {...datePickerGuardProps}
                      ></el-date-picker>
                    );
                    break;
                  }
                  case 'numberRange': {
                    formEleComponent = (
                      <el-slider
                        {...formEleComponentProps}
                        range
                      ></el-slider>
                    );
                    break;
                  }
                  case 'upload': {
                    formEleComponent = (
                      <Upload {...formEleComponentProps}>
                        {{
                          ...(slots[`upload-${formItemConfig.key}-fileList`] && {
                            fileList: ({ fileList }) =>
                              slots[`upload-${formItemConfig.key}-fileList`](fileList),
                          }),
                          ...(slots[`upload-${formItemConfig.key}-previewContent`] && {
                            previewContent: ({ data }) =>
                              slots[`upload-${formItemConfig.key}-previewContent`](data),
                          }),
                        }}
                      </Upload>
                    );
                    break;
                  }
                  case 'custom': {
                    formEleComponent = slots[`form-item-custom-${formItemConfig.key}`]({
                      ...formEleComponentProps,
                    });
                    break;
                  }
                }

                return (
                  <el-formItem
                    {...formItemComponentProps}
                    class={
                      [!formItemConfig.label ? classes.no_label : '', formItemConfig.class || '']
                        .filter(Boolean)
                        .join(' ') || undefined
                    }
                  >
                    <div class={classes.form_item_body}>
                      <div class={classes.form_item_content}>
                        {formEleComponent}
                        {slots[`form-item-after-${formItemConfig.key}`]?.()}
                      </div>
                      {formItemConfig.tip && (
                        <div class={classes.form_item_tip}>*{formItemConfig.tip}</div>
                      )}
                    </div>
                  </el-formItem>
                );
              } else {
                return null;
              }
            })}
          </div>
        </el-form>

        {/* 按钮区域 */}
        {props.config.showButton && (
          <div style="display: flex; justify-content: center; margin-top: 20px;">
            {slots.button ? (
              slots.button()
            ) : (
              <div>
                <el-button
                  type="primary"
                  onClick={submitButtonClickHandler}
                  style="margin-right: 20px"
                >
                  确认
                </el-button>
                <el-button onClick={clearFormData}>清空</el-button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
});
