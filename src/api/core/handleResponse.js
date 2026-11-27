import { runOnion, runProcess } from './utils.js';
import { createStreamWithFinish } from './streamUtils.js';
import { createRequestConfig } from './buildRequestConfig.js';

/**
 * 构建三级处理链：全局默认 → 接口定义 → 调用场景
 * - transformList：固定叠加，全局那层按响应形态（responseType）选取
 * - successChain / failChain：洋葱式，最内层（调用场景）决定是否复用外层处理
 * - finalList：固定顺序全部执行，保证清理逻辑不被抑制
 * @param {Object} paramsInfo
 * @param {Object} paramsInfo.defaultHooks - 全局默认回调
 * @param {Object} paramsInfo.defaultTransformMap - 按响应形态分派的默认转换器
 * @param {Object} paramsInfo.apiDesc - 接口描述
 * @param {Object} paramsInfo.callOptions - 调用场景传入的选项
 * @param {string} paramsInfo.responseType - 响应形态
 * @returns {{transformList: Function[], successChain: Function[], failChain: Function[], finalList: Function[]}}
 */
export const buildResponseHandlers = ({
  defaultHooks,
  defaultTransformMap,
  apiDesc,
  callOptions,
  responseType,
}) => {
  const globalResTransform = defaultTransformMap[responseType] || defaultTransformMap.json;
  return {
    transformList: [globalResTransform, apiDesc.resTransform, callOptions.resTransform].filter(
      Boolean
    ),
    successChain: [defaultHooks.success, apiDesc.success, callOptions.success].filter(Boolean),
    failChain: [defaultHooks.fail, apiDesc.fail, callOptions.fail].filter(Boolean),
    finalList: [defaultHooks.final, apiDesc.final, callOptions.final].filter(Boolean),
  };
};

/**
 * 触发浏览器下载：数据已由二进制转换器透传，这里只负责生成临时链接
 * @param {Object} res - 统一响应结构
 */
export const triggerDownload = (res) => {
  const { data: responseData, fileName } = res;
  const sourceResponse = res[Symbol.for('source')];
  const contentType = sourceResponse?.headers?.['content-type'];
  const blob =
    responseData instanceof Blob
      ? responseData
      : new Blob([responseData], contentType ? { type: contentType } : undefined);
  const aLinkDocument = document.createElement('a');
  const downloadUrl = window.URL.createObjectURL(blob);
  aLinkDocument.href = downloadUrl;
  aLinkDocument.download = fileName || 'download';
  aLinkDocument.style.display = 'none';
  document.body.appendChild(aLinkDocument);
  aLinkDocument.click();
  aLinkDocument.parentNode.removeChild(aLinkDocument);
  window.URL.revokeObjectURL(downloadUrl);
};

/**
 * 执行一次请求：组装配置 → 发送 → 转换 → 回调
 * @param {Object} paramsInfo
 * @param {Object} paramsInfo.apiDesc - 接口描述
 * @param {Object} [paramsInfo.callOptions] - 调用场景选项（params/data/otherData/customConfig/回调）
 * @param {Function} paramsInfo.sendRequest - 发送器
 * @param {Object} paramsInfo.defaultHooks - 全局默认回调
 * @param {Object} paramsInfo.defaultTransformMap - 默认转换器注册表
 * @param {Object} paramsInfo.defaultRequestConfig - 全局默认请求配置
 * @returns {Promise<Object>} 统一响应结构
 */
export const executeRequest = async ({
  apiDesc,
  callOptions = {},
  sendRequest,
  defaultHooks,
  defaultTransformMap,
  defaultRequestConfig,
}) => {
  const { params, data, otherData, customConfig } = callOptions;
  const requestConfig = createRequestConfig({
    apiDesc,
    defaultRequestConfig,
    params,
    data,
    otherData,
    customConfig,
  });
  const responseType = requestConfig.responseType || 'json';
  const isStream = responseType === 'stream';
  const { transformList, successChain, failChain, finalList } = buildResponseHandlers({
    defaultHooks,
    defaultTransformMap,
    apiDesc,
    callOptions,
    responseType,
  });

  //final 是否推迟到流结束时执行：流式响应头部到达就返回，此时请求并未真正结束
  let isFinalDeferred = false;
  const runFinal = () => {
    finalList.forEach((finalFn) => finalFn());
  };

  try {
    const sourceRes = await sendRequest({ apiDesc, requestConfig });
    const res = runProcess(sourceRes, transformList);

    if (res.success) {
      if (isStream) {
        if (!res.data?.stream) {
          throw new Error(
            '[openApi] 流式接口未拿到响应流，请检查是否为流式接口声明了 responseType: "stream"，以及当前模式是否支持流式（mock 模式不支持）'
          );
        }
        //流结束时再执行 final，保证 loading 之类的清理不会提前结束
        isFinalDeferred = true;
        res.data.stream = createStreamWithFinish(res.data.stream, runFinal);
        runOnion(successChain, res);
        return Promise.resolve(res);
      }
      if (apiDesc.download) {
        triggerDownload(res);
      }
      runOnion(successChain, res);
      return Promise.resolve(res);
    } else {
      runOnion(failChain, res);
      return Promise.reject(res);
    }
  } catch (e) {
    runOnion(failChain, e);
    return Promise.reject(e);
  } finally {
    //final 不参与洋葱：保证清理逻辑一定执行；流式响应的 final 已挂到流结束
    if (!isFinalDeferred) runFinal();
  }
};
