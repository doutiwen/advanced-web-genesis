//单例基类
export class SingletonBase {
  static instances = new WeakMap();
  constructor() {
    const CurrentClass = this.constructor;
    if (SingletonBase.instances.has(CurrentClass)) {
      return SingletonBase.instances.get(CurrentClass);
    }
    SingletonBase.instances.set(CurrentClass, this);
  }
}

export class UUId extends SingletonBase {
  constructor() {
    super();
    this.currentId = 0;
  }
  getNewId() {
    this.currentId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    return this.currentId;
  }
  getCurrentId() {
    return this.currentId;
  }
}

//延迟操作
export class DelayHandle extends SingletonBase {
  constructor(key) {
    super();
    this.setTimeoutKey = Symbol.for(`delayHandle_${key}_TimerId`);
  }
  breakOff() {
    if (Reflect.has(window, this.setTimeoutKey)) {
      clearTimeout(window[this.setTimeoutKey]);
      Reflect.deleteProperty(window, this.setTimeoutKey);
    }
  }
  exceFn(delayExceFn, time = 5000) {
    this.breakOff();
    window[this.setTimeoutKey] = setTimeout(() => {
      delayExceFn();
      Reflect.deleteProperty(window, this.setTimeoutKey);
    }, time);
  }
}

//一组栈
export class StackList {
  constructor(stackNameList) {
    this.stackMap = new Map();
    for (const stackName of stackNameList) {
      if (!this.stackMap.has(stackName)) {
        this.stackMap.set(stackName, []);
      }
    }
    return new Proxy(this, {
      set() {
        throw new Error('StackList对象不允许修改');
      },
      get(target, propKey) {
        if (stackNameList.includes(propKey)) {
          const stackName = propKey;
          return {
            get(itemNum, deleteItem) {
              return target.get(stackName, itemNum, deleteItem);
            },
            add(item, itemNum, proceessFn) {
              return target.add(stackName, item, itemNum, proceessFn);
            },
            del(num) {
              return target.del(stackName, num);
            },
            moveTo(toName, itemNum, proceessFn) {
              return target.moveTo(stackName, toName, itemNum, proceessFn);
            },
            isEmpty() {
              return target.isEmpty(stackName);
            },
            edit(newValue, setterFn) {
              return target.edit(stackName, newValue, setterFn);
            },
            length: target.length(stackName),
          };
        } else {
          throw new Error(`StackList对象没有${propKey}属性`);
        }
      },
    });
  }
  getStack = (stackName) => {
    if (this.stackMap.has(stackName)) {
      return this.stackMap.get(stackName);
    } else {
      throw new Error(`没有名字为${stackName}的栈`);
    }
  };
  get = (stackName, getItemNum = 1, deleteItem = false) => {
    const targetStack = this.getStack(stackName);
    const targetItemList = [];
    if (targetStack.length >= getItemNum) {
      for (let num = 1; num <= getItemNum; num++) {
        let targetItem;
        if (deleteItem) {
          targetItem = targetStack.pop();
        } else {
          targetItem = targetStack[targetStack.length - num];
        }
        targetItemList.push(targetItem);
      }
      return getItemNum === 1 ? targetItemList[0] : targetItemList;
    } else {
      return undefined;
    }
  };
  add = (stackName, itemValue, itemNum = 1, proceessFn) => {
    const targetStack = this.getStack(stackName);
    if (Object.prototype.toString.call(itemValue).toLowerCase().includes('array]') && itemNum > 1) {
      for (const item of itemValue) {
        targetStack.push(typeof proceessFn === 'function' ? proceessFn(item) : item);
      }
    } else {
      targetStack.push(typeof proceessFn === 'function' ? proceessFn(itemValue) : itemValue);
    }
  };
  del = (stackName, num = 1) => {
    const targetStack = this.getStack(stackName);
    for (let i = 1; i <= num; i++) {
      targetStack.pop();
    }
  };
  moveTo = (fromName, toName, itemNum, proceessFn) => {
    const moveItems = this.get(fromName, itemNum, true);
    this.add(toName, moveItems, itemNum, proceessFn);
  };
  length = (stackName) => {
    const targetStack = this.getStack(stackName);
    return targetStack.length;
  };
  isEmpty = (stackName) => {
    if (this.length(stackName) === 0) {
      return true;
    } else {
      return false;
    }
  };
  edit = (stackName, newValue, setterFn) => {
    const targetItem = this.get(stackName, 1, true);
    this.add(stackName, targetItem, 1, setterFn);
  };
}

//页面关闭操作
export class BeforePageUnloadCallBack extends SingletonBase {
  constructor(callbackList) {
    super();
    this.callbackList = new Set(callbackList);
    window.onbeforeunload = (e) => {
      for (const callback of this.callbackList.values()) {
        callback();
      }
    };
  }
  add(callback) {
    this.callbackList.add(callbackList);
  }
  remove(callback) {
    this.callbackList.delete(callback);
  }
  clear() {
    this.callbackList.clear();
  }
}

class EventBusStore {
  constructor() {
    this.data = {};
    this.eventBus = {};
  }
  setData(key, data) {
    if (key) {
      set(this.data, key, data);
    } else {
      this.data = data;
    }
  }
  getData(key) {
    if (key) {
      return get(this.data, key);
    } else {
      return this.data;
    }
  }
  on(eventName, callback) {
    if (!this.eventBus[eventName]) {
      this.eventBus[eventName] = [];
    }
    const callbackList = this.eventBus[eventName];
    callbackList.push(callback);
  }
  emit(eventName, newValue, payload) {
    if (this.eventBus[eventName]) {
      for (const callback of this.eventBus[eventName]) {
        callback({
          storeData: this.data,
          eventName,
          newValue,
          other: payload || {},
        });
      }
    }
  }
  removeListener(eventName, callback) {
    if (this.eventBus[eventName]) {
      const callbackList = this.eventBus[eventName];
      const callbackIndex = callbackList.findIndex((i) => i === callback);
      if (callbackIndex !== undefined) {
        callbackList.splice(callbackIndex, 1);
      }
    }
  }
}

//vue动态watch管理器，先setWatchInfo再registerWatch使用
export class WatchManager {
  constructor(initWatchInfo) {
    this.watchInfoListMap = new Map(); //
    if (initWatchInfo) {
      for (const { key, watchSetting } of Object.keys(initWatchInfo)) {
        this.setWatchInfo(key, watchSetting);
      }
    }
  }
  //设置watch相关参数，key参数仅仅是唯一标识，不是watch对象
  setWatchInfo = (key, watchSetting) => {
    if (!this.watchInfoListMap.has(key)) {
      this.watchInfoListMap.set(key, []);
    }
    const targetWatchInfoList = this.watchInfoListMap.get(key);
    if (getVarType(watchSetting) === 'array' && getVarType(watchSetting[0]) === 'array') {
      for (const settingItem of watchSetting) {
        targetWatchInfoList.push({
          setting: settingItem,
          operate: {},
        });
      }
    } else {
      targetWatchInfoList.push({
        setting: watchSetting,
        operate: {},
      });
    }
  };
  //注册watch以生效
  registerWatch = (key) => {
    if (key && this.watchInfoListMap.has(key)) {
      const watchList = this.watchInfoListMap.get(key);
      for (const watchItem of watchList) {
        if (!watchItem.operate.stop) {
          const { stop, pause, resume } = watch(...watchItem.setting);
          Object.assign(watchItem.operate, { stop, pause, resume });
        }
      }
    } else if (!key) {
      for (const [key, watchList] of this.watchInfoListMap.entries()) {
        for (const watchItem of watchList) {
          if (!watchItem.operate.stop) {
            const { stop, pause, resume } = watch(...watchItem.setting);
            Object.assign(watchItem.operate, { stop, pause, resume });
          }
        }
      }
    }
  };
  //暂停watch（需要vue3.5+版本）
  pauseWatch = (key) => {
    if (key && this.watchInfoListMap.has(key)) {
      const watchList = this.watchInfoListMap.get(key);
      for (const watchItem of watchList) {
        if (watchItem?.operate?.pause) {
          watchItem.operate.pause();
        }
      }
    } else {
      for (const [key, watchList] of this.watchInfoListMap.entries()) {
        for (const watchItem of watchList) {
          if (watchItem?.operate?.pause) {
            watchItem.operate.pause();
          }
        }
      }
    }
  };
  //恢复watch
  resumeWatch = (key) => {
    if (key && this.watchInfoListMap.has(key)) {
      const watchList = this.watchInfoListMap.get(key);
      for (const watchItem of watchList) {
        if (watchItem?.operate?.resume) {
          watchItem.operate.resume();
        }
      }
    } else {
      for (const [key, watchList] of this.watchInfoListMap.entries()) {
        for (const watchItem of watchList) {
          if (watchItem?.operate?.resume) {
            watchItem.operate.resume();
          }
        }
      }
    }
  };
  //删除watch
  deleteWatch = (key) => {
    if (key && this.watchInfoListMap.has(key)) {
      const watchList = this.watchInfoListMap.get(key);
      for (const watchItem of watchList) {
        if (watchItem?.operate?.stop) {
          watchItem.operate.stop();
        }
      }
      this.watchInfoListMap.delete(key);
    }
  };
  clear = () => {
    for (const watchList of this.watchInfoListMap.values()) {
      for (const watchItem of watchList) {
        if (watchItem?.operate?.stop) {
          watchItem.operate.stop();
        }
      }
    }
    this.watchInfoListMap.clear();
  };
}

//数据处理方法队列，后面的方法的参数是前面方法返回的对象(队列)
export class ProcessFnList {
  constructor(initData, proceessFnList) {
    this.initData = { ...initData };
    this.argsStack = [initData];
    this.proceessFnList = [];
    proceessFnList && this.proceessFnList.push(...proceessFnList);
  }
  addProceess = (proceessFn) => {
    if (getVarType(proceessFn) === 'array') {
      this.proceessFnList.push(...proceessFn);
    } else {
      this.proceessFnList.push(proceessFn);
    }
  };
  getData = () => {
    let data = this.initData;
    this.proceessFnList.map((proceessFn, index) => {
      data = proceessFn(...this.argsStack.slice(0, index + 1));
      this.argsStack.push(JSON.parse(JSON.stringify(data)));
    });
    return data;
  };
}

//运行处理函数管道
export function runProcess(initData, processFnList) {
  let currentData = JSON.parse(JSON.stringify(initData));
  const argsStack = [initData];
  // 遍历执行函数
  processFnList.forEach((fn, index) => {
    const fnArgs = argsStack.slice(0, index + 1);
    currentData = fn(...fnArgs);
    // 将新产生的数据深拷贝后推入栈中，供下一个函数使用
    argsStack.push(JSON.parse(JSON.stringify(currentData)));
  });
  return currentData;
}

//执行方法栈，执行栈内最后一个方法，并且把之前的方法作为该方法的参数传入
export class FunctionStack {
  constructor(sourceParams, fnList) {
    this.fnStack = [];
    this.paramsList = [];
    sourceParams && this.paramsList.push(sourceParams);
    if (fnList) {
      fnList.map((sourceFnItem, index) => {
        const targetFnItem = () => {
          sourceFnItem(...this.paramsList.slice(0, index + 1));
        };
        this.paramsList.push(targetFnItem);
        this.fnStack.push(targetFnItem);
      });
    }
  }
  addFn = (fn) => {
    this.fnStack.push(fn);
  };
  exce() {
    if (this.fnStack.length) {
      this.fnStack[this.fnStack.length - 1](...this.paramsList);
    }
  }
}

//执行方法栈中的最后一个方法，并将之前的参数/方法作为参数传入
export function execLastFunction(fnList, sourceParams) {
  const fnStack = [];
  const paramsList = [];
  if (sourceParams) {
    paramsList.push(sourceParams);
  }
  fnList.forEach((sourceFnItem, index) => {
    const targetFnItem = () => {
      sourceFnItem(...paramsList.slice(0, index + 1));
    };
    paramsList.push(targetFnItem);
    fnStack.push(targetFnItem);
  });
  const lastFn = fnStack[fnStack.length - 1];
  return lastFn(...paramsList);
}

export const getVarType = (variable) => {
  let typeName;
  const typeofType = (typeof variable).toLowerCase();
  switch (typeofType) {
    case 'number': {
      if (Number.isNaN(variable)) {
        typeName = 'nan';
      } else {
        typeName = 'number';
      }
      break;
    }
    case 'object': {
      if (variable === null) {
        typeName = 'null';
      }
      //以下为js内置对象的判断，可根据需求扩展
      else if (Object.prototype.toString.call(variable).toLowerCase().includes('array]')) {
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

export function notEmptyValue(value) {
  return ![undefined, null, ''].includes(value);
}
