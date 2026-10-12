import { createRouter, createWebHistory } from 'vue-router';
import { useTokenExpire } from '@/modules/logout/common/hooks.js';
import { basicRoutes } from './basicRoutes.js';

const modulesInfo = import.meta.glob([
  '../modules/**/*.{vue,jsx,tsx}',
  '!../modules/**/common/**',
  '!../modules/**/config/**',
  '!../modules/404/**',
]);
const customRoutesInfo = import.meta.glob(['../modules/**/route.js', '!../modules/**/common/**'], {
  eager: true,
});

class DynamicRouterManager {
  constructor(basicRoutes, modules, customRoutes) {
    this.allRoutesList = [];
    this.allRoutesMap = new Map();
    this.basicRoutes = [];
    this.customRoutesInfo = {};

    for (const basicRoute of basicRoutes) {
      const basicRouteInfo = {
        ...basicRoute,
        meta: {
          ...(basicRoute?.meta ?? {}),
          code: basicRoute.name,
          parentName: null,
          level: 1,
        },
      };
      this.allRoutesMap.set(basicRoute.name, basicRouteInfo);
      this.basicRoutes.push(basicRouteInfo);
    }
    for (const [filePath, asyncImportFn] of Object.entries(modulesInfo)) {
      const routeItem = this.createRoute(filePath, asyncImportFn);
      this.allRoutesList.push(routeItem);
      this.allRoutesMap.set(routeItem.meta.code, routeItem);
    }
    for (const [filePath, customRoute] of Object.entries(customRoutes)) {
      const { fullPath } = DynamicRouterManager.getRoutePathInfo(filePath);
      this.customRoutesInfo[fullPath] = customRoute;
    }
    this.router = createRouter({
      history: createWebHistory(),
      routes: this.basicRoutes,
    });
    this.router.beforeEach((to, from) => {
      if (checkAuthState()) {
        if (to.name === 'login') {
          return false;
        } else {
          if (to.meta?.title) {
            document.title = to.meta.title;
          } else {
            document.title = import.meta.env.VITE_APP_TITLE;
          }
        }
      } else {
        if (!this.isBasicRoute(to?.meta?.code)) {
          useTokenExpire(to);
          return false;
        }
      }
    });
  }
  static getRoutePathInfo(filePath) {
    const pathInfo = {
      fullPath: filePath
        .replace(/^\.\.\/modules\//g, '')
        .replace(/\/[[\]\w]+\.(vue|jsx|tsx)$/g, ''),
      entryFileName: filePath.replace(/^.+\/([[\]\w]+)\.(vue|jsx|tsx)$/g, '$1'),
    };
    return pathInfo;
  }
  isBasicRoute(routeCode) {
    if (routeCode) {
      return !!this.basicRoutes.find((i) => i.meta.code === routeCode);
    } else {
      return false;
    }
  }
  getRouteByCode(routeCode) {
    return this.allRoutesMap.get(routeCode);
  }
  createRoute(filePath, asyncImportFn) {
    // 去除前缀和后缀
    const { fullPath, entryFileName } = DynamicRouterManager.getRoutePathInfo(filePath);
    const fullPathParts = fullPath.split('/');
    const routeName =
      fullPathParts
        .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
        .join('') || 'index';
    let routePath = fullPathParts.length > 1 ? fullPathParts.at(-1) : `/${fullPathParts[0]}`;
    if (entryFileName.includes('[')) {
      const routeParamName = entryFileName.replace(/^\[(\w+)\]$/g, '$1');
      routePath += `/:${routeParamName}`;
    }

    const route = {
      path: routePath,
      name: routeName,
      component: asyncImportFn,
    };
    Object.assign(route, this.customRoutesInfo?.[filePath] ?? {}, {
      meta: {
        ...(this.customRoutesInfo[filePath]?.meta ?? {}),
        code: fullPathParts.join('/'),
        parentName:
          fullPathParts?.length > 1
            ? fullPathParts
                .slice(0, -1)
                .map((part, index) =>
                  index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
                )
                .join('')
            : null,
        level: fullPathParts.length,
      },
    });
    return route;
  }
  createDynamicRoutes(permissionList) {
    const allLevelRoutes = [[]];
    for (const code of permissionList) {
      if (this.allRoutesMap.has(code)) {
        const routeItem = this.allRoutesMap.get(code);
        if (routeItem.meta.parentName) {
          const parentName = routeItem.meta.parentName;
          const level = routeItem.meta.level;
          if (allLevelRoutes.length < level) {
            for (let i = allLevelRoutes.length; i <= level; i++) {
              allLevelRoutes.push([]);
            }
          }
          const currentLevelChildren = allLevelRoutes[level - 1];
          currentLevelChildren.push(routeItem);
        } else {
          allLevelRoutes[0].push(routeItem);
        }
      }
    }
    allLevelRoutes.forEach((currentLevelRoutes, index) => {
      const level = index + 1;
      for (const routeItem of currentLevelRoutes) {
        if (level == 1) {
          this.router.addRoute(routeItem);
        } else {
          this.router.addRoute(routeItem.meta.parentName, routeItem);
        }
      }
    });
  }
  removeDynamicRoutes() {
    const routes = this.router.getRoutes();
    routes.forEach((route) => {
      if (!this.basicRoutes.find((i) => i.name === route.name)) {
        this.router.removeRoute(route.name);
      }
    });
  }
}

const dynamicRouterManager = new DynamicRouterManager(basicRoutes, modulesInfo, customRoutesInfo);

export default dynamicRouterManager;
