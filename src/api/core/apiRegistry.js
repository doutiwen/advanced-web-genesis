//接口注册表：登记「模块路径 → 配置模块加载函数」，供 openApi 属性访问时查找
//核心不自带任何扫描能力，由宿主项目手写注册，或引入 extensions 下的扫描扩展

//模块路径 → 配置模块的加载函数
const moduleLoaderMap = new Map();
//已加载模块缓存：同一模块只执行一次加载函数
const moduleCache = new Map();

/**
 * 注册单个接口模块
 * @param {string} modulePath - 模块路径，如 'example'、'routeTest1/routeTest2/routeTest3'
 * @param {Object|Function} loaderOrModule - 配置对象，或返回配置对象的加载函数（用于懒加载）
 */
export const registerApiModule = (modulePath, loaderOrModule) => {
  //统一成 loader，核心内部只有一条取值路径
  const loader =
    typeof loaderOrModule === 'function' ? loaderOrModule : async () => loaderOrModule;
  moduleLoaderMap.set(modulePath, loader);
  moduleCache.delete(modulePath);
};

/**
 * 批量注册接口模块
 * @param {Object<string, Object|Function>} modulesMap - { 模块路径: 配置对象或加载函数 }
 */
export const registerApiModules = (modulesMap) => {
  Object.entries(modulesMap || {}).forEach(([modulePath, loaderOrModule]) => {
    registerApiModule(modulePath, loaderOrModule);
  });
};

/**
 * 获取已注册的模块路径列表，用于错误提示
 * @returns {string[]}
 */
export const getRegisteredModulePaths = () => [...moduleLoaderMap.keys()];

/**
 * 解析接口描述
 * @param {string} modulePath - 模块路径
 * @param {string} apiName - 接口名
 * @returns {Promise<{apiDesc: Object, apiFullName: string}>}
 */
export const resolveApi = async (modulePath, apiName) => {
  const loader = moduleLoaderMap.get(modulePath);
  if (!loader) {
    const availableModules = getRegisteredModulePaths().join('、') || '无';
    throw new Error(`[openApi] 模块「${modulePath}」未注册，可用模块：${availableModules}`);
  }
  if (!moduleCache.has(modulePath)) {
    //加载失败不写入缓存，允许下次重试
    const loadPromise = loader().catch((error) => {
      moduleCache.delete(modulePath);
      throw error;
    });
    moduleCache.set(modulePath, loadPromise);
  }
  const apiModule = await moduleCache.get(modulePath);
  if (!apiModule || !Object.prototype.hasOwnProperty.call(apiModule, apiName)) {
    const availableApis = Object.keys(apiModule || {}).join('、') || '无';
    throw new Error(
      `[openApi] 模块「${modulePath}」中不存在接口「${apiName}」，可用接口：${availableApis}`
    );
  }
  return {
    //附加模块信息：mock 扩展依赖 modulePath / apiName 定位同名 mock 配置
    apiDesc: { ...apiModule[apiName], modulePath, apiName },
    apiFullName: `${modulePath}/${apiName}`,
  };
};
