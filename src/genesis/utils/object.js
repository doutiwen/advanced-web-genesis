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
