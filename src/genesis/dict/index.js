//字典数据缓存
/**
 * 字典数据缓存（DictStore）：静态字典与异步字典的统一实现
 *
 * 统一规则：
 *   - 每个字典只需提供 getData，不区分静态/异步类型
 *   - 首次访问（getData / getLabel / getValue）时调用 getData：
 *     返回普通值即按静态字典同步入缓存；返回 Promise 即按异步字典加载，
 *     并发场景只请求一次
 *   - 三类方法对静态/异步字典使用同一套方法名
 *   - 纯 JS 实现，不依赖 Vue 响应式；异步字典未就绪时取值返回 null / ''
 *   - 字典配置统一放在同目录的 config.js，默认导出的单例在创建时批量注册
 */
import DICT_CONFIGS from './config';

// 字典项上保存转换前原始元素的属性键，使用时通过 Symbol.for('sourceData') 读取
const SOURCE_DATA = Symbol.for('sourceData');

export class DictStore {
  /**
   * @param {Array<{name: string, getData: Function, set?: Function}>} [dictConfigs]
   *   - 初始化时批量注册的字典配置；只登记，不触发取数
   */
  constructor(dictConfigs = []) {
    this.dictionaryMap = new Map();
    dictConfigs.forEach((dictionaryConfig) => this.createDictItem(dictionaryConfig));
  }

  has(dictName) {
    return this.dictionaryMap.has(dictName);
  }

  /**
   * 注册字典项：只登记配置，不触发请求，静态/异步在首次访问时判定
   * @param {{name: string, getData: Function, set?: Function}} dictionaryConfig
   *   - getData：取数方法，同步返回数组即静态字典，返回 Promise 即异步字典
   *   - set：可选的数据转换方法，在 data 入缓存前执行
   */
  createDictItem(dictionaryConfig) {
    this.dictionaryMap.set(dictionaryConfig.name, {
      name: dictionaryConfig.name,
      getData: dictionaryConfig.getData,
      set: dictionaryConfig.set,
      data: null,
      status: 'noData', //noData,loading,hasData
      promise: null,
      error: null,
      version: 0, // 刷新版本号，用于丢弃过期响应
    });
  }

  /**
   * 内部：按需取数
   * - 静态字典（getData 返回非 Promise）：同步取数并转换，返回 data
   * - 异步字典（getData 返回 Promise）：只发起一次加载，本次返回 null
   * @param {string} dictionaryName
   * @param {boolean} [retry] - 是否允许失败后重试（显式 getData 传 true，取值方法不传）
   * @returns {Array|null}
   */
  _ensure(dictionaryName, retry = false) {
    const item = this.dictionaryMap.get(dictionaryName);
    if (!item) return null;
    if (item.status === 'hasData') return item.data;
    if (item.status === 'loading') return null; // 已在加载，等待其 promise 即可
    // 上次加载失败时，避免在 getLabel/getValue 的高频调用中反复发起请求
    if (item.error && !retry) return null;

    item.error = null;
    let result;
    try {
      result = item.getData();
    } catch (e) {
      item.error = e;
      console.error(`[DictStore] 字典「${dictionaryName}」取数失败：`, e);
      return null;
    }

    // 异步字典：惰性加载，保存 promise 实现并发去重
    if (result && typeof result.then === 'function') {
      item.status = 'loading';
      const version = item.version;
      let promise;
      promise = Promise.resolve(result)
        .then((sourceData) => {
          // 刷新后到达的旧响应直接丢弃，避免覆盖新数据
          if (item.version !== version) return item.data;
          item.data = this._applySet(item.set, sourceData);
          item.status = 'hasData';
          return item.data;
        })
        .catch((e) => {
          item.error = e;
          item.status = 'noData'; // 回到未加载，允许下次重试
          console.error(`[DictStore] 字典「${dictionaryName}」加载失败：`, e);
          return null;
        })
        .finally(() => {
          // 只清理本次加载的 promise，避免误清刷新后新发起的请求
          if (item.promise === promise) item.promise = null;
        });
      item.promise = promise;
      return null;
    }

    // 静态字典：同步就绪
    item.data = this._applySet(item.set, result);
    item.status = 'hasData';
    return item.data;
  }

  /**
   * 内部：执行 set 转换，并把转换前的原始元素挂到每个字典项上
   * 仅当原始数据与转换结果都是数组且长度一致（一一对应）时才挂载
   * @param {Function|undefined} set - 转换方法
   * @param {*} sourceData - getData 返回的原始数据
   * @returns {*}
   */
  _applySet(set, sourceData) {
    if (!set) return sourceData;
    const data = set(sourceData);
    if (Array.isArray(data) && Array.isArray(sourceData) && data.length === sourceData.length) {
      data.forEach((entry, index) => {
        // 通过 Symbol 挂载，避免污染字典项的可枚举字段
        if (entry && typeof entry === 'object') {
          entry[SOURCE_DATA] = sourceData[index];
        }
      });
    }
    return data;
  }

  /**
   * 异步取字典数据：静态字典立即返回，异步字典等待加载完成
   * @param {string} dictionaryName - 字典名称
   * @param {(data: Array|null) => void} [callback] - 可选回调
   * @returns {Promise<Array|null>}
   */
  async getData(dictionaryName, callback) {
    const item = this.dictionaryMap.get(dictionaryName);
    if (!item) return null;

    this._ensure(dictionaryName, true); // 显式取数允许失败后重试
    const data =
      item.status === 'loading' && item.promise ? await item.promise : item.data;

    callback && callback(data);
    return data;
  }

  /**
   * 内部：取已就绪的字典数据；未就绪时触发一次加载（异步字典本次返回 null）
   * @param {string} dictName - 字典名称
   * @returns {Array|null}
   */
  _getLoadedData(dictName) {
    const item = this.dictionaryMap.get(dictName);
    if (!item) return null;
    this._ensure(dictName);
    return item.status === 'hasData' && Array.isArray(item.data) ? item.data : null;
  }

  /**
   * 根据 value 获取 label，未匹配到返回 ''
   * 字典未就绪时会触发一次加载；异步字典首次调用返回 ''，加载完成后再调用即可取到
   * @param {string} dictName - 字典名称
   * @param {*} value - 字典值
   * @returns {string}
   */
  getLabel(dictName, value) {
    const data = this._getLoadedData(dictName);
    if (Array.isArray(data)) {
      // 统一转字符串比较，避免 0 与 '0' 两种形态分别判断
      const target = String(value);
      const item = data.find((i) => String(i.value) === target);
      return item ? item.label : '';
    }
    return '';
  }

  /**
   * 根据 label 获取 value，未匹配到返回 ''
   * 字典未就绪时会触发一次加载；异步字典首次调用返回 ''，加载完成后再调用即可取到
   * @param {string} dictName - 字典名称
   * @param {string} label - 字典文案
   * @returns {*}
   */
  getValue(dictName, label) {
    const data = this._getLoadedData(dictName);
    if (Array.isArray(data)) {
      const target = String(label);
      const item = data.find((i) => String(i.label) === target);
      return item ? item.value : '';
    }
    return '';
  }

  /**
   * 按注册的 set 方法转换数据
   * @param {string} name - 字典名称
   * @param {*} data - 待转换的数据
   * @returns {*}
   */
  transformSetData = (name, data) => {
    const item = this.dictionaryMap.get(name);
    if (!item) return null;
    return item.set ? item.set(data) : data;
  };

  /**
   * 刷新指定字典缓存：将状态重置为 noData，下次调用 getData 时会重新请求接口
   * @param {string} name - 字典名称
   */
  refreshData(name) {
    const item = this.dictionaryMap.get(name);
    if (!item) return;
    item.version += 1; // 版本号自增，使在途响应失效
    item.status = 'noData';
    item.data = null;
    item.promise = null;
    item.error = null;
  }
}

// 导出单例缓存实例：创建时载入 config.js 中的字典配置，之后全局共享
export default new DictStore(DICT_CONFIGS);
