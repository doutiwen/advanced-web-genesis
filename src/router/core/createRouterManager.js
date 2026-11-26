import { createRouter, createWebHistory } from 'vue-router';
import { basicRoutes as defaultBasicRoutes } from '../basicRoutes.js';
import { buildMenu, filterRoutesByCodes, normalizeRoutes, treeToFlat } from './normalize.js';
import { createComponentResolver } from './componentIndex.js';
import { presetRegistry } from '../presets/index.js';

const LAYOUT_ROUTE_NAME = 'root';

/**
 * 创建路由管理器
 * 所有业务路由（无论本地扫描还是后端菜单）都通过 addRoute 动态装载，
 * createRouter 只接收启动必需的基础路由。
 */
export function createRouterManager(options = {}) {
  const {
    preset = 'feature-modules',
    presetOptions = {},
    routes: baseRoutes = defaultBasicRoutes,
    layout = null,
    aliases = {},
    componentOrder,
    title = '',
    auth = {},
    permission = {},
    menu = {},
  } = options;

  const presetFactory = presetRegistry[preset];
  if (!presetFactory) {
    throw new Error(`[router] 未知的路由预设: ${preset}`);
  }

  const authOptions = {
    enabled: false,
    isAuthenticated: () => true,
    loginRouteName: 'login',
    homeRouteName: 'home',
    onLoginRequired: null,
    ...auth,
  };
  const permissionOptions = {
    mode: 'none',
    codeKey: 'code',
    getCodes: () => [],
    ...permission,
  };
  const menuOptions = { enabled: false, ...menu };

  const warnings = [];
  const warn = (message) => {
    warnings.push(message);
    console.warn(`[router] ${message}`);
  };

  const resolver = createComponentResolver({ aliases, order: componentOrder });

  // 布局支持三种写法：
  // 1. 组件函数：() => import('...')
  // 2. 组件索引字符串：'Layout'
  // 3. 配置对象：{ component, path?, name?, redirect? }
  const layoutConfig =
    layout && typeof layout === 'object' && 'component' in layout ? layout : null;
  const layoutSource = layoutConfig ? layoutConfig.component : layout;

  let layoutComponent = null;
  if (typeof layoutSource === 'function') layoutComponent = layoutSource;
  else if (typeof layoutSource === 'string') layoutComponent = resolver.resolve(layoutSource);
  if (layoutSource && !layoutComponent) {
    warn(`布局组件无法解析: ${String(layoutSource)}`);
  }

  const layoutRouteName = layoutConfig?.name || LAYOUT_ROUTE_NAME;
  const layoutRoutePath = layoutConfig?.path || '/';

  const bootstrapRoutes = [...baseRoutes];
  if (layoutComponent) {
    bootstrapRoutes.unshift({
      path: layoutRoutePath,
      name: layoutRouteName,
      component: layoutComponent,
      // 根布局可同时承载重定向，例如 / -> /home
      ...(layoutConfig?.redirect ? { redirect: layoutConfig.redirect } : {}),
      children: [],
    });
  }

  const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: bootstrapRoutes,
  });

  // 布局路由只是容器，不作为“已匹配的基础页面”对待
  const bootstrapRouteNames = new Set(
    bootstrapRoutes
      .map((route) => route.name)
      .filter((name) => name && name !== layoutRouteName)
  );
  const removeHandlers = [];
  const state = { loaded: false, loading: null, menuTree: [] };

  // 递归注册路由树；父级注册成功后再挂子路由
  function registerRouteTree(routes, parentName) {
    for (const route of routes) {
      const { children, ...rest } = route;
      if (!rest.component && !rest.redirect && !children?.length) continue;

      // 路由名冲突时自动加后缀，避免覆盖已有路由
      let name = rest.name;
      let suffix = 2;
      while (router.hasRoute(name)) {
        const nextName = `${rest.name}${suffix}`;
        warn(`路由名 ${rest.name} 已存在，自动改为 ${nextName}`);
        name = nextName;
        suffix += 1;
      }

      const record = { ...rest, name };
      if (!record.component) delete record.component;
      const addTo = parentName && router.hasRoute(parentName) ? parentName : undefined;
      // 有父级时挂到父级下，否则作为顶层路由注册
      const remove = addTo ? router.addRoute(addTo, record) : router.addRoute(record);
      removeHandlers.push(remove);

      if (children?.length) registerRouteTree(children, name);
    }
  }

  // 幂等装载业务路由，并发调用共享同一个 Promise
  async function ensureRoutes() {
    if (state.loaded) return;
    if (state.loading) return state.loading;

    state.loading = (async () => {
      const presetImpl = presetFactory(presetOptions?.[preset] ?? {});
      const result = await presetImpl.collect({
        config: options,
        resolveComponent: resolver.resolve,
        warn,
      });
      if (!result || !Array.isArray(result.routes)) {
        throw new Error(`预设 ${preset} 未返回 routes 数组`);
      }

      let routeTree = normalizeRoutes(result.routes, { warnings });
      if (permissionOptions.mode === 'codes') {
        const codes = new Set(await permissionOptions.getCodes());
        routeTree = filterRoutesByCodes(routeTree, codes, permissionOptions.codeKey);
      }
      if (menuOptions.enabled) {
        state.menuTree = buildMenu(routeTree);
      }

      const registerList = result.flatten ? treeToFlat(routeTree) : routeTree;
      registerRouteTree(registerList, layoutComponent ? layoutRouteName : undefined);
      state.loaded = true;
    })();

    try {
      await state.loading;
    } finally {
      state.loading = null;
    }
  }

  // 登出或切换账号时移除全部业务路由
  function resetRoutes() {
    while (removeHandlers.length) {
      const remove = removeHandlers.pop();
      try {
        remove();
      } catch {
        // 父路由移除后，子路由的 remove 可能重复执行，忽略即可
      }
    }
    state.loaded = false;
    state.menuTree = [];
  }

  // 供微前端或运行时追加路由使用
  function addRoutes(rawRoutes, parentName) {
    const normalized = normalizeRoutes(rawRoutes, { warnings });
    registerRouteTree(normalized, parentName);
    return normalized;
  }

  router.beforeEach(async (to) => {
    const isLogin = to.name === authOptions.loginRouteName;
    const isNotFound = to.name === 'notFound';
    const isBootstrap = bootstrapRouteNames.has(to.name) && !isNotFound;

    // 1. 登录态：未登录只能访问基础路由
    if (authOptions.enabled) {
      if (!authOptions.isAuthenticated()) {
        if (isBootstrap) return true;
        authOptions.onLoginRequired?.(to);
        // 沿用项目现有的 loginBack 约定，登录成功后可以回到原页面
        const query = { ...to.query };
        const backTarget = to.name && to.name !== 'notFound' ? to.name : to.fullPath;
        if (backTarget && backTarget !== '/') query.loginBack = backTarget;
        return { name: authOptions.loginRouteName, query };
      }
      if (isLogin) return { name: authOptions.homeRouteName };
    }

    // 2. 业务路由按需装载；装载后重新导航一次以命中新路由
    if (!isBootstrap && !state.loaded) {
      try {
        await ensureRoutes();
        return { path: to.fullPath, replace: true };
      } catch (error) {
        console.error('[router] 路由装载失败:', error);
        return true;
      }
    }

    // 3. 页面标题
    document.title = to.meta?.title || title || document.title;
    return true;
  });

  return {
    router,
    preset,
    warnings,
    ensureRoutes,
    resetRoutes,
    addRoutes,
    isAuthenticated: () => !authOptions.enabled || Boolean(authOptions.isAuthenticated()),
    hasLoadedRoutes: () => state.loaded,
    getMenuTree: () => state.menuTree,
  };
}
