<template>
  <!-- 布局示例页：仅展示 flex / grid 类名效果，不含业务逻辑 -->
  <div class="flex_col_gap[28px]">
    <!-- 1. flex 方向 -->
    <section class="flex_col_gap[10px]">
      <div class="demo-label">
        1. flex 方向：flex_row / flex_row[reverse] / flex_col / flex_col[reverse]
      </div>
      <div class="flex_row_gap[8px]">
        <div v-for="i in 3" :key="i" class="demo-cell">row-{{ i }}</div>
      </div>
      <div class="flex_row[reverse]_gap[8px]">
        <div v-for="i in 3" :key="i" class="demo-cell">reverse-{{ i }}</div>
      </div>
      <div class="flex_col_gap[8px] h[140px]">
        <div v-for="i in 2" :key="i" class="demo-cell">col-{{ i }}</div>
      </div>
      <div class="flex_col[reverse]_gap[8px] h[140px]">
        <div v-for="i in 2" :key="i" class="demo-cell">col-reverse-{{ i }}</div>
      </div>
    </section>

    <!-- 2. 主轴对齐 -->
    <section class="flex_col_gap[10px]">
      <div class="demo-label">
        2. 主轴对齐：justify[start] / justify[center] / justify[between] / justify[around]
      </div>
      <div class="grid_cols[2]_gap[12px]">
        <div class="flex_row_justify[start]_gap[8px] h[64px]">
          <div class="demo-cell">A</div>
          <div class="demo-cell">B</div>
        </div>
        <div class="flex_row_justify[center]_gap[8px] h[64px]">
          <div class="demo-cell">A</div>
          <div class="demo-cell">B</div>
        </div>
        <div class="flex_row_justify[between]_gap[8px] h[64px]">
          <div class="demo-cell">A</div>
          <div class="demo-cell">B</div>
        </div>
        <div class="flex_row_justify[around]_gap[8px] h[64px]">
          <div class="demo-cell">A</div>
          <div class="demo-cell">B</div>
        </div>
      </div>
    </section>

    <!-- 3. 交叉轴对齐 -->
    <section class="flex_col_gap[10px]">
      <div class="demo-label">
        3. 交叉轴对齐：items[start] / items[center] / items[end] / items[stretch]
      </div>
      <div class="grid_cols[2]_gap[12px]">
        <div class="flex_row_items[start]_gap[8px] h[88px]">
          <div class="demo-cell h[32px]">A</div>
          <div class="demo-cell h[32px]">B</div>
        </div>
        <div class="flex_row_items[center]_gap[8px] h[88px]">
          <div class="demo-cell h[32px]">A</div>
          <div class="demo-cell h[32px]">B</div>
        </div>
        <div class="flex_row_items[end]_gap[8px] h[88px]">
          <div class="demo-cell h[32px]">A</div>
          <div class="demo-cell h[32px]">B</div>
        </div>
        <div class="flex_row_items[stretch]_gap[8px] h[88px]">
          <div class="demo-cell">A</div>
          <div class="demo-cell">B</div>
        </div>
      </div>
    </section>

    <!-- 4. 换行与双值间距 -->
    <section class="flex_col_gap[10px]">
      <div class="demo-label">
        4. 换行与双值间距：flex_row_wrap_gap[16px,10px] / wrap-reverse
      </div>
      <div class="flex_row_wrap_gap[16px,10px]">
        <div v-for="i in 9" :key="i" class="demo-cell w[120px]">{{ i }}</div>
      </div>
      <div class="flex_row_wrap-reverse_gap[16px,10px] h[160px]">
        <div v-for="i in 5" :key="i" class="demo-cell w[120px]">{{ i }}</div>
      </div>
    </section>

    <!-- 5. flex 子项尺寸 -->
    <section class="flex_col_gap[10px]">
      <div class="demo-label">5. flex 子项尺寸：w[100px] / w[flex-grow] / h[flex-grow]</div>
      <div class="flex_row_gap[8px]">
        <div class="demo-cell w[100px]">w[100px]</div>
        <div class="demo-cell w[flex-grow]">w[flex-grow]</div>
        <div class="demo-cell w[flex-grow]">w[flex-grow]</div>
        <div class="demo-cell w[60px]">w[60px]</div>
      </div>
      <div class="flex_col_gap[8px] h[180px]">
        <div class="demo-cell h[44px]">h[44px]</div>
        <div class="demo-cell h[flex-grow]">h[flex-grow]</div>
      </div>
    </section>

    <!-- 6. grid 列模板 -->
    <section class="flex_col_gap[10px]">
      <div class="demo-label">
        6. grid 列模板：cols[3] / cols[200px,1fr,auto] / cols[repeat(2,minmax(0,1fr))] / rows[2]
      </div>
      <div class="grid_cols[3]_gap[12px]">
        <div v-for="i in 6" :key="i" class="demo-cell">{{ i }}</div>
      </div>
      <div class="grid_cols[200px,1fr,auto]_gap[12px]">
        <div class="demo-cell">200px</div>
        <div class="demo-cell">1fr</div>
        <div class="demo-cell">auto</div>
      </div>
      <div class="grid_cols[repeat(2,minmax(0,1fr))]_gap[12px]">
        <div v-for="i in 4" :key="i" class="demo-cell">{{ i }}</div>
      </div>
      <div class="grid_cols[2]_rows[2]_gap[12px]">
        <div v-for="i in 4" :key="i" class="demo-cell">{{ i }}</div>
      </div>
    </section>

    <!-- 7. grid 自适应列数 -->
    <section class="flex_col_gap[10px]">
      <div class="demo-label">
        7. 自适应列数：容器 560px、最小列宽 80px、只有 2 个子项。
        autoFill[80px] 保留空轨道，autoFit[80px] 折叠空轨道并撑满整行
      </div>
      <div class="w[560px] max-w-full flex_col_gap[8px]">
        <div class="grid_autoFill[80px]_gap[12px]">
          <div class="demo-cell">A</div>
          <div class="demo-cell">B</div>
        </div>
        <div class="grid_autoFit[80px]_gap[12px]">
          <div class="demo-cell">A</div>
          <div class="demo-cell">B</div>
        </div>
      </div>
    </section>

    <!-- 8. grid 跨列 / 跨行 / 定位 -->
    <section class="flex_col_gap[10px]">
      <div class="demo-label">8. 跨列跨行：span[2] / rowSpan[2] / col[2/4] / col[1/-1] / flow[row-dense]</div>
      <div class="grid_cols[3]_gap[12px]">
        <div class="demo-cell">1</div>
        <div class="demo-cell span[2]">span[2]</div>
        <div class="demo-cell rowSpan[2]">rowSpan[2]</div>
        <div class="demo-cell">4</div>
        <div class="demo-cell">5</div>
        <div class="demo-cell">6</div>
      </div>
      <div class="grid_cols[4]_gap[12px]">
        <div class="demo-cell col[2/4]">col[2/4]</div>
        <div class="demo-cell col[1/-1]">col[1/-1]</div>
      </div>
      <div class="grid_cols[3]_flow[row-dense]_gap[12px]">
        <div class="demo-cell span[2]">span[2]</div>
        <div v-for="i in 3" :key="i" class="demo-cell">{{ i }}</div>
      </div>
    </section>

    <!-- 9. grid 单元格对齐 -->
    <section class="flex_col_gap[10px]">
      <div class="demo-label">
        9. 单元格对齐：justifyItems[center]_items[center] / self[end] / justifySelf[end] / content[between]
      </div>
      <div class="grid_cols[3]_gap[12px]_justifyItems[center]_items[center] h[96px]">
        <div class="demo-cell h[44px] w[120px]">居中</div>
        <div class="demo-cell h[44px] w[120px]">居中</div>
        <div class="demo-cell h[44px] w[120px]">居中</div>
      </div>
      <div class="grid_cols[3]_items[start]_gap[12px] h[100px]">
        <div class="demo-cell self[end]">self[end]</div>
        <div class="demo-cell self[center]">self[center]</div>
        <div class="demo-cell w[100px] justifySelf[end]">justifySelf[end]</div>
      </div>
      <div class="grid_cols[2]_rows[44px,44px]_content[between]_gap[12px] h[200px]">
        <div v-for="i in 4" :key="i" class="demo-cell">{{ i }}</div>
      </div>
    </section>

    <!-- 10. 组合：列表工具条 -->
    <section class="flex_col_gap[10px]">
      <div class="demo-label">10. 组合：两端对齐 + 底部对齐的工具条</div>
      <div class="flex_row_justify[between]_items[end]_gap[12px]">
        <div class="flex_row_items[end]_gap[12px]">
          <div class="demo-cell w[200px] h[36px]">搜索框</div>
          <div class="demo-cell w[120px] h[36px]">筛选</div>
        </div>
        <div class="flex_row_items[end]_gap[12px]">
          <div class="demo-cell w[64px] h[32px]">重置</div>
          <div class="demo-cell w[64px] h[36px]">新增</div>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
  /* 示例说明文字：仅用于标注，不属于布局演示内容 */
  .demo-label {
    font-size: 13px;
    line-height: 1.6;
    color: #606266;
  }

  /* 示例方块：只承载"看得见"的背景与边框，布局全部由类名控制 */
  .demo-cell {
    box-sizing: border-box;
    padding: 10px 12px;
    min-height: 44px;
    background: #f5f7fa;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    font-size: 12px;
    line-height: 1.4;
    color: #303133;
    text-align: center;
  }
</style>
