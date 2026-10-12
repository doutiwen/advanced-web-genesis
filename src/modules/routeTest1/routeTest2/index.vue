<template>
  <div>嵌套路由第二级</div>
  <RouterLink :to="{ name: 'routeTest1RouteTest2RouteTest3' }">去第三级</RouterLink>
  <RouterView></RouterView>
</template>
