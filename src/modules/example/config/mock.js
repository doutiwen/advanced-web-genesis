const exampleMock = {
  add: {
    validate: {
      department: {
        required: true,
      },
    },
  },
  getList: {
    validate: {
      pageNum: {
        require: true,
        type: 'number',
      },
      pageSize: {
        require: true,
        type: 'number',
      },
    },
    mockJsConfig: {
      random: {
        date: 'yyyy-MM-dd',
      },
      mockFnArgs({ pageSize }) {
        return {
          [`list|${pageSize}`]: [
            {
              'id|+1': 1,
              'name|1-4': '标题',
              'department|1': ['部门1', '部门2'],
              'content|1-4': '内容',
              'level|1': ['一级', '二级'],
              'flowStatus|1': ['待派工', '待整改'],
              'status|1': ['1', '0'],
            },
          ],
          total: Math.ceil(pageSize * 7.8),
        };
      },
    },
  },
  getDetail: {},
  getLevel: {
    resData() {
      return [
        { label: '一级', value: '一级' },
        { label: '二级', value: '二级' },
      ];
    },
  },
  getDepartment: {
    resData() {
      return [
        { label: '公司-部门1', value: '部门1' },
        { label: '公司-部门2', value: '部门2' },
      ];
    },
  },
};

export default exampleMock;
