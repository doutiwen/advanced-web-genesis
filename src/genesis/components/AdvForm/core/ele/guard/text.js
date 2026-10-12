/**
 * 文本输入守卫（phone / intNumber / number）—— DOM 事件层的直接实现（逐类型直写，无抽象层）
 *
 * 本文件自成一体：位数上限（inputGuard.numberLimit）的 spec 构建、默认字符集约束、以及把约束翻译成真正生效的
 * DOM 事件处理器（onKeydown / onPaste）都集中在此，不再经由 core/common 中转。
 *   - onKeydown：逐键模拟插入后的字符串，若 canExtend 为 false 则 preventDefault 阻止该字符输入；
 *   - onPaste：preventDefault 后对「当前值 + 剪贴板」整体 normalize 再写回并派发 input（避免多小数点等）；
 *   - maxlength：作为兜底保留（仅 phone 等转发 maxlength 的控件消费）。
 *
 * 注意事件命名必须用 camelCase（onKeydown / onPaste），Vue mergeProps 只把 on + 大写开头当作事件监听；
 * 旧的 onkeypress（小写）会被当作普通属性丢弃，拦截不生效。preventDefault 才能真正阻止输入。
 * el-input-number 不把 maxlength/监听转发进内部 input，onKeydown/onPaste 靠根节点冒泡生效。
 *
 * 【真实文本】number / intNumber 的宿主是 el-input-number，内部是原生 <input type="number">，它会把
 * 【末尾小数点】从 value 里吃掉：真实文本 "12345678." 下 el.value 读到的是 "12345678"（Chrome 实测，
 * 既不出现在 value 里，也不置 badInput；失焦也不会清掉这个待定小数点）。守卫若只看 value，就会把
 * "12345678." 当成 "12345678" 参与判定，于是——
 *   - 整数位敲满后再敲小数点，后面每一位都被当成整数位继续计数 → 小数位一位也敲不进去；
 *   - 已经存在的待定小数点看不见 → 第二个小数点拦不住（接连敲点都放行）。
 * 故守卫自己记一份【认可的真实文本】（见 trustedRawText），其余一切以 DOM 值为准。
 */

// ==================== 文本约束（默认字符集 / numberLimit 位数上限） ====================

// 仅保留数字（可选限制最大长度）
const sanitizeDigits = (value, maxLength) =>
  String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, maxLength);

// 手机 / 座机的前缀形态（canExtend 判定用）——与 predefineValidateRules.phone 的报告语义同一来源：
//   - 手机：1 开头，第二位 3~9，之后最多再 9 位（合计 11 位）；
//   - 座机：0 开头；区号本身含开头的 0 共 3~4 位（即 0 之后再接 2~3 位），号码 7~8 位，
//           故【含开头 0 在内】数字合计最多 12 位（4 位区号 + 8 位号码）；
//           输 '-' 时区号须已有 2~3 位（'-' 之前只写了 0 或 1 位数字的写法无解，须拦住），号码最多 8 位。
const PHONE_PREFIX_RE = /^(?:1([3-9]\d{0,9})?|0(?:\d{0,11}|\d{2,3}-\d{0,8}))$/;

/**
 * 手机 / 座机粘贴清洗：把「当前值 + 剪贴板」的整体输入投影到最接近的合法形态。
 * 先做字符集清洗——非数字、非 '-' 的字符一律丢弃，并把连续的 '-' 收敛成一个
 * （于是「+86 138 0013 8000」先变成「8613800138000」）；
 * 再逐字符累积「仍是合法前缀」的最长部分，借 PHONE_PREFIX_RE 一并完成位数截断
 * （手机 11 位 / 座机 13 字符），非法位置的字符也会被自动跳过——
 * 例如前置的 86 既进不了手机分支也进不了座机分支，会被丢弃而不是粘进号码里。
 * @param {string} raw - 待清洗的原始文本
 * @returns {string} 合法前缀形态的手机号 / 座机（可能尚未输完，与其余类型的 normalize 语义一致）
 */
const sanitizePhone = (raw) => {
  const cleaned = String(raw ?? '')
    .replace(/[^\d-]/g, '')
    .replace(/-{2,}/g, '-');
  let result = '';
  for (const char of cleaned) {
    if (PHONE_PREFIX_RE.test(result + char)) {
      result += char;
    }
  }
  return result;
};

// 仅保留数字与第一个小数点（沿用旧的 sanitizeNumber 语义）
const sanitizeDecimal = (value) => {
  const str = String(value ?? '').replace(/[^\d.]/g, '');
  const dotIndex = str.indexOf('.');
  if (dotIndex !== -1) {
    return str.substring(0, dotIndex + 1) + str.substring(dotIndex + 1).replace(/\./g, '');
  }
  return str;
};

// ==================== 参数化的位数上限约束（numberLimit） ====================
// 给 number/intNumber 提供“最多 N 位整数（有效位）+ 最多 M 位小数”的硬位数上限，
// 由 getTextConstraint(type, numberLimit) 按需构建；未配上限时返回下方默认注册表条目（逐字节等价）。
// 语义要点：
//   - 整数位按【有效位】计数/截断（前导 0 不计），保证 typing（canExtend）与 paste（normalize）一致，
//     不会因先敲几个前导 0 就把字段锁死；
//   - 小数位按【原始位】计数（cap=M 时第 M+1 位小数，哪怕是 0，也否决）；
//   - normalize 一律产出 Number(...) 可回环的规范串（去前导 0 / 去尾随 0 / 空串保持 ''），
//     使 el-input-number 的 paste 回写与 EP userInput/模型不脱节。

// 整数“有效位”：去全部前导 0（'000'→''、'0'→''、'0123'→'123'）
const intSignificant = (digits) => digits.replace(/^0+/, '');

// 可配置上限的“小数文本”约束；无界维度用 Infinity（等价该轴默认）
const buildCappedDecimalSpec = ({ integerLength = Infinity, decimalLength = Infinity }) => ({
  canExtend(prefix) {
    if (!/^\d*\.?\d*$/.test(prefix)) return false;
    const dotIndex = prefix.indexOf('.');
    const intRaw = dotIndex === -1 ? prefix : prefix.slice(0, dotIndex);
    const decRaw = dotIndex === -1 ? '' : prefix.slice(dotIndex + 1);
    if (intSignificant(intRaw).length > integerLength) return false;
    if (decRaw.length > decimalLength) return false;
    return true;
  },
  normalize(raw) {
    const cleaned = String(raw ?? '').replace(/[^\d.]/g, '');
    if (cleaned === '') return '';
    const dotIndex = cleaned.indexOf('.');
    const intRaw = dotIndex === -1 ? cleaned : cleaned.slice(0, dotIndex);
    const decRaw = dotIndex === -1 ? '' : cleaned.slice(dotIndex + 1).replace(/\./g, '');
    // 先剥前导 0 再截位（避免 "0123456789" 按 raw 截成 7 位）；小数截到 M 位后去尾随 0
    const intCapped = (intSignificant(intRaw) || '0').slice(0, integerLength);
    const decCapped = decRaw.slice(0, decimalLength).replace(/0+$/, '');
    return decCapped ? `${intCapped}.${decCapped}` : intCapped;
  },
});

// 可配置上限的“整数文本”约束（numberLimit.decimal 对 intNumber 无意义，忽略）
const buildCappedIntegerSpec = ({ integerLength = Infinity }) => ({
  canExtend(prefix) {
    if (!/^\d*$/.test(prefix)) return false;
    return intSignificant(prefix).length <= integerLength;
  },
  normalize(raw) {
    const digits = String(raw ?? '').replace(/\D/g, '');
    if (digits === '') return '';
    return (intSignificant(digits) || '0').slice(0, integerLength);
  },
});

/**
 * 文本约束注册表：type → 约束（对应手机号或座机/整数/小数的“过程中禁止非法输入”）。
 * canExtend(prefix)：本次按键后的字符串是否“合法 或 可继续扩展成合法值”（前缀可判）。
 *   —— 结果为完整合法值时也放行，保证最后一个合法字符能输入。
 * normalize(raw)：粘贴清洗，把整体 raw 投影到最接近的合法形态。
 * maxlength：作为兜底保留（与原行为一致）。
 */
const TEXT_CONSTRAINTS = {
  // 中国大陆 11 位手机号 或 座机（区号-号码，如 0951-6732639）——与 predefineValidateRules.phone 的报告语义同一来源
  phone: {
    canExtend: (prefix) => PHONE_PREFIX_RE.test(prefix),
    normalize: sanitizePhone,
    // 最长形态为 4 位区号 + '-' + 8 位号码（0571-12345678，共 13 字符）；手机一侧的 11 位上限由 canExtend 另行拦住
    maxlength: 13,
  },
  // 非负整数
  intNumber: {
    canExtend: (prefix) => /^\d*$/.test(prefix),
    normalize: (raw) => sanitizeDigits(raw),
  },
  // 小数（文本形态）
  number: {
    canExtend: (prefix) => /^\d*\.?\d*$/.test(prefix),
    normalize: (raw) => sanitizeDecimal(raw),
  },
};

/**
 * 获取某类型的文本约束；未登记类型返回 undefined。
 * @param {string} type - phone / intNumber / number
 * @param {{ integer?: number, decimal?: number } | undefined} numberLimit
 *        可选位数上限（DSL 形态）：integer=有效整数位上限、decimal=小数位上限。
 *        number：integer 或 decimal 任一有限即返回 capped 约束，否则默认条目；
 *        intNumber：仅 integer 有限时 capped；phone 忽略 numberLimit。
 */
const getTextConstraint = (type, numberLimit) => {
  if (type === 'number') {
    const integerLength = numberLimit?.integer;
    const decimalLength = numberLimit?.decimal;
    if (Number.isFinite(integerLength) || Number.isFinite(decimalLength)) {
      return buildCappedDecimalSpec({ integerLength, decimalLength });
    }
    return TEXT_CONSTRAINTS.number;
  }
  if (type === 'intNumber') {
    const integerLength = numberLimit?.integer;
    if (Number.isFinite(integerLength)) {
      return buildCappedIntegerSpec({ integerLength });
    }
    return TEXT_CONSTRAINTS.intNumber;
  }
  return TEXT_CONSTRAINTS[type];
};

// ==================== 真实文本（原生 type=number 吃掉末尾小数点后的补足） ====================
// 每个输入元素一份「守卫认可的真实文本」：只在该文本与 DOM 值一致、或恰好差一个被吃掉的末尾小数点时采用，
// 其余情况（回填、清空、联动改写等 DOM 值已变化的场景）一律以 DOM 值为准，避免用过期的记录做判定。
const rawTextMap = new WeakMap();

// 会改动文本的功能键：其后果在 value 上常常完全看不出来（例如退格删掉末尾小数点后 value 仍是同一个数），
// 故直接丢弃记录，让下一次按键回到 DOM 值判定。
const TEXT_EDIT_KEYS = new Set(['Backspace', 'Delete']);

const rememberRawText = (el, text) => {
  if (el) rawTextMap.set(el, text);
};

const trustedRawText = (el, domValue) => {
  const tracked = rawTextMap.get(el);
  if (tracked === undefined) return domValue;
  return tracked === domValue || tracked === domValue + '.' ? tracked : domValue;
};

// ==================== 约束 → DOM 事件守卫 ====================

/**
 * 创建文本守卫事件处理器
 * @param {string} type - phone / intNumber / number（未登记类型返回空处理器）
 * @param {{ integer?: number, decimal?: number } | undefined} numberLimit
 *        可选位数上限（透传给 getTextConstraint 构建 capped 约束，如 { integer: 8, decimal: 2 }）
 * @returns {{ onKeydown?: (e: KeyboardEvent) => void, onPaste?: (e: ClipboardEvent) => void, maxlength?: number }}
 */
export const createTextGuardHandlers = (type, numberLimit) => {
  const spec = getTextConstraint(type, numberLimit);
  if (!spec) {
    return { onKeydown: undefined, onPaste: undefined, maxlength: undefined };
  }

  // 按键否决：把“本次按键后的字符串”视为候选前缀，前缀不可能扩展成合法值时阻止输入。
  // 组合键（复制/粘贴/全选等）与功能键（退格/删除/方向等）放行。
  const onKeydown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target;
    if (e.key.length > 1) {
      if (TEXT_EDIT_KEYS.has(e.key)) rawTextMap.delete(el);
      return;
    }
    // 原生 type=number 会吃掉末尾小数点，故取守卫记录的真实文本（selectionStart 对它是 null，只能按“光标在末尾”算）
    const currentValue = trustedRawText(el, el?.value ?? '');
    const start = el?.selectionStart ?? currentValue.length;
    const end = el?.selectionEnd ?? start;
    const nextValue = currentValue.slice(0, start) + e.key + currentValue.slice(end);
    if (spec.canExtend(nextValue) === false) {
      rememberRawText(el, currentValue);
      e.preventDefault();
      return;
    }
    rememberRawText(el, nextValue);
  };

  // 粘贴清洗：阻止默认粘贴，对整体合并值 normalize 后写回
  const onPaste = (e) => {
    e.preventDefault();
    const el = e.target;
    const text = e.clipboardData?.getData('text') ?? '';
    if (!text) return;
    // 同 onKeydown：待定小数点不在 value 里，须取真实文本再合并（光标位置对 number 输入也只能按真实文本长度兜底，
    // 用 value.length 会把粘贴内容插到待定小数点之前）
    const currentValue = trustedRawText(el, el?.value ?? '');
    const start = el?.selectionStart ?? currentValue.length;
    const end = el?.selectionEnd ?? start;
    const merged = currentValue.slice(0, start) + text + currentValue.slice(end);
    const cleanValue = spec.normalize(merged);
    if (cleanValue === currentValue) return;
    // 仅当目标是真正的文本输入元素才写回（el-input-number 冒泡路径的 target 即内部原生 input）
    if (!(el && typeof el.value === 'string')) return;
    // normalize 的结果从不以小数点结尾，写回后 DOM 值即真实文本，记录随之作废
    el.value = cleanValue;
    rawTextMap.delete(el);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };

  return { onKeydown, onPaste, maxlength: spec.maxlength };
};
