/**
 * 路由描述归一化
 * 所有预设最终都产出同一种结构：
 * { name, path, component, redirect, meta, children }
 */

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

// 统一斜杠、补齐前导斜杠、去掉多余尾部斜杠
export function normalizePath(path = '') {
  const value = String(path).trim().replace(/\\/g, '/');
  if (!value) return '/';
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  const collapsed = withLeading.replace(/\/{2,}/g, '/');
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;
}

// 拼接父子路径；子路径以 / 开头时视为绝对路径
export function joinPath(parentPath, childPath) {
  if (!childPath) return normalizePath(parentPath || '/');
  if (String(childPath).startsWith('/')) return normalizePath(childPath);
  const parent = normalizePath(parentPath || '/');
  return normalizePath(parent === '/' ? `/${childPath}` : `${parent}/${childPath}`);
}

// 路径转路由名：/routeTest1/routeTest2 -> routeTest1RouteTest2
export function toRouteName(path) {
  const segments = normalizePath(path).split('/').filter(Boolean);
  if (!segments.length) return 'index';
  return segments
    .map((segment, index) => {
      const cleaned = segment
        .replace(/^:/, '')
        .replace(/\(.*\)$/g, '')
        .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, ' ');
      const name = cleaned.split(' ').filter(Boolean).map(capitalize).join('');
      if (!name) return `param${index}`;
      return index === 0 ? name.charAt(0).toLowerCase() + name.slice(1) : name;
    })
    .join('');
}

// 从路径推导默认标题，仅在有需要时使用
export function toTitle(path) {
  const last = normalizePath(path).split('/').filter(Boolean).pop();
  if (!last) return '';
  const cleaned = last.replace(/^:/, '').replace(/[\[\]]/g, '').replace(/[-_]+/g, ' ');
  return cleaned ? capitalize(cleaned) : '';
}

// 按 meta.order 排序，未声明的保持原有顺序
function sortByOrder(routes) {
  return routes
    .map((route, index) => ({ route, index }))
    .sort((a, b) => {
      const orderA = a.route.meta?.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.route.meta?.order ?? Number.MAX_SAFE_INTEGER;
      return orderA === orderB ? a.index - b.index : orderA - orderB;
    })
    .map((item) => item.route);
}

/**
 * 归一化路由树
 * @param {Array} routes 原始路由描述
 * @param {object} options
 * @param {string} options.parentPath 父级完整路径
 * @param {boolean} options.titleFromPath 未声明标题时是否用路径推导
 * @param {string[]} options.warnings 告警收集数组
 */
export function normalizeRoutes(
  routes = [],
  { parentPath = '', titleFromPath = false, warnings } = {}
) {
  const result = [];
  for (const raw of sortByOrder(routes)) {
    if (!raw) continue;
    const { code, title, children, ...rest } = raw;
    const rawPath = rest.path;
    const path = rawPath
      ? String(rawPath).startsWith('/')
        ? normalizePath(rawPath)
        : joinPath(parentPath, rawPath)
      : rest.name
        ? joinPath(parentPath, toRouteName(rest.name))
        : normalizePath(parentPath || '/');

    const meta = {
      ...(rest.meta ?? {}),
      ...(code !== undefined ? { code } : {}),
      fullPath: path,
    };
    if (title !== undefined && meta.title === undefined) meta.title = title;
    if (titleFromPath && !meta.title && path !== '/') meta.title = toTitle(path);

    const route = {
      ...rest,
      path,
      name: rest.name || toRouteName(path),
      meta,
    };
    if (children?.length) {
      route.children = normalizeRoutes(children, { parentPath: path, titleFromPath, warnings });
    } else {
      delete route.children;
    }

    // 既没有组件、也没有子路由和重定向的节点无法渲染
    if (!route.component && !route.children?.length && !route.redirect) {
      warnings?.push(`路由 ${path} 缺少组件且没有子路由，已跳过`);
      continue;
    }
    result.push(route);
  }
  return result;
}

// 把嵌套路由树拍平成一组顶层路由，path 保持绝对的完整路径
export function treeToFlat(routes = []) {
  const result = [];
  const walk = (list) => {
    for (const route of list) {
      const { children, ...record } = route;
      result.push(record);
      if (children?.length) walk(children);
    }
  };
  walk(routes);
  return result;
}

/**
 * 按权限码过滤路由
 * 父级不在权限码里、但仍有可见子路由时保留父级，避免嵌套路由丢失
 */
export function filterRoutesByCodes(routes = [], codes = new Set(), codeKey = 'code') {
  const result = [];
  for (const route of routes) {
    const children = route.children?.length
      ? filterRoutesByCodes(route.children, codes, codeKey)
      : [];
    const value = route.meta?.[codeKey];
    const allowed = Array.isArray(value)
      ? value.some((item) => codes.has(item))
      : codes.has(value);
    if (!allowed && !children.length) continue;
    const next = { ...route };
    if (children.length) next.children = children;
    else delete next.children;
    result.push(next);
  }
  return result;
}

/**
 * 由路由树生成菜单树
 * 只消费 meta，不再维护第二份菜单数据
 */
export function buildMenu(routes = []) {
  const items = [];
  for (const route of routes) {
    if (route.meta?.hidden) continue;
    if (route.meta?.menu === false) continue;
    const children = route.children?.length ? buildMenu(route.children) : [];
    const path = route.meta?.fullPath || route.path;
    // 没有 meta.title 时用路径生成标题，保证菜单不会漏掉未声明标题的页面
    const title = route.meta?.title || toTitle(path) || route.name;
    if (!title && !children.length) continue;
    items.push({
      name: route.name,
      path,
      title: title || route.name,
      icon: route.meta?.icon,
      order: route.meta?.order,
      permission: route.meta?.permission,
      children,
    });
  }
  return items.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
}
