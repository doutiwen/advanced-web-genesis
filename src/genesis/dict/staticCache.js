/**
 * 静态数据字典缓存（通用层）
 *
 * 以「名称 → { label, value } 列表」缓存固定(硬编码)的静态枚举字典，
 * 并提供初始化、新增字典以及 value <-> label 互相转换。
 *
 * 与 dictionaryCache.js（异步字典缓存）的区别：静态字典数据在注册时即就绪，
 * 无需走接口、无 loading 状态，因此本类只保留其中同步能力：
 *   初始化 / 新增字典 / 取数据 / 值↔文案转换
 *
 * 与异步字典的对应关系（DICT_ASYNC 为异步、DICT_STATIC 为同步）：
 *   DICT_ASYNC.TITLE.value        → DICT_STATIC.TITLE.value（直接返回条目列表，无需 await）
 *   DICT_ASYNC.TITLE.getLabel(v)  → DICT_STATIC.TITLE.getLabel(v)
 *   DICT_ASYNC.TITLE.getValue(l)  → DICT_STATIC.TITLE.getValue(l)
 */
class StaticDictionaryCache {
  constructor() {
    this.dictionaryMap = new Map();
  }

  has(dictName) {
    return this.dictionaryMap.has(dictName);
  }

  /**
   * 新增/覆盖单个静态字典
   * @param {string} name - 字典名称（建议 STATIC_ 前缀，与 DICT_STATIC 的 key 去掉前缀对应）
   * @param {Array<{label: string, value: any}> | Object} data
   *   - 数组：[{ label, value }]，与 GENDER / 异步字典数据一致
   *   - 对象：{ [value]: label } 文本映射，注册时自动转换为数组
   */
  addDictionary(name, data) {
    this.dictionaryMap.set(name, this._toList(data));
    return this;
  }

  /**
   * 批量初始化静态字典（可多次调用，一般先注册公共静态字典、再注册子系统自身字典）
   * @param {Array<{name: string, data: Array | Object}>} dictConfigs - 静态字典配置参数数组
   */
  init(dictConfigs = []) {
    dictConfigs.forEach(({ name, data }) => this.addDictionary(name, data));
    return this;
  }

  /**
   * 取某静态字典的条目列表（供 DICT_STATIC.*.value 使用）
   * @param {string} dictName - 字典名称
   * @returns {Array<{label: string, value: any}> | null}
   */
  getData(dictName) {
    return this.has(dictName) ? this.dictionaryMap.get(dictName) : null;
  }

  /**
   * 根据 value 获取 label，未匹配到返回 ''
   * @param {string} dictName - 字典名称
   * @param {*} value - 字典值
   * @returns {string}
   */
  getLabel(dictName, value) {
    const list = this.getData(dictName);
    if (Array.isArray(list)) {
      const item = list.find((i) => i.value == value);
      return item ? item.label : '';
    }
    return '';
  }

  /**
   * 根据 label 获取 value，未匹配到返回 ''
   * @param {string} dictName - 字典名称
   * @param {string} label - 字典文案
   * @returns {*}
   */
  getValue(dictName, label) {
    const list = this.getData(dictName);
    if (Array.isArray(list)) {
      const item = list.find((i) => i.label == label);
      return item ? item.value : '';
    }
    return '';
  }

  /** 内部：将数据统一归一化为 { label, value }[] */
  _toList(data) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      return Object.entries(data).map(([value, label]) => ({ value, label }));
    }
    return [];
  }
}

// 全局共享单例：各子系统 dict/static.js 在模块加载时向其中注册（先公共后自身）
const staticDictionaryCache = new StaticDictionaryCache();

/**
 * 将字典名称包装为静态字典组对象（用法与异步字典组 createAsyncDictGroup 相仿，同步返回）
 * @param {string} name - 字典名称（与注册到 staticDictionaryCache 的 name 一致）
 * @returns {{ value: Array, getLabel: Function, getValue: Function }}
 */
export function createStaticDictGroup(name) {
  return {
    // getter：始终取缓存中的最新数据
    get value() {
      return staticDictionaryCache.getData(name) || [];
    },
    getLabel: (value) => staticDictionaryCache.getLabel(name, value),
    getValue: (label) => staticDictionaryCache.getValue(name, label),
  };
}

// 导出单例缓存实例（静态字典由各子系统 dict/static.js 在模块加载时注册）
export default staticDictionaryCache;
