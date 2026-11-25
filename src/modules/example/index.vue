<template>
  <AdvRecordsManager
    :config="config"
    v-model:pageNum="pageNum"
    v-model:pageSize="pageSize"
    v-model:total="total"
    ref="TRMref"
  >
    <template #recordListColumn-content="{ rowData, colData }">
      custom-内容-{{ `${rowData.id}.${colData}` }}
    </template>
    <template #recordListColumn-level="{ rowData, colData }">
      <template v-if="colData == '一级'">
        <el-text type="success">{{ colData }}</el-text>
      </template>
      <template v-else-if="colData == '二级'">
        <el-text type="warning">{{ colData }}</el-text>
      </template>
    </template>
  </AdvRecordsManager>
  <!-- 分页器按实际布局放置，与组件通过双向绑定对接 -->
  <div class="example_pagination">
    <el-pagination
      v-model:current-page="pageNum"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      layout="total, sizes, prev, pager, next, jumper"
    />
  </div>
</template>
<script setup>
  const TRMref = ref();
  // 分页状态与组件双向绑定
  const pageNum = ref(1);
  const pageSize = ref(20);
  const total = ref(0);

  const toolBarConfig = {
    layout: 'inline',
    items: [
      {
        key: 'add',
        type: 'button',
        text: '新增',
        UiProps: {
          type: 'primary',
          style: {
            'background-color': 'rgba(245, 154, 35, 1)',
            'border-color': 'rgba(245, 154, 35, 1)',
          },
        },
        UiEvents: {},
        inline: 'right',
        // 按钮自带弹窗
        modal: {
          key: 'add',
          type: 'dialog',
          title: '新增',
          fullscreen: true,
          form: {
            list: [
              {
                key: 'department',
                type: 'select',
                label: '检查部门',
                async options() {
                  const res = await openApi({ api: 'example/getDepartment' });
                  return res.data;
                },
                validate: [{ type: 'required' }],
                attrs: { showSearch: true },
              },
              {
                key: 'checkLocation',
                type: 'input',
                label: '检查地点',
                validate: [{ type: 'required' }],
              },
              {
                key: 'hazardContent',
                type: 'textarea',
                label: '隐患内容',
                attrs: { showCount: true },
                validate: [{ type: 'required' }],
              },
              {
                key: 'hazardLevel',
                type: 'select',
                label: '隐患级别',
                async options() {
                  const res = await openApi({ api: 'example/getLevel' });
                  return res.data;
                },
                validate: [{ type: 'required' }],
              },
              {
                key: 'remark',
                type: 'textarea',
                label: '备注',
                attrs: { showCount: true },
                set(sourceValue) {
                  return `set-${sourceValue}`;
                },
                get(sourceValue) {
                  return `get-${sourceValue}`;
                },
              },
            ],
            attrs: { style: 'width:600px' },
            UIformItemAttrs: { labelCol: { span: 6, offset: 1 } },
          },
          async getBindData() {
            // 模拟异步取数
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return {
              department: '1',
              checkLocation: '地点34',
              hazardContent: '隐患内容玻璃',
              hazardLevel: '2',
              remark: '备注一下',
            };
          },
          okButton: {
            text: '保存新增',
            async onClick(modalBindData, formData) {
              console.log('新增保存', modalBindData, formData);
              return { close: true, reloadList: false };
            },
          },
          cancelButton: {
            text: '取消新增',
            onClick(modalBindData) {
              console.log('取消新增', modalBindData);
              return { close: true };
            },
          },
        },
      },
      {
        key: 'exportSelected',
        text: '批量导出',
        type: 'enterSelectMode',
        UiProps: {
          type: 'primary',
        },
        ok: {
          text: '导出',
          onClick(selectedRows) {
            console.log('批量导出数据', selectedRows);
          },
        },
        cancel: {
          text: '取消',
        },
        inline: 'right',
      },
      {
        key: 'deleteSelected',
        text: '批量删除',
        type: 'enterSelectMode',
        UiProps: {
          type: 'primary',
        },
        ok: {
          text: '删除',
          onClick(selectedRows) {
            console.log('批量删除数据', selectedRows);
          },
        },
        cancel: {
          text: '取消',
        },
        inline: 'right',
      },
      {
        key: 'title',
        placeholder: '搜索标题',
        type: 'input',
        inline: 'right',
      },
      {
        key: 'level',
        placeholder: '等级',
        type: 'select',
        inline: 'right',
        async options() {
          const res = await openApi({ api: 'example/getLevel' });
          return res.data;
        },
        UiProps: {
          style: 'width:180px',
        },
      },
      {
        key: 'search',
        type: 'searchButton',
        inline: 'right',
        text: '搜索',
      },
    ],
  };
  const recordListConfig = {
    UiProps: {
      scroll: {
        scrollToFirstRowOnChange: true,
        //x: 2000,
        y: '58vh',
      },
    },
    UiEvents: {},
    rowKeyName: 'id',
    //formItemActive: true,
    cols: [
      {
        title: '序号',
        type: 'index',
        key: 'index',
        width: '6',
      },
      {
        title: '名称',
        key: 'name',
        width: '13',
        UiProps: {
          sortable: 'custom',
        },
      },
      {
        title: '部门',
        key: 'department',
        width: '13',
        get(sourceData) {
          return `公司-${sourceData}`;
        },
        async getFilterList() {
          const res = await openApi({ api: 'example/getDepartment' });
          return res.data;
        },
      },
      {
        title: '内容',
        key: 'content',
        width: '13',
        type: 'custom',
        UiProps: {
          sortable: true,
        },
      },
      {
        title: '级别',
        key: 'level',
        width: '10',
        async getFilterList() {
          const res = await openApi({ api: 'example/getLevel' });
          return res.data;
        },
        type: 'custom',
      },
      {
        title: '流程状态',
        key: 'flowStatus',
        width: '14%',
        type: 'formItem',
        formItemConfig: {
          type: 'input',
          UiProps: {
            style: 'width:180px',
          },
        },
        async fn(rowData) {
          console.log('流程状态保存', rowData);
          return false;
        },
      },
      {
        title: '启用状态',
        key: 'status',
        type: 'formItem',
        formItemConfig: {
          type: 'switch',
          UiProps: {
            checkedValue: '0',
            checkedChildren: '启用',
            unCheckedValue: '1',
            unCheckedChildren: '停用',
          },
        },
        debounce: 500,
        async fn(rowData) {
          console.log('启用状态保存', rowData);
          return false;
        },
        width: '10',
      },
    ],
    // 操作列由 operater 独立配置，按钮列表使用 buttons
    operater: {
      title: '操作',
      key: 'operater',
      width: '12',
      fixed: 'right',
      buttons: [
        {
          key: 'dispatchWorkers',
          type: 'button',
          text: '派工',
          show: "flowStatus==='待派工'",
          // 行数据通过 modalPayload 自动传入，getBindData 接收该数据
          modal: {
            key: 'dispatchWorkers',
            type: 'dialog',
            title: '派工',
            form: {
              list: [
                {
                  key: 'rectificationDeadline',
                  type: 'date',
                  label: '整改期限',
                  validate: [{ type: 'required' }],
                },
                {
                  key: 'remark',
                  type: 'textarea',
                  label: '备注',
                  attrs: { showCount: true },
                  set(sourceValue) {
                    return `set-${sourceValue}`;
                  },
                  get(setterValue) {
                    return `get-${setterValue.replace(/^set-([\w\u4e00-\u9fa5]+)$/g, '$1')}`;
                  },
                },
              ],
              attrs: { style: 'width:600px' },
              UIformItemAttrs: { labelCol: { span: 6, offset: 1 } },
              events: {
                validateSuccess(formData) {
                  console.log('表单数据', formData);
                },
              },
            },
            async getBindData(rowData) {
              console.log('派工载入行数据', rowData);
              return { rectificationDeadline: '2025-02-02', remark: '备注一下' };
            },
            okButton: {
              text: '确定派工',
              async onClick(rowData, formData) {
                console.log('派工保存', rowData, formData);
                return { close: true, reloadList: false };
              },
            },
          },
        },
        {
          key: 'rectify',
          type: 'button',
          text: '整改',
          show: "flowStatus==='待整改'",
          modal: {
            key: 'rectify',
            type: 'dialog',
            title: '整改',
          },
        },
        {
          key: 'del',
          type: 'button',
          text: '删除',
          confirm: {
            notice: '是否确认删除该条数据？',
            okText: '确认',
            cancelText: '取消1',
            onCancel: (rowData) => {
              console.log('取消删除', rowData);
            },
          },
          async onClick(rowData) {
            console.log('删除', rowData);
          },
          buttonAttrs: {
            type: 'danger',
          },
          UiProps: {},
        },
        {
          key: 'formItemOperater',
          type: 'formItemOperater',
          text: '编辑行内状态',
          async onClick(rowData) {
            console.log('表格行内表单保存', rowData);
            return false;
          },
        },
      ],
    },
    async getList({
      pageParams,
      searchParams,
      sorterParams,
      filterParams,
      otherParams,
      customParams,
    }) {
      console.log(
        '获取列表方法参数',
        pageParams,
        searchParams,
        sorterParams,
        filterParams,
        otherParams,
        customParams
      );
      const res = await openApi({
        api: 'example/getList',
        params: {
          pageNum: pageParams.pageNum,
          pageSize: pageParams.pageSize,
        },
      });
      return res.data;
    },
  };

  /**
   * 记录管理器合并配置：toolBar 为工具栏配置，其余字段为列表配置
   */
  const config = {
    toolBar: toolBarConfig,
    ...recordListConfig,
  };

  const modalList = [
    {
      key: 'add',
      title: '新增',
      fullScreen: true,
      okButton: {
        text: '保存新增',
        async fn(modalData, formData) {
          let rs;
          setTimeout(() => {
            rs();
          }, 2000);
          console.log('新增保存', modalData, formData);
          await new Promise((res) => {
            rs = res;
          });
          return {
            close: true,
            refreshTable: false,
          };
        },
      },
      cancelButton: {
        text: '取消新增',
        fn(modalData) {
          console.log('取消新增', modalData);
          return {
            close: true,
          };
        },
      },
      async getDataFn(data) {
        let rs;
        let formData = {};
        setTimeout(() => {
          formData = {
            checkCategory: '2',
            checkDepartment: '1',
            checkLocation: '地点34',
            hazardContent: '隐患内容玻璃',
            hazardLevel: '2',
            hazardCategory: '3',
            rectificationDeadline: '2025-01-01',
            remark: '备注一下',
          };
          rs();
        }, 2000);
        await new Promise((resolve) => {
          rs = resolve;
        });
        return formData;
      },
      form: {
        list: [
          {
            key: 'department',
            type: 'select',
            label: '检查部门',
            async options() {
              const res = await openApi({ api: 'example/getDepartment' });
              return res.data;
            },
            validate: [{ type: 'required' }],
            attrs: {
              showSearch: true,
              filterOption: (input, option) => {
                return option.label.includes(input);
              },
            },
            // 表单项显隐联动：watch 数组写法
            // watch: [
            //   { on: ['checkDepartment'], show: ({ checkDepartment }) => checkDepartment !== '2' },
            // ],
          },
          {
            key: 'checkLocation',
            type: 'input',
            label: '检查地点',
            watch: [
              {
                on: ['department'],
                validate: ({ department }) => {
                  if (department === '1') {
                    return [{ type: 'number' }];
                  } else {
                    return [{ type: 'required' }, { type: 'peopleIdNum' }];
                  }
                },
              },
            ],
          },
          {
            key: 'hazardContent',
            type: 'textarea',
            label: '隐患内容',
            attrs: {
              showCount: true,
            },
            validate: [{ type: 'required' }],
          },
          {
            key: 'hazardLevel',
            type: 'select',
            label: '隐患级别',
            watch: [
              {
                on: ['department'],
                options: async ({ department }) => {
                  if (department === '1') {
                    const res = await openApi({ api: 'example/getLevel' });
                    return res.data;
                  } else {
                    const res = await asyncDictionaryManager.getData('hazardCategory');
                    return res.data;
                  }
                },
              },
            ],
            validate: [{ type: 'required' }],
          },
          {
            key: 'remark',
            type: 'textarea',
            label: '备注',
            attrs: {
              showCount: true,
            },
            set(sourceValue) {
              return `set-${sourceValue}`;
            },
            get(sourceValue) {
              return `get-${sourceValue}`;
            },
          },
        ],
        attrs: {
          style: 'width:600px',
        },
        UIformItemAttrs: {
          labelCol: {
            span: 6,
            offset: 1,
          },
        },
      },
    },
    {
      key: 'dispatchWorkers',
      title: '派工',
      async getDataFn(rowData) {
        let rs;
        let formData = {};
        setTimeout(() => {
          formData = {
            rectificationDeadline: '2025-02-02',
            remark: '备注一下',
          };
          rs();
        }, 2000);
        await new Promise((resolve) => {
          rs = resolve;
        });
        return formData;
      },
      form: {
        list: [
          {
            key: 'rectificationDeadline',
            type: 'date',
            label: '整改期限',
            validate: [{ type: 'required' }],
          },
          {
            key: 'remark',
            type: 'textarea',
            label: '备注',
            attrs: {
              showCount: true,
            },
            set(sourceValue) {
              return `set-${sourceValue}`;
            },
            //get方法的参数为set方法的返回值
            get(setterValue) {
              return `get-${setterValue.replace(/^set-([\w\u4e00-\u9fa5]+)$/g, '$1')}`;
            },
          },
        ],
        attrs: {
          style: 'width:600px',
        },
        UIformItemAttrs: {
          labelCol: {
            span: 6,
            offset: 1,
          },
        },
        events: {
          validateSuccess(formData) {
            console.log('表单数据', formData);
          },
        },
      },
      okButton: {
        text: '确定派工',
        async fn(rowData, formData) {
          let rs;
          setTimeout(() => {
            rs();
          }, 2000);
          console.log('派工保存', rowData, formData);
          await new Promise((res) => {
            rs = res;
          });
          return {
            close: true,
            refreshTable: false,
          };
        },
      },
      attrs: {},
    },
    {
      key: 'rectify',
      attrs: {
        title: '整改',
      },
    },
  ];
</script>
<style lang="scss" scoped>
  .rectify_pic_list {
    display: flex;
  }
  .rectify_pic_list > li {
    width: 100px;
    height: 100px;
    border: 1px solid #999;
    padding: 5px;
    margin-right: 8px;
    margin-bottom: 8px;
    cursor: pointer;
  }
  .rectify_pic_list > li > img {
    display: block;
    width: 100%;
    height: 100%;
  }
  /* 外置分页器容器 */
  .example_pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }
</style>
