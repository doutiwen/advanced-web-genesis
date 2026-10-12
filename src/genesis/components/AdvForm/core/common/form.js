import predefineValidateRules from './predefineValidateRules.js';
import { ref, computed, reactive, watch, onUnmounted, shallowRef } from 'vue';

// AdvForm 组件 props 定义：modelValue 为表单数据对象、config 为表单配置
const advFormProps = {
  modelValue: {
    type: Object,
  },
  config: {
    type: Object,
    required: true,
  },
};

// AdvForm 组件 emits 定义
const advFormEmits = ['update:modelValue', 'input', 'validateSuccess', 'validateFail'];

// AdvForm 核心逻辑工厂：根据配置与数据生成渲染所需的状态、watch 联动与表单操作方法
const useAdvForm = (
  { config, modelValue },
  emits,
  formRef,
  UIAttrsTransform,
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

  let currentInputKey;

  const _config = toValue(config);

  // 表单项是否配置了数据变换（同时存在 get/set）
  const formItemHasDataTransform = (key) => {
    const formItemConfig = formItemDict.value[key];
    return typeof formItemConfig?.get === 'function' && typeof formItemConfig?.set === 'function';
  };

  const formDataState = reactive({});

  watch(
    modelValue,
    (n, o) => {
      if (n) {
        for (const [key, val] of Object.entries(n)) {
          // 数据变换（set/get）只在 setFormData / submit 中应用，modelValue 直接赋值
          currentInputKey = key;
          formDataState[key] = val;
        }
      }
    },
    {
      deep: true,
      immediate: true,
    }
  );

  watch(
    formDataState,
    (n, o) => {
      emits('input', {
        key: currentInputKey,
        data: n[currentInputKey],
      });
    },
    {
      deep: true,
      flush: 'sync',
    }
  );

  const validateRules = ref({});

  const formItemRef = new Map();

  const formEleComponentShowInfo = ref({});

  const formEleComponentOptionsInfo = {};

  const formEleComponentAttrsInfo = {};

  // 是否为自带选项数据的控件类型（选项交由 formEleComponentOptionsInfo 统一管理）
  const isOwnOptionsType = (type) => {
    return ['select', 'treeSelect', 'radio', 'checkbox'].includes(type);
  };

  // 记录表单项组件引用
  const setFormItemRef = (formItemKey, ref) => {
    formItemRef.set(formItemKey, ref);
  };

  // 获取表单项组件引用
  const getFormItemRef = (formItemKey) => {
    return formItemRef.get[formItemKey];
  };

  // 表单项显隐切换（占位实现，显隐实际由 show 联动 watch 维护）
  const formItemToggleShow = (key, newShowValue) => {};

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

  // ============ watch 依赖引用解析 ============
  // keys 中除 formData 字段 key 外，还支持函数式引用其他响应式属性：
  //   options(b)          → 字段 b 的 options（formEleComponentOptionsInfo[b]）
  //   selected(b)         → 字段 b 的当前选中项（由值 + options 共同驱动）
  //   show(b)             → 字段 b 的显隐状态（formEleComponentShowInfo[b]）
  //   attrs(b, disabled)  → 字段 b 的自定义属性（formEleComponentAttrsInfo[b][disabled]）
  // 引用只声明"触发依赖"；handle 中通过生成的局部名读取值（options(b) → options_b），
  // 字符串表达式会先把引用替换成局部名再构建 new Function。
  const WATCH_SCOPE_REF_REGEX =
    /\b(options|selected|show|attrs)\(\s*([\w$]+)(?:\s*,\s*([\w$]+))?\s*\)/g;
  const WATCH_SINGLE_SCOPE_REF_REGEX =
    /^(options|selected|show|attrs)\(\s*([\w$]+)(?:\s*,\s*([\w$]+))?\s*\)$/;

  // 生成 watch 引用的局部参数名（attrs 引用额外携带属性名）
  const buildWatchRefLocalName = (type, key, attrKey) => {
    return type === 'attrs' && attrKey ? `attrs_${key}_${attrKey}` : `${type}_${key}`;
  };

  // 匹配单个 watch 引用字符串（如 options(a)、show(b)），返回结构化的引用信息
  const matchSingleWatchRef = (item) => {
    if (typeof item !== 'string') return null;
    const m = item.match(WATCH_SINGLE_SCOPE_REF_REGEX);
    if (!m) return null;
    const [, type, key, attrKey] = m;
    return { type, key, attrKey, localName: buildWatchRefLocalName(type, key, attrKey), raw: item };
  };

  // 解析 keys（字符串或数组）：拆分为纯 formData key 与引用依赖
  const parseWatchKeys = (keys) => {
    const sourceKeys = typeof keys === 'string' ? [keys] : [...keys];
    const formDataKeys = [];
    const deps = [];
    for (const item of sourceKeys) {
      const ref = matchSingleWatchRef(item);
      if (ref) {
        deps.push(ref);
      } else {
        formDataKeys.push(item);
      }
    }
    return { formDataKeys: [...new Set(formDataKeys)], deps };
  };

  // 解析字符串表达式：把引用替换为局部名，剩余标识符作为 formData key
  const parseStringWatchConfig = (expr) => {
    const deps = [];
    const localNames = [];
    const transformed = expr.replace(WATCH_SCOPE_REF_REGEX, (full, type, key, attrKey) => {
      const localName = buildWatchRefLocalName(type, key, attrKey);
      deps.push({ type, key, attrKey, localName, raw: full });
      localNames.push(localName);
      return localName;
    });
    const keyNameRegex = /[a-zA-Z_$][a-zA-Z0-9_$]*/g;
    const allMatches = transformed.match(keyNameRegex) || [];
    const formDataKeys = [...new Set(allMatches.filter((k) => !localNames.includes(k)))];
    return {
      formDataKeys,
      deps,
      transformed,
      rawKeys: [...formDataKeys, ...deps.map((d) => d.raw)],
    };
  };

  // 依赖在触发源（computed）中订阅的响应式值
  const resolveWatchRefSources = (dep) => {
    switch (dep.type) {
      case 'options':
        return [formEleComponentOptionsInfo[dep.key]?.value];
      case 'selected':
        return [formDataState[dep.key], formEleComponentOptionsInfo[dep.key]?.value];
      case 'show':
        return [formEleComponentShowInfo.value[dep.key]];
      case 'attrs':
        return [formEleComponentAttrsInfo[dep.key]?.[dep.attrKey]?.value];
      default:
        return [];
    }
  };

  // 依赖在 handle 参数中的取值
  const resolveWatchRefValue = (dep, args) => {
    switch (dep.type) {
      case 'options':
        return formEleComponentOptionsInfo[dep.key]?.value ?? [];
      case 'selected':
        return args?.currentSelectInfo?.[dep.key];
      case 'show':
        return formEleComponentShowInfo.value[dep.key] ?? false;
      case 'attrs':
        return formEleComponentAttrsInfo[dep.key]?.[dep.attrKey]?.value;
      default:
        return undefined;
    }
  };

  // 组装 handle 参数名，冲突时给出明确报错
  const buildWatchHandleParams = (formDataKeys, deps) => {
    const paramNames = [...formDataKeys, ...deps.map((d) => d.localName)];
    if (new Set(paramNames).size !== paramNames.length) {
      throw new Error(
        `[AdvForm] watch 配置 keys 与 options()/selected()/show()/attrs() 引用生成的参数名冲突：${paramNames.join(
          ', '
        )}`
      );
    }
    return paramNames;
  };

  // 组装 watch handle 入参：formData 快照、全量 options、选中项信息及各字段 key / 引用局部名
  const getWatchHandleArgs = (watchKeys) => {
    const { formDataKeys, deps } = parseWatchKeys(watchKeys);
    const watchHandleArgs = {
      optionsInfo: Object.entries(formEleComponentOptionsInfo).reduce((newObj, [key, value]) => {
        newObj[key] = value.value;
        return newObj;
      }, {}),
      currentSelectInfo: {},
      formData: { ...formDataState },
    };
    // 需要计算选中项信息的字段：formData key 与 options/selected 引用指向的字段
    const currentSelectTargets = [
      ...formDataKeys,
      ...deps.filter((d) => d.type === 'options' || d.type === 'selected').map((d) => d.key),
    ];
    for (const targetKey of new Set(currentSelectTargets)) {
      if (formEleComponentOptionsInfo[targetKey]) {
        watchHandleArgs.currentSelectInfo[targetKey] = formEleComponentOptionsInfo[
          targetKey
        ].value.find((i) => i.value === formDataState[targetKey]);
      }
    }
    for (const formDataKey of formDataKeys) {
      watchHandleArgs[formDataKey] = formDataState[formDataKey];
    }
    for (const dep of deps) {
      watchHandleArgs[dep.localName] = resolveWatchRefValue(dep, watchHandleArgs);
    }
    return watchHandleArgs;
  };

  // 将字符串或 { keys, handle } 配置解析为 Vue3 watch 参数 [computed 依赖源, 触发回调, option?]
  const getWatchSetting = (key, sourceWatchConfig, stateChangeHandle) => {
    const targetWatchConfig = {
      keys: [],
      handle: null,
    };
    let watchSetting;
    if (typeof sourceWatchConfig === 'string') {
      const { formDataKeys, deps, transformed, rawKeys } =
        parseStringWatchConfig(sourceWatchConfig);
      targetWatchConfig.keys = rawKeys;
      // 记录该字段 watch 依赖的源字段，供回填值保护判定联动源是否被用户改动
      recordWatchSourceKeys(key, [...formDataKeys, ...deps.map((d) => d.key)]);
      const paramNames = buildWatchHandleParams(formDataKeys, deps);
      targetWatchConfig.handle = new Function(`{${paramNames.join(',')}}`, `return ${transformed}`);
      watchSetting = [
        computed(() => [
          ...formDataKeys.map((key) => formDataState[key]),
          ...deps.flatMap((dep) => resolveWatchRefSources(dep)),
        ]),
        () => {
          stateChangeHandle(key, targetWatchConfig.keys, targetWatchConfig.handle);
        },
      ];
    } else if (sourceWatchConfig.keys) {
      if (typeof sourceWatchConfig.keys === 'string') {
        targetWatchConfig.keys.push(sourceWatchConfig.keys);
      } else if (getVarType(sourceWatchConfig.keys) === 'array') {
        targetWatchConfig.keys.push(...sourceWatchConfig.keys);
      }
      const { formDataKeys, deps } = parseWatchKeys(targetWatchConfig.keys);
      // 记录该字段 watch 依赖的源字段，供回填值保护判定联动源是否被用户改动
      recordWatchSourceKeys(key, [...formDataKeys, ...deps.map((d) => d.key)]);

      if (sourceWatchConfig?.handle) {
        targetWatchConfig.handle = sourceWatchConfig.handle;
      } else {
        const paramNames = buildWatchHandleParams(formDataKeys, deps);
        targetWatchConfig.handle = new Function(
          `{${paramNames.join(',')}}`,
          `return ${paramNames.join('&&') || 'true'}`
        );
      }

      watchSetting = [
        computed(() => [
          ...formDataKeys.map((key) => formDataState[key]),
          ...deps.flatMap((dep) => resolveWatchRefSources(dep)),
        ]),
        () => {
          stateChangeHandle(key, targetWatchConfig.keys, targetWatchConfig.handle);
        },
      ];

      if (sourceWatchConfig?.option) {
        watchSetting.push(sourceWatchConfig.option);
      }
    }
    return watchSetting;
  };

  // update:modelValue 防抖缓存机制
  // 在极快速度下连续调用 updateFormDataState 时，将各字段的最新值缓存起来，
  // 统一推迟到下一个事件循环（setTimeout 0）触发一次 update:modelValue，避免高频 emit 造成父组件频繁更新。
  // 若未配置 modelValue，则保持原有逻辑（直接更新 formDataState），不走防抖。
  let modelValueUpdateTimer = null;
  let pendingModelValueCache = {};

  // 冲刷防抖缓存：一次性 emit update:modelValue（modelValue 被清空时直接写回 formDataState）
  const flushModelValueUpdate = () => {
    modelValueUpdateTimer = null;
    const cache = pendingModelValueCache;
    pendingModelValueCache = {};
    const cachedKeys = Object.keys(cache);
    if (cachedKeys.length === 0) return;
    if (toValue(modelValue)) {
      const newModelValue = Object.assign(JSON.parse(JSON.stringify(toValue(modelValue))), cache);
      emits('update:modelValue', newModelValue);
    } else {
      // 防抖期间 modelValue 被清空时，沿用无 modelValue 的原有逻辑直接写入 formDataState
      for (const key of cachedKeys) {
        // 数据变换（set/get）只在 setFormData / submit 中应用，这里直接写入用户输入值
        formDataState[key] = cache[key];
      }
    }
  };

  // 缓存字段最新值，并由 setTimeout 0 统一触发一次防抖冲刷
  const cacheModelValueUpdate = (key, realValue) => {
    pendingModelValueCache[key] = realValue;
    if (modelValueUpdateTimer === null) {
      modelValueUpdateTimer = setTimeout(flushModelValueUpdate, 0);
    }
  };

  // 更新字段值入口：字段值一律同步写入 formDataState；配置了 modelValue 时额外走防抖缓存 emit 同步父层
  const updateFormDataState = (key, value) => {
    currentInputKey = key;
    // 用户输入/动态值直接写入，不做 set/get 变换（变换只在 setFormData / submit 中应用）
    // 【必须同步落库，不能只依赖父层回显】el-input 的 handleInput 在 emit 之后会 await nextTick() 回写原生 value：
    // 若此刻 props.modelValue 仍是旧值，原生 value 会被回写成旧文本（文本回退，光标随之丢失），
    // 待防抖 flush 后父层回显新值、再经 watch(nativeInputValue) 写 DOM 时（该路径 Element Plus 不做任何光标补偿），
    // 光标即跳到文本末尾（在文本中间删除字符时光标跳变即由此产生）。
    // 同步写入后 props.modelValue 在一个微任务内即跟上 UI，EP 的 setNativeInputValue 判定新旧一致直接 return，
    // 其自带的光标恢复逻辑（useCursor）得以生效；无 modelValue 时行为不变。
    formDataState[key] = value;
    if (toValue(modelValue)) {
      cacheModelValueUpdate(key, value);
    }
  };

  // show 联动：用 handle 结果控制字段显隐，隐藏时清空字段值
  const formEleItemShowChangeFn = (key, watchKeys, handle) => {
    const isShow = handle(getWatchHandleArgs(watchKeys));
    if (!isShow) {
      formDataState[key] = undefined;
    }
    formEleComponentShowInfo.value[key] = isShow;
  };

  // 解析 options 联动结果：纯数组直接作为选项，{ value, options } 同时回填选中值
  const parsingOptionsResult = (key, result) => {
    if (toValue(modelValue)) {
      if (Array.isArray(result)) {
        formEleComponentOptionsInfo[key].value = result;
      } else if (typeof result === 'object' && result?.value && result?.options) {
        // 字段已被回填且联动源未被用户改动时，仅更新选项、不写回字段值，保护后端值
        if (!shouldSuppressWatchValueWrite(key)) {
          updateFormDataState(key, result.value);
        }
        formEleComponentOptionsInfo[key].value = result.options;
      }
    } else {
      if (Array.isArray(result)) {
        formEleComponentOptionsInfo[key].value = result;
      } else if (typeof result === 'object' && Reflect.has(result, 'value') && result?.options) {
        // 字段已被回填且联动源未被用户改动时，仅更新选项、不写回字段值，保护后端值
        if (!shouldSuppressWatchValueWrite(key)) {
          updateFormDataState(key, result.value);
        }
        formEleComponentOptionsInfo[key].value = result.options;
      }
    }
  };

  // options 联动：执行 handle（支持异步）并解析结果更新选项数据
  const formEleItemOptionsChangeFn = (key, watchKeys, handle) => {
    const handleArgs = getWatchHandleArgs(watchKeys);
    if (getVarType(handle) === 'asyncFunction') {
      handle(handleArgs).then((res) => {
        parsingOptionsResult(key, res);
      });
    } else if (typeof handle === 'function') {
      parsingOptionsResult(key, handle(handleArgs));
    }
  };

  // value 联动：用 handle 结果动态回填字段值（字段已被回填且联动源未被用户改动时跳过，保护后端值）
  const formEleItemBindValueChangeFn = (key, watchKeys, handle) => {
    const newValue = handle(getWatchHandleArgs(watchKeys));
    if (shouldSuppressWatchValueWrite(key)) {
      return;
    }
    updateFormDataState(key, newValue);
  };

  // validate 联动：用 handle 结果动态生成或清除字段校验规则
  const formEleItemValidateChangeFn = (key, watchKeys, handle) => {
    const newValidateRules = handle(getWatchHandleArgs(watchKeys));
    if (newValidateRules) {
      formDataState[key] = undefined;
      validateRules.value[key] = newValidateRules.map((validateItem) => {
        return validateConfigItemFormat(validateItem, sourceFormItem.label, newValidateRules);
      });
      formRef.value?.clearValidate();
    } else {
      Reflect.deleteProperty(validateRules.value, key);
    }
  };

  // 自定义属性整体联动：用 handle 结果更新字段自定义属性
  const formEleItemCustomAttrChangeFn = (key, watchKeys, handle) => {
    const newCustomAttr = handle(getWatchHandleArgs(watchKeys));
    if (newCustomAttr) {
      formDataState[key] = undefined;
      formEleComponentCustomAttrInfo[key].value = newCustomAttr;
    } else {
      Reflect.deleteProperty(formEleComponentCustomAttrInfo, key);
    }
  };

  // 包装数组格式 watch 的 callback，统一支持异步 callback
  // 通过 getVarType 判断 callback 是否为 asyncFunction，若是则等待 resolve 后再交给 consumeFn 处理
  const wrapAsyncWatchCallback = (callback, consumeFn) => {
    return (newVal, oldVal) => {
      if (getVarType(callback) === 'asyncFunction') {
        callback(newVal, oldVal).then((res) => consumeFn(res));
      } else {
        consumeFn(callback(newVal, oldVal));
      }
    };
  };

  // 注册表单项全部 watch 联动（show/options/validate/value/自定义属性），按类型写入 WatchManager
  const setFormItemWatch = (sourceFormItem) => {
    const formItemKey = sourceFormItem.key;
    // 控制表单项显隐
    if (sourceFormItem?.show) {
      // 数组格式：展开为 Vue3 watch 参数 [source, callback, options?]
      // 对 callback 进行包装，将其返回值交由 formEleItemShowChangeFn 更新属性
      if (getVarType(sourceFormItem.show) === 'array') {
        const [source, callback, options] = sourceFormItem.show;
        // 通过 wrapAsyncWatchCallback 支持 callback 返回 Promise（异步显隐控制）
        const wrappedWatchSetting = [
          source,
          wrapAsyncWatchCallback(callback, (result) => {
            formEleItemShowChangeFn(formItemKey, [], () => result);
          }),
          options,
        ].filter(Boolean);
        formEleComponentShowInfo.value[formItemKey] = false;
        setFormItemWatchInfo(formItemKey, 'show', wrappedWatchSetting);
      } else {
        formEleComponentShowInfo.value[sourceFormItem.key] = false;
        const watchSetting = getWatchSetting(
          formItemKey,
          sourceFormItem.show,
          formEleItemShowChangeFn
        );
        setFormItemWatchInfo(formItemKey, 'show', watchSetting);
      }
    }
    // 动态更新选项数据
    if (sourceFormItem?.options?.watch) {
      // 数组格式：展开为 Vue3 watch 参数 [source, callback, options?]
      // 对 callback 进行包装，将其返回值交由 formEleItemOptionsChangeFn 更新属性
      if (getVarType(sourceFormItem.options.watch) === 'array') {
        const [source, callback, options] = sourceFormItem.options.watch;
        // 通过 wrapAsyncWatchCallback 支持 callback 返回 Promise（异步加载选项）
        const wrappedWatchSetting = [
          source,
          wrapAsyncWatchCallback(callback, (result) => {
            formEleItemOptionsChangeFn(formItemKey, [], () => result);
          }),
          options,
        ].filter(Boolean);
        setFormItemWatchInfo(formItemKey, 'options', wrappedWatchSetting);
      } else {
        const watchSetting = getWatchSetting(
          formItemKey,
          sourceFormItem.options.watch,
          formEleItemOptionsChangeFn
        );
        setFormItemWatchInfo(formItemKey, 'options', watchSetting);
      }
    }
    // 动态更新校验规则
    if (sourceFormItem?.validate?.watch) {
      // 数组格式：展开为 Vue3 watch 参数 [source, callback, options?]
      // 对 callback 进行包装，将其返回值交由 formEleItemValidateChangeFn 更新属性
      if (getVarType(sourceFormItem.validate.watch) === 'array') {
        const [source, callback, options] = sourceFormItem.validate.watch;
        // 通过 wrapAsyncWatchCallback 支持 callback 返回 Promise（异步生成校验规则）

        const wrappedWatchSetting = [
          source,
          wrapAsyncWatchCallback(callback, (result) => {
            formEleItemValidateChangeFn(formItemKey, [], () => result);
          }),
          options,
        ].filter(Boolean);
        setFormItemWatchInfo(formItemKey, 'validate', wrappedWatchSetting);
      } else {
        const watchSetting = getWatchSetting(
          formItemKey,
          sourceFormItem.validate.watch,
          formEleItemValidateChangeFn
        );
        setFormItemWatchInfo(formItemKey, 'validate', watchSetting);
      }
    }
    // 动态更新表单值
    if (sourceFormItem?.value?.watch) {
      // 数组格式：展开为 Vue3 watch 参数 [source, callback, options?]
      // 对 callback 进行包装，将其返回值交由 formEleItemBindValueChangeFn 更新属性
      if (getVarType(sourceFormItem.value.watch) === 'array') {
        const [source, callback, options] = sourceFormItem.value.watch;

        // 通过 wrapAsyncWatchCallback 支持 callback 返回 Promise（异步计算表单值）
        const wrappedWatchSetting = [
          source,
          wrapAsyncWatchCallback(callback, (result) => {
            formEleItemBindValueChangeFn(formItemKey, [], () => result);
          }),
          options,
        ].filter(Boolean);
        setFormItemWatchInfo(formItemKey, 'value', wrappedWatchSetting);
      } else {
        const watchSetting = getWatchSetting(
          formItemKey,
          sourceFormItem.value.watch,
          formEleItemBindValueChangeFn
        );
        setFormItemWatchInfo(formItemKey, 'value', watchSetting);
      }
    }

    // 动态更新自定义属性
    // 更新自定义属性的通用逻辑：按属性名更新 formEleComponentAttrsInfo[key][attrKey]
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

    // 注册单个自定义属性的 watch：attrWatchConfig 支持 { keys, handle } 或数组 [source, callback, options?]
    const setAttrWatchConfig = (attrKey, attrWatchConfig) => {
      if (attrWatchConfig?.keys && attrWatchConfig?.handle) {
        // 有 keys：标准 watch 配置，通过 getWatchSetting 处理
        const watchSetting = getWatchSetting(
          formItemKey,
          attrWatchConfig,
          (key, watchKeys, handle) => {
            const newValue = handle(getWatchHandleArgs(watchKeys));
            updateFormEleAttr(key, attrKey, newValue);
          }
        );
        setFormItemWatchInfo(formItemKey, 'attrs', watchSetting);
      } else if (getVarType(attrWatchConfig) === 'array') {
        // 无 keys 且为数组：展开为 Vue3 watch 参数 [source, handle, options?]
        // 对 handle 进行包装，将其返回值更新到对应自定义属性
        // 通过 wrapAsyncWatchCallback 支持 handle 返回 Promise（异步更新自定义属性）
        const [source, handle, options] = attrWatchConfig;
        const wrappedWatchSetting = [
          source,
          wrapAsyncWatchCallback(handle, (result) => {
            updateFormEleAttr(formItemKey, attrKey, result);
          }),
          options,
        ].filter(Boolean);
        setFormItemWatchInfo(formItemKey, 'attrs', wrappedWatchSetting);
      }
    };

    // 方式一：watch[attrKey][watchConfig] —— 表单项 watch 属性按自定义属性名分别配置
    const watchConfig = sourceFormItem?.watch;
    if (watchConfig) {
      for (const [attrKey, attrWatchConfig] of Object.entries(watchConfig)) {
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
      'encrypt',
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
            formEleComponentOptionsInfo[formItemKey].value = res;
          });
        } else if (getVarType(sourceFormItem.options) === 'function') {
          const getOptionsFn = sourceFormItem.options;
          formEleComponentOptionsInfo[formItemKey].value = getOptionsFn(formDataState);
        } else if (getVarType(sourceFormItem.options) === 'array') {
          formEleComponentOptionsInfo[formItemKey].value = sourceFormItem.options;
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
    if (UIAttrsTransform) {
      targetFormItem.attrs = UIAttrsTransform(targetFormItem.attrs);
    } else if (!sourceFormItem?.attrs) {
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
        ref: (el) => setFormItemRef(key, el),
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

  // 计算最大公约数
  const gcd = (a, b) => {
    while (b !== 0) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  };

  // 计算最小公倍数
  const lcm = (a, b) => {
    if (a === 0 || b === 0) return 0;
    return (a * b) / gcd(a, b);
  };

  // 计算数组的最小公倍数
  const lcmOfArray = (arr) => {
    return arr.reduce((acc, val) => lcm(acc, val), 1);
  };

  // 计算表格网格配置
  const computedGridConfig = ref(null);

  // 初始化表单：拍平二维 / 一维配置、计算网格布局、注册各表单项后一次性启用 watch
  const initForm = (sourceData) => {
    if (sourceData?.length) {
      let allFormItems = [];
      const isTwoDimensional = getVarType(sourceData[0]) === 'array';

      if (isTwoDimensional) {
        // 二维数组：记录每行元素个数，转换为一维
        const rowLengthList = [];
        for (const sourceRow of sourceData) {
          rowLengthList.push(sourceRow.length);
          allFormItems.push(...sourceRow);
        }

        // 计算最小公倍数作为总列数（仅二维数组时自动计算）
        const totalCols = lcmOfArray(rowLengthList);
        computedGridConfig.value = {
          cols: `repeat(${totalCols}, 1fr)`,
          rows: _config?.grid?.rows || 'auto',
          gap: _config?.grid?.gap || '20px',
        };

        // 为每个表单项设置 grid.col
        for (const sourceRow of sourceData) {
          const rowSpan = totalCols / sourceRow.length;
          sourceRow.forEach((item) => {
            if (!item.grid) item.grid = {};
            item.grid.col = `span ${rowSpan}`;
          });
        }
      } else {
        // 一维数组：使用用户配置的 grid，不自动计算
        allFormItems.push(...sourceData);

        // 一维数组时，使用用户配置或默认值（默认一行一个）
        computedGridConfig.value = {
          cols: _config?.grid?.cols || 'repeat(1, 1fr)',
          rows: _config?.grid?.rows || 'auto',
          gap: _config?.grid?.gap || '16px',
        };
      }

      // 构建字段 key -> label 映射：供 dateLimit 派生校验提示引用被限制的目标字段名称
      const keyLabelMap = {};
      for (const sourceFormItem of allFormItems) {
        keyLabelMap[sourceFormItem.key] = sourceFormItem.label ?? sourceFormItem.key;
      }
      const dateLimitLabelCtxOf = (sourceFormItem) => ({
        label: sourceFormItem.label ?? sourceFormItem.key,
        peerLabel: (targetKey) => keyLabelMap[targetKey] ?? targetKey,
      });

      // dateLimit 联动写表项（越界即清空依赖字段）：
      // 依赖字段 inputGuard.dateLimit.targetFieldName 指向本表单某源字段（如计划完工日期 → 计划开工日期）时，
      // 若源字段被用户重选到「使依赖字段当前值失效」的方向（重选开工晚于既有完工 / 重选开始早于既有结束），
      // 旧依赖值已不可能满足约束，直接清空，避免残留旧值触发派生校验误报。
      // 仅当源字段为用户直接改动（userInputKeys 命中）时触发——setFormData / modelValue 回填与其它联动改动
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
      // 清空经 updateFormDataState 写入（有 modelValue 时走防抖 emit 同步父层，无 modelValue 时直写 formDataState）。
      const dayPartOf = (value) =>
        typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : value;
      for (const [sourceKey, dependentList] of dateLimitSourceClearMap) {
        watchManager.setWatchInfo(`${sourceKey}-dateLimitSourceClear`, [
          () => formDataState[sourceKey],
          () => {
            // 非用户改动（回填 / modelValue 加载 / 其它联动）不清空，保护权威数据
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
  const submit = () => {
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
                  // submit 提交数据时应用 get 变换（如 encrypt 字段在此加密）
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
          res(submitData);
          emits('validateSuccess', submitData);
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
    for (const key of Object.keys(formDataState)) {
      const formItem = formItemRowList.value.find((i) => i.key === key);
      if (Reflect.has(formItem, 'defaultValue')) {
        if (getVarType(formItem.defaultValue) === 'asyncFunction') {
          formItem.defaultValue().then((res) => {
            formDataState[key] = res;
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
  };

  initForm(_config.list);

  onUnmounted(() => {
    watchManager.clear();
    if (modelValueUpdateTimer !== null) {
      clearTimeout(modelValueUpdateTimer);
      modelValueUpdateTimer = null;
      pendingModelValueCache = {};
    }
  });

  // 提交按钮点击处理（忽略校验失败，失败统一由 emits('validateFail') 派发）
  const submitButtonClickHandler = () => {
    submit().catch(() => {});
  };

  // 判断回填值是否为空值：undefined / null / 空字符串视为空；
  // 数字 0（如开关量、数量、序号）与布尔 false 均为有效业务值，不算空值
  const isBlankFormDataValue = (value) => value === undefined || value === null || value === '';

  // 回填表单数据：赋值期间暂时停用 value / options 类型 watch，并开启“回填值保护”，避免覆盖本次回填数据
  const setFormData = (formData) => {
    // 开启新一轮回填保护：以本次显式提供的字段 key 作为受保护集合，并清空上一轮的用户改动记录
    externallyProvidedKeys.clear();
    userInputKeys.clear();
    for (const providedKey of Object.keys(formData)) {
      externallyProvidedKeys.add(providedKey);
    }
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
    for (const [key, val] of Object.entries(formData)) {
      const formItem = formItemDict.value[key];
      // 空值不回填：后端返回 undefined / null / 空字符串时，若该表单项配置了 defaultValue，
      // 则保留 initForm（setFormDataState）阶段写入的默认值，避免回填把默认值清空——
      // 使「后端未返回该字段」与「后端返回空值」两种情形表现一致。
      // 注意 0 与 false 是有效值，不算空值，需正常回填。
      if (isBlankFormDataValue(val) && formItem && Reflect.has(formItem, 'defaultValue')) {
        continue;
      }
      if (formItemHasDataTransform(key)) {
        // setFormData 设置表单数据时应用 set 变换（如 encrypt 字段在此解密）
        formDataState[key] = formItem.set(val);
      } else {
        formDataState[key] = val;
      }
    }
    for (const formItemKey of valueTypeFormItemKeys) {
      watchManager.resumeWatch(`${formItemKey}-value`);
    }
    for (const formItemKey of optionsTypeFormItemKeys) {
      watchManager.resumeWatch(`${formItemKey}-options`);
    }
  };

  const defineExposeConfig = {
    submit,
    clearFormData,
    setFormData,
  };

  return {
    formItemRowList: formItemRowList,
    formItemDict: formItemDict,
    formDataState: formDataState,
    validateRules: validateRules,
    getFormEleComponentProps,
    formEleComponentShowInfo: formEleComponentShowInfo,
    formEleComponentOptionsInfo: formEleComponentOptionsInfo,
    formEleComponentAttrsInfo: formEleComponentAttrsInfo,
    setFormItemRef,
    getFormItemRef,
    submit,
    submitButtonClickHandler,
    clearFormData,
    defineExposeConfig,
    computedGridConfig,
  };
};

export { useAdvForm, advFormProps, advFormEmits };
