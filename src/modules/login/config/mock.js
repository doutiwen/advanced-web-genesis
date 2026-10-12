// 扫描所有模块的视图文件，用于生成权限列表（排除 config、common、login、404 目录）
const sourceUserPermissionList = import.meta.glob([
  '../../../modules/**/*.{vue,jsx,tsx}',
  '!../../../modules/**/config/**',
  '!../../../modules/**/common/**',
  '!../../../modules/{login,404}/**',
]);

const loginMock = {
  // 登录接口 mock 数据
  login: {
    resData() {
      // 根据扫描到的模块文件路径生成权限映射表
      const permission = {};
      Object.keys(sourceUserPermissionList).forEach((path) => {
        const modulePath = path
          .replace(/^(\.\.\/){2}|\.(vue|jsx|tsx)$/g, '')
          .replace(/\/index/g, '');
        permission[modulePath] = {
          buttons: [],
          recordList: [],
          form: [],
          other: [],
        };
        // example 模块默认赋予增删改查等按钮权限
        if (modulePath === 'example') {
          permission[modulePath].buttons.push('add', 'batchExport', 'dispatchWorkers', 'rectify');
        }
      });

      return {
        id: '1',
        userName: 'admin',
        token: 'token',
        expire: '1h',
        permission,
      };
    },
  },
};

export default loginMock;
