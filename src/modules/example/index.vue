<template>
  <AdvRecordsManager
    :toolBarConfig="toolBarConfig"
    :recordListConfig="recordListConfig"
    :modalConfig="modalList"
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
    <!-- <template #modal-modalKey="{data, closeModal, setFormRef}">内容</template> -->
  </AdvRecordsManager>
</template>
<script setup>
  const TRMref = ref();

  const toolBarConfig = {
    list: [
      {
        key: 'add',
        type: 'openModal',
        text: '新增',
        attrs: {
          type: 'primary',
          style: {
            'background-color': 'rgba(245, 154, 35, 1)',
            'border-color': 'rgba(245, 154, 35, 1)',
          },
        },
        events: {},
        inRight: true,
      },
      {
        key: 'batchExport',
        text: '批量导出',
        type: 'batch',
        attrs: {
          type: 'primary',
        },
        ok: {
          text: '导出',
          fn(selectedRows) {
            console.log('批量导出数据', selectedRows);
          },
        },
        cancel: {
          text: '取消',
        },
        inRight: true,
      },
      {
        key: 'batchDel',
        text: '批量删除',
        type: 'batch',
        attrs: {
          type: 'primary',
        },
        ok: {
          text: '删除',
          fn(selectedRows) {
            console.log('批量删除数据', selectedRows);
          },
        },
        cancel: {
          text: '取消',
        },
        inRight: true,
      },
      {
        key: 'title',
        placeholder: '搜索标题',
        type: 'input',
        inRight: true,
      },
      {
        key: 'level',
        placeholder: '等级',
        type: 'select',
        inRight: true,
        async options() {
          const res = await openApi({ api: 'example/getLevel' });
          return res.data;
        },
        attrs: {
          style: 'width:180px',
        },
      },
      {
        key: 'search',
        type: 'searchButton',
        inRight: true,
        text: '搜索',
      },
    ],
    //batchFixed: true, //处于固定勾选状态，此时没有batchOkText、batchCancelText、batchOkFn配置项目，只能通过getCurrentBatchSelectList方法来获取选中项
  };
  const recordListConfig = {
    attrs: {
      scroll: {
        scrollToFirstRowOnChange: true,
        //x: 2000,
        y: '58vh',
      },
    },
    events: {},
    rowKeyName: 'id',
    //formItemActive: true,
    columnsConfig: [
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
        attrs: {
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
        attrs: {
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
          attrs: {
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
          attrs: {
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
      {
        title: '操作',
        key: 'operater',
        type: 'operater',
        width: '12',
        fixed: 'right',
        list: [
          {
            key: 'dispatchWorkers',
            type: 'openModal',
            text: '派工',
            show: "flowStatus==='待派工'",
          },
          {
            key: 'rectify',
            type: 'openModal',
            text: '整改',
            show: "flowStatus==='待整改'",
          },
          {
            key: 'del',
            type: 'confirm',
            text: '删除',
            confirm: {
              async fn(rowData) {
                console.log('删除', rowData);
                const refreshTable = false;
                return refreshTable;
              },
            },
            cancel: {
              text: '取消1',
              fn(rowData) {},
            },
            buttonAttrs: {
              type: 'danger',
            },
            attrs: {},
          },
          {
            key: 'formItemOperater',
            type: 'formItemOperater',
            text: '编辑行内状态',
            async fn(rowData) {
              console.log('表格行内表单保存', rowData);
              return false;
            },
          },
        ],
      },
    ],
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
    showPagination: true,
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
            // show: "checkDepartment!='2'", //表单项显示条件的三种写法
            // show: 'checkDepartment',
            // show: {
            //   watchKeys: ['checkDepartment'],
            //   handle({ checkDepartment }) {
            //     return checkDepartment !== '2';
            //   },
            // },
          },
          {
            key: 'checkLocation',
            type: 'input',
            label: '检查地点',
            validate: {
              watch: {
                keys: ['department'],
                handle({ department }) {
                  if (department === '1') {
                    return [{ type: 'number' }];
                  } else {
                    return [{ type: 'required' }, { type: 'peopleIdNum' }];
                  }
                },
              },
            },
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
            options: {
              watchKeys: ['department'],
              async handle({ department }) {
                if (department === '1') {
                  const res = await openApi({ api: 'example/getLevel' });
                  return res.data;
                } else {
                  const res = await asyncDictionaryManager.getData('hazardCategory');
                  return res.data;
                }
              },
            },
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
</style>
