import { moduleRouteConfigModules, moduleViewModules } from '../core/scan.js';

const DEFAULT_EXCLUDE_DIRS = ['config', 'common', 'components', 'assets'];
const DEFAULT_EXCLUDE_MODULES = ['login', '404'];
// 只有约定入口文件才算页面，避免 public 子组件被误注册成路由
const ENTRY_FILE_REGEX = /^(?:index|\[[^\]]+\])\.(?:vue|jsx|tsx)$/;

function createNode() {
  return { children: new Map(), entry: null };
}

/**
 * 收集模块内的 route.js 覆盖配置
 * 同时兼容 <模块>/route.js 与 <模块>/config/route.js 两种位置
 */
function collectOverrides(root) {
  const overrides = new Map();
  for (const [file, module] of Object.entries(moduleRouteConfigModules)) {
    if (!file.startsWith(root)) continue;
    const relative = file.slice(root.length).replace(/\.js$/, '');
    const parts = relative.split('/');
    parts.pop(); // 去掉 route
    if (parts.at(-1) === 'config') parts.pop();
    const key = parts.join('/');
    const value = module?.default ?? module;
    if (!key || !value || !Object.keys(value).length) continue;
    // 同目录 route.js 优先于 config/route.js
    if (!overrides.has(key) || !relative.includes('/config/')) {
      overrides.set(key, value);
    }
  }
  return overrides;
}

/**
 * 功能模块化预设
 * 目录约定：modules/<模块>/<子模块>/index.vue，层级即嵌套路由层级
 */
export function featureModulesPreset(options = {}) {
  const {
    root = '/src/modules/',
    entryRegex = ENTRY_FILE_REGEX,
    excludeDirs = DEFAULT_EXCLUDE_DIRS,
    excludeModules = DEFAULT_EXCLUDE_MODULES,
    flatten = false,
  } = options;

  return {
    name: 'feature-modules',
    collect({ resolveComponent, warn }) {
      const overrides = collectOverrides(root);
      const rootNode = createNode();

      for (const [file, loader] of Object.entries(moduleViewModules)) {
        if (!file.startsWith(root)) continue;
        const segments = file.slice(root.length).split('/').filter(Boolean);
        // 模块根目录下的文件不作为页面（例如公共组件）
        if (segments.length < 2) continue;
        const entryFileName = segments.at(-1);
        if (!entryRegex.test(entryFileName)) continue;
        const dirs = segments.slice(0, -1);
        if (dirs.some((dir) => excludeDirs.includes(dir))) continue;
        if (excludeModules.includes(dirs[0])) continue;

        let node = rootNode;
        for (const dir of dirs) {
          if (!node.children.has(dir)) node.children.set(dir, createNode());
          node = node.children.get(dir);
        }
        if (node.entry) {
          warn(`模块 ${dirs.join('/')} 存在多个入口文件，仅使用 ${entryFileName}`);
          continue;
        }
        node.entry = { loader, entryFileName };
      }

      const routes = buildRoutes(rootNode, [], overrides, { resolveComponent, warn });
      return { routes, flatten };
    },
  };
}

// 按目录层级递归生成嵌套路由
function buildRoutes(node, dirs, overrides, context) {
  const routes = [];
  for (const [dir, child] of node.children) {
    const childDirs = [...dirs, dir];
    const key = childDirs.join('/');
    const childRoutes = buildRoutes(child, childDirs, overrides, context);

    let route = null;
    if (child.entry) {
      route = createEntryRoute(child.entry, key, overrides.get(key), context);
    } else if (childRoutes.length) {
      // 只有目录没有页面：生成无组件的分组路由，保证子页面仍能注册
      route = { path: `/${key}`, component: null, meta: { code: key } };
    }
    if (!route) continue;

    // route.js 里声明的子路由与目录扫描结果合并
    const children = [...(route.children ?? []), ...childRoutes];
    if (children.length) route.children = children;
    else delete route.children;
    routes.push(route);
  }
  return routes;
}

function createEntryRoute(entry, key, override, { resolveComponent, warn }) {
  // [id].vue 作为入口时，把文件名转成路径参数
  const rawParam = entry.entryFileName.replace(/^\[(.+)\]\.(?:vue|jsx|tsx)$/, '$1');
  const isParamEntry = rawParam !== entry.entryFileName;
  const param = rawParam.startsWith('...')
    ? `${rawParam.slice(3)}(.*)*`
    : rawParam;

  const route = {
    path: isParamEntry ? `/${key}/:${param}` : `/${key}`,
    component: entry.loader,
    meta: { code: key },
  };

  if (!override) return route;

  if (override.component !== undefined) {
    const component =
      typeof override.component === 'string'
        ? resolveComponent(override.component)
        : override.component;
    if (!component) warn(`模块 ${key} 的 route.js 组件无法解析: ${override.component}`);
    route.component = component;
  }
  if (override.path !== undefined) route.path = override.path;
  if (override.name !== undefined) route.name = override.name;
  if (override.redirect !== undefined) route.redirect = override.redirect;
  if (override.meta) route.meta = { ...route.meta, ...override.meta };
  // 透传 alias / props / beforeEnter / children 等 vue-router 原生字段
  for (const field of ['alias', 'props', 'beforeEnter', 'children']) {
    if (override[field] !== undefined) route[field] = override[field];
  }
  return route;
}
