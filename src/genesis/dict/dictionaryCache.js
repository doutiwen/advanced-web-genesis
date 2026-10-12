//字典数据缓存
class DictionaryCache {
  constructor() {
    this.dictionaryMap = new Map();
  }

  has(dictName) {
    return this.dictionaryMap.has(dictName);
  }

  createDictItem(dictionaryConfig) {
    this.dictionaryMap.set(dictionaryConfig.name, {
      name: dictionaryConfig.name,
      getData: dictionaryConfig.getData,
      set: dictionaryConfig.set,
      sourceData: null,
      data: null,
      status: 'noData', //noData,loading,hasData
      dataGetPromise: null,
      dataGetResolve: null,
    });
  }

  async getData(name, callback) {
    if (this.dictionaryMap.has(name)) {
      const targetDictionaryInfo = this.dictionaryMap.get(name);
      switch (targetDictionaryInfo.status) {
        case 'noData': {
          targetDictionaryInfo.status = 'loading';
          targetDictionaryInfo.dataGetPromise = new Promise((resolve, reject) => {
            targetDictionaryInfo.dataGetResolve = resolve;
          });
          targetDictionaryInfo.sourceData = await targetDictionaryInfo.getData();
          if (targetDictionaryInfo.set) {
            targetDictionaryInfo.data = targetDictionaryInfo.set(targetDictionaryInfo.sourceData);
          } else {
            targetDictionaryInfo.data = targetDictionaryInfo.sourceData;
          }
          targetDictionaryInfo.status = 'hasData';
          targetDictionaryInfo.dataGetResolve();
          targetDictionaryInfo.callback && targetDictionaryInfo.callback(targetDictionaryInfo.data);
          break;
        }
        case 'loading': {
          await targetDictionaryInfo.dataGetPromise;
          break;
        }
      }
      callback && callback(targetDictionaryInfo.data);
      return targetDictionaryInfo.data;
    } else {
      return null;
    }
  }
  getDataSync(dictionaryName) {
    if (this.dictionaryMap.has(dictionaryName)) {
      const targetDictionaryInfo = this.dictionaryMap.get(dictionaryName);
      if (targetDictionaryInfo.data) {
        return targetDictionaryInfo.data;
      } else {
        return null;
      }
    }
  }
  getLabel(dictName, value) {
    const data = this.getDataSync(dictName);
    if (data && Array.isArray(data)) {
      const item = data.find((i) => i.value == value);
      return item ? item.label : '';
    }
    return '';
  }
  getValue(dictName, label) {
    const data = this.getDataSync(dictName);
    if (data && Array.isArray(data)) {
      const item = data.find((i) => i.label == label);
      return item ? item.value : '';
    }
    return '';
  }
  getSourceDataSync = (name) => {
    if (this.dictionaryMap.has(name) && this.dictionaryMap.get(name).sourceData) {
      return this.dictionaryMap.get(name).sourceData;
    } else {
      return null;
    }
  };
  transformSetData = (name, data) => {
    if (this.dictionaryMap.has(name)) {
      const targetDictionaryInfo = this.dictionaryMap.get(name);
      if (targetDictionaryInfo.set) {
        return targetDictionaryInfo.set(data);
      } else {
        return data;
      }
    } else {
      return null;
    }
  };

  /**
   * 刷新指定字典缓存：将状态重置为 noData，下次调用 getData 时会重新请求接口
   * @param {string} name - 字典名称
   */
  refreshData(name) {
    if (this.dictionaryMap.has(name)) {
      const targetDictionaryInfo = this.dictionaryMap.get(name);
      targetDictionaryInfo.status = 'noData';
      targetDictionaryInfo.data = null;
      targetDictionaryInfo.sourceData = null;
    }
  }
}

// 导出单例缓存实例（全局共享，异步字典在 async.js 模块加载时注册）
export default new DictionaryCache();
