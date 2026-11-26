/**
 * 构建期扫描索引
 * 注意：import.meta.glob 的路径必须是静态字面量，Vite 才能在编译阶段收集文件。
 * 具体“哪些文件算页面”由 presets 层筛选，核心不直接依赖某种目录约定。
 */

// 功能模块化目录：惰性加载，避免首屏加载全部页面
export const moduleViewModules = import.meta.glob('/src/modules/**/*.{vue,jsx,tsx}');

// 集中配置式页面目录（views + 本地路由表）
export const viewModules = import.meta.glob('/src/views/**/*.{vue,jsx,tsx}');

// 文件约定式页面目录（文件路径即路由）
export const pageModules = import.meta.glob('/src/pages/**/*.{vue,jsx,tsx}');

// 模块内路由覆盖配置：eager 读取，构建期即可拿到配置对象
export const moduleRouteConfigModules = import.meta.glob('/src/modules/**/route.js', {
  eager: true,
});
