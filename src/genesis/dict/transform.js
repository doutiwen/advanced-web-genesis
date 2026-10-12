/**
 * 公共字典值转换（通用层）
 *
 * 存放多子系统共用的「后端字典值 → 页面展示文案」转换方法。
 *
 * 与 @/dict/static.js 的分工：
 *   - static.js    只维护标准字典值，如 GENDER 中的 '1'=男、'0'=女
 *   - transform.js 面向展示，额外容忍历史数据里的非标准取值（如旧值 2 表示女、
 *                  部分接口直接返回中文"男"/"女"），能识别的一律转成文案
 *
 * 使用方式：
 *   import { getGenderText } from '@/dict/transform'
 *   getGenderText(row.gender) // '男' | '女' | ''
 */

/**
 * 性别展示字典
 *
 * 后端与历史数据的性别取值并不统一，在这里一次性收敛：
 *   - 数字：0=女、1=男（与 @/dict/static.js 的 GENDER 一致）
 *          2=女（历史数据遗留的旧值，仍可能有存量数据在用）
 *   - 中文：'男' / '女'（部分接口直接返回中文字符串）
 *
 * key 统一按字符串书写，取值前先 String() 归一，
 * 避免 0 与 '0'、1 与 '1' 两种形态要分别判断。
 */
const GENDER_TEXT_MAP = {
  0: '女',
  1: '男',
  2: '女',
  男: '男',
  女: '女',
};

/**
 * 性别值 → 展示文案
 * @param {number|string} gender - 后端返回的性别值，可能为数字或中文字符串
 * @returns {string} '男' / '女'；null、undefined、空串等无法识别的取值返回 ''
 */
export function getGenderText(gender) {
  // String(null) 得 'null'、String(undefined) 得 'undefined'，都不在字典中，自然落到 ''
  return GENDER_TEXT_MAP[String(gender)] || '';
}
