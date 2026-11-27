import { resolveApi, registerApiModule, registerApiModules } from './apiRegistry.js';
import { executeRequest } from './handleResponse.js';
import { resolveSender } from './senders/resolveSender.js';

//属性访问需要放行的键：避免代理被识别为 thenable（await 会卡死）或参与序列化
const passthroughProps = new Set(['then', 'toJSON', 'constructor', 'prototype', '__esModule']);

/**
 * 创建 openApi 实例
 * 核心只负责机制，接口发现方式、发送器与业务契约都由宿主注入
 * @param {Object} options
 * @param {Object} options.defaultHooks - 全局默认回调 { success, fail, final }
 * @param {Object} options.defaultTransformMap - 按响应形态分派的默认转换器 { json, blob, arraybuffer, text, stream }
 * @param {Object} options.senders - 发送器注册表，必须由宿主注入（核心不内置任何实现）
 * @param {Object} [options.defaultRequestConfig] - 全局默认请求配置
 * @param {string} [options.defaultSender] - 全局默认发送器名称，缺省取 senders 的第一个
 * @param {string} [options.streamSender] - 流式响应强制使用的发送器名称
 * @param {Object|null} [options.dictCache] - 字典缓存实例，不传则不做字典缓存
 * @returns {{openApi: Object, registerApiModule: Function, registerApiModules: Function, resolveApi: Function}}
 */
export const createOpenApi = ({
  defaultHooks,
  defaultTransformMap,
  defaultRequestConfig = {},
  senders,
  defaultSender,
  streamSender = 'fetch',
  dictCache = null,
} = {}) => {
  if (!defaultHooks || !defaultTransformMap) {
    throw new Error('[openApi] 缺少初始化参数：defaultHooks 与 defaultTransformMap 为必填');
  }
  const senderNames = Object.keys(senders || {});
  if (!senderNames.length) {
    throw new Error(
      '[openApi] 缺少初始化参数：senders 为必填，至少注册一个发送器（如 { axios: axiosSender } 或 { fetch: fetchSender }）'
    );
  }
  const defaultSenderName = defaultSender || senderNames[0];
  if (!senders[defaultSenderName]) {
    throw new Error(
      `[openApi] 默认发送器「${defaultSenderName}」不存在，可用发送器：${senderNames.join('、')}`
    );
  }

  /**
   * 按访问路径发起请求：最后一段为接口名，前面的段拼成模块路径
   * @param {string[]} pathSegments - 属性访问累积的路径段
   * @param {Object} callOptions - 调用场景选项
   * @returns {Promise<Object>}
   */
  const requestByPath = async (pathSegments, callOptions) => {
    if (!pathSegments.length) {
      return Promise.reject(
        new Error('[openApi] 请使用 openApi.模块路径.接口名(参数) 的方式调用接口')
      );
    }
    const apiName = pathSegments[pathSegments.length - 1];
    const modulePath = pathSegments.slice(0, -1).join('/');
    const { apiDesc, apiFullName } = await resolveApi(modulePath, apiName);
    //发送器按「调用选项 > 接口配置 > 流式强制指定发送器 > 全局默认」选择
    const sendRequest = resolveSender({
      apiDesc,
      callOptions,
      senders,
      defaultSenderName,
      streamSenderName: streamSender,
    });
    const executeOptions = {
      apiDesc,
      callOptions,
      sendRequest,
      defaultHooks,
      defaultTransformMap,
      defaultRequestConfig,
    };

    //未传入字典缓存实例时，字典接口退化为普通请求
    if (apiDesc.isDict && dictCache) {
      if (dictCache.has(apiFullName)) {
        return dictCache.getData(apiFullName);
      }
      dictCache.createDictItem({
        name: apiFullName,
        getData: () => executeRequest(executeOptions),
      });
      return dictCache.getData(apiFullName);
    }
    return executeRequest(executeOptions);
  };

  /**
   * 生成属性访问代理：openApi.example.getList(...)
   * 每次属性访问只累积路径段，真正调用时才解析接口配置
   * @param {string[]} pathSegments - 已累积的路径段
   * @returns {Proxy}
   */
  const createOpenApiNode = (pathSegments) => {
    //apply 拦截要求目标必须是函数
    const nodeTarget = () => {};
    return new Proxy(nodeTarget, {
      get(target, prop) {
        if (typeof prop === 'symbol' || passthroughProps.has(prop)) {
          return Reflect.get(target, prop);
        }
        return createOpenApiNode([...pathSegments, prop]);
      },
      apply(target, thisArg, argsList) {
        return requestByPath(pathSegments, argsList[0] || {});
      },
    });
  };

  return {
    openApi: createOpenApiNode([]),
    registerApiModule,
    registerApiModules,
    resolveApi,
  };
};

export default createOpenApi;
