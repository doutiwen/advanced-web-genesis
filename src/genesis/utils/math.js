/**
 * 获取数字的小数位数
 * @param {number} num
 * @returns {number} 小数位数
 */
const getDecimalPlaces = (num) => {
  const match = ('' + num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  if (!match) return 0;
  return Math.max(0, (match[1] ? match[1].length : 0) - (match[2] ? +match[2] : 0));
};

/**
 * 数学计算工具类
 */
export const mathUtils = {
  /**
   * 1. 精确加法 (解决 0.1 + 0.2 = 0.30000000000000004 问题)
   * @param {number} a
   * @param {number} b
   * @param {number} [precision] 可选：保留的小数位数
   */
  add(a, b, precision) {
    const maxDecimal = Math.max(getDecimalPlaces(a), getDecimalPlaces(b));
    const multiplier = Math.pow(10, maxDecimal);
    const result = (Math.round(a * multiplier) + Math.round(b * multiplier)) / multiplier;
    return precision !== undefined ? Number(result.toFixed(precision)) : result;
  },

  /**
   * 2. 精确减法
   * @param {number} a
   * @param {number} b
   * @param {number} [precision] 可选：保留的小数位数
   */
  subtract(a, b, precision) {
    const maxDecimal = Math.max(getDecimalPlaces(a), getDecimalPlaces(b));
    const multiplier = Math.pow(10, maxDecimal);
    const result = (Math.round(a * multiplier) - Math.round(b * multiplier)) / multiplier;
    return precision !== undefined ? Number(result.toFixed(precision)) : result;
  },

  /**
   * 3. 精确乘法
   * @param {number} a
   * @param {number} b
   * @param {number} [precision] 可选：保留的小数位数
   */
  multiply(a, b, precision) {
    const aDecimal = getDecimalPlaces(a);
    const bDecimal = getDecimalPlaces(b);
    const multiplier = Math.pow(10, aDecimal + bDecimal);
    const result =
      (Math.round(a * Math.pow(10, aDecimal)) * Math.round(b * Math.pow(10, bDecimal))) /
      multiplier;
    return precision !== undefined ? Number(result.toFixed(precision)) : result;
  },

  /**
   * 4. 精确除法
   * @param {number} a
   * @param {number} b
   * @param {number} [precision] 可选：保留的小数位数
   */
  divide(a, b, precision) {
    if (b === 0) throw new Error('除数不能为0');
    const aDecimal = getDecimalPlaces(a);
    const bDecimal = getDecimalPlaces(b);
    // 转换为整数进行计算
    const aInt = Math.round(a * Math.pow(10, aDecimal));
    const bInt = Math.round(b * Math.pow(10, bDecimal));
    // 调整精度
    const result = (aInt / bInt) * Math.pow(10, bDecimal - aDecimal);
    return precision !== undefined ? Number(result.toFixed(precision)) : result;
  },

  /**
   * 5. 数值范围限制 (Clamp)
   * 将数值限制在 [min, max] 之间
   * @param {number} val
   * @param {number} min
   * @param {number} max
   */
  clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  },

  /**
   * 6. 生成指定范围的随机整数
   * @param {number} min 最小值 (包含)
   * @param {number} max 最大值 (包含)
   */
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * 7. 金额格式化
   * 例如: 1234.5 -> '1,234.50'
   * @param {number} amount
   * @param {number} decimals 小数位数
   */
  formatMoney(amount, decimals = 2) {
    if (amount === null || amount === undefined) return '-';
    const regex = /\B(?=(\d{3})+(?!\d))/g;
    return Number(amount).toFixed(decimals).replace(regex, ',');
  },

  /**
   * 8. 百分比计算与格式化
   * @param {number} part 部分值
   * @param {number} total 总值
   * @param {number} decimals 保留小数位
   */
  calcPercent(part, total, decimals = 1) {
    if (total === 0) return '0%';
    return (this.divide(part, total) * 100).toFixed(decimals) + '%';
  },
};
