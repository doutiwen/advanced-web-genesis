/**
 * 当前项目的路由配置
 * 切换代码组织形式时只改 preset 与对应的 presetOptions，核心无需修改
 * 可选预设：feature-modules | views-config | pages-file | server-menu
 */
export default {
  preset: 'feature-modules',

  // 页面未声明 meta.title 时的文档标题兜底
  title: import.meta.env.VITE_APP_TITLE,

  // 当前是纯本地前端项目，不做登录拦截
  auth: {
    enabled: false,
  },

  // 没有后端权限数据：none 表示本地路由全部可见
  permission: {
    mode: 'none',
  },

  // 菜单由路由表推导，供 Layout 顶部菜单使用
  menu: {
    enabled: true,
  },

  // 统一布局：业务页面都会渲染在 Layout 的内容区
  layout: {
    component: () => import('@/components/Layout/index.vue'),
    // 根路径直接进入首页
    redirect: '/home',
  },

  // 组件字符串解析顺序：同名时优先命中前面的目录
  componentOrder: ['views', 'modules', 'pages'],

  // 按预设分组的参数
  presetOptions: {
    'feature-modules': {
      // 保持现有嵌套路由行为；新项目使用统一 Layout 时可改为 true
      flatten: false,
    },
    'views-config': {
      // 切换到该预设时，在这里提供集中式路由表
      routes: [],
      flatten: true,
    },
    'pages-file': {
      flatten: true,
    },
    'server-menu': {
      // 真实项目接入示例：fetchMenu: () => request.get('/api/menu')
      menu: [],
      flatten: true,
    },
  },
};
