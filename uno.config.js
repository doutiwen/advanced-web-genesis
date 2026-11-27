import { defineConfig, presetWind3, transformerVariantGroup } from 'unocss';

/*
  UnoCSS 配置

  定位：只负责 flex / grid 布局，不承担颜色、主题、阴影等视觉样式（视觉样式一律留在 scss 中）。

  父容器写法：类名由若干「属性段」用 "_" 连接，首段决定布局类型，例如
    flex_row_justify[between]_items[end]_gap[12px]
    grid_cols[3]_gap[16px]_justifyItems[center]
  首段之后的属性段可自由排序，同一属性重复出现时以书写顺序后者覆盖前者。

  子元素写法：独立类
    w[220px] / h[36px]             固定宽高（单位必填）
    w[flex-grow] / h[flex-grow]    占满剩余空间（min-width|min-height: 0 + flex-grow: 1）
    col[2/4] / row[1/-1]           网格线定位
    span[2] / rowSpan[2]           跨列 / 跨行
    self[end] / justifySelf[center] 单元格内单个子项的对齐

  多词 token 一律小驼峰（autoFill / justifyItems / justifySelf / rowSpan），单词保持小写。
*/

// 作用域：flex 链专用 / grid 链专用 / 两种链都可用
const FLEX = 'flex';
const GRID = 'grid';
const BOTH = 'both';

// 长度校验：只接受带单位的数值，拼错（如 gap[12]）时整条类不生成样式，便于尽早暴露问题
const LENGTH_RE = /^-?\d*\.?\d+(px|rem|em|%|vw|vh|vmin|vmax)$/;

// gap 的取值校验：允许 0，用于只设置其中一个轴（如 gap[12px,0]）
function isLengthOrZero(value) {
  return value === '0' || LENGTH_RE.test(value);
}

// 轨道校验：单条轨道可以是长度、分数或自动关键字
const TRACK_RE = /^-?\d*\.?\d+(px|rem|em|%|vw|vh|vmin|vmax|fr)$|^(auto|min-content|max-content)$/;

// 网格线校验：col[2] 或 col[2/4]（允许负数线号，如 col[1/-1]）
const GRID_LINE_RE = /^-?\d+(\/-?\d+)?$/;

// 无参数段：类名段 → 作用域 + 固定声明
const STATIC_SEGMENTS = {
  // flex 链
  flex: { scope: FLEX, style: { display: 'flex' } },
  row: { scope: FLEX, style: { 'flex-direction': 'row' } },
  'row[reverse]': { scope: FLEX, style: { 'flex-direction': 'row-reverse' } },
  col: { scope: FLEX, style: { 'flex-direction': 'column' } },
  'col[reverse]': { scope: FLEX, style: { 'flex-direction': 'column-reverse' } },
  wrap: { scope: FLEX, style: { 'flex-wrap': 'wrap' } },
  nowrap: { scope: FLEX, style: { 'flex-wrap': 'nowrap' } },
  'wrap-reverse': { scope: FLEX, style: { 'flex-wrap': 'wrap-reverse' } },
  // grid 链
  grid: { scope: GRID, style: { display: 'grid' } },
};

// 枚举段：token → 作用域 + CSS 属性 + 关键字映射
const ENUM_SEGMENTS = {
  // 主轴 / 网格整体分布
  justify: {
    scope: BOTH,
    property: 'justify-content',
    values: { start: 'flex-start', end: 'flex-end', center: 'center', between: 'space-between', around: 'space-around' },
  },
  // 交叉轴 / 单元格内垂直对齐
  items: {
    scope: BOTH,
    property: 'align-items',
    values: { start: 'flex-start', end: 'flex-end', center: 'center', baseline: 'baseline', stretch: 'stretch' },
  },
  // 多行 / 多轨道时的整体分布
  content: {
    scope: BOTH,
    property: 'align-content',
    values: {
      start: 'flex-start',
      end: 'flex-end',
      center: 'center',
      between: 'space-between',
      around: 'space-around',
      stretch: 'stretch',
    },
  },
  // 单元格内水平对齐（grid 专用）
  justifyItems: {
    scope: GRID,
    property: 'justify-items',
    values: { start: 'start', end: 'end', center: 'center', stretch: 'stretch' },
  },
  // 自动排列方向与密集填充（grid 专用）
  flow: {
    scope: GRID,
    property: 'grid-auto-flow',
    values: { row: 'row', col: 'column', dense: 'dense', 'row-dense': 'row dense', 'col-dense': 'column dense' },
  },
};

// 子项自身对齐的枚举值（self / justifySelf）
const SELF_VALUES = { start: 'start', end: 'end', center: 'center', stretch: 'stretch' };

/**
 * 判断属性段是否允许出现在当前布局类型中
 * @param {'flex'|'grid'|'both'} scope 段的作用域
 * @param {'flex'|'grid'} mode 当前链的类型
 */
function isScopeAllowed(scope, mode) {
  return scope === BOTH || scope === mode;
}

/**
 * 按顶层逗号切分（忽略括号内的逗号），用于解析轨道列表
 * @param {string} value 形如 200px,1fr 或 200px,minmax(120px,1fr)
 */
function splitTopLevel(value) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const char of value) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts.map((item) => item.trim()).filter(Boolean);
}

/**
 * 网格模板值 → CSS 值
 * 纯整数：等分轨道（用 minmax(0,1fr) 防止内容撑破）；否则按逗号切分为轨道列表
 * @returns {string|null} null 表示非法取值
 */
function toTrackList(value) {
  // 纯整数：等分列 / 行
  if (/^\d+$/.test(value)) return `repeat(${value}, minmax(0, 1fr))`;

  const tracks = splitTopLevel(value);
  if (!tracks.length) return null;

  // 每条轨道必须是合法长度/分数、自动关键字，或自定义函数（如 repeat(...) / minmax(...)）
  const isValid = tracks.every((track) => TRACK_RE.test(track) || (track.includes('(') && track.endsWith(')')));
  return isValid ? tracks.join(' ') : null;
}

/**
 * 解析单个属性段
 * @param {string} segment 形如 row / justify[between] / cols[3] / gap[12px,8px]
 * @param {'flex'|'grid'} mode 当前链的类型
 * @returns {object|null} 对应的 CSS 声明；null 表示非法属性段
 */
function parseSegment(segment, mode) {
  // 1. 无参数固定段
  const fixed = STATIC_SEGMENTS[segment];
  if (fixed) return isScopeAllowed(fixed.scope, mode) ? fixed.style : null;

  // 2. 间距段：gap[12px] 两轴同值；gap[横,纵] 分别指定（横 = column-gap 在前，纵 = row-gap 在后）
  const gapMatched = /^gap\[([^\]]+)\]$/.exec(segment);
  if (gapMatched) {
    const parts = gapMatched[1].split(',').map((item) => item.trim());
    // 最多两个取值，且都必须是长度或 0（0 用于只设置其中一个轴）
    if (parts.length > 2 || parts.some((item) => !isLengthOrZero(item))) return null;
    if (parts.length === 1) return { gap: parts[0] };
    // 用长属性输出，避免与 CSS gap 简写「先纵后横」的顺序混淆
    return { 'column-gap': parts[0], 'row-gap': parts[1] };
  }

  // 3. 网格模板段：cols / rows / autoFill / autoFit（grid 专用）
  const templateMatched = /^(cols|rows|autoFill|autoFit)\[([^\]]+)\]$/.exec(segment);
  if (templateMatched) {
    if (mode !== GRID) return null;
    const [, key, value] = templateMatched;

    // 自适应列数：参数为最小列宽
    if (key === 'autoFill' || key === 'autoFit') {
      if (!LENGTH_RE.test(value)) return null;
      const keyword = key === 'autoFill' ? 'auto-fill' : 'auto-fit';
      return { 'grid-template-columns': `repeat(${keyword}, minmax(${value}, 1fr))` };
    }

    const tracks = toTrackList(value);
    if (!tracks) return null;
    return { [key === 'cols' ? 'grid-template-columns' : 'grid-template-rows']: tracks };
  }

  // 4. 枚举段：justify / items / content / justifyItems / flow
  const enumMatched = /^([a-zA-Z]+)\[([^\]]+)\]$/.exec(segment);
  if (enumMatched) {
    const [, key, value] = enumMatched;
    const enumSegment = ENUM_SEGMENTS[key];
    if (!enumSegment) return null;
    if (!isScopeAllowed(enumSegment.scope, mode)) return null;

    // 不认识的枚举值直接判为非法，避免写错后静默失效
    const cssValue = enumSegment.values[value];
    return cssValue ? { [enumSegment.property]: cssValue } : null;
  }

  return null;
}

/**
 * 构建布局链的声明
 * @param {string} source 完整类名
 * @param {'flex'|'grid'} mode 链的类型
 * @returns {object|undefined} 任一段非法则返回 undefined，整条类不生成样式
 */
function parseChain(source, mode) {
  const segments = source.split('_');
  const style = {};

  for (const segment of segments) {
    const declaration = parseSegment(segment, mode);
    if (!declaration) return;
    Object.assign(style, declaration); // 后者覆盖前者，实现"重复段顺序覆盖"
  }
  return style;
}

export default defineConfig({
  presets: [
    /*
      Tailwind 3 语法的原子预设，用于 flex / grid 之外的通用能力（截断、定位、过渡等）
      important: true —— 工具类输出 !important，避免被 element-plus / ant-design-vue 的组件样式覆盖
    */
    presetWind3({ important: true }),
  ],
  transformers: [
    // 支持 hover:(...) 这类分组写法，便于以后扩展状态类
    transformerVariantGroup(),
  ],

  rules: [
    /*
      flex 布局链：flex_xxx_yyy
      首段必须是 flex；逐段解析并按书写顺序合并声明。
    */
    [/^flex/, (matcher) => {
      const source = matcher.input; // 完整类名（不含变体前缀）
      const isChain = source === 'flex' || source.startsWith('flex_');
      if (!isChain) return; // flex-1 / flex-row 等标准工具类交给预设处理
      return parseChain(source, FLEX);
    }],

    /*
      grid 布局链：grid_xxx_yyy
      首段必须是 grid；grid-cols-3 这类标准类名不含下划线，会自动落回预设处理。
    */
    [/^grid/, (matcher) => {
      const source = matcher.input;
      const isChain = source === 'grid' || source.startsWith('grid_');
      if (!isChain) return;
      return parseChain(source, GRID);
    }],

    /*
      子元素尺寸类：w[220px] / h[36px] / w[flex-grow] / h[flex-grow]
    */
    [/^([wh])\[([^\]]+)\]$/, ([, axis, value]) => {
      const isWidth = axis === 'w';

      // 占满剩余空间：min-size 归零后才允许被压缩到内容以下
      if (value === 'flex-grow') {
        return isWidth ? { 'min-width': '0', 'flex-grow': '1' } : { 'min-height': '0', 'flex-grow': '1' };
      }

      // 固定尺寸：必须带单位
      if (!LENGTH_RE.test(value)) return;
      return isWidth ? { width: value } : { height: value };
    }],

    /*
      子元素网格定位类：col[2/4] / row[1/-1] / span[2] / rowSpan[2] / self[end] / justifySelf[center]
    */
    [/^(col|row|span|rowSpan|self|justifySelf)\[([^\]]+)\]$/, ([, token, value]) => {
      // 网格线定位
      if (token === 'col' || token === 'row') {
        if (!GRID_LINE_RE.test(value)) return;
        const line = value.replace(/\//g, ' / ');
        return token === 'col' ? { 'grid-column': line } : { 'grid-row': line };
      }

      // 跨列 / 跨行
      if (token === 'span' || token === 'rowSpan') {
        if (!/^\d+$/.test(value)) return;
        const span = `span ${value} / span ${value}`;
        return token === 'span' ? { 'grid-column': span } : { 'grid-row': span };
      }

      // 单个子项对齐
      const cssValue = SELF_VALUES[value];
      if (!cssValue) return;
      return token === 'self' ? { 'align-self': cssValue } : { 'justify-self': cssValue };
    }],
  ],

  blocklist: [
    // 颜色属于视觉样式，禁止用工具类书写（含任意值颜色，避免绕过设计规范）
    /\[#/,
    /^(bg|text|border|fill|stroke)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}$/,
  ],
});
