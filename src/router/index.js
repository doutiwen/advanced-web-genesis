import { createRouterManager } from './core/createRouterManager.js';
import config from './config.js';

// 应用级单例：整个项目只创建一个路由管理器
const routerManager = createRouterManager(config);

export default routerManager;
