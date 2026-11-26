import { featureModulesPreset } from './featureModules.js';
import { pagesFilePreset } from './pagesFile.js';
import { serverMenuPreset } from './serverMenu.js';
import { viewsConfigPreset } from './viewsConfig.js';

// 预设注册表：新增一种代码组织方式时，只需在这里登记
export const presetRegistry = {
  'feature-modules': featureModulesPreset,
  'views-config': viewsConfigPreset,
  'pages-file': pagesFilePreset,
  'server-menu': serverMenuPreset,
};

export { featureModulesPreset, pagesFilePreset, serverMenuPreset, viewsConfigPreset };
