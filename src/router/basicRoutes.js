export const basicRoutes = [
  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    component: () => import('../modules/404/index.vue'),
  },
];
