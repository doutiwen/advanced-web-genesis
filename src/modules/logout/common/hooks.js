import dynamicRouterManager from '@/router';
import { useUserStore } from '@/store';

export const useLogout = () => {
  const advStorage = new AdvStorage();
  const userStore = useUserStore();
  userStore.delUser();
  dynamicRouterManager.router.push({ name: 'login' });
  dynamicRouterManager.removeDynamicRoutes();
  advStorage.del('userInfo');
};

export const useTokenExpire = (toRoute) => {
  const advStorage = new AdvStorage();
  const userStore = useUserStore();
  userStore.delUser();
  dynamicRouterManager.router.push({
    name: 'login',
    query: {
      ...(toRoute.name === 'home' ? {} : { loginBack: toRoute.name }),
      ...(toRoute.query || {}),
    },
  });
  dynamicRouterManager.removeDynamicRoutes();
  advStorage.del('userInfo');
};
