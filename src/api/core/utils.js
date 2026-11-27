/**
 * 全局 util 引用：空值判断
 * 只把 undefined / null / '' 视为空，0 与 false 会被保留
 */
export function notEmptyValue(value) {
  return ![undefined, null, ''].includes(value);
}

/**
 * 全局 util 引用：清理对象，剔除空值字段；可传入转换函数逐个加工
 * @param {Object} sourceInfo - 源对象
 * @param {Function} [setter] - 逐个字段的转换函数
 * @returns {Object}
 */
export function cleanObject(sourceInfo, setter) {
  const targetInfo = {};
  for (const key of Object.keys(sourceInfo)) {
    if (notEmptyValue(sourceInfo[key])) {
      targetInfo[key] = setter ? setter(sourceInfo[key], key) : sourceInfo[key];
    }
  }
  return targetInfo;
}

/**
 * 全局 util 引用：获取变量的精确类型名
 * @param {*} variable
 * @returns {string}
 */
export const getVarType = (variable) => {
  let typeName;
  const typeofType = (typeof variable).toLowerCase();
  switch (typeofType) {
    case 'number': {
      typeName = Number.isNaN(variable) ? 'nan' : 'number';
      break;
    }
    case 'object': {
      if (variable === null) {
        typeName = 'null';
      } else if (Object.prototype.toString.call(variable).toLowerCase().includes('array]')) {
        typeName = 'array';
      } else if (Object.prototype.toString.call(variable).toLowerCase().includes('date]')) {
        typeName = 'date';
      } else if (Object.prototype.toString.call(variable).toLowerCase().includes('regexp]')) {
        typeName = 'regexp';
      } else if (Object.prototype.toString.call(variable).toLowerCase().includes('file]')) {
        typeName = 'file';
      } else if (Object.prototype.toString.call(variable).toLowerCase().includes('blob]')) {
        typeName = 'blob';
      } else if (Object.prototype.toString.call(variable).toLowerCase().includes('filereader]')) {
        typeName = 'fileReader';
      } else if (Object.prototype.toString.call(variable).toLowerCase().includes('filelist]')) {
        typeName = 'fileList';
      } else if (Object.prototype.toString.call(variable).toLowerCase().includes('map]')) {
        typeName = 'map';
      } else if (Object.prototype.toString.call(variable).toLowerCase().includes('set]')) {
        typeName = 'set';
      } else {
        typeName = 'object';
      }
      break;
    }
    case 'function': {
      const functionString = variable.toString();
      //判断是否async函数，第二种条件针对babel（5/6/7）转换后的代码，可能会根据babel版本不同而有变化
      if (
        Object.prototype.toString.call(variable).toLowerCase().includes('asyncfunction') ||
        functionString.includes('return _regenerator.default.async(function')
      ) {
        typeName = 'asyncFunction';
      } else {
        typeName = typeofType;
      }
      break;
    }
    default:
      typeName = typeofType;
  }
  return typeName;
};

/**
 * 上传数据转 FormData：文件/文件数组按同名 key 追加，其余按普通字段追加
 * @param {Object} data - 待上传的数据
 * @returns {FormData}
 */
export const toFormData = (data) => {
  const formData = new FormData();
  cleanObject(data, (sourceValue, key) => {
    const valueType = getVarType(sourceValue);
    if (valueType === 'file') {
      formData.append(key, sourceValue, sourceValue.name);
    } else if (valueType === 'fileList') {
      sourceValue.forEach((file) => formData.append(key, file, file.name));
    } else {
      formData.append(key, sourceValue);
    }
  });
  return formData;
};

/**
 * 管道数据拷贝：仅普通对象与数组递归拷贝（保留 Symbol 键），
 * Blob、File、Date、FormData 等特殊对象保持引用，
 * 避免 JSON 序列化把二进制响应变成空对象、把 Symbol 键丢弃
 * @param {*} value - 待拷贝数据
 * @param {WeakMap} [cache] - 循环引用缓存
 * @returns {*}
 */
export function copyProcessData(value, cache = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (cache.has(value)) return cache.get(value);
  if (Array.isArray(value)) {
    const targetArray = [];
    cache.set(value, targetArray);
    value.forEach((item, index) => {
      targetArray[index] = copyProcessData(item, cache);
    });
    return targetArray;
  }
  // 非普通对象（Blob/ArrayBuffer/Date/FormData/Map/Set 等）直接复用引用
  const valueProto = Object.getPrototypeOf(value);
  if (valueProto !== Object.prototype && valueProto !== null) return value;
  const targetObject = {};
  cache.set(value, targetObject);
  Reflect.ownKeys(value).forEach((key) => {
    targetObject[key] = copyProcessData(value[key], cache);
  });
  return targetObject;
}

/**
 * 运行处理函数管道：逐个执行，后一个函数能拿到之前所有的数据/结果
 * @param {*} initData - 初始数据
 * @param {Function[]} processFnList - 处理函数列表
 * @returns {*}
 */
export function runProcess(initData, processFnList) {
  let currentData = copyProcessData(initData);
  const argsStack = [initData];
  processFnList.forEach((fn, index) => {
    const fnArgs = argsStack.slice(0, index + 1);
    currentData = fn(...fnArgs);
    // 将新产生的数据拷贝后推入栈中，供下一个函数使用
    argsStack.push(copyProcessData(currentData));
  });
  return currentData;
}

/**
 * 洋葱式执行：从最内层（数组末尾）开始执行
 * handler 收到 (payload, next)，只有显式调用 next 才会执行紧邻的外层处理器，
 * 因此最内层（调用场景）可以自行决定是否复用外层（接口、全局）的处理方式
 * @param {Function[]} handlerList - 由外到内排列的处理器列表
 * @param {*} payload - 传入最内层的参数
 * @returns {*}
 */
export function runOnion(handlerList, payload) {
  const execHandler = (index, currentPayload) => {
    if (index < 0) return undefined;
    const handler = handlerList[index];
    // next 可传入新参数；不传则沿用当前参数
    return handler(currentPayload, (nextPayload) =>
      execHandler(index - 1, nextPayload === undefined ? currentPayload : nextPayload)
    );
  };
  return execHandler(handlerList.length - 1, payload);
}
