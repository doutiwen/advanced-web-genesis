const exampleApi = {
  add: {
    url: '/api/example/add',
    method: 'post',
  },
  getList: {
    url: '/api/example/getList',
    method: 'get',
    axiosConfig: { apiProp: 1 },
    resTransform(sourceRes, defaultRes) {
      const apiRes = { ...defaultRes, apiResProp: 1 };
      return apiRes;
    },
    success(response, defaultCallback) {
      console.log('api请求成功(api定义)：', response);
    },
    fail(error, defaultCallback) {
      console.log('api请求失败(api定义)：', error);
    },
    final(defaultCallback) {
      console.log('api请求结束(api定义)');
    },
  },
  getDetail: {
    url: '/api/example/getLevel',
    method: 'get',
  },
  getLevel: {
    url: '/api/example/getLevel',
    method: 'get',
    isDict: true,
  },
  getDepartment: {
    url: '/api/example/getDepartment',
    method: 'get',
    isDict: true,
  },
};

export default exampleApi;
