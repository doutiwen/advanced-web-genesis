import { pageModules } from '../core/scan.js';

const PAGE_EXTENSION_REGEX = /\.(vue|jsx|tsx)$/;

function isGroupSegment(segment) {
  return /^\(.+\)$/.test(segment);
}

/**
 * 文件名转路由
 * 支持 [id] 动态段、[...slug] 通配段、(group) 分组目录、index 默认页
 */
function fileToRoute(segments) {
  const urlSegments = [];
  for (const segment of segments) {
    if (isGroupSegment(segment) || segment === 'index') continue;
    if (/^\[\.\.\..+\]$/.test(segment)) {
      urlSegments.push(`:${segment.slice(4, -1)}(.*)*`);
    } else if (/^\[.+\]$/.test(segment)) {
      urlSegments.push(`:${segment.slice(1, -1)}`);
    } else {
      urlSegments.push(segment);
    }
  }
  const path = urlSegments.length ? `/${urlSegments.join('/')}` : '/';
  return { path, name: path === '/' ? 'index' : undefined };
}

function titleFromSegments(segments) {
  const target = [...segments]
    .reverse()
    .find((segment) => !isGroupSegment(segment) && segment !== 'index');
  if (!target) return '';
  return target
    .replace(/^\[\.{0,3}/, '')
    .replace(/\]$/, '')
    .replace(/[-_]+/g, ' ');
}

/**
 * 文件约定式预设
 * 目录约定：pages 下的文件路径即路由，适合快速试验和小型项目
 */
export function pagesFilePreset(options = {}) {
  const {
    root = '/src/pages/',
    excludeDirs = ['components'],
    flatten = true,
    metaMap = {},
  } = options;

  return {
    name: 'pages-file',
    collect({ warn }) {
      const routes = [];
      for (const [file, loader] of Object.entries(pageModules)) {
        if (!file.startsWith(root)) continue;
        const segments = file
          .slice(root.length)
          .replace(PAGE_EXTENSION_REGEX, '')
          .split('/')
          .filter(Boolean);
        // 下划线开头的文件视为局部片段，不生成路由
        if (segments.some((segment) => segment.startsWith('_') || excludeDirs.includes(segment))) {
          continue;
        }
        const { path, name } = fileToRoute(segments);
        if (routes.some((route) => route.path === path)) {
          warn(`pages-file 出现重复路径: ${path}（${file}）`);
          continue;
        }
        const meta = { ...(metaMap[path] ?? {}) };
        if (!meta.title) meta.title = titleFromSegments(segments);
        routes.push({ path, name, component: loader, meta });
      }
      return { routes, flatten };
    },
  };
}
