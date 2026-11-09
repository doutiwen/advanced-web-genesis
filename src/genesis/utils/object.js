export class DeepObjectIterator {
  constructor(deepObject, isLeafFn) {
    const notComplete = [];
    const completed = [];
    const everyLevelChildNum = [];
    const everyLevelCompletedChildNum = [];
    const everyLevelPropKey = [];
    const oneTick = () => {
      const currentNode = notComplete.pop();
      let isLeaf = false;
      let currentLevelCompleted = false;
      let handleOneNode = false;
      if (isLeafFn(currentNode)) {
        isLeaf = true;
      }
      if (everyLevelCompletedChildNum.length) {
        if (
          everyLevelCompletedChildNum[everyLevelCompletedChildNum.length - 1] ===
          everyLevelChildNum[everyLevelChildNum.length - 1]
        ) {
          currentLevelCompleted = true;
        }
      }
      if (currentLevelCompleted) {
        const currentLevelChildNum = everyLevelChildNum.pop();
        completed.splice(-currentLevelChildNum);
        everyLevelCompletedChildNum.pop();
        completed.push(notComplete.pop());
        if (everyLevelCompletedChildNum.length) {
          everyLevelCompletedChildNum[everyLevelCompletedChildNum.length - 1]++;
        }
        handleOneNode = true;
      } else {
        if (isLeaf) {
          completed.push(notComplete.pop());
          if (everyLevelCompletedChildNum.length) {
            everyLevelCompletedChildNum[everyLevelCompletedChildNum.length - 1]++;
          }
          handleOneNode = true;
        } else {
          let chilidNum = 0;
          for (const childKey of Object.keys(currentNode)) {
            notComplete.push(currentNode[childKey]);
            chilidNum++;
          }
          everyLevelChildNum.push(chilidNum);
          everyLevelCompletedChildNum.push(0);
        }
      }
      return handleOneNode;
    };

    this[Symbol.iterator] = () => {
      notComplete.push(deepObject);
      return {
        next() {
          if (notComplete.length) {
            let handleOneNode;
            do {
              handleOneNode = oneTick();
            } while (!handleOneNode);
            return {
              value: completed[completed.length - 1],
            };
          } else {
            return {
              done: true,
            };
          }
        },
      };
    };
  }
}

export function getObjectDiffProperty(oldObject, newObject) {
  const needAddPropertyNameList = [];
  const needDeletePropertyNameList = [];
  const noChangePropertyNameList = [];
  const diffInfo = {};

  if (oldObject) {
    for (const readyDeleteKey of Object.keys(oldObject)) {
      diffInfo[readyDeleteKey] = -1;
    }
  }
  if (newObject) {
    for (const readyAddKey of Object.keys(newObject)) {
      if (Reflect.has(diffInfo, readyAddKey)) {
        diffInfo[readyAddKey] = 0;
      } else {
        diffInfo[readyAddKey] = 1;
      }
    }
  }
  for (const key of Object.keys(diffInfo)) {
    if (diffInfo[key] === -1) {
      needDeletePropertyNameList.push(key);
    } else if (diffInfo[key] === 1) {
      needAddPropertyNameList.push(key);
    } else if (diffInfo[key] === 0) {
      noChangePropertyNameList.push(key);
    }
  }
  return {
    addKeyList: needAddPropertyNameList,
    deleteKeyList: needDeletePropertyNameList,
    noChangeKeyList: noChangePropertyNameList,
  };
}

export function objectDiff(oldObject, newObject, diffHandler) {
  const { addKeyList, deleteKeyList, noChangeKeyList } = getObjectDiffProperty(
    oldObject,
    newObject
  );
  for (const addKey of addKeyList) {
    diffHandler('add', addKey, newObject[addKey]);
  }
  for (const deleteKey of deleteKeyList) {
    diffHandler('delete', deleteKey, oldObject[deleteKey]);
  }
  for (const noChangeKey of noChangeKeyList) {
    diffHandler('noChange', noChangeKey, newObject[noChangeKey]);
  }
  return {
    addKeyList,
    deleteKeyList,
    noChangeKeyList,
  };
}

export function arrayDiff(oldArray, newArray, idFieldName, diffHandler) {
  const oldInfo = {},
    newInfo = {};
  if (oldArray) {
    for (const oldItem of oldArray) {
      oldInfo[oldItem[idFieldName]] = oldItem;
    }
  }
  if (newArray) {
    for (const newItem of newArray) {
      newInfo[newItem[idFieldName]] = newItem;
    }
  }
  return objectDiff(oldInfo, newInfo, diffHandler);
}

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
 * 同步管道处理器
 */
class SyncPipeline {
  /**
   * @param {Object|Map} steps - 流程方法集合，如 { key1: fn1, key2: fn2 }
   * @param {string[]} [order] - 执行顺序数组，不传则按注册先后顺序
   */
  constructor(steps = {}, order) {
    this.steps = new Map();

    // 兼容 Map 和普通对象
    if (steps instanceof Map) {
      this.steps = new Map(steps);
    } else {
      for (const [key, handler] of Object.entries(steps)) {
        this.steps.set(key, handler);
      }
    }

    // 确定执行顺序
    this.order = order ? [...order] : [...this.steps.keys()];

    // 校验顺序中的 key 是否都已注册
    for (const key of this.order) {
      if (!this.steps.has(key)) {
        throw new Error(`流程顺序中的步骤 "${key}" 未注册`);
      }
    }
  }

  /**
   * 执行管道
   * @param {*} initialValue - 初始值
   * @returns {*} 最终结果
   */
  execute(initialValue) {
    let current = initialValue;

    for (const key of this.order) {
      const handler = this.steps.get(key);
      const result = handler(current);

      // 如果返回了 { done: true }，提前终止并返回当前 value
      if (result && typeof result === 'object' && result.done === true) {
        return result.value;
      }

      // 提取 value 继续下一步（兼容未严格返回 {value} 格式的情况）
      current = result && typeof result === 'object' && 'value' in result ? result.value : result;
    }

    return current;
  }
}

/**
 * 异步管道处理器（支持同步和异步方法混用，整体执行异步）
 */
class AsyncPipeline {
  constructor(steps = {}, order) {
    this.steps = new Map();

    if (steps instanceof Map) {
      this.steps = new Map(steps);
    } else {
      for (const [key, handler] of Object.entries(steps)) {
        this.steps.set(key, handler);
      }
    }

    this.order = order ? [...order] : [...this.steps.keys()];

    for (const key of this.order) {
      if (!this.steps.has(key)) {
        throw new Error(`流程顺序中的步骤 "${key}" 未注册`);
      }
    }
  }

  async execute(initialValue) {
    let current = initialValue;

    for (const key of this.order) {
      const handler = this.steps.get(key);
      // await 可以同时兼容同步和异步方法
      const result = await handler(current);

      if (result && typeof result === 'object' && result.done === true) {
        return result.value;
      }

      current = result && typeof result === 'object' && 'value' in result ? result.value : result;
    }

    return current;
  }
}
