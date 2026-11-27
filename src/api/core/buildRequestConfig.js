import deepmerge from 'deepmerge';
import { cleanObject, runProcess, toFormData } from './utils.js';

//请求方法策略表：只描述各方法在请求配置上的差异
//响应数据形态（json/blob/arraybuffer/text）由 responseType 单独控制，不再塞进 method
const methodHandlers = {
  get: (requestConfig) => {
    requestConfig.method = 'get';
  },
  post: (requestConfig) => {
    requestConfig.method = 'post';
  },
  put: (requestConfig) => {
    requestConfig.method = 'put';
  },
  delete: (requestConfig) => {
    requestConfig.method = 'delete';
  },
  upload: (requestConfig, { data }) => {
    requestConfig.method = 'post';
    requestConfig.data = toFormData(data);
  },
};

/**
 * 解析请求地址：支持函数、模板字符串、静态字符串三种写法
 * @param {Object} apiDesc - 接口描述
 * @param {Array} otherData - 地址模板/函数使用的参数
 * @returns {string}
 */
export const resolveUrl = (apiDesc, otherData) => {
  if (typeof apiDesc.url === 'function') {
    return apiDesc.url(otherData);
  }
  if (apiDesc.url.includes('${')) {
    return new Function(`return \`${apiDesc.url}\``)(...(otherData || []));
  }
  return apiDesc.url;
};

/**
 * 组装一次请求的配置
 * @param {Object} paramsInfo
 * @param {Object} paramsInfo.apiDesc - 接口描述
 * @param {Object} paramsInfo.defaultRequestConfig - 全局默认请求配置
 * @param {Object} [paramsInfo.params] - 查询参数
 * @param {Object} [paramsInfo.data] - 请求体
 * @param {Array} [paramsInfo.otherData] - 地址模板参数
 * @param {Object} [paramsInfo.customConfig] - 调用场景追加的配置
 * @returns {Object} 请求配置
 */
export const createRequestConfig = ({
  apiDesc,
  defaultRequestConfig,
  params,
  data,
  otherData,
  customConfig,
}) => {
  const configSetFnList = [];
  if (typeof apiDesc?.requestConfig === 'function') {
    configSetFnList.push(apiDesc.requestConfig);
  } else if (typeof apiDesc?.requestConfig === 'object') {
    configSetFnList.push((defaultRequestConfig) =>
      deepmerge(defaultRequestConfig, apiDesc.requestConfig)
    );
  }
  if (customConfig) {
    configSetFnList.push((defaultRequestConfig, apiRequestConfig) =>
      deepmerge(defaultRequestConfig, apiRequestConfig, customConfig)
    );
  }
  const requestConfig = runProcess(defaultRequestConfig, configSetFnList);
  requestConfig.url = resolveUrl(apiDesc, otherData);
  //头部值为函数时在请求前求值，便于携带运行时数据（如 token）
  Object.keys(requestConfig.headers || {}).forEach((headerName) => {
    const headerValue = requestConfig.headers[headerName];
    if (typeof headerValue === 'function') {
      requestConfig.headers[headerName] = headerValue();
    }
  });
  if (apiDesc.method !== 'upload') {
    if (typeof params === 'object') {
      requestConfig.params = cleanObject(params);
    }
    if (typeof data === 'object') {
      requestConfig.data = cleanObject(data);
    }
  }
  //未声明 method 时按 get 处理
  (methodHandlers[apiDesc.method] || methodHandlers.get)(requestConfig, { data });
  //响应形态由接口配置显式声明，不再依赖后端 content-type 判断
  if (apiDesc.responseType) {
    requestConfig.responseType = apiDesc.responseType;
  }
  return requestConfig;
};
