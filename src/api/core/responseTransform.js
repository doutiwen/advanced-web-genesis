/**
 * 内置响应转换器：与具体业务无关的通用部分
 * 业务侧的 JSON 结构解析（isSuccess / code / msg）由宿主项目注入
 */

/**
 * 从响应头解析文件名（content-disposition）
 * @param {Object} headers - 响应头
 * @returns {string} 文件名，解析不到返回空字符串
 */
export const getFileNameFromHeaders = (headers = {}) => {
  const disposition = headers['content-disposition'] || '';
  // 兼容 filename 与 filename*=UTF-8'' 两种写法
  const fileNameMatch = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  if (!fileNameMatch) return '';
  try {
    return decodeURIComponent(fileNameMatch[1]);
  } catch {
    // 文件名不是合法编码时按原样返回，避免解析失败导致请求中断
    return fileNameMatch[1];
  }
};

/**
 * 非 JSON 响应（二进制/文本）默认转换：数据原样透传，不做 JSON 解析
 * @param {Object} sourceResponse - 发送器返回的原始响应
 * @returns {Object} 统一响应结构
 */
export const passThroughResTransform = (sourceResponse) => {
  const isOkStatus = sourceResponse.status >= 200 && sourceResponse.status < 300;
  return {
    success: isOkStatus,
    data: sourceResponse.data,
    msg: isOkStatus ? '' : sourceResponse.statusText,
    code: sourceResponse.status,
    fileName: getFileNameFromHeaders(sourceResponse.headers), //二进制响应可直接用于下载
    [Symbol.for('source')]: sourceResponse,
  };
};
