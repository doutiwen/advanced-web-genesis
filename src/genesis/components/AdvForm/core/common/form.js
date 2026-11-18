import predefineValidateRules from './predefineValidateRules.js';
import { ref, computed, reactive, readonly, watch, onUnmounted, shallowRef } from 'vue';

// AdvForm 组件 props 定义：config 为表单配置
const advFormProps = {
  config: {
    type: Object,
    required: true,
  },
};

// AdvForm 组件 emits 定义
const advFormEmits = ['input', 'validateSuccess', 'validateFail'];

// AdvForm 核心逻辑工厂：根据配置与数据生成渲染所需的状态、watch 联动与表单操作方法
const useAdvForm = (
  { config },
  emits,
  formRef,
  vModelKey = 'value'
) => {
  const watchManager = new WatchManager();

  // ============ watch 类型分组 ============
  // 注册 watch 时以 `${formItemKey}-${watchType}` 作为 WatchManager 的唯一标识，
  // 使同一字段不同类型（value/options/show/validate/attrs）的联动 watch 相互独立，可按需停用/恢复。
  // formItemKeyOfWatchType 按 watch 类型记录各自的 formItemKey，
  // 供 setFormData 回填数据时暂时停用 value / options 类型 watch（避免联动计算值与动态选项在回填过程中覆盖本次数据），
  // 而 show/validate/attrs 等类型仍保持生效，以基于回填值刷新派生状态。
  const formItemKeyOfWatchType = {
    value: [],
    options: [],
    show: [],
    validate: [],
    attrs: [],
  };

  // 按 watch 类型注册表单项联动，并将 formItemKey 记录到对应类型分组
  const setFormItemWatchInfo = (formItemKey, watchType, watchSetting) => {
    watchManager.setWatchInfo(`${formItemKey}-${watchType}`, watchSetting);
    const typeKeyList = formItemKeyOfWatchType[watchType];
    if (typeKeyList && !typeKeyList.includes(formItemKey)) {
      typeKeyList.push(formItemKey);
    }
  };

  // ============ 回填值保护（方案 A） ============
  // setFormData 显式回填的字段值视为权威数据（后端保存值）；
  // 在该字段或其任一联动源被用户改动之前，value / options 联动“写字段值”应跳过，
  // 避免回填值被 watch 基于中间态 / 异步 options 晚到重算而清洗（覆盖/清空）。
  const externallyProvidedKeys = new Set();
  const userInputKeys = new Set();
  // 字段 key -> 其 watch 依赖的源 formData key 集合（用于判断用户是否改过联动源）
  const watchSourceKeysMap = new Map();

  // ============ 未配置字段透传缓冲 ============
  // setFormData 过滤掉未在 config.list 中配置的 key 时，同时把它们暂存到这里，
  // 供 submit() 原样合并回提交数据——既保持回填阶段 UI 不显示、watch 不处理，
  // 又恢复原语义：未配置字段在 submit 时随表单一起原样提交。
  let externalFormDataBuffer = {};

  // 记录某字段 watch 依赖的源 formData key
  const recordWatchSourceKeys = (key, sourceKeys) => {
    if (!sourceKeys?.length) return;
    if (!watchSourceKeysMap.has(key)) {
      watchSourceKeysMap.set(key, new Set());
    }
    const sourceSet = watchSourceKeysMap.get(key);
    sourceKeys.forEach((sourceKey) => sourceSet.add(sourceKey));
  };

  // 写字段值前判断是否应跳过：
  // 字段已被本次回填显式提供，且用户既未直接改该字段、也未改其任一联动源时返回 true
  const shouldSuppressWatchValueWrite = (key) => {
    if (!externallyProvidedKeys.has(key)) return false;
    if (userInputKeys.has(key)) return false;
    const sourceSet = watchSourceKeysMap.get(key);
    if (sourceSet && [...sourceSet].some((sourceKey) => userInputKeys.has(sourceKey))) {
      return false;
    }
    return true;
  };

  const formItemRowList = ref([]);

  const formItemDict = computed(() => {
    const dictInfo = {};
    for (const item of formItemRowList.value) {
      dictInfo[item.key] = item;
    }
    return dictInfo;
  });

  const formEleComponentProps = {};

  // 表单项 key -> 控件类型：watch 注册阶段 formItemDict 尚未构建完成，用它判断选项类字段
  const formItemTypeMap = new Map();

  let currentInputKey;

  const _config = toValue(config);

  // 收集 props.config.list 中配置过的表单项 key，
  // 用于过滤回填数据中未在本表单配置过的字段，供 setFormData 回填使用
  const getConfiguredFormItemKeySet = () => {
    const configuredKeySet = new Set();
    for (const formItemConfig of _config?.list ?? []) {
      if (formItemConfig?.key != null) {
        configuredKeySet.add(String(formItemConfig.key));
      }
    }
    return configuredKeySet;
  };

  // 表单项是否配置了数据变换（同时存在 get/set）
  const formItemHasDataTransform = (key) => {
    const formItemConfig = formItemDict.value[key];
    return typeof formItemConfig?.get === 'function' && typeof formItemConfig?.set === 'function';
  };

  const formDataState = reactive({});

  // 选项类控件类型：下拉 / 树选择 / 单选 / 多选，其选中值需要一并派发对应的 option item
  const optionItemInputTypes = ['select', 'treeSelect', 'radio', 'checkbox'];

  // 按 value 在选项列表中查找选项对象：递归 children，兼容扁平与树形结构
  const findOptionItemByValue = (optionList, targetValue) => {
    for (const optionItem of optionList ?? []) {
      if (optionItem.value === targetValue) return optionItem;
      const childHit = findOptionItemByValue(optionItem.children, targetValue);
      if (childHit) return childHit;
    }
    return undefined;
  };

  // 根据字段当前值在选项列表中查找对应的 option item：
  // 多选（值为数组）返回 option item 数组（过滤未匹配项），单选返回单个 option item，
  // 非选项类控件或未命中时返回空对象（保持原有 data 结构）
  const getSelectedOptionItemData = (key, value) => {
    const formItem = formItemDict.value[key];
    if (!formItem || !optionItemInputTypes.includes(formItem.type)) return {};
    const optionList = formEleComponentOptionsInfo[key]?.value ?? [];
    if (Array.isArray(value)) {
      return value
        .map((itemValue) => findOptionItemByValue(optionList, itemValue))
        .filter(Boolean);
    }
    return findOptionItemByValue(optionList, value) ?? {};
  };

  // 收集提交数据中各选项类字段对应的选中项对象（仅针对实际提交的字段）
  const collectSelectedOptionItems = (keys) => {
    const optionItems = {};
    for (const key of keys) {
      const formItem = formItemDict.value[key];
      if (!formItem || !optionItemInputTypes.includes(formItem.type)) continue;
      const value = formDataState[key];
      if (value == null) continue;
      optionItems[key] = getSelectedOptionItemData(key, value);
    }
    return optionItems;
  };

  // 程序化批量回填标记：setFormData / clearFormData 期间不派发 input，保证该事件只代表用户编辑
  let isApplyingFormData = false;

  watch(
    formDataState,
    (n) => {
      // 无当前交互字段（如批量写值）或处于程序化回填中时不派发
      if (currentInputKey == null || isApplyingFormData) return;
      emits('input', {
        key: currentInputKey,
        value: n[currentInputKey],
        data: getSelectedOptionItemData(currentInputKey, n[currentInputKey]),
      });
    },
    {
      deep: true,
      flush: 'sync',
    }
  );

  const validateRules = ref({});

  const formEleComponentShowInfo = ref({});

  const formEleComponentOptionsInfo = {};

  const formEleComponentAttrsInfo = {};

  // 是否为自带选项数据的控件类型（选项交由 formEleComponentOptionsInfo 统一管理）
  const isOwnOptionsType = (type) => {
    return ['select', 'treeSelect', 'radio', 'checkbox'].includes(type);
  };

  // 标准化校验规则：命中预定义规则则合并默认配置，并支持 message 覆盖与空值跳过非必填校验
  const validateConfigItemFormat = (sourceValidateItem, label, validateRuleList = []) => {
    const targetValidateRuleItem = {};
    if (sourceValidateItem.type && Reflect.has(predefineValidateRules, sourceValidateItem.type)) {
      const ruleFactory = predefineValidateRules[sourceValidateItem.type];
      let ruleFromPredefine;
      if (typeof ruleFactory === 'function') {
        ruleFromPredefine = ruleFactory(sourceValidateItem);
      } else {
        ruleFromPredefine = ruleFactory;
      }
      Object.assign(targetValidateRuleItem, { type: sourceValidateItem.type }, ruleFromPredefine);
    } else if (sourceValidateItem.type) {
      Object.assign(targetValidateRuleItem, { type: sourceValidateItem.type }, sourceValidateItem);
    } else {
      Object.assign(targetValidateRuleItem, { type: 'custom' }, sourceValidateItem);
    }
    if (typeof targetValidateRuleItem.notice === 'function') {
      targetValidateRuleItem.notice = targetValidateRuleItem.notice(label);
    }
    // 配置中的 message 可覆盖预定义规则的默认提示
    if (sourceValidateItem.message) {
      targetValidateRuleItem.notice = sourceValidateItem.message;
    }
    // 当字段的验证规则中不含必填项时，字段值为空则跳过其他类型的验证，
    // 避免空值触发格式（身份证/手机号等）或一致性（sameWith）等非必填校验
    const hasRequiredRule = validateRuleList.some((item) => item?.type === 'required');
    if (
      !hasRequiredRule &&
      sourceValidateItem.type !== 'required' &&
      typeof targetValidateRuleItem.validateFn === 'function'
    ) {
      const originValidateFn = targetValidateRuleItem.validateFn;
      targetValidateRuleItem.validateFn = (rule, value, formData) => {
        if (value === '' || value === undefined || value === null) {
          return true;
        }
        return originValidateFn(rule, value, formData);
      };
    }
    return targetValidateRuleItem;
  };

  // ============ watch 联动（统一数组配置） ============
  // 配置形态：watch: [{ on, option?, attrKey?, show|options|value|validate|attrs: fn }]
  // - on 为内部字段/描述符时，动作接收 (values, oldValues, ctx)
  // - on 为外部响应式源时，动作接收 (newVal, oldVal, ctx)，与 Vue watch 一致
  // - 动作只接受函数；字符串表达式已移除
  const WATCH_ACTION_NAMES = ['show', 'options', 'value', 'validate', 'attrs'];
  const WATCH_DEP_TYPES = ['options', 'selected', 'show', 'attrs'];
  // 旧版字符串 DSL 特征：options(x) / selected(x) / show(x) / attrs(x, y)
  const LEGACY_DSL_PATTERN = /(?:options|selected|show|attrs)\s*\(/;
  const warnedLegacyWatch = new Set();

  // 旧版 watch 配置首次命中时输出一次迁移提示
  const warnLegacyWatchOnce = (key, type) => {
    const flag = `${key}-${type}`;
    if (warnedLegacyWatch.has(flag)) return;
    warnedLegacyWatch.add(flag);
    console.warn(
      `[AdvForm] 表单项 "${key}" 的 ${type} 使用了旧版 watch 配置，建议迁移到 watch 数组写法`
    );
  };

  // 依赖描述符：只建立订阅，不进入动作的 values
  const isWatchDepDescriptor = (item) =>
    !!item &&
    typeof item === 'object' &&
    WATCH_DEP_TYPES.includes(item.type) &&
    item.key != null;

  // 判断 on 是否为内部字段/描述符形态
  const isInternalWatchOn = (on) => {
    if (typeof on === 'string') return true;
    if (isWatchDepDescriptor(on)) return true;
    return (
      Array.isArray(on) &&
      on.length > 0 &&
      on.every((item) => typeof item === 'string' || isWatchDepDescriptor(item))
    );
  };

  // 校验单条 watch 规则并做归一化
  const normalizeWatchRule = (formItemKey, rawRule, index) => {
    const where = `[AdvForm] 表单项 "${formItemKey}" 的 watch[${index}]`;
    if (!rawRule || typeof rawRule !== 'object') {
      throw new Error(`${where} 必须是对象`);
    }
    const actionNames = WATCH_ACTION_NAMES.filter((name) => Reflect.has(rawRule, name));
    if (actionNames.length !== 1) {
      throw new Error(
        `${where} 必须且只能配置一个动作（${WATCH_ACTION_NAMES.join(
          ' / '
        )}），当前为：${actionNames.join(', ') || '无'}`
      );
    }
    const actionName = actionNames[0];
    const action = rawRule[actionName];
    if (typeof action !== 'function') {
      throw new Error(
        `${where} 的动作 "${actionName}" 必须是函数；字符串表达式已移除，请改为 ({ 字段名 }) => 结果`
      );
    }
    if (rawRule.on == null) {
      throw new Error(`${where} 缺少 on 依赖声明`);
    }
    if (actionName === 'attrs' && !rawRule.attrKey) {
      throw new Error(`${where} 的 attrs 动作必须配置 attrKey`);
    }
    if (actionName !== 'attrs' && rawRule.attrKey) {
      throw new Error(`${where} 配置了 attrKey，但动作是 ${actionName}；attrKey 仅用于 attrs`);
    }
    if (isInternalWatchOn(rawRule.on)) {
      const onList = Array.isArray(rawRule.on) ? rawRule.on : [rawRule.on];
      for (const item of onList) {
        if (typeof item === 'string' && LEGACY_DSL_PATTERN.test(item)) {
          throw new Error(
            `${where} 的 on 不支持 options()/selected()/show()/attrs() 字符串引用，` +
              `请写字段 key 并使用 ctx 中的同名方法`
          );
        }
        if (isWatchDepDescriptor(item)) {
          if (item.type === 'attrs' && !item.attrKey) {
            throw new Error(`${where} 的 on 描述符 type="attrs" 必须配置 attrKey`);
          }
          if (item.type !== 'attrs' && item.attrKey) {
            throw new Error(`${where} 的 on 描述符仅 type="attrs" 需要 attrKey`);
          }
        }
      }
    } else {
      const sourceList = Array.isArray(rawRule.on) ? rawRule.on : [rawRule.on];
      if (!sourceList.length) {
        throw new Error(`${where} 的 on 不能为空`);
      }
      for (const item of sourceList) {
        const isSource = typeof item === 'function' || (item && typeof item === 'object');
        if (!isSource) {
          throw new Error(`${where} 的 on 不能混用内部字段与外部响应式源`);
        }
      }
    }
    return {
      actionName,
      action,
      attrKey: rawRule.attrKey,
      on: rawRule.on,
      option: rawRule.option,
    };
  };

  // 描述符只在 computed 中读取一次，用于建立响应式订阅
  const touchWatchDep = (dep) => {
    switch (dep.type) {
      case 'options':
        return formEleComponentOptionsInfo[dep.key]?.value;
      case 'selected':
        return [formDataState[dep.key], formEleComponentOptionsInfo[dep.key]?.value];
      case 'show':
        return formEleComponentShowInfo.value[dep.key];
      case 'attrs':
        return formEleComponentAttrsInfo[dep.key]?.[dep.attrKey]?.value;
      default:
        return undefined;
    }
  };

  // 内部依赖源：字段值 + 描述符订阅 + 选项类字段自动订阅选项变化
  const buildInternalWatchSource = (on) => {
    const onList = Array.isArray(on) ? on : [on];
    const valueKeys = [];
    const depList = [];
    for (const item of onList) {
      if (typeof item === 'string') {
        if (!valueKeys.includes(item)) valueKeys.push(item);
      } else {
        depList.push(item);
      }
    }
    const optionKeys = valueKeys.filter((key) => isOwnOptionsType(formItemTypeMap.get(key)));
    return {
      valueKeys,
      source: computed(() => {
        depList.forEach((dep) => touchWatchDep(dep));
        // 选项类字段：值变化或选项变化都触发，对齐旧 selected()/options() 的触发语义
        optionKeys.forEach((key) => formEleComponentOptionsInfo[key]?.value);
        return valueKeys.map((key) => formDataState[key]);
      }),
    };
  };

  // 将依赖值数组还原为命名字段对象
  const buildWatchValues = (keys, valueList) => {
    const values = {};
    keys.forEach((key, index) => {
      values[key] = valueList?.[index];
    });
    return values;
  };

  // 选中项查询：对齐旧行为，单选未命中返回 undefined；多选返回命中数组
  const getWatchSelectedOption = (key) => {
    const optionList = formEleComponentOptionsInfo[key]?.value ?? [];
    const currentValue = formDataState[key];
    if (Array.isArray(currentValue)) {
      return currentValue
        .map((itemValue) => findOptionItemByValue(optionList, itemValue))
        .filter(Boolean);
    }
    return findOptionItemByValue(optionList, currentValue);
  };

  // 联动上下文：formData 为触发时快照，与旧实现一致
  const buildWatchCtx = () => ({
    formData: { ...formDataState },
    selected: getWatchSelectedOption,
    options: (key) => formEleComponentOptionsInfo[key]?.value ?? [],
    show: (key) => formEleComponentShowInfo.value[key] ?? false,
    attrs: (key, attrKey) => formEleComponentAttrsInfo[key]?.[attrKey]?.value,
  });

  const reportWatchError = (key, actionName, err) => {
    console.error(`[AdvForm] 表单项 "${key}" 的 watch ${actionName} 执行失败`, err);
  };

  // 更新表单项自定义属性的通用逻辑
  const updateFormEleAttr = (key, attrKey, newValue) => {
    if (!formEleComponentAttrsInfo[key]) {
      formEleComponentAttrsInfo[key] = {};
    }
    if (!formEleComponentAttrsInfo[key][attrKey]) {
      formEleComponentAttrsInfo[key][attrKey] = ref(newValue);
    } else {
      formEleComponentAttrsInfo[key][attrKey].value = newValue;
    }
  };

  // 动作结果分发：统一同步/异步，异常带字段与动作信息
  const consumeWatchResult = (key, actionName, attrKey, result) => {
    if (result && typeof result.then === 'function') {
      result
        .then((resolved) => applyWatchAction(key, actionName, attrKey, resolved))
        .catch((err) => reportWatchError(key, actionName, err));
      return;
    }
    applyWatchAction(key, actionName, attrKey, result);
  };

  // 执行用户动作：参数后追加 ctx，异常与异步失败统一输出
  const runWatchAction = (key, actionName, attrKey, action, args) => {
    let result;
    try {
      result = action(...args, buildWatchCtx());
    } catch (err) {
      reportWatchError(key, actionName, err);
      return;
    }
    consumeWatchResult(key, actionName, attrKey, result);
  };

  // 动作结果落到表单状态（消费函数在运行时已初始化）
  const applyWatchAction = (key, actionName, attrKey, result) => {
    switch (actionName) {
      case 'show':
        formEleItemShowChangeFn(key, result);
        break;
      case 'options':
        formEleItemOptionsChangeFn(key, result);
        break;
      case 'value':
        formEleItemBindValueChangeFn(key, result);
        break;
      case 'validate':
        formEleItemValidateChangeFn(key, result);
        break;
      case 'attrs':
        updateFormEleAttr(key, attrKey, result);
        break;
      default:
        break;
    }
  };

  // 旧版 watch keys：只接受普通字段 key，字符串 DSL 已移除
  const parseLegacyWatchKeys = (keys, formItemKey, type) => {
    if (typeof keys !== 'string' && !Array.isArray(keys)) {
      throw new Error(
        `[AdvForm] 表单项 "${formItemKey}" 的 ${type} watch keys 必须是字符串或字符串数组`
      );
    }
    const sourceKeys = typeof keys === 'string' ? [keys] : keys;
    const formDataKeys = [];
    for (const item of sourceKeys) {
      if (typeof item !== 'string') {
        throw new Error(
          `[AdvForm] 表单项 "${formItemKey}" 的 ${type} watch keys 只支持字段 key 字符串`
        );
      }
      if (LEGACY_DSL_PATTERN.test(item)) {
        throw new Error(
          `[AdvForm] 表单项 "${formItemKey}" 的 ${type} watch keys 使用了已移除的字符串 DSL：${item}`
        );
      }
      if (!formDataKeys.includes(item)) formDataKeys.push(item);
    }
    return formDataKeys;
  };

  // 旧版 handle 入参：保持 optionsInfo / currentSelectInfo / formData 兼容
  const buildLegacyWatchArgs = (formDataKeys) => {
    const args = {
      optionsInfo: Object.entries(formEleComponentOptionsInfo).reduce((result, [key, value]) => {
        result[key] = value.value;
        return result;
      }, {}),
      currentSelectInfo: {},
      formData: { ...formDataState },
    };
    for (const key of formDataKeys) {
      args[key] = formDataState[key];
      if (formEleComponentOptionsInfo[key]?.value) {
        args.currentSelectInfo[key] = findOptionItemByValue(
          formEleComponentOptionsInfo[key].value,
          formDataState[key]
        );
      }
    }
    return args;
  };

  // 旧版 { keys, handle } 配置 → Vue watch 参数
  const getLegacyWatchSetting = (key, watchConfig, actionName, attrKey) => {
    if (watchConfig?.keys == null) {
      throw new Error(
        `[AdvForm] 表单项 "${key}" 的 ${actionName} watch 配置缺少 keys，请改用 watch 数组写法`
      );
    }
    const formDataKeys = parseLegacyWatchKeys(watchConfig.keys, key, actionName);
    // 记录联动源，供回填值保护判断源字段是否被用户改动
    recordWatchSourceKeys(key, formDataKeys);
    const handle =
      watchConfig.handle ??
      ((values) => {
        // 未配置 handle 时保持旧语义：无 keys 返回 true，否则返回 keys 的短路与结果
        if (!formDataKeys.length) return true;
        let result;
        for (const formDataKey of formDataKeys) {
          result = values[formDataKey];
          if (!result) return result;
        }
        return result;
      });
    const watchSetting = [
      computed(() => formDataKeys.map((formDataKey) => formDataState[formDataKey])),
      () => {
        let result;
        try {
          result = handle(buildLegacyWatchArgs(formDataKeys));
        } catch (err) {
          reportWatchError(key, actionName, err);
          return;
        }
        consumeWatchResult(key, actionName, attrKey, result);
      },
    ];
    if (watchConfig.option) {
      watchSetting.push(watchConfig.option);
    }
    return watchSetting;
  };

  // 更新字段值入口：同步写入 formDataState（表单项组件直接以该状态作为 modelValue）
  // 必须同步落库：Element Plus 在输入事件后会 await nextTick() 回写原生 value，
  // 同步写入可让其判定新旧值一致并保留自带的光标恢复逻辑，避免光标跳到末尾。
  const updateFormDataState = (key, value) => {
    currentInputKey = key;
    // 用户输入/动态值直接写入，不做 set/get 变换（变换只在 setFormData / submit 中应用）
    formDataState[key] = value;
  };

  // show 联动：用动作结果控制字段显隐，隐藏时清空字段值
  const formEleItemShowChangeFn = (key, result) => {
    const isShow = Boolean(result);
    if (!isShow) {
      formDataState[key] = undefined;
    }
    formEleComponentShowInfo.value[key] = isShow;
  };

  // 解析 options 联动结果：纯数组直接作为选项，{ value, options } 同时回填选中值
  const parsingOptionsResult = (key, result) => {
    if (Array.isArray(result)) {
      formEleComponentOptionsInfo[key].value = result;
    } else if (typeof result === 'object' && Reflect.has(result, 'value') && result?.options) {
      // 字段已被回填且联动源未被用户改动时，仅更新选项、不写回字段值，保护后端值
      if (!shouldSuppressWatchValueWrite(key)) {
        updateFormDataState(key, result.value);
      }
      formEleComponentOptionsInfo[key].value = result.options;
    }
  };

  // options 联动消费：异步结果已由 consumeWatchResult 统一等待
  const formEleItemOptionsChangeFn = (key, result) => {
    parsingOptionsResult(key, result);
  };

  // value 联动：用动作结果动态回填字段值（字段已被回填且联动源未被用户改动时跳过，保护后端值）
  const formEleItemBindValueChangeFn = (key, result) => {
    if (shouldSuppressWatchValueWrite(key)) {
      return;
    }
    updateFormDataState(key, result);
  };

  // validate 联动：用动作结果动态生成或清除字段校验规则
  const formEleItemValidateChangeFn = (key, result) => {
    if (!result) {
      Reflect.deleteProperty(validateRules.value, key);
      return;
    }
    if (!Array.isArray(result)) {
      reportWatchError(key, 'validate', new Error('validate 联动必须返回规则数组或空值'));
      return;
    }
    formDataState[key] = undefined;
    const label = formItemDict.value[key]?.label ?? key;
    validateRules.value[key] = result.map((validateItem) => {
      return validateConfigItemFormat(validateItem, label, result);
    });
    formRef.value?.clearValidate();
  };

  // 注册表单项 watch 联动：新版 watch 数组 + 旧版配置（函数形态，告警）
  const setFormItemWatch = (sourceFormItem) => {
    const formItemKey = sourceFormItem.key;

    // ===== 新版统一入口：watch 数组 =====
    if (Array.isArray(sourceFormItem?.watch)) {
      sourceFormItem.watch.forEach((rawRule, index) => {
        const rule = normalizeWatchRule(formItemKey, rawRule, index);
        // options 动作只适用于自带选项数据的控件
        if (rule.actionName === 'options' && !isOwnOptionsType(formItemTypeMap.get(formItemKey))) {
          throw new Error(
            `[AdvForm] 表单项 "${formItemKey}" 的 watch[${index}] 使用 options 动作，但控件类型不支持动态选项`
          );
        }
        // show 规则：先置隐藏，保持旧版首帧行为
        if (rule.actionName === 'show') {
          formEleComponentShowInfo.value[formItemKey] = false;
        }
        let watchSetting;
        if (isInternalWatchOn(rule.on)) {
          const { valueKeys, source } = buildInternalWatchSource(rule.on);
          // 记录联动源，供回填值保护判断源字段是否被用户改动
          recordWatchSourceKeys(formItemKey, valueKeys);
          watchSetting = [
            source,
            (newValues, oldValues) => {
              runWatchAction(formItemKey, rule.actionName, rule.attrKey, rule.action, [
                buildWatchValues(valueKeys, newValues),
                oldValues ? buildWatchValues(valueKeys, oldValues) : undefined,
              ]);
            },
          ];
        } else {
          // 外部多源统一包成 getter：避免 WatchManager 把源数组误判为多条 watch 配置
          const externalSource = Array.isArray(rule.on)
            ? () => rule.on.map((source) => toValue(source))
            : rule.on;
          watchSetting = [
            externalSource,
            (newValue, oldValue) => {
              runWatchAction(formItemKey, rule.actionName, rule.attrKey, rule.action, [
                newValue,
                oldValue,
              ]);
            },
          ];
        }
        if (rule.option) {
          watchSetting.push(rule.option);
        }
        setFormItemWatchInfo(formItemKey, rule.actionName, watchSetting);
      });
    }

    // ===== 旧版配置兼容（仅函数/原生数组形态） =====
    // 字符串表达式直接报错，避免静默失效
    const assertLegacyNotString = (config, type) => {
      if (typeof config === 'string') {
        throw new Error(
          `[AdvForm] 表单项 "${formItemKey}" 的 ${type} 字符串表达式已移除，请改用 watch 数组 + 函数`
        );
      }
    };

    // 旧版数组形态：保持 [source, callback, option] 的原生 watch 语义
    const registerLegacyArrayWatch = (config, actionName, attrKey) => {
      const [source, callback, options] = config;
      if (typeof callback !== 'function') {
        throw new Error(
          `[AdvForm] 表单项 "${formItemKey}" 的 ${actionName} 数组形态第二个参数必须是函数`
        );
      }
      const watchSetting = [
        source,
        (newValue, oldValue) => {
          let result;
          try {
            result = callback(newValue, oldValue);
          } catch (err) {
            reportWatchError(formItemKey, actionName, err);
            return;
          }
          consumeWatchResult(formItemKey, actionName, attrKey, result);
        },
        options,
      ].filter(Boolean);
      setFormItemWatchInfo(formItemKey, actionName, watchSetting);
    };

    // 控制表单项显隐
    if (sourceFormItem?.show) {
      assertLegacyNotString(sourceFormItem.show, 'show');
      warnLegacyWatchOnce(formItemKey, 'show');
      formEleComponentShowInfo.value[formItemKey] = false;
      if (getVarType(sourceFormItem.show) === 'array') {
        registerLegacyArrayWatch(sourceFormItem.show, 'show');
      } else {
        setFormItemWatchInfo(
          formItemKey,
          'show',
          getLegacyWatchSetting(formItemKey, sourceFormItem.show, 'show')
        );
      }
    }

    // 动态更新选项数据
    if (sourceFormItem?.options?.watch) {
      assertLegacyNotString(sourceFormItem.options.watch, 'options');
      warnLegacyWatchOnce(formItemKey, 'options');
      if (getVarType(sourceFormItem.options.watch) === 'array') {
        registerLegacyArrayWatch(sourceFormItem.options.watch, 'options');
      } else {
        setFormItemWatchInfo(
          formItemKey,
          'options',
          getLegacyWatchSetting(formItemKey, sourceFormItem.options.watch, 'options')
        );
      }
    }

    // 动态更新校验规则
    if (sourceFormItem?.validate?.watch) {
      assertLegacyNotString(sourceFormItem.validate.watch, 'validate');
      warnLegacyWatchOnce(formItemKey, 'validate');
      if (getVarType(sourceFormItem.validate.watch) === 'array') {
        registerLegacyArrayWatch(sourceFormItem.validate.watch, 'validate');
      } else {
        setFormItemWatchInfo(
          formItemKey,
          'validate',
          getLegacyWatchSetting(formItemKey, sourceFormItem.validate.watch, 'validate')
        );
      }
    }

    // 动态更新表单值
    if (sourceFormItem?.value?.watch) {
      assertLegacyNotString(sourceFormItem.value.watch, 'value');
      warnLegacyWatchOnce(formItemKey, 'value');
      if (getVarType(sourceFormItem.value.watch) === 'array') {
        registerLegacyArrayWatch(sourceFormItem.value.watch, 'value');
      } else {
        setFormItemWatchInfo(
          formItemKey,
          'value',
          getLegacyWatchSetting(formItemKey, sourceFormItem.value.watch, 'value')
        );
      }
    }

    // 注册单个自定义属性的旧版 watch：{ keys, handle } 或 [source, callback, option]
    const setAttrWatchConfig = (attrKey, attrWatchConfig) => {
      assertLegacyNotString(attrWatchConfig, `attrs(${attrKey})`);
      warnLegacyWatchOnce(formItemKey, `attrs:${attrKey}`);
      if (attrWatchConfig?.keys) {
        setFormItemWatchInfo(
          formItemKey,
          'attrs',
          getLegacyWatchSetting(formItemKey, attrWatchConfig, 'attrs', attrKey)
        );
      } else if (getVarType(attrWatchConfig) === 'array') {
        registerLegacyArrayWatch(attrWatchConfig, 'attrs', attrKey);
      } else {
        throw new Error(
          `[AdvForm] 表单项 "${formItemKey}" 的属性 "${attrKey}" watch 配置不合法`
        );
      }
    };

    // 方式一：watch[attrKey][watchConfig]（对象形态，区别于新版数组）
    if (sourceFormItem?.watch && !Array.isArray(sourceFormItem.watch)) {
      for (const [attrKey, attrWatchConfig] of Object.entries(sourceFormItem.watch)) {
        setAttrWatchConfig(attrKey, attrWatchConfig);
      }
    }

    // 方式二：attrKey: { watch: watchConfig } —— 如 disabled: { watch: [...] }
    // 遍历表单项自定义属性，处理带 watch 包装的配置（排除表单项结构属性）
    const formItemStructuralKeys = new Set([
      'key',
      'label',
      'type',
      'show',
      'options',
      'validate',
      'value',
      'watch',
      'attrs',
      'events',
      'grid',
      'style',
      'class',
      'tip',
      'formItemAttrs',
      'defaultValue',
      'placeholder',
      // 输入时过滤/阻止的表单项配置统一收纳于 inputGuard（如 inputGuard: { dateLimit, numberLimit }），
      // 顶层不再出现 dateLimit / numberLimit，避免被当作自定义属性 watch 扫描
      'inputGuard',
    ]);
    for (const [attrKey, attrValue] of Object.entries(sourceFormItem)) {
      if (formItemStructuralKeys.has(attrKey)) continue;
      if (attrValue && getVarType(attrValue) === 'object' && attrValue.watch) {
        setAttrWatchConfig(attrKey, attrValue.watch);
      }
    }
  };

  // ============ dateLimit（日期范围限制）派生校验 ============
  // 只保留「事后提示」通道：inputGuard.dateLimit 预置规则按配置直接派生一条 custom 校验项并入既有 validate 管道，
  // 失焦/提交时由 UI 库的校验通道给出提示（消息文本与规则语义保持一致）。
  // 「事中禁用」（面板单元格禁选）是纯 UI 能力，不再由本模块产出——直接落在 core/ele/guard/date.js，
  // disabledDate 每次被面板调用时实时读目标字段当前值（targetFieldName）或取固定 date，无需 watch/描述符中转。
  // 支持形态（与消费侧 inputGuard.dateLimit 配置一致）：{ type: 'notAfter' | 'notBefore', targetFieldName? | date? }
  const compileDateLimitValidate = (dateLimitConfig, labelCtx) => {
    if (!dateLimitConfig || typeof dateLimitConfig !== 'object') return [];
    const { type, targetFieldName, date } = dateLimitConfig;
    if (type !== 'notBefore' && type !== 'notAfter') return [];
    const dayPart = (v) => (typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : v);
    const boundOf = (formData) => (targetFieldName ? formData?.[targetFieldName] : date);
    const verb = type === 'notBefore' ? '不能早于' : '不能晚于';
    const message = targetFieldName
      ? `${labelCtx.label}${verb}${labelCtx.peerLabel(targetFieldName)}`
      : `${labelCtx.label}${verb}${date}`;
    return [
      {
        type: 'custom',
        validateFn(rule, value, formData) {
          const boundDay = boundOf(formData);
          if (!value || !boundDay) return true;
          return type === 'notBefore'
            ? dayPart(value) >= dayPart(boundDay)
            : dayPart(value) <= dayPart(boundDay);
        },
        message,
      },
    ];
  };

  // 配置静态校验规则并写入 validateRules
  const setValidateConfig = (sourceFormItem) => {
    if (sourceFormItem.validate) {
      const targetValidateRules = [];
      if (getVarType(sourceFormItem.validate) === 'array') {
        for (const validateItem of sourceFormItem.validate) {
          targetValidateRules.push(
            validateConfigItemFormat(validateItem, sourceFormItem.label, sourceFormItem.validate)
          );
        }
      }
      validateRules.value[sourceFormItem.key] = targetValidateRules;
    }
  };

  // 标准化表单项配置：初始化选项源 / attrs 响应式信息并生成默认 placeholder
  const formItemConfigFormat = (sourceFormItem) => {
    const targetFormItem = {
      ...sourceFormItem,
    };
    const formItemKey = sourceFormItem.key;
    if (isOwnOptionsType(sourceFormItem.type)) {
      formEleComponentOptionsInfo[formItemKey] = shallowRef([]);
      if (sourceFormItem.options) {
        if (getVarType(sourceFormItem.options) === 'asyncFunction') {
          const getOptionsFn = sourceFormItem.options;
          getOptionsFn(formDataState).then((res) => {
            parsingOptionsResult(formItemKey, res);
          });
        } else if (getVarType(sourceFormItem.options) === 'function') {
          const getOptionsFn = sourceFormItem.options;
          parsingOptionsResult(formItemKey, getOptionsFn(formDataState));
        } else if (getVarType(sourceFormItem.options) === 'array') {
          parsingOptionsResult(formItemKey, sourceFormItem.options);
        }
      }
    }
    if (!Reflect.has(sourceFormItem, 'placeholder')) {
      switch (sourceFormItem.type) {
        case 'select':
        case 'treeSelect':
        case 'radio':
        case 'checkbox':
        case 'switch': {
          targetFormItem.placeholder = `请选择${sourceFormItem.label}`;
          break;
        }
        default: {
          targetFormItem.placeholder = `请输入${sourceFormItem.label}`;
        }
      }
    }
    if (!sourceFormItem?.attrs) {
      targetFormItem.attrs = {};
    }

    if (sourceFormItem.attrs) {
      formEleComponentAttrsInfo[formItemKey] = {};
      for (const [attrKey, attrValue] of Object.entries(sourceFormItem.attrs)) {
        formEleComponentAttrsInfo[formItemKey][attrKey] = ref(attrValue);
      }
    }

    return targetFormItem;
  };

  // 获取（并缓存）表单项传给 UI 组件的 props，attrs 响应式变化时同步刷新
  const getFormEleComponentProps = (sourceFormItem) => {
    const key = sourceFormItem.key;
    if (!formEleComponentProps[key]) {
      formEleComponentProps[key] = {
        [`onUpdate:${vModelKey}`]: (value) => {
          // UI 用户输入：记录用户改动过的 key（用于解除对应字段的回填值保护）
          userInputKeys.add(key);
          updateFormDataState(key, value);
        },
        placeholder: sourceFormItem.placeholder,
        ...(sourceFormItem.attrs ?? {}),
        ...(sourceFormItem.events ?? {}),
      };
    }
    const attrsInfo = formEleComponentAttrsInfo[key] ?? {};
    for (const [attrKey, attrRef] of Object.entries(attrsInfo)) {
      formEleComponentProps[key][attrKey] = attrRef.value;
    }
    return formEleComponentProps[key];
  };

  // 初始化表单项为显示状态
  const setFormEleComponentShowInfo = (sourceFormItem) => {
    formEleComponentShowInfo.value[sourceFormItem.key] = true;
  };

  // 初始化字段值：无 value 联动时取 defaultValue（支持函数 / 异步），已有值则不覆盖
  const setFormDataState = (sourceFormItem) => {
    if (!Reflect.has(formDataState, sourceFormItem.key)) {
      let realValue = undefined;
      if (!sourceFormItem?.value?.watch) {
        if (getVarType(sourceFormItem?.defaultValue) === 'asyncFunction') {
          sourceFormItem.defaultValue().then((res) => {
            if (formDataState[sourceFormItem.key] == null) {
              formDataState[sourceFormItem.key] = res;
            }
          });
        } else if (typeof sourceFormItem?.defaultValue === 'function') {
          realValue = sourceFormItem.defaultValue();
        } else if (Reflect.has(sourceFormItem, 'defaultValue')) {
          realValue = sourceFormItem.defaultValue;
        }
      }
      formDataState[sourceFormItem.key] = realValue;
    }
  };

  // 计算表格网格配置
  const computedGridConfig = ref(null);

  // 初始化表单：计算网格布局、注册各表单项后一次性启用 watch
  const initForm = (sourceData) => {
    if (sourceData?.length) {
      // 一维配置：直接使用，布局完全由 config.grid 与表单项 grid 决定
      const allFormItems = [...sourceData];

      // 使用用户配置或默认值（默认一行一个）
      computedGridConfig.value = {
        cols: _config?.grid?.cols || 'repeat(1, 1fr)',
        rows: _config?.grid?.rows || 'auto',
        gap: _config?.grid?.gap || '16px',
      };

      // 构建字段 key -> label 映射：供 dateLimit 派生校验提示引用被限制的目标字段名称
      const keyLabelMap = {};
      for (const sourceFormItem of allFormItems) {
        keyLabelMap[sourceFormItem.key] = sourceFormItem.label ?? sourceFormItem.key;
        // 预先登记控件类型：watch 注册阶段 formItemDict 尚未构建完成
        formItemTypeMap.set(sourceFormItem.key, sourceFormItem.type);
      }
      const dateLimitLabelCtxOf = (sourceFormItem) => ({
        label: sourceFormItem.label ?? sourceFormItem.key,
        peerLabel: (targetKey) => keyLabelMap[targetKey] ?? targetKey,
      });

      // dateLimit 联动写表项（越界即清空依赖字段）：
      // 依赖字段 inputGuard.dateLimit.targetFieldName 指向本表单某源字段（如计划完工日期 → 计划开工日期）时，
      // 若源字段被用户重选到「使依赖字段当前值失效」的方向（重选开工晚于既有完工 / 重选开始早于既有结束），
      // 旧依赖值已不可能满足约束，直接清空，避免残留旧值触发派生校验误报。
      // 仅当源字段为用户直接改动（userInputKeys 命中）时触发——setFormData 回填与其它联动改动
      // 属于权威数据（源字段未被用户碰过），不清空。watch 走 WatchManager，逻辑留在 core/common；
      // 事中面板禁选仍是纯 UI，由 core/ele/guard/date.js 实时判定负责，二者互补。
      const dateLimitSourceClearMap = new Map();
      for (const formItem of allFormItems) {
        const dateLimitDependent = formItem?.inputGuard?.dateLimit;
        const sourceKey = dateLimitDependent?.targetFieldName;
        // 源字段不在本表单（外部引用）或字段非日期类型时无联动清空对象
        if (!sourceKey || !keyLabelMap[sourceKey]) continue;
        if (formItem.type !== 'date' && formItem.type !== 'dateTime') continue;
        if (dateLimitDependent.type !== 'notBefore' && dateLimitDependent.type !== 'notAfter')
          continue;
        if (!dateLimitSourceClearMap.has(sourceKey)) {
          dateLimitSourceClearMap.set(sourceKey, []);
        }
        dateLimitSourceClearMap.get(sourceKey).push({
          dependentKey: formItem.key,
          type: dateLimitDependent.type,
        });
      }

      // 处理所有表单项（废弃行概念，直接扁平化）
      allFormItems.forEach((sourceFormItem) => {
        const formattedItem = formItemConfigFormat(sourceFormItem);
        setFormEleComponentShowInfo(sourceFormItem);
        // dateLimit：取回派生 report 校验原始项（blur/submit 提示）；guard 由渲染层按 inputGuard.dateLimit 配置直接落地。
        // 派生项并入 validate 通道时克隆配置，避免改动源配置对象；
        // 字段自身 validate 为 watch 等非数组形态时不并入派生项，保持既有动态校验语义
        const dateLimitDerivedValidateItems = compileDateLimitValidate(
          sourceFormItem.inputGuard?.dateLimit,
          dateLimitLabelCtxOf(sourceFormItem)
        );
        if (dateLimitDerivedValidateItems.length) {
          if (getVarType(sourceFormItem.validate) === 'array') {
            setValidateConfig({
              ...sourceFormItem,
              validate: [...sourceFormItem.validate, ...dateLimitDerivedValidateItems],
            });
          } else if (sourceFormItem.validate == null) {
            setValidateConfig({
              ...sourceFormItem,
              validate: dateLimitDerivedValidateItems,
            });
          } else {
            setValidateConfig(sourceFormItem);
          }
        } else {
          setValidateConfig(sourceFormItem);
        }
        setFormItemWatch(sourceFormItem);
        setFormDataState(sourceFormItem);
        formItemRowList.value.push(formattedItem);
      });

      // 注册 dateLimit 联动清空 watch：每个源字段注册一个（一次源值变更统一清空所有越界依赖字段）。
      // 以源字段当前值为 watch 源，变更时仅当源字段被用户改动过（userInputKeys）才执行；
      // 清空经 updateFormDataState 写入（直接写 formDataState 并派发 input）。
      const dayPartOf = (value) =>
        typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : value;
      for (const [sourceKey, dependentList] of dateLimitSourceClearMap) {
        watchManager.setWatchInfo(`${sourceKey}-dateLimitSourceClear`, [
          () => formDataState[sourceKey],
          () => {
            // 非用户改动（回填 / 其它联动）不清空，保护权威数据
            if (!userInputKeys.has(sourceKey)) return;
            const sourceValue = formDataState[sourceKey];
            if (!sourceValue) return;
            const sourceDay = dayPartOf(sourceValue);
            for (const { dependentKey, type } of dependentList) {
              const dependentValue = formDataState[dependentKey];
              if (!dependentValue) continue;
              // notBefore：依赖不得早于源（完工不得早于开工）；notAfter：依赖不得晚于源（结束不得晚于开始）
              const dependentDay = dayPartOf(dependentValue);
              const breaks =
                type === 'notBefore' ? dependentDay < sourceDay : dependentDay > sourceDay;
              if (breaks) {
                updateFormDataState(dependentKey, undefined);
              }
            }
          },
        ]);
      }

      watchManager.registerWatch();
    }
  };

  // 提交表单：校验通过后按 get 变换生成提交数据并派发结果
  // withOptionItems 为 true 时 resolve { data, optionItems }；默认仍返回提交数据本身，兼容现有调用方
  const submit = ({ withOptionItems = false } = {}) => {
    return new Promise((res, rej) => {
      formRef.value
        .validate()
        .then(() => {
          const submitData = {};
          for (const [key, sourceValue] of Object.entries(formDataState)) {
            // 仅提交显示的字段, 隐藏字段不提交(不存在于表单项配置中的字段保持原样)
            // 不过滤空值，保留所有字段（为了业务场景中能够删除某个字段值）
            if (!Reflect.has(formEleComponentShowInfo.value, key)) {
              submitData[key] = sourceValue;
            } else if (formEleComponentShowInfo.value[key] === true) {
              const formItem = formItemDict.value[key];
              let realValue;
              if (sourceValue !== undefined && sourceValue !== null) {
                if (formItemHasDataTransform(key)) {
                  // submit 提交数据时应用 get 变换
                  realValue = formItem.get(sourceValue);
                } else {
                  if (sourceValue instanceof File || sourceValue instanceof Blob) {
                    // File/Blob 对象的属性都是不可枚举的原型属性，
                    // { ...file } 会得到空对象，必须直接保留原始引用
                    realValue = sourceValue;
                  } else if (Array.isArray(sourceValue)) {
                    realValue = [...sourceValue];
                  } else if (typeof sourceValue === 'object') {
                    realValue = { ...sourceValue };
                  } else {
                    realValue = sourceValue;
                  }
                }
              } else {
                realValue = sourceValue;
              }
              submitData[key] = realValue;
            }
          }
          // 合并 setFormData 暂存的未配置字段：恢复原语义"不在配置中的字段原样提交"
          // formDataState 里已无这些 key，因此直接 spread 不会覆盖已配置字段
          Object.assign(submitData, externalFormDataBuffer);
          // 选中项对象与提交数据并列返回，不混入提交数据本体
          const optionItems = collectSelectedOptionItems(Object.keys(submitData));
          emits('validateSuccess', submitData, optionItems);
          res(withOptionItems ? { data: submitData, optionItems } : submitData);
        })
        .catch((err) => {
          console.log('验证失败', err);
          rej(err);
          emits('validateFail', err);
        });
    });
  };

  // 清空表单数据：有 defaultValue 的字段重置为默认值，其余置空
  const clearFormData = () => {
    // 同步清空未配置字段缓冲，避免关闭弹窗 / 重置后再提交还残留上一次的未配置字段
    externalFormDataBuffer = {};
    // 程序化批量写值期间不派发 input
    isApplyingFormData = true;
    for (const key of Object.keys(formDataState)) {
      const formItem = formItemRowList.value.find((i) => i.key === key);
      if (Reflect.has(formItem, 'defaultValue')) {
        if (getVarType(formItem.defaultValue) === 'asyncFunction') {
          formItem.defaultValue().then((res) => {
            isApplyingFormData = true;
            formDataState[key] = res;
            isApplyingFormData = false;
          });
        } else if (typeof formItem.defaultValue === 'function') {
          formDataState[key] = formItem.defaultValue();
        } else {
          formDataState[key] = formItem.defaultValue;
        }
      } else {
        formDataState[key] = undefined;
      }
    }
    isApplyingFormData = false;
  };

  initForm(_config.list);

  onUnmounted(() => {
    watchManager.clear();
  });

  // 提交按钮点击处理（忽略校验失败，失败统一由 emits('validateFail') 派发）
  const submitButtonClickHandler = () => {
    submit().catch(() => {});
  };

  // 判断回填值是否为空值：undefined / null / 空字符串视为空；
  // 数字 0（如开关量、数量、序号）与布尔 false 均为有效业务值，不算空值
  const isBlankFormDataValue = (value) => value === undefined || value === null || value === '';

  // 回填表单数据：默认局部合并（未传入字段保持不变，未配置字段缓冲与回填保护集合累积）；
  // replace 为 true 时先整表重置（已配置字段置空、缓冲与保护集合清空），再写入本次数据
  const setFormData = (formData, { replace = false } = {}) => {
    const configuredKeySet = getConfiguredFormItemKeySet();
    if (replace) {
      // 整表重载：清空透传缓冲与回填保护集合
      externalFormDataBuffer = {};
      externallyProvidedKeys.clear();
    }
    // 新一轮回填清空用户改动记录，避免旧交互影响本次回填
    userInputKeys.clear();
    // 回填期间暂时停用 value（动态计算字段值）与 options（动态选项）两类联动 watch：
    // 避免它们基于回填过程中的中间值/旧值或异步选项结果回写、清空本次表单值；
    // show/validate/attrs 等其余类型的 watch 保持生效，以基于回填后的数据刷新派生状态。
    const valueTypeFormItemKeys = formItemKeyOfWatchType.value;
    const optionsTypeFormItemKeys = formItemKeyOfWatchType.options;
    for (const formItemKey of valueTypeFormItemKeys) {
      watchManager.pauseWatch(`${formItemKey}-value`);
    }
    for (const formItemKey of optionsTypeFormItemKeys) {
      watchManager.pauseWatch(`${formItemKey}-options`);
    }
    // 程序化批量写值期间不派发 input
    isApplyingFormData = true;
    try {
      if (replace) {
        // 整表重载：已配置字段先置空，未传入的字段不会残留上一次的值
        for (const formItem of formItemRowList.value) {
          formDataState[formItem.key] = undefined;
        }
      }
      // 单次遍历：已配置字段写入 formDataState 并纳入回填值保护；
      // 未配置字段累积到缓冲供 submit 原样透传（局部合并时不丢弃上一轮缓冲）
      for (const [key, val] of Object.entries(formData)) {
        if (!configuredKeySet.has(String(key))) {
          // 未配置 key 不进入 formDataState，UI 不显示、watch 不处理；但保留值供 submit 原样提交
          externalFormDataBuffer[key] = val;
          continue;
        }
        externallyProvidedKeys.add(key);
        const formItem = formItemDict.value[key];
        // 空值不回填：后端返回 undefined / null / 空字符串时，若该表单项配置了 defaultValue，
        // 则保留 initForm（setFormDataState）阶段写入的默认值，避免回填把默认值清空——
        // 使"后端未返回该字段"与"后端返回空值"两种情形表现一致。
        // 注意 0 与 false 是有效值，不算空值，需正常回填。
        if (isBlankFormDataValue(val) && formItem && Reflect.has(formItem, 'defaultValue')) {
          continue;
        }
        if (formItemHasDataTransform(key)) {
          // setFormData 设置表单数据时应用 set 变换
          formDataState[key] = formItem.set(val);
        } else {
          formDataState[key] = val;
        }
      }
    } finally {
      isApplyingFormData = false;
    }
    for (const formItemKey of valueTypeFormItemKeys) {
      watchManager.resumeWatch(`${formItemKey}-value`);
    }
    for (const formItemKey of optionsTypeFormItemKeys) {
      watchManager.resumeWatch(`${formItemKey}-options`);
    }
  };

  // 局部写入单个字段：直写内部状态（不应用 set 变换），并派发 input 事件
  // 未在 config.list 中配置的 key 直接忽略，避免产生游离字段
  const updateFormData = (key, value) => {
    if (!formItemDict.value[key]) return;
    updateFormDataState(key, value);
  };

  // 读取当前表单值快照：不触发校验；transform 为 true 时按 get 变换输出（与 submit 一致）
  const getFormData = ({ transform = false } = {}) => {
    const data = {};
    for (const formItem of formItemRowList.value) {
      const key = formItem.key;
      const sourceValue = formDataState[key];
      if (transform && formItemHasDataTransform(key) && sourceValue != null) {
        data[key] = formItem.get(sourceValue);
        continue;
      }
      // 与 submit 保持一致的轻量拷贝，避免外部直接改动内部引用
      if (sourceValue instanceof File || sourceValue instanceof Blob) {
        data[key] = sourceValue;
      } else if (Array.isArray(sourceValue)) {
        data[key] = [...sourceValue];
      } else if (sourceValue && typeof sourceValue === 'object') {
        data[key] = { ...sourceValue };
      } else {
        data[key] = sourceValue;
      }
    }
    return data;
  };

  // 只读表单数据：供外部 watch 指定字段，写入仍须走 setFormData / updateFormData
  const readonlyFormData = readonly(formDataState);

  const defineExposeConfig = {
    submit,
    clearFormData,
    setFormData,
    updateFormData,
    getFormData,
    formData: readonlyFormData,
  };

  return {
    formItemRowList: formItemRowList,
    formDataState: formDataState,
    validateRules: validateRules,
    getFormEleComponentProps,
    formEleComponentShowInfo: formEleComponentShowInfo,
    formEleComponentOptionsInfo: formEleComponentOptionsInfo,
    submit,
    submitButtonClickHandler,
    clearFormData,
    defineExposeConfig,
    computedGridConfig,
  };
};

export { useAdvForm, advFormProps, advFormEmits };
