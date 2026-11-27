//发送器解析：纯逻辑，不引入任何发送器实现
//核心只负责"按规则挑一个发送器"，具体实现由宿主注入，避免把 axios/fetch 绑进核心

/**
 * 决定本次请求使用哪个发送器
 * 优先级：调用选项 > 接口配置 > 流式响应强制指定的发送器 > 全局默认
 * @param {Object} paramsInfo
 * @param {Object} paramsInfo.apiDesc - 接口描述
 * @param {Object} [paramsInfo.callOptions] - 调用场景选项
 * @param {string} [paramsInfo.streamSenderName] - 流式响应强制使用的发送器名称
 * @returns {string|null} 发送器名称，返回 null 表示使用全局默认
 */
export const pickSenderName = ({ apiDesc, callOptions, streamSenderName = 'fetch' }) => {
  if (callOptions?.sender) return callOptions.sender;
  if (apiDesc?.sender) return apiDesc.sender;
  if (apiDesc?.responseType === 'stream') return streamSenderName;
  return null;
};

/**
 * 解析出本次请求要用的发送器函数
 * @param {Object} paramsInfo
 * @param {Object} paramsInfo.apiDesc - 接口描述
 * @param {Object} [paramsInfo.callOptions] - 调用场景选项
 * @param {Object} paramsInfo.senders - 发送器注册表
 * @param {string} paramsInfo.defaultSenderName - 全局默认发送器名称
 * @param {string} [paramsInfo.streamSenderName] - 流式响应强制使用的发送器名称
 * @returns {Function}
 */
export const resolveSender = ({
  apiDesc,
  callOptions,
  senders,
  defaultSenderName,
  streamSenderName,
}) => {
  const senderName =
    pickSenderName({ apiDesc, callOptions, streamSenderName }) || defaultSenderName;
  const sender = senders?.[senderName];
  if (!sender) {
    const availableSenders = Object.keys(senders || {}).join('、') || '无';
    throw new Error(`[openApi] 未找到发送器「${senderName}」，可用发送器：${availableSenders}`);
  }
  return sender;
};

export default resolveSender;
