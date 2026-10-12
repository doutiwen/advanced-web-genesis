/**
 * 日期格式化工具函数
 * 支持格式：YYYY-MM-DD HH:mm:ss
 * @param date - 日期对象/字符串/时间戳
 * @param format - 格式化模板（默认YYYY-MM-DD）
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date | string | number, format: string = 'YYYY-MM-DD'): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0'); // 月份从0开始，补零
  const day = String(d.getDate()).padStart(2, '0'); // 日期补零
  const hours = String(d.getHours()).padStart(2, '0'); // 小时补零
  const minutes = String(d.getMinutes()).padStart(2, '0'); // 分钟补零
  const seconds = String(d.getSeconds()).padStart(2, '0'); // 秒补零

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 解析日期字符串为Date对象
 * @param dateStr - 日期字符串
 * @returns Date对象
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * 获取今天日期（YYYY-MM-DD格式）
 * @returns 今天日期字符串
 */
export function getToday(): string {
  return formatDate(new Date());
}

/**
 * 获取当前年份（YYYY格式）
 * @returns 当前年份字符串
 */
export function getThisYear(): string {
  return formatDate(new Date(), 'YYYY');
}

/**
 * 获取昨天日期（YYYY-MM-DD格式）
 * @returns 昨天日期字符串
 */
export function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDate(d);
}

/**
 * 获取N天前日期（YYYY-MM-DD格式）
 * @param days - 天数
 * @returns N天前日期字符串
 */
export function getDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatDate(d);
}

/**
 * 获取N年前的日期字符串
 * @param years 要回溯的年数
 * @returns 格式化后的日期字符串
 */
export function getYearsAgo(years: number): string {
  const d = new Date();
  const targetYear = d.getFullYear() - years;

  // 保存原始的月和日，用于后续闰年边界判断
  const originalMonth = d.getMonth(); // 0-indexed, 1 = February
  const originalDay = d.getDate();

  // 先设置目标年份
  d.setFullYear(targetYear);

  /**
   * 闰年兜底处理：
   * 如果原始日期是2月29日，而目标年份不是闰年，
   * setFullYear 会自动将日期溢出为3月1日。
   * 这里检测到溢出后，手动回退到2月28日。
   */
  if (originalMonth === 1 && originalDay === 29 && d.getMonth() !== 1) {
    d.setMonth(1, 28); // 设置为2月28日
  }
  return formatDate(d);
}

/**
 * 判断两个日期是否是同一天
 * @param date1 - 日期1
 * @param date2 - 日期2
 * @returns 是否同一天
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.toDateString() === d2.toDateString();
}

/**
 * 判断两个日期是否是同一个月
 * @param date1 - 日期1
 * @param date2 - 日期2
 * @returns 是否同一个月
 */
export function isSameMonth(date1: Date | string, date2: Date | string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}

/**
 * 获取指定月份的天数
 * @param year - 年份
 * @param month - 月份（0-11）
 * @returns 该月天数
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * 日期加N天
 * @param date - 原日期
 * @param days - 天数
 * @returns 新日期对象
 */
export function addDays(date: Date | string, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * 日期加N个月
 * @param date - 原日期
 * @param months - 月数
 * @returns 新日期对象
 */
export function addMonths(date: Date | string, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

//解析时间字符(1ms,1s,1m,1h,1d)，返回毫秒数，传入数字视为毫秒
export function parseTimeStr(time) {
  if (typeof time === 'number') {
    return time;
  } else if (typeof time === 'string') {
    const match = time.match(/^(\d+)(ms|s|m|h|d)$/i);
    if (!match) {
      return null;
    }
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    switch (unit) {
      case 'ms':
        return value; // 毫秒
      case 's':
        return value * 1000; // 秒
      case 'm':
        return value * 60 * 1000; // 分
      case 'h':
        return value * 60 * 60 * 1000; // 小时
      case 'd':
        return value * 24 * 60 * 60 * 1000; // 天
      default:
        return null;
    }
  } else {
    return null;
  }
}

//将毫秒数格式化为可读的时间字符串，unit指定返回的单位 ('auto', 'd', 'h', 'm', 's', 'ms')
export function parseTimeNum(ms, unit = 'auto') {
  if (ms === null || ms === undefined || isNaN(ms)) {
    return '';
  } else if (ms <= 0) {
    return '0s';
  } else {
    const timeUnits = [
      { unit: 'd', ms: 24 * 60 * 60 * 1000 },
      { unit: 'h', ms: 60 * 60 * 1000 },
      { unit: 'm', ms: 60 * 1000 },
      { unit: 's', ms: 1000 },
      { unit: 'ms', ms: 1 },
    ];
    if (unit === 'auto') {
      let result = '';
      let remainingMs = ms;
      for (let i = 0; i < timeUnits.length; i++) {
        const { unit: u, ms: unitMs } = timeUnits[i];
        const count = Math.floor(remainingMs / unitMs);

        if (count > 0) {
          result += `${count}${u} `;
          remainingMs %= unitMs;
        }
      }
      return result.trim();
    } else {
      const target = timeUnits.find((u) => u.unit === unit);
      if (!target) return '';
      return `${Math.floor(ms / target.ms)}${unit}`;
    }
  }
}

export const getDateString = (milliseconds) => {
  const date = new Date(milliseconds);
  return `${date.getFullYear()}-${
    date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1
  }-${date.getDate() < 10 ? `0${date.getDate()}` : date.getDate()}`;
};