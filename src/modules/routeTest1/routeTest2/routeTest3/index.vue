<template>
  <RouterView></RouterView>
  <div>嵌套路由第三级</div>
  <el-button type="primary" @click="handler">请求接口</el-button>
  <div>{{ data }}</div>
</template>
<script setup>
  const data = shallowRef();
  const handler = () => {
    openApi({
      api: 'routeTest1/routeTest2/routeTest3/getList',
      params: {
        page: 1,
        pageSize: 10,
      },
    }).then((res) => {
      data.value = res.data;
    });
  };
</script>
