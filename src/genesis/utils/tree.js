//树形数据遍历器
export class TreeDataIterator {
  constructor(treeData, childrenDataKey = 'children') {
    const stackNameList = [
      'notComplete',
      'completed',
      'everyLevelChildNum',
      'everyLevelCompletedChildNum',
    ];
    const stack = new StackList(stackNameList);
    const oneTick = () => {
      const currentNode = stack.notComplete.get();
      let isContainer = false;
      let currentLevelCompleted = false;
      let handleOneNode = false;
      if (currentNode[childrenDataKey]) {
        isContainer = true;
      }
      if (!stack.everyLevelCompletedChildNum.isEmpty()) {
        if (stack.everyLevelCompletedChildNum.get() === stack.everyLevelChildNum.get()) {
          currentLevelCompleted = true;
        }
      }
      if (currentLevelCompleted) {
        const currentLevelChildNum = stack.everyLevelChildNum.get(1, true);
        stack.completed.del(currentLevelChildNum);
        stack.everyLevelCompletedChildNum.del();
        stack.notComplete.moveTo('completed', 1);
        if (stack.everyLevelCompletedChildNum.length) {
          stack.everyLevelCompletedChildNum.edit(undefined, (num) => ++num);
        }
        handleOneNode = true;
      } else {
        if (!isContainer) {
          stack.notComplete.moveTo('completed', 1);
          if (stack.everyLevelCompletedChildNum.length) {
            stack.everyLevelCompletedChildNum.edit(undefined, (num) => ++num);
          }
          handleOneNode = true;
        } else {
          let chilidNum = 0;
          for (const child of currentNode[childrenDataKey]) {
            stack.notComplete.add(child);
            chilidNum++;
          }
          stack.everyLevelChildNum.add(chilidNum);
          stack.everyLevelCompletedChildNum.add(0);
        }
      }
      return handleOneNode;
    };

    this[Symbol.iterator] = () => {
      let treeDataLength,
        currentTreeDataIndex = 0;
      if (Array.isArray(treeData)) {
        treeDataLength = treeData.length;
        if (treeDataLength) {
          stack.notComplete.add(treeData[0]);
        }
      } else {
        treeDataLength = 1;
        stack.notComplete.add(treeData);
      }
      return {
        next() {
          if (treeDataLength === 0) {
            return {
              done: true,
            };
          } else {
            if (stack.notComplete.length !== 0) {
              let handleOneNode;
              do {
                handleOneNode = oneTick();
              } while (!handleOneNode);
              return {
                value: stack.completed.get(),
              };
            } else {
              ++currentTreeDataIndex;
              if (currentTreeDataIndex === treeDataLength) {
                return {
                  done: true,
                };
              } else {
                stack.notComplete.add(treeData[currentTreeDataIndex]);
                let handleOneNode;
                do {
                  handleOneNode = oneTick();
                } while (!handleOneNode);
                return {
                  value: stack.completed.get(),
                };
              }
            }
          }
        },
      };
    };
  }
}

//遍历树
//nodeHandler签名:({currentNode,parent,index,level,dataFromParentLevel})=>({forChildrenData,stop,filter,doneCallBack})
export const runTreeData = ({
  sourceTree,
  nodeHandler,
  initNodeHandlerData,
  childrenListKey = 'children',
  runCompleteHandler,
}) => {
  const parentKey = Symbol.for('parent');
  const indexKey = Symbol.for('index');
  const levelKey = Symbol.for('level');
  let stopRun;
  const allDoneCallBack = [],
    allstopReturn = [];
  const runTreeDataFunction = (rootData, rootIndex) => {
    const notComplete = [];
    const completed = [];
    const argsMap = new Map();
    notComplete.push(rootData);
    do {
      const currentNode = notComplete.pop();
      if (completed.length && currentNode[parentKey]) {
        if (currentNode[parentKey] !== completed[completed.length - 1][parentKey]) {
          currentNode[indexKey] = 0;
        } else {
          currentNode[indexKey] = completed[completed.length - 1][indexKey] + 1;
        }
      } else {
        currentNode[indexKey] = rootIndex;
      }

      if (!currentNode[parentKey]) {
        currentNode[levelKey] = 1;
      } else {
        currentNode[levelKey] = currentNode[parentKey][levelKey] + 1;
      }

      const handerFunctionReturnList = [];
      let currentRunFunctionArgs;
      if (typeof nodeHandler === 'function') {
        if (currentNode[parentKey]) {
          currentRunFunctionArgs = argsMap.get(currentNode[parentKey])[0];
        } else {
          currentRunFunctionArgs = initNodeHandlerData;
        }
        handerFunctionReturnList.push(
          nodeHandler({
            currentNode,
            parent: currentNode[parentKey],
            index: currentNode[indexKey],
            level: currentNode[levelKey],
            dataFromParentLevel: currentRunFunctionArgs,
          })
        );
      } else if (Array.isArray(nodeHandler)) {
        nodeHandler.map((nodeHandlerItem, index) => {
          if (allstopReturn?.[index] !== true) {
            if (currentNode[parentKey]) {
              currentRunFunctionArgs = argsMap.get(currentNode[parentKey])?.[index];
            } else {
              currentRunFunctionArgs = initNodeHandlerData?.[index];
            }
            handerFunctionReturnList.push(
              nodeHandlerItem({
                currentNode,
                parent: currentNode[parentKey],
                index: currentNode[indexKey],
                level: currentNode[levelKey],
                dataFromParentLevel: currentRunFunctionArgs,
              })
            );
          } else {
            handerFunctionReturnList.push(undefined);
          }
        });
      }
      const forChildrenArgs = [],
        allFilterReturn = [];
      let stop = false,
        filter = false;

      for (const nodeHanderRetrun of handerFunctionReturnList) {
        forChildrenArgs.push(nodeHanderRetrun?.forChildrenData);
        allstopReturn.push(nodeHanderRetrun?.stop);
        allFilterReturn.push(nodeHanderRetrun?.filter);
        if (nodeHanderRetrun?.doneCallBack && typeof nodeHanderRetrun.doneCallBack === 'function') {
          allDoneCallBack.push(nodeHanderRetrun.doneCallBack);
        }
      }
      if (allstopReturn.length && allstopReturn.every((i) => !!i)) {
        stop = true;
      }
      if (allstopReturn.length && allFilterReturn.some((i) => !!i)) {
        filter = true;
      }
      if (!filter) {
        completed.push(currentNode);
      } else {
        if (currentNode[parentKey]) {
          currentNode[parentKey][childrenListKey].splice(currentNode[indexKey], 1);
        }
        const indexInNotComplet = notComplete.findIndex((item) => item === currentNode);
        notComplete.splice(indexInNotComplet, 1);
      }
      if (stop) {
        stopRun = stop;
        break;
      } else if (!filter) {
        if (Array.isArray(currentNode[childrenListKey])) {
          argsMap.set(currentNode, forChildrenArgs);
          for (let i = 0; i < currentNode[childrenListKey].length; i++) {
            currentNode[childrenListKey][i][parentKey] = currentNode;
            notComplete.push(currentNode[childrenListKey][i]);
          }
        }
      }
    } while (notComplete.length);
    for (let i = 0; i < completed.length; i++) {
      if (Reflect.has(completed[i], parentKey)) {
        Reflect.deleteProperty(completed[i], parentKey);
      }
      Reflect.deleteProperty(completed[i], indexKey);
      Reflect.deleteProperty(completed[i], levelKey);
    }
  };
  if (Array.isArray(sourceTree)) {
    for (let i = 0; i < sourceTree.length; i++) {
      runTreeDataFunction(sourceTree[i], i);
      if (stopRun) {
        break;
      }
    }
  } else if (sourceTree) {
    runTreeDataFunction(sourceTree, 0);
  }
  for (const nodeRegisterDoneCallBack of allDoneCallBack) {
    nodeRegisterDoneCallBack();
  }
  typeof runCompleteHandler === 'function' && runCompleteHandler();
};

export function createTree(sourceTree, createNodeFn) {
  const targetTree = [];
  const nodeHandler = ({ currentNode, parent, index, level, dataFromParentLevel }) => {
    const targetNode = createNodeFn({
      sourceNode,
      sourceParent,
      parent: dataFromParentLevel?.parent,
      index,
      level,
    });
    if (!sourceParent) {
      targetTree.push(targetNode);
    } else {
      dataFromParentLevel.parent.children.push(targetNode);
    }
    return {
      forChildrenData: {
        parent: targetNode,
      },
    };
  };
  runTreeData({ sourceTree, nodeHandler });
  return targetTree;
}
