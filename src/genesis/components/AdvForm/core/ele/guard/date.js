/**
 * 日期面板守卫（inputGuard.dateLimit 事中禁用 + 面板默认页）—— element-plus 日期面板的直接实现（逐类型直写，无抽象层）
 *
 * dateLimit 只对 date / dateTime 表单项有意义，随表单项配置 inputGuard.dateLimit 读取；本文件是它的唯一 UI 落地，
 * 按同一份配置产出两个面板属性，不经过任何中间描述符/约束产物：
 *   - createDatePickerDisabledDate → disabledDate（哪些格子不可选）
 *   - createDatePickerDefaultValue → defaultValue（打开面板时定位到哪一页）
 *
 * 关键：两者都在【每次被面板调用 / 每次渲染时】实时求界——
 *   - 联动（targetFieldName）：每次读取目标字段当前值，同一函数引用永远返回最新判定。
 *     这规避了 element-plus 2.3.14 日期面板在 setup 时一次性冻结首版 disabledDate
 *     （panel-date-pick.mjs 解构 props.disabledDate 后不再更新）导致「后写入的守卫不生效」的缺陷，
 *     故联动无需 watch、无需强制重挂载。
 *   - 静态（date）：取固定常量，天然成立。
 *   （defaultValue 走的是另一条通路：panel-date-pick.mjs 里 watch(() => defaultValue) 是活的，
 *     props 变化即把面板重定位到新值所在页，故只需保证「日期没变时引用不变」，见下方 Date 缓存。）
 *
 * 派生 report 校验（blur/submit 提示）与「源字段被改晚后清空依赖」的写表项属于引擎逻辑，
 * 落在 core/common/form.js；本文件不参与。日期统一用 'YYYY-MM-DD' 定宽字符串（day 粒度）做词法比较。
 */

// 将 Date 对齐为 'YYYY-MM-DD'（day 粒度）参与词法比较
const pad = (n) => String(n).padStart(2, '0');
const dayStringOf = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// 截取日期部分：dateTime 等含时分秒的值仅保留前 10 位；非字符串原样返回
const daySlice = (value) =>
  typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : value;

/**
 * 由 inputGuard.dateLimit 配置生成 el-date-picker 的 disabledDate
 * @param {{ type?: 'notAfter' | 'notBefore', targetFieldName?: string, date?: string } | undefined} dateLimit
 *        表单项 inputGuard.dateLimit 配置；type 非法或未配置时原样返回 userDisabledDate（不加包裹、零开销）
 * @param {(fieldKey: string) => *} getValue 读取表单字段当前值的访问器（联动 targetFieldName 时每次调用实时取）
 * @param {((date: Date) => boolean) | undefined} userDisabledDate 用户通过 attrs.disabledDate 声明的禁用函数
 * @returns {(date: Date) => boolean} true = 该天禁用
 */
export const createDatePickerDisabledDate = (dateLimit, getValue, userDisabledDate) => {
  const type = dateLimit?.type;
  if (type !== 'notBefore' && type !== 'notAfter') return userDisabledDate;
  return (date) => {
    if (userDisabledDate && userDisabledDate(date)) return true;
    const rawBound = dateLimit.targetFieldName
      ? getValue(dateLimit.targetFieldName)
      : dateLimit.date;
    if (!rawBound) return false; // 联动源未填写 / 未给固定日期 → 不限
    const boundDay = daySlice(rawBound);
    const day = dayStringOf(date);
    return type === 'notBefore' ? day < boundDay : day > boundDay;
  };
};

// 同一天复用同一个 Date 实例：面板对 defaultValue 是按引用比较的（watch(() => defaultValue.value)），
// 若每次渲染都新建 Date，表单任意一次重渲染都会把用户正在翻的面板拽回默认页；
// 按日期串缓存后，引用只在日期真的变化时才变——正好等价于「只有界变了才重新定位」。
const defaultDateCache = new Map();
const dateOfDay = (day) => {
  if (!defaultDateCache.has(day)) {
    const [year, month, date] = day.split('-').map(Number);
    defaultDateCache.set(day, new Date(year, month - 1, date));
  }
  return defaultDateCache.get(day);
};

/**
 * 由 inputGuard.dateLimit 配置生成 el-date-picker 的 defaultValue（面板打开时定位到哪一页）
 *
 * 要解决的问题：界在很早以前时（notAfter 最常见——「不得晚于」的界来自某个已过去的日期），
 * element-plus 默认把面板定位到今天（innerDate 初值 dayjs()），而今天整页都是禁用格子，
 * 用户得逐月往回翻到合法区间。给一个 defaultValue 即可让面板一次落在合法页上。
 *
 * 取值规则：把「今天」夹进合法区间——notAfter 取 min(今天, 界)，notBefore 取 max(今天, 界)，
 * 即「离今天最近的合法日」。界在过去时它落在界上（notAfter 下即最晚合法日，也是诉求所在）；
 * 今天本身合法时留在今天（不把用户丢到未来页）。界缺失（联动源未填写 / 未配 date）→ undefined，
 * 不干预，沿用 element-plus 默认。
 *
 * @param {{ type?: 'notAfter' | 'notBefore', targetFieldName?: string, date?: string } | undefined} dateLimit
 *        表单项 inputGuard.dateLimit 配置；type 非法或未配置时返回 undefined（零开销）
 * @param {(fieldKey: string) => *} getValue 读取表单字段当前值的访问器（联动 targetFieldName 时实时取）
 * @returns {Date | undefined} 面板默认定位日期；undefined = 不干预
 */
export const createDatePickerDefaultValue = (dateLimit, getValue) => {
  const type = dateLimit?.type;
  if (type !== 'notBefore' && type !== 'notAfter') return undefined;
  const rawBound = dateLimit.targetFieldName
    ? getValue(dateLimit.targetFieldName)
    : dateLimit.date;
  const boundDay = daySlice(rawBound);
  // 非 'YYYY-MM-DD' 形态（null / 未填 / 残缺值）一律不干预，避免造出 Invalid Date
  if (typeof boundDay !== 'string' || boundDay.length !== 10) return undefined;
  const todayDay = dayStringOf(new Date());
  const isTodayLegal = type === 'notBefore' ? todayDay >= boundDay : todayDay <= boundDay;
  return dateOfDay(isTodayLegal ? todayDay : boundDay);
};
