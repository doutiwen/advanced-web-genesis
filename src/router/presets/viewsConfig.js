/**
 * 集中配置式预设
 * 路由表由项目配置提供，组件通过 views 目录索引解析
 */
export function viewsConfigPreset(options = {}) {
  const { routes = [], flatten = true } = options;

  return {
    name: 'views-config',
    collect({ resolveComponent, warn }) {
      const source = typeof routes === 'function' ? routes() : routes;
      const resolveTree = (items = []) =>
        items.map((item) => {
          const route = { ...item };
          if (typeof route.component === 'string') {
            const component = resolveComponent(route.component);
            if (!component) warn(`views-config 无法解析组件: ${route.component}`);
            route.component = component;
          }
          if (route.children?.length) {
            route.children = resolveTree(route.children);
          }
          return route;
        });

      return { routes: resolveTree(Array.isArray(source) ? source : []), flatten };
    },
  };
}
