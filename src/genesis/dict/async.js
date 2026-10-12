/**
 * 异步数据字典通用能力（基于 DictionaryCache 单例）
 *
 * 本模块为通用层，不绑定任何具体的字典配置（config.js）与数据获取接口，
 * 只对外提供注册与包装方法。各业务应用需自行引入本模块的方法，
 * 并结合各自应用的 config.js 与 api 方法完成注册与导出，例如：
 *
 *   import { registerAsyncDicts, createAsyncDictGroup } from '@/dict/async'
 *   import { ASYNC_DICT_CONFIGS } from './config'
 *   import { getDicDetailsData } from '@/api/system/dict'
 *
 *   // 注册字典（模块加载时执行一次），传入应用侧的字典数据获取接口
 *   registerAsyncDicts(ASYNC_DICT_CONFIGS, getDicDetailsData)
 *
 *   // 按名称包装导出，每个字典支持 value / getLabel / getValue 三种用法
 *   export const DICT_ASYNC = ASYNC_DICT_CONFIGS.reduce((groups, { name }) => {
 *     groups[name.replace(/^ASYNC_/, '')] = createAsyncDictGroup(name)
 *     return groups
 *   }, {})
 */
import dictionaryCache from './dictionaryCache';

/**
 * 将字典名称包装为可直接 await 的异步字典
 * @param {string} name - 字典名称（与 config.js 中的 name 一致）
 * @returns {{ then: (resolve: Function, reject: Function) => Promise }} 可直接 await 的对象
 */
export function createAsyncDict(name) {
  return {
    then(resolve, reject) {
      return dictionaryCache.getData(name).then(resolve, reject);
    },
  };
}

/**
 * 默认响应转换：将接口返回的 name 字段映射为 { value, label }
 * @param {{ data: Array }} res - getDicDetailsData 的响应对象
 * @returns {Array<{ value: *, label: * }>}
 */
export function transformData(res) {
  return res.data.map((i) => ({ value: i.name, label: i.name }));
}
/**
 * 注册异步字典
 * @param {Array<{ name: string, param: object, set?: Function }>} configs - 异步字典配置参数数组
 * @param {(param: object) => Promise} getData - 字典数据获取接口方法（由应用层注入），接收单个字典的 param 返回数据
 */
export function registerAsyncDicts(configs, getData) {
  configs.forEach(({ name, param, set }) => {
    dictionaryCache.createDictItem({
      name,
      getData: () => getData(param),
      set: set ?? transformData,
    });
  });
}

/**
 * 将字典名称包装为「根据 value 获取 label」的函数
 * @param {string} name - 字典名称（与 config.js 中的 name 一致）
 * @returns {(value: *) => Promise<string>} 异步函数，传入 value 返回对应的 label，未匹配到返回 ''
 */
export function createAsyncLabelGetter(name) {
  return (value) => {
    dictionaryCache.getDataSync(name);
    return dictionaryCache.getLabel(name, value);
  };
}

/**
 * 将字典名称包装为「根据 label 获取 value」的异步函数
 * @param {string} name - 字典名称（与 config.js 中的 name 一致）
 * @returns {(label: *) => Promise<*>} 异步函数，传入 label 返回对应的 value，未匹配到返回 ''
 */
export function createAsyncValueGetter(name) {
  return async (label) => {
    await dictionaryCache.getData(name);
    return dictionaryCache.getValue(name, label);
  };
}

/**
 * 将字典名称包装为一个异步字典组对象
 * @param {string} name - 字典名称（与 config.js 中的 name 一致）
 * @returns {{ value: Object, getLabel: Function, getValue: Function }}
 */
export function createAsyncDictGroup(name) {
  return {
    value: createAsyncDict(name),
    getLabel: createAsyncLabelGetter(name),
    getValue: createAsyncValueGetter(name),
  };
}
