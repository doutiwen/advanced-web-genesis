import { createApp } from 'vue';
import App from './app.vue';
import dynamicRouterManager from './router/index.js';
// 样式由 vite.config.js 中的 unplugin-element-plus 按需注入，切勿再引入 element-plus/dist/index.css 全量样式
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
// ant-design-vue 4.x 组件样式由 CSS-in-JS 在运行时注入（对应 vite.config.js 中
// AntDesignVueResolver 的 importStyle: false），无需引入全量样式，仅需全局补一次 reset 基础样式，
// 否则 a-button、a-modal 等组件会缺失基础排版重置，出现「样式没生效」的观感
import 'ant-design-vue/dist/reset.css';
import pinia from './store';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

const app = createApp(App);

const componentModules = import.meta.glob([
  './components/**/index.{vue,js,jsx,ts,tsx}',
  '!./components/**/core/**',
]);
Object.entries(componentModules).forEach(([path, loadComponent]) => {
  const pathParts = path.split('/');
  const componentName = pathParts[pathParts.length - 2];
  app.component(componentName, defineAsyncComponent(loadComponent));
});

pinia.use(piniaPluginPersistedstate);
app
  .use(pinia)
  .use(dynamicRouterManager.router)
  .use(ElementPlus, {
    locale: zhCn,
  })
  .mount('#app');

export default app;
