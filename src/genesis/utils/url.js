//构建查询字符串
//params - 参数对象（支持二层嵌套） [originUrl] - 可选的基础 URL [encode=false] - 是否对最终结果进行 URI 编码
export const buildQuery = (params, originUrl, encode = false) => {
  if (!params || typeof params !== 'object') return originUrl || '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val === null || val === undefined) return;
    // 处理二层嵌套对象，如 { a: { b: 1 } } -> a[b]=1
    if (typeof val === 'object' && !Array.isArray(val)) {
      Object.entries(val).forEach(([subKey, subVal]) => {
        searchParams.append(`${key}[${subKey}]`, subVal);
      });
    } else {
      searchParams.append(key, val);
    }
  });
  // 如果传入了 originUrl，则拼接；否则只返回 query 字符串
  let result = originUrl ? `${originUrl}?${searchParams}` : searchParams.toString();
  return encode ? encodeURIComponent(result) : result;
};

//解析 URL 查询字符串为对象,支持类型自动转换（数字、布尔值）及数组转换
//[url] - 可选的 URL 字符串 [convertToArray=false] - 是否将逗号分隔的字符串转换为数组 [convertToString=false] - 是否保持字符串格式（不进行数字/布尔转换）
export const parseQuery = (url, convertToArray = false, convertToString = false) => {
  // 1. 辅助函数：统一处理值的类型转换
  const parseValue = (val) => {
    if (convertToString) return val;
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);
    return val;
  };
  // 2. 辅助函数：处理数组逻辑
  const handleArray = (val) => {
    if (!convertToArray || !val.includes(',')) return parseValue(val);

    return val.split(',').map((item) => parseValue(item));
  };
  // 3. 获取 SearchParams 实例
  let searchParams;
  try {
    if (typeof url === 'string') {
      if (url.startsWith('?')) {
        searchParams = new URLSearchParams(url);
      } else if (url.startsWith('http')) {
        searchParams = new URL(url).searchParams;
      } else {
        searchParams = new URLSearchParams(); // 无效字符串回退
      }
    } else {
      searchParams = new URL(window.location.href).searchParams;
    }
  } catch (e) {
    console.error('Invalid URL provided', e);
    return {};
  }
  // 4. 遍历并组装对象
  const result = {};
  for (const [key, value] of searchParams.entries()) {
    if (!value || value === 'undefined' || value === 'null') continue;
    // 处理嵌套对象格式：key[subKey]
    const match = key.match(/^([a-zA-Z_$][\w$]*)\[(.+)\]$/);
    if (match) {
      const [, mainKey, subKey] = match;
      if (!result[mainKey]) result[mainKey] = {};
      result[mainKey][subKey] = handleArray(value);
    } else {
      // 普通参数
      result[key] = handleArray(value);
    }
  }
  if (Object.keys(result).length) {
    return result;
  } else {
    return null;
  }
};
