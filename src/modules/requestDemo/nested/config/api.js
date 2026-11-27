//多级模块路径示例：目录层级即模块路径，调用时是 openApi.requestDemo.nested.echo()
//本目录没有入口文件，不会生成路由
const requestDemoNestedApi = {
  echo: {
    url: '/api/requestDemo/nested/echo',
    method: 'get',
  },
};

export default requestDemoNestedApi;
