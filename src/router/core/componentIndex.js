import { moduleViewModules, pageModules, viewModules } from './scan.js';

const VIEW_EXTENSION_REGEX = /\.(vue|jsx|tsx)$/;

/**
 * 把 glob 结果整理成“多种写法都能命中”的索引
 * 例如 modules/example/index.vue 会同时登记 example、example/index 两个 key
 */
function buildIndex(modules, root) {
  const index = new Map();
  for (const [file, loader] of Object.entries(modules)) {
    if (!file.startsWith(root)) continue;
    const relativeWithExt = file.slice(root.length);
    const relative = relativeWithExt.replace(VIEW_EXTENSION_REGEX, '');
    index.set(relative, loader);
    index.set(relative.replace(/\/index$/, ''), loader);
    index.set(relativeWithExt, loader);
  }
  return index;
}

/**
 * 把后端或配置里的组件字符串统一成可查表的 key
 * 支持 '@/views/system/user'、'/src/views/system/user/index.vue'、'system/user' 等写法
 */
function buildLookupKeys(reference) {
  let value = reference.trim().replace(/\\/g, '/').replace(/^\/+/, '');
  value = value.replace(/^@\//, '').replace(/^src\//, '');
  value = value.replace(/^(views|modules|pages)\//, '');
  value = value.replace(VIEW_EXTENSION_REGEX, '').replace(/\/+$/, '');
  if (!value) return [];
  const keys = new Set([value]);
  keys.add(value.replace(/\/index$/, ''));
  keys.add(`${value}/index`);
  return [...keys].filter(Boolean);
}

/**
 * 创建组件解析器
 * @param {object} options
 * @param {object} options.aliases 别名映射，例如 { Layout: () => import('@/components/Layout/index.vue') }
 * @param {string[]} options.order 同名组件在多个目录中的查找顺序
 */
export function createComponentResolver({ aliases = {}, order = ['views', 'modules', 'pages'] } = {}) {
  const indexMap = {
    modules: buildIndex(moduleViewModules, '/src/modules/'),
    views: buildIndex(viewModules, '/src/views/'),
    pages: buildIndex(pageModules, '/src/pages/'),
  };
  const aliasMap = new Map(Object.entries(aliases));

  function resolve(reference) {
    if (!reference) return null;
    // 已经是懒加载函数或组件对象，直接使用
    if (typeof reference === 'function') return reference;
    if (typeof reference === 'object' && typeof reference.default === 'function') {
      return reference.default;
    }
    if (typeof reference !== 'string') return null;
    if (aliasMap.has(reference)) return resolve(aliasMap.get(reference));
    for (const key of buildLookupKeys(reference)) {
      for (const sourceName of order) {
        const loader = indexMap[sourceName]?.get(key);
        if (loader) return loader;
      }
    }
    return null;
  }

  return { resolve, indexes: indexMap };
}
