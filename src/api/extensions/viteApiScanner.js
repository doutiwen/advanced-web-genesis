//接口扫描扩展：基于 Vite 的 import.meta.glob 自动注册各模块的接口配置
//不需要自动扫描的项目可以不引入本文件，改为在装配层手写 registerApiModule
const apiModuleGlob = import.meta.glob('../../modules/**/**/config/api.js', {
  import: 'default',
});

/**
 * 把 glob 路径转成模块路径
 * 例：'../../modules/routeTest1/routeTest2/config/api.js' → 'routeTest1/routeTest2'
 * @param {string} globPath
 * @returns {string}
 */
const toModulePath = (globPath) =>
  globPath.replace(/^\.\.\/\.\.\/modules\//, '').replace(/\/config\/api\.js$/, '');

/**
 * 安装扫描：把扫到的每个模块以懒加载方式登记到注册表
 * @param {Function} registerApiModule - 注册函数
 * @returns {number} 已登记的模块数量
 */
export const installViteApiScanner = (registerApiModule) => {
  for (const [globPath, loader] of Object.entries(apiModuleGlob)) {
    registerApiModule(toModulePath(globPath), loader);
  }
  return Object.keys(apiModuleGlob).length;
};

export default installViteApiScanner;
