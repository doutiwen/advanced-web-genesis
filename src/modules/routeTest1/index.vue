<template>
  <div>嵌套路由第一级</div>
  <RouterLink :to="{ name: 'routeTest1RouteTest2' }">去第二级</RouterLink>
  <RouterView></RouterView>
</template>
