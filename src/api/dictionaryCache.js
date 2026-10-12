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
          targetDictionaryInfo.data = targetDictionaryInfo.sourceData;
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
}

export default DictionaryCache;
