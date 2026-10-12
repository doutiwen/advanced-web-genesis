//export { default } from './core/ele/index.vue';
// 入口保持与 UI 库无关：@ui 由 vite.config.js 中的别名按 VITE_UI_LIB 重定向到 core/ele 或 core/ant
export { default } from './core/@ui/index.vue';
