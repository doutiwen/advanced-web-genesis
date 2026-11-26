/**
 * 字典配置（DictStore 初始化时批量注册）
 *
 * 每个字典项的结构：
 *   {
 *     name: string,             // 字典名称，全局唯一
 *     getData: () => any,       // 返回数组即静态字典；返回 Promise 即异步字典
 *     set?: (source) => Array,  // 可选，把原始数据转换成 [{ label, value }]
 *   }
 *
 * 异步字典示例（getData 返回 Promise 即可，无需额外声明类型）：
 *   {
 *     name: 'TITLE',
 *     getData: () => getDicDetailsData({ type: 'title' }).then((res) => res.data),
 *     set: (list) => list.map((i) => ({ label: i.name, value: i.name })),
 *   }
 */

/** 性别（同步字典） */
const GENDER = [
  { label: '男', value: '1' },
  { label: '女', value: '0' },
];

export default [
  {
    name: 'GENDER',
    getData: () => GENDER,
  },
];
