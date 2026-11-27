import Mock from 'mockjs';
import { getVarType, notEmptyValue } from '../../core/utils.js';

//mock 扩展：把接口配置里的同名 mock 配置转成模拟响应
//发送器契约与 core/senders 一致：({ apiDesc, requestConfig }) => Promise<responseLike>
//带 query: '?url' 才会拿到静态资源地址，否则拿到的是模块加载函数
const mockFilePathInfo = import.meta.glob('./file/*', {
  eager: true,
  query: '?url',
  import: 'default',
});
const mockFileNameToPathMap = new Map();
for (const [path, fileUrl] of Object.entries(mockFilePathInfo)) {
  const name = path.replace(/^.+\.(\w+)$/g, '$1');
  mockFileNameToPathMap.set(name, fileUrl);
}

const apiMockSettingFilePathInfo = import.meta.glob('../../../modules/**/**/config/mock.js', {
  import: 'default',
});

const getMockResJsonData = (reqData, mockSetting, isSuccess, msg) => {
  const mockData = {};
  const resJsonData = {
    isSuccess: !!isSuccess,
    code: 200,
    message: msg ? msg : isSuccess ? '操作成功' : '操作失败',
    data: null,
  };
  if (isSuccess) {
    if (mockSetting?.mockJsConfig) {
      const mockJsCfg = mockSetting.mockJsConfig;
      if (mockJsCfg?.random) {
        for (const [randomName, randomSetting] of Object.entries(mockJsCfg.random)) {
          if (randomSetting) {
            Mock.Random[randomName](randomSetting);
          } else {
            Mock.Random[randomName]();
          }
        }
      }
      if (getVarType(mockJsCfg.mockFnArgs) === 'function') {
        resJsonData.data = Mock.mock(mockJsCfg.mockFnArgs(reqData));
      } else if (getVarType(mockJsCfg.mockFnArgs) === 'object') {
        resJsonData.data = Mock.mock(mockJsCfg.mockFnArgs);
      }
    } else if (mockSetting?.resData) {
      if (getVarType(mockSetting.resData) === 'function') {
        resJsonData.data = mockSetting.resData(reqData);
      } else if (getVarType(mockSetting.resData) === 'object') {
        resJsonData.data = JSON.parse(JSON.stringify(mockSetting.resData));
      } else if (getVarType(mockSetting.resData) === 'array') {
        resJsonData.data = [...mockSetting.resData];
      } else {
        resJsonData.data = mockSetting.resData;
      }
    }
  }
  return resJsonData;
};

//请求参数验证（仅验证数据类型和必填项）
const requestParamsValidate = (validateRuleInfo, requestConfig) => {
  let isPass = true;
  const requireErrorName = [],
    typeErrorName = [],
    params =
      requestConfig.method === 'get' ? requestConfig.params : requestConfig.data;
  for (const [key, rule] of Object.entries(validateRuleInfo)) {
    if (rule.require === true) {
      if (!notEmptyValue(params?.[key])) {
        isPass = false;
        requireErrorName.push(key);
      }
    }
    if (typeof rule.type === 'string') {
      const typeList = rule.type.split('|');
      if (typeList.length === 1 && typeList[0] === '') {
        typeList[0] = 'string';
      }
      if (params?.[key] && !typeList.includes(getVarType(params?.[key]))) {
        isPass = false;
        typeErrorName.push(key);
      }
    }
  }
  let msg = `${requireErrorName.length ? `${requireErrorName.join('、')}为必传项,` : ''}${
    typeErrorName.length ? `${typeErrorName.join('、')}类型错误` : ''
  }`;
  msg = msg.replace(/,$/g, '');
  return {
    isPass,
    msg,
  };
};

//上传文件类型简单验证
const uploadFileTypeValidate = (uploadFileTypes, selectedFileType) => {
  const fileMIMEs = [];
  for (const uploadFileType of uploadFileTypes) {
    switch (uploadFileType) {
      case 'img': {
        fileMIMEs.push(...['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
        break;
      }
      case 'word': {
        fileMIMEs.push(
          ...[
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ]
        );
        break;
      }
      case 'excel': {
        fileMIMEs.push(
          ...[
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ]
        );
        break;
      }
      case 'ppt': {
        fileMIMEs.push(
          ...[
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          ]
        );
        break;
      }
      case 'txt': {
        fileMIMEs.push('text/plain');
        break;
      }
      case 'pdf': {
        fileMIMEs.push('application/pdf');
        break;
      }
      case 'zip': {
        fileMIMEs.push('application/zip');
        break;
      }
    }
  }
  return fileMIMEs.includes(selectedFileType);
};

const mockSend = async ({ apiDesc, requestConfig }) => {
  const apiMockSettingFileFullPath = `../../../modules/${apiDesc.modulePath}/config/mock.js`;
  if (apiMockSettingFilePathInfo?.[apiMockSettingFileFullPath]) {
    const mockFileInfo = await apiMockSettingFilePathInfo[apiMockSettingFileFullPath]();
    const mockSetting = mockFileInfo?.[apiDesc.apiName];
    const sourceResponse = {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json',
      },
    };
    if (mockSetting) {
      let isSuccess = true,
        msg;
      if (mockSetting?.success === false) {
        isSuccess = false;
      } else if (mockSetting.validate) {
        const validateResult = requestParamsValidate(mockSetting.validate, requestConfig);
        if (!validateResult.isPass) {
          isSuccess = false;
          msg = validateResult.msg;
        }
      }

      const sourceRequestData =
        requestConfig.method === 'get' ? requestConfig.params : requestConfig.data;

      //响应形态归一：文件类响应由 responseType / download 声明，method 只表示请求动词
      const mockMethod =
        apiDesc.method === 'upload'
          ? 'upload'
          : apiDesc.download || ['blob', 'arraybuffer'].includes(apiDesc.responseType)
            ? 'download'
            : 'data';

      switch (mockMethod) {
        case 'upload': {
          const uploadFileTypes = [];
          if (getVarType(mockSetting?.fileType) === 'array') {
            uploadFileTypes.push(...mockSetting.fileType);
          } else if (getVarType(mockSetting?.fileType) === 'string') {
            uploadFileTypes.push(mockSetting.fileType);
          }
          if (uploadFileTypes.length) {
            let isSuccess = true,
              msg = '上传文件类型错误：';
            for (const [key, val] of requestConfig.data.entries()) {
              if (getVarType(val) === 'file') {
                if (!uploadFileTypeValidate(uploadFileTypes, val)) {
                  isSuccess = false;
                  msg += `${key},`;
                }
              }
            }
            msg = msg.replace(/,$/g, '');
            if (!isSuccess) {
              sourceResponse.data = {
                isSuccess: false,
                code: 200,
                message: msg,
                data: {},
              };
            }
          } else {
            sourceResponse.data = getMockResJsonData(
              sourceRequestData,
              mockSetting,
              isSuccess,
              msg
            );
          }
          break;
        }
        case 'download': {
          const mockFilePath = mockFileNameToPathMap.get(mockSetting.fileType);

          if (!mockFilePath) {
            isSuccess = false;
          }
          if (isSuccess) {
            sourceResponse.headers['content-type'] = 'application/octet-stream';
            sourceResponse.headers['content-disposition'] =
              `attachment;filename="mock文件.${mockSetting.fileType}"`;
            const mockFile = await fetch(mockFilePath);
            const mockFileBlobData = await mockFile.blob();
            sourceResponse.data = mockFileBlobData;
          } else {
            sourceResponse.data = getMockResJsonData(
              sourceRequestData,
              mockSetting,
              isSuccess,
              msg
            );
          }
          break;
        }
        default: {
          sourceResponse.data = getMockResJsonData(sourceRequestData, mockSetting, isSuccess, msg);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return Promise.resolve(sourceResponse);
  } else {
    return Promise.reject();
  }
};

/**
 * 创建 mock 发送器
 * @returns {Function} 与 core 发送器契约一致的函数
 */
const createMockRequest = () => mockSend;

export default createMockRequest;
