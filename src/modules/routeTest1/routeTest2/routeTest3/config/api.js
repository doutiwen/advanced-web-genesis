const routeTest3Api = {
  getList: {
    url: 'api/routeTest3Api/get',
    method: 'get',
    mock: {
      validate: {
        page: {
          require: true,
        },
        pageSize: {
          require: true,
        },
      },
      mockJsConfig: {
        mockFnArgs({ page, pageSize }) {
          return {
            [`list|${pageSize}`]: [
              { 'id|+1': 1, 'title|1-4': '标题', time: '@date', 'active|1': true },
            ],
            total: Math.ceil(pageSize * 7.8),
          };
        },
      },
    },
    isDict: true,
  },
  downFile: {
    url: 'api/routeTest3Api/downFile',
    method: 'download',
    mock: {
      fileType: 'txt',
    },
  },
};

export default routeTest3Api;
