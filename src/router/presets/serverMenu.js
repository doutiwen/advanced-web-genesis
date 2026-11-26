import { joinPath } from '../core/normalize.js';

const DEFAULT_FIELD_MAP = {
  name: 'name',
  path: 'path',
  component: 'component',
  children: 'children',
  title: 'title',
  icon: 'icon',
  hidden: 'hidden',
  order: 'order',
  permission: 'permission',
  meta: 'meta',
};

// 后端常见的“布局/分组”占位组件
const DEFAULT_GROUP_COMPONENTS = ['Layout', 'ParentView', ''];

/**
 * 后端菜单树预设
 * 只负责把菜单树翻译成统一路由描述，权限过滤已在后端完成
 */
export function serverMenuPreset(options = {}) {
  const {
    fetchMenu,
    menu = [],
    fieldMap = {},
    flatten = true,
    groupComponents = DEFAULT_GROUP_COMPONENTS,
  } = options;
  const map = { ...DEFAULT_FIELD_MAP, ...fieldMap };
  const groups = groupComponents instanceof Set ? groupComponents : new Set(groupComponents);

  return {
    name: 'server-menu',
    async collect({ resolveComponent, warn }) {
      const tree = typeof fetchMenu === 'function' ? await fetchMenu() : menu;
      if (!Array.isArray(tree)) {
        warn('server-menu 未提供可用的菜单树');
        return { routes: [], flatten };
      }

      const walk = (nodes, parentPath = '') => {
        const routes = [];
        for (const node of nodes) {
          if (!node) continue;
          const rawPath = node[map.path];
          const path = rawPath
            ? String(rawPath).startsWith('/')
              ? String(rawPath)
              : joinPath(parentPath, String(rawPath))
            : '';
          const componentRef = node[map.component];
          const children = Array.isArray(node[map.children])
            ? walk(node[map.children], path)
            : [];
          const isGroup = !componentRef || groups.has(componentRef);
          let component = null;
          if (!isGroup) {
            component = resolveComponent(componentRef);
            if (!component) warn(`server-menu 无法解析组件: ${componentRef}（${path}）`);
          }

          const rawMeta =
            node[map.meta] && typeof node[map.meta] === 'object' ? node[map.meta] : {};
          const meta = {
            ...rawMeta,
            title: rawMeta.title ?? node[map.title] ?? node[map.name],
            icon: rawMeta.icon ?? node[map.icon],
            hidden: rawMeta.hidden ?? node[map.hidden],
            order: rawMeta.order ?? node[map.order],
            permission: rawMeta.permission ?? node[map.permission],
            code: rawMeta.code ?? node[map.permission] ?? path,
          };

          // 无路径的分组节点直接提升子路由，避免生成无效 URL
          if (!path) {
            if (!component && children.length) routes.push(...children);
            else warn(`server-menu 菜单缺少 path: ${meta.title || componentRef}`);
            continue;
          }
          // 组件解析失败且没有子路由时丢弃，避免生成死链
          if (!component && !children.length) {
            warn(`server-menu 忽略无效菜单: ${meta.title || path}`);
            continue;
          }

          const route = { path, component, meta };
          if (children.length) route.children = children;
          routes.push(route);
        }
        return routes;
      };

      return { routes: walk(tree), flatten };
    },
  };
}
