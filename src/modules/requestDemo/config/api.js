//api 能力示例模块的接口配置：覆盖地址写法、请求方法、响应形态、三级处理链、字典、发送器选择
const requestDemoApi = {
  //基础：只声明地址与方法
  getList: {
    url: '/api/requestDemo/getList',
    method: 'get',
  },
  saveData: {
    url: '/api/requestDemo/saveData',
    method: 'post',
  },
  updateData: {
    url: '/api/requestDemo/updateData',
    method: 'put',
  },
  removeData: {
    url: '/api/requestDemo/removeData',
    method: 'delete',
  },
  //upload 是伪方法：请求体会被转成 FormData，实际发的是 post
  uploadFile: {
    url: '/api/requestDemo/uploadFile',
    method: 'upload',
  },

  //地址写法二：函数，接收 otherData（调用时传的数组）
  urlByFunction: {
    url: (otherData) => `/api/requestDemo/detail/${otherData?.[0] ?? ''}`,
    method: 'get',
  },
  //地址写法三：模板字符串，${0} 由 otherData[0] 填充
  urlByTemplate: {
    url: '/api/requestDemo/detail/${0}/sub/${1}',
    method: 'get',
  },

  //响应形态：文本 / 二进制 / 文件下载 / 流式
  getText: {
    url: '/api/requestDemo/text',
    method: 'get',
    responseType: 'text',
  },
  getBinary: {
    url: '/api/requestDemo/binary',
    method: 'get',
    responseType: 'arraybuffer',
  },
  //download 与 responseType 分开声明：前者控制副作用，后者控制数据形态
  downloadFile: {
    url: '/api/requestDemo/download',
    method: 'get',
    responseType: 'blob',
    download: true,
  },
  streamText: {
    url: '/api/requestDemo/streamText',
    method: 'get',
    responseType: 'stream',
  },
  streamSse: {
    url: '/api/requestDemo/streamSse',
    method: 'post',
    responseType: 'stream',
  },

  //三级处理链：接口层自定义转换与回调
  hookDemo: {
    url: '/api/requestDemo/hook',
    method: 'get',
    resTransform(sourceRes, defaultRes) {
      return { ...defaultRes, fromApiTransform: true };
    },
    success(response, next) {
      console.log('[接口层 success] fromApiTransform =', response.fromApiTransform);
      next();
    },
    fail(error, next) {
      console.log('[接口层 fail]', error?.msg);
      next();
    },
    final() {
      console.log('[接口层 final]');
    },
  },
  //业务失败示例：mock 里配置 success: false
  failDemo: {
    url: '/api/requestDemo/fail',
    method: 'get',
  },

  //字典接口：首次请求后进缓存，后续调用直接取缓存
  getLevel: {
    url: '/api/requestDemo/level',
    method: 'get',
    isDict: true,
  },

  //接口级请求配置：与全局默认配置深度合并
  withRequestConfig: {
    url: '/api/requestDemo/config',
    method: 'get',
    requestConfig: {
      headers: { 'X-Api-Demo': 'from-api-config' },
    },
  },

  //发送器选择：显式指定 fetch（不写则用全局默认的 axios）
  byFetchSender: {
    url: '/api/requestDemo/fetch',
    method: 'get',
    sender: 'fetch',
  },
};

export default requestDemoApi;
