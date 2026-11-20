/**
 * AdvButton 下载能力
 *
 * 【功能说明】
 * 只消费调用方提供的现成数据：直链 URL 或二进制数据（Blob / File），
 * 组件内部不发起任何接口请求。
 *
 * 【download 支持的形态】
 * | 形态 | 说明 |
 * |------|------|
 * | String | 直链地址，文件名取 URL 末段 |
 * | Blob / File | 二进制数据，File 自动取 name 作文件名 |
 * | Object | { url?, blob?, filename?, name?, onSuccess?, onError? }，url 与 blob 二选一 |
 * | Function | () => String \| Blob \| Object \| Promise<...>，点击时取数 |
 */

/**
 * 判断是否为下载配置对象（排除 Blob / File 这类二进制数据本身）
 * @param {Any} download - download 属性
 * @returns {Boolean}
 */
const isDownloadConfig = (download) =>
  !!download && typeof download === 'object' && !(download instanceof Blob);

/**
 * 从 URL 中提取文件名（去掉 query / hash 后取末段）
 * @param {String} url - 下载地址
 * @returns {String} 解析出的文件名，取不到时返回空字符串
 */
const getFilenameFromUrl = (url) => {
  if (typeof url !== 'string' || !url) return '';
  const cleanUrl = url.split('#')[0].split('?')[0];
  const segments = cleanUrl.split('/');
  const lastSegment = segments[segments.length - 1];
  if (!lastSegment) return '';
  try {
    return decodeURIComponent(lastSegment);
  } catch (err) {
    // URL 编码不合法时退回原始末段
    return lastSegment;
  }
};

/**
 * 生成兜底文件名
 * @returns {String}
 */
const createFallbackFilename = () => `download_${Date.now()}`;

/**
 * 归一化 download 配置
 * @param {String|Blob|Object} download - download 属性
 * @returns {Object|null} 归一化后的配置；非法输入返回 null
 */
const normalizeDownloadConfig = (download) => {
  if (typeof download === 'string') return { url: download };
  if (download instanceof Blob) return { blob: download };
  if (download && typeof download === 'object') return { ...download };
  return null;
};

/**
 * 触发直链下载
 * @param {String} url - 下载地址
 * @param {String} filename - 文件名
 */
const triggerUrlDownload = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  // 跨域 URL 的 download 属性会被浏览器忽略，最终以服务端响应头为准
  link.download = filename || '';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
};

/**
 * 触发 Blob 下载
 * @param {Blob} blob - 二进制数据
 * @param {String} filename - 文件名
 */
const triggerBlobDownload = (blob, filename) => {
  const objectUrl = URL.createObjectURL(blob);
  try {
    triggerUrlDownload(objectUrl, filename);
  } finally {
    // 延迟释放：立即 revoke 在部分浏览器会导致下载失败
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
};

/**
 * 执行下载
 * @param {String|Blob|Object} download - download 属性
 * @returns {Promise<{filename: String}>} 实际使用的文件名
 */
const triggerDownload = async (download) => {
  const config = normalizeDownloadConfig(download);
  if (!config) throw new Error('download 配置无效');

  const { url, blob } = config;

  // 二进制数据：文件名优先取 filename，其次取 File.name
  if (blob) {
    if (!(blob instanceof Blob)) throw new Error('download.blob 必须是 Blob 或 File');
    const filename =
      config.filename ||
      config.name ||
      (typeof blob.name === 'string' && blob.name) ||
      createFallbackFilename();
    triggerBlobDownload(blob, filename);
    return { filename };
  }

  // 直链下载
  if (url) {
    const filename =
      config.filename || config.name || getFilenameFromUrl(url) || createFallbackFilename();
    triggerUrlDownload(url, filename);
    return { filename };
  }

  throw new Error('download 需要提供 url 或 blob');
};

export { triggerDownload, normalizeDownloadConfig, isDownloadConfig };
