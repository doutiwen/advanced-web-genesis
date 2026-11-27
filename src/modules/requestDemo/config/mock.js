//api 能力示例模块的 mock 配置：key 必须与 config/api.js 里的接口名一致
const requestDemoMock = {
  getList: {
    mockJsConfig: {
      mockFnArgs({ pageSize = 5 }) {
        return {
          [`list|${pageSize}`]: [{ 'id|+1': 100, name: '@cname', time: '@date' }],
          total: 42,
        };
      },
    },
  },
  saveData: {
    resData: { saved: true, id: 1001 },
  },
  updateData: {
    resData: { updated: 1 },
  },
  removeData: {
    resData: { removed: 1 },
  },
  //上传：不声明 fileType 时会直接返回 JSON 结果
  uploadFile: {},
  urlByFunction: {
    resData: { route: 'url 由函数生成' },
  },
  urlByTemplate: {
    resData: { route: 'url 由模板字符串生成' },
  },
  getText: {
    resData: '这是一段纯文本响应',
  },
  getBinary: {
    resData: { note: 'mock 无法返回真正的 ArrayBuffer，真实接口下 data 为 ArrayBuffer' },
  },
  //文件下载：mock 会返回 file 目录下对应类型的文件与 content-disposition
  downloadFile: {
    fileType: 'txt',
  },
  streamText: {
    resData: { note: 'mock 模式不支持流式，会提示未拿到响应流' },
  },
  streamSse: {
    resData: { note: 'mock 模式不支持流式，会提示未拿到响应流' },
  },
  hookDemo: {
    resData: { hook: '接口层转换与回调已执行' },
  },
  //业务失败：isSuccess 为 false，会走 fail 分支
  failDemo: {
    success: false,
  },
  getLevel: {
    resData: () => [
      { label: '一级', value: '1' },
      { label: '二级', value: '2' },
    ],
  },
  withRequestConfig: {
    resData: { config: '接口级 requestConfig 已与全局默认合并' },
  },
  byFetchSender: {
    resData: { sender: 'fetch' },
  },
};

export default requestDemoMock;
