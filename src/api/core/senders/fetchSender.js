import { getVarType } from '../utils.js';

//不允许携带请求体的方法：fetch 对这类方法带 body 会直接抛错
const METHODS_WITHOUT_BODY = new Set(['get', 'head']);

//请求头名称大小写不敏感地查找，避免默认配置里的 Content-Type 与后续判断对不上
const findHeaderKey = (headers, headerName) => {
  const targetName = headerName.toLowerCase();
  return Object.keys(headers).find((key) => key.toLowerCase() === targetName);
};

const setHeader = (headers, headerName, headerValue) => {
  headers[findHeaderKey(headers, headerName) || headerName] = headerValue;
};

const removeHeader = (headers, headerName) => {
  const existKey = findHeaderKey(headers, headerName);
  if (existKey) delete headers[existKey];
};

/**
 * 追加一个查询参数：数组用 key[]，嵌套对象用 key[sub]
 * 方括号不编码，与 axios 的默认序列化结果保持一致，避免后端解析行为变化
 * @param {string[]} parts - 查询串片段收集数组
 * @param {string} keyPath - 已编码的参数名路径，如 ids[]、filter[level]
 * @param {*} value - 参数值
 */
const appendQueryParam = (parts, keyPath, value) => {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item) => appendQueryParam(parts, `${keyPath}[]`, item));
    return;
  }
  if (value instanceof Date) {
    parts.push(`${keyPath}=${encodeURIComponent(value.toISOString())}`);
    return;
  }
  if (getVarType(value) === 'object') {
    Object.keys(value).forEach((subKey) =>
      appendQueryParam(parts, `${keyPath}[${encodeURIComponent(subKey)}]`, value[subKey])
    );
    return;
  }
  parts.push(`${keyPath}=${encodeURIComponent(value)}`);
};

/**
 * 拼接查询串
 * @param {string} url - 原始地址（可为相对地址）
 * @param {Object} [params] - 查询参数
 * @returns {string}
 */
export const buildUrl = (url, params) => {
  if (!params) return url;
  const parts = [];
  Object.keys(params).forEach((key) =>
    appendQueryParam(parts, encodeURIComponent(key), params[key])
  );
  if (!parts.length) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${parts.join('&')}`;
};

/**
 * 组装请求体
 * @param {Object} paramsInfo
 * @param {string} paramsInfo.method - 请求方法
 * @param {*} paramsInfo.data - 请求体数据
 * @param {Object} paramsInfo.headers - 请求头（会被就地修改）
 * @returns {BodyInit|undefined}
 */
export const buildRequestBody = ({ method, data, headers }) => {
  if (METHODS_WITHOUT_BODY.has((method || 'get').toLowerCase())) return undefined;
  if (data === null || data === undefined) return undefined;
  //FormData 交给浏览器生成 boundary，必须移除手动设置的 Content-Type
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    removeHeader(headers, 'content-type');
    return data;
  }
  const dataType = getVarType(data);
  if (dataType === 'blob' || dataType === 'file') return data;
  if (typeof ArrayBuffer !== 'undefined' && (data instanceof ArrayBuffer || dataType === 'arraybuffer')) {
    return data;
  }
  if (typeof data === 'string') return data;
  //普通对象按 JSON 发送
  setHeader(headers, 'content-type', 'application/json;charset=utf-8');
  return JSON.stringify(data);
};

/**
 * 响应头归一：Headers 实例转成小写 key 的普通对象，与原有转换器的取值方式保持一致
 * @param {Headers} headers
 * @returns {Object}
 */
export const normalizeHeaders = (headers) => {
  const targetHeaders = {};
  headers.forEach((headerValue, headerName) => {
    targetHeaders[headerName.toLowerCase()] = headerValue;
  });
  return targetHeaders;
};

/**
 * 按响应形态读取响应数据
 * @param {Response} response - fetch 响应
 * @param {string} [declaredResponseType] - 接口声明的响应形态
 * @param {Object} responseHeaders - 已归一的响应头
 * @returns {Promise<*>}
 */
export const readResponseData = async (response, declaredResponseType, responseHeaders) => {
  //204/205 与空响应没有 body，直接按 null 处理，避免 json 解析抛错
  if (response.status === 204 || response.status === 205) return null;
  if (responseHeaders['content-length'] === '0') return null;

  switch (declaredResponseType) {
    case 'blob': {
      return response.blob();
    }
    case 'arraybuffer': {
      return response.arrayBuffer();
    }
    case 'text': {
      return response.text();
    }
    case 'json': {
      try {
        return await response.json();
      } catch {
        //空 body 或非法 JSON 时返回 null，交给上层按业务失败处理
        return null;
      }
    }
    default: {
      //未声明响应形态时按 content-type 判断，避免把二进制当 JSON 解析
      const contentType = responseHeaders['content-type'] || '';
      if (contentType.includes('json')) {
        try {
          return await response.json();
        } catch {
          return null;
        }
      }
      return response.text();
    }
  }
};

/**
 * 创建中断控制器：合并外部 signal 与超时
 * @param {Object} paramsInfo
 * @param {number} [paramsInfo.timeout] - 超时毫秒数，0 或负数表示不限时
 * @param {AbortSignal} [paramsInfo.signal] - 外部传入的中断信号
 * @returns {{signal: AbortSignal, abort: Function, cleanup: Function, isTimeout: Function}}
 */
export const createAbortController = ({ timeout, signal }) => {
  const controller = new AbortController();
  let timer = null;
  let timeoutTriggered = false;
  const onExternalAbort = () => controller.abort(signal?.reason);

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener('abort', onExternalAbort);
    }
  }
  if (timeout > 0) {
    timer = setTimeout(() => {
      timeoutTriggered = true;
      controller.abort();
    }, timeout);
  }
  return {
    signal: controller.signal,
    abort: (reason) => controller.abort(reason),
    cleanup: () => {
      if (timer) clearTimeout(timer);
      signal?.removeEventListener('abort', onExternalAbort);
    },
    isTimeout: () => timeoutTriggered,
  };
};

/**
 * 把 fetch 抛出的错误归一成带 msg 的对象，便于默认失败回调直接提示
 * @param {Error} error - 原始错误
 * @param {boolean} isTimeout - 是否为超时导致的中断
 * @returns {Error}
 */
const normalizeFetchError = (error, isTimeout) => {
  let message;
  if (error?.name === 'AbortError') {
    message = isTimeout ? '请求超时' : '请求已取消';
  } else {
    message = error?.message || '网络请求失败';
  }
  const requestError = new Error(message);
  requestError.msg = message;
  requestError[Symbol.for('source')] = error;
  return requestError;
};

/**
 * fetch 发送器：支持流式响应
 * 契约：({ apiDesc, requestConfig }) => Promise<responseLike>
 * - 普通请求返回 { status, statusText, headers, data }
 * - 流式请求（responseType: 'stream'）返回 { status, statusText, headers, data: { stream, abort } }
 */
const fetchSender = async ({ apiDesc, requestConfig }) => {
  const {
    url,
    method = 'get',
    params,
    data,
    headers,
    responseType,
    timeout,
    signal,
    credentials,
  } = requestConfig;
  const isStream = responseType === 'stream';
  //请求头复制一份，避免修改调用方传入的对象
  const requestHeaders = { ...(headers || {}) };
  const abortInfo = createAbortController({
    //流式请求不自动超时，否则会掐断长连接
    timeout: isStream ? 0 : timeout,
    signal,
  });

  const fetchOptions = {
    method: (method || 'get').toUpperCase(),
    headers: requestHeaders,
    signal: abortInfo.signal,
    credentials: credentials || 'same-origin',
  };
  const requestBody = buildRequestBody({ method, data, headers: requestHeaders });
  if (requestBody !== undefined) {
    fetchOptions.body = requestBody;
  }

  try {
    const response = await fetch(buildUrl(url, params), fetchOptions);
    const responseHeaders = normalizeHeaders(response.headers);
    //HTTP/2 下 statusText 常为空，用状态码兜底，避免提示信息为空白
    const statusText = response.statusText || `HTTP ${response.status}`;

    if (isStream) {
      return {
        status: response.status,
        statusText,
        headers: responseHeaders,
        data: { stream: response.body, abort: abortInfo.abort },
      };
    }
    const responseData = await readResponseData(response, responseType, responseHeaders);
    return { status: response.status, statusText, headers: responseHeaders, data: responseData };
  } catch (error) {
    throw normalizeFetchError(error, abortInfo.isTimeout());
  } finally {
    //流式请求需要保留 abort 能力，不清理中断控制器
    if (!isStream) abortInfo.cleanup();
  }
};

export default fetchSender;
