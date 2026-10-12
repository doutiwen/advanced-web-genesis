import requestCoreFn from 'request';
import { defaultResTransform, defaultAxiosConfig, defaultCallback } from '@/config.js';
import deepmerge from 'deepmerge';
import DictionaryCache from './dictionaryCache.js';

const apiPathToModuleInfo = import.meta.glob('../modules/**/**/config/api.js', {
  import: 'default',
});
const dictionaryCache = new DictionaryCache();

const createAxiosConfig = (apiDesc, params, data, otherData, customAxiosConfig) => {
  const axiosConfigSetFnList = [];
  if (typeof apiDesc?.axiosConfig === 'function') {
    axiosConfigSetFnList.push(apiDesc.axiosConfig);
  } else if (typeof apiDesc?.axiosConfig === 'object') {
    axiosConfigSetFnList.push((defaultAxiosConfig) =>
      deepmerge(defaultAxiosConfig, apiDesc.axiosConfig)
    );
  }
  if (customAxiosConfig) {
    axiosConfigSetFnList.push((defaultAxiosConfig, apiAxiosConfig) =>
      deepmerge(defaultAxiosConfig, apiAxiosConfig, customAxiosConfig)
    );
  }
  const axiosConfig = runProcess(defaultAxiosConfig, axiosConfigSetFnList);
  if (typeof apiDesc.url === 'function') {
    axiosConfig.url = apiDesc.url(otherData);
  } else if (apiDesc.url.includes('${')) {
    axiosConfig.url = new Function(`return \`${apiDesc.url}\``)(...otherData);
  } else {
    axiosConfig.url = apiDesc.url;
  }
  if (apiDesc.method !== 'upload') {
    if (typeof params === 'object') {
      axiosConfig.params = cleanObject(params);
    }
    if (typeof data === 'object') {
      axiosConfig.data = cleanObject(data);
    }
  }
  switch (apiDesc.method) {
    case 'get':
    case 'delete':
    case 'post':
    case 'put': {
      axiosConfig.method = apiDesc.method;
      break;
    }
    case 'upload': {
      axiosConfig.method = 'post';
      const formData = new FormData();
      cleanObject(data, (sourceValue, key) => {
        if (getVarType(sourceValue) === 'file') {
          const file = sourceValue;
          formData.append(key, file, file.name);
        } else if (getVarType(sourceValue) === 'fileList') {
          const fileList = sourceValue;
          for (const file of fileList) {
            formData.append(key, file, file.name);
          }
        } else {
          formData.append(key, sourceValue);
        }
      });
      axiosConfig.data = formData;
      break;
    }
    case 'download': {
      axiosConfig.method = 'get';
      axiosConfig.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      axiosConfig.responseType = 'blob';
      break;
    }
  }
  return axiosConfig;
};

const createRequest = async (apiDesc, params, data, otherData, customConfig) => {
  const axiosConfig = createAxiosConfig(apiDesc, params, data, otherData, customConfig);
  const resTransformList = [defaultResTransform];
  const successCallbackList = [defaultCallback.success];
  const failCallbackList = [defaultCallback.fail];
  const finalCallbackList = [defaultCallback.final];
  apiDesc.resTransform && resTransformList.push(apiDesc.resTransform);
  apiDesc.success && successCallbackList.push(apiDesc.success);
  apiDesc.fail && failCallbackList.push(apiDesc.fail);
  apiDesc.final && finalCallbackList.push(apiDesc.final);

  try {
    const sourceRes = await requestCoreFn({ apiDesc, axiosConfig });
    const res = runProcess(sourceRes, resTransformList);

    if (res.success) {
      if (apiDesc.method === 'download') {
        const filenameStarMatch =
          res[Symbol.for('source')].headers['content-disposition'].match(/filename="?([^";]+)"?/i);
        const fileName = decodeURIComponent(filenameStarMatch[1]);
        const blob = new Blob([res.data], {
          type: res[Symbol.for('source')].headers['content-type'],
        });
        const aLinkDocument = document.createElement('a');
        const downloadUrl = window.URL.createObjectURL(blob);
        aLinkDocument.href = downloadUrl;
        aLinkDocument.download = decodeURI(fileName);
        aLinkDocument.style.display = 'none';
        document.body.appendChild(aLinkDocument);
        aLinkDocument.click();
        aLinkDocument.parentNode.removeChild(aLinkDocument);
        window.URL.revokeObjectURL(downloadUrl);
      }
      execLastFunction(successCallbackList, res);
      return Promise.resolve(res);
    } else {
      execLastFunction(failCallbackList, res);
      return Promise.reject(res);
    }
  } catch (e) {
    execLastFunction(failCallbackList, e);
    return Promise.reject(e);
  } finally {
    execLastFunction(finalCallbackList);
  }
};

const openApi = async ({ api, params, data, otherData, customConfig }) => {
  const apiFullName = api;
  const apiModuleFullPath = `../modules/${apiFullName.replace(
    /^\/?([\w\\/]*)\/[\w&=\\?]+$/g,
    '$1'
  )}/config/api.js`;
  if (Reflect.has(apiPathToModuleInfo, apiModuleFullPath)) {
    const apiName = apiFullName.replace(/^\/?[\w\\/]*\/([\w]+)(\?[\w=&]+)?$/g, '$1');
    const apiModule = await apiPathToModuleInfo[apiModuleFullPath]();
    const apiDesc = {
      ...apiModule[apiName],
      modulePath: apiFullName.split('/').slice(0, -1).join('/'),
      apiName,
    };
    if (apiDesc.isDict) {
      if (dictionaryCache.has(apiFullName)) {
        return dictionaryCache.getData(apiFullName);
      } else {
        dictionaryCache.createDictItem({
          name: apiFullName,
          getData: () => createRequest(apiDesc, params, data, otherData, customConfig),
        });
        return dictionaryCache.getData(apiFullName);
      }
    } else {
      return createRequest(apiDesc, params, data, otherData, customConfig);
    }
  }
};

export { openApi };
