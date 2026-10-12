/**
 * 公共静态数据字典（通用层）
 *
 * 存放多子系统共用的固定(硬编码)枚举数据，如性别 GENDER。
 * 除按原样导出数据外，还汇总为 COMMON_STATIC_DICTS 清单，
 * 供各子系统 dict/static.js 在导出 DICT_STATIC 前「先初始化公共静态字典」使用。
 *
 * 使用方式：
 *   - 既有写法（直接取数据，兼容现有代码）：import { GENDER } from '@/dict/static'
 *   - DICT_STATIC 统一用法（同步）：import { DICT_STATIC } from '@/dict/static'（各子系统文件）
 *       例如 DICT_STATIC.GENDER.value / DICT_STATIC.GENDER.getLabel('1') / DICT_STATIC.GENDER.getValue('男')
 */

/** 性别 */
export const GENDER = [
  { label: '男', value: '1' },
  { label: '女', value: '0' },
];

/**
 * 公共静态字典清单：供各子系统 dict/static.js 先于子系统自身字典初始化。
 * 字典名称以 STATIC_ 前缀标识（与 DICT_STATIC 的 key 去掉前缀对应）。
 */
export const COMMON_STATIC_DICTS = [
  {
    name: 'STATIC_GENDER',
    data: GENDER,
  },
];
