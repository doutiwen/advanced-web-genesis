export const basicRoutes = [
  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    component: () => import('../modules/404/index.vue'),
  },
  {
    path: '/login',
    name: 'login',
    alias: '/',
    component: () => import('../modules/login/index.vue'),
  },
];
