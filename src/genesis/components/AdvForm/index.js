// 通用层入口：转发到核心实现，与 AdvButton/index.js 保持同一约定
// 注意不可指向 ../AdvFormForApp/index.vue——应用层包装反过来依赖本文件，会形成循环依赖
export { default } from './core/@ui/index.jsx';
