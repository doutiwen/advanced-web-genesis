<template>
  <!-- 表格列表容器 -->
  <div
    :class="['record-list-wrapper', props.recordListWrapClass]"
    ref="tableBodyRef"
  >
    <!-- 虚拟表格组件：支持自适应高度和树形数据 -->
    <el-auto-resizer>
      <template #default="{ height, width }">
        <el-table-v2
          :data="list"
          :columns="virtualColumns"
          :row-key="props.rowKeyName"
          :tree-props="treeProps"
          :height="height"
          :width="width"
          :row-height="50"
          v-loading="loading"
          v-bind="props.attrs"
          v-on="virtualTableEvents"
          ref="virtualTableRef"
        />
      </template>
    </el-auto-resizer>

    <!-- 分页组件 -->
    <el-pagination
      v-if="props.showPagination"
      class="pagination"
      v-model:current-page="pageNum"
      v-model:page-size="pageSize"
      :total="totalNum"
      :page-sizes="[10, 20, 50, 100]"
      v-bind="props.paginationConfig"
      layout="total, sizes, prev, pager, next, jumper"
    ></el-pagination>
  </div>
</template>

<script setup>
  /**
   * RecordListV2 - 虚拟滚动表格列表组件
   *
   * 【组件功能】
   * 基于 Element Plus el-table-v2 封装的虚拟滚动表格列表组件，
   * 适用于大数据量场景，支持多种列类型渲染、批量选择、分页等功能。
   *
   * 【核心特性】
   * 1. 虚拟滚动：支持大数据量渲染，性能优秀
   * 2. 自适应高度：通过 el-auto-resizer 自动适应容器大小
   * 3. 动态列渲染：根据 columnsConfig 配置动态生成表格列
   * 4. 批量选择：支持跨页批量选择
   * 5. 分页：内置分页组件
   * 6. 插槽支持：支持通过插槽自定义列渲染
   */

  import {
    nextTick,
    toRefs,
    toValue,
    watch,
    onMounted,
    onBeforeUnmount,
    shallowRef,
    ref,
    computed,
    h,
    useSlots,
  } from 'vue';
  import {
    ElButton,
    ElSwitch,
    ElCheckbox,
    ElInput,
    ElInputNumber,
    ElSelect,
    ElOption,
    ElPopconfirm,
  } from 'element-plus';
  import { useRecordList, recordListProps, recordListEmits } from '../common/recordList.js';

  /**
   * 组件属性定义
   */
  const props = defineProps(recordListProps);

  /**
   * 组件事件定义
   */
  const emits = defineEmits(recordListEmits);

  /**
   * 虚拟表格组件引用
   */
  const virtualTableRef = ref();

  /**
   * 上下文符号，用于存储行级状态
   */
  const ctxSymbol = Symbol;

  /**
   * 非 props 属性
   */
  const attrs = useAttrs();

  /**
   * 获取插槽对象，用于检测是否存在对应列的自定义插槽
   */
  const slots = useSlots();

  /**
   * 检查指定列是否存在对应的自定义插槽
   * @param {string} columnKey - 列配置的 key
   * @returns {boolean} 是否存在插槽
   */
  const hasColumnSlot = (columnKey) => {
    const slotName = `recordList-column-${columnKey}`;
    return !!slots[slotName];
  };

  /**
   * 渲染插槽内容为 VNode
   * @param {string} columnKey - 列配置的 key
   * @param {Object} rowData - 行数据
   * @returns {VNode} 渲染的 VNode
   */
  const renderColumnSlot = (columnKey, rowData) => {
    const slotName = `recordList-column-${columnKey}`;
    const slotFn = slots[slotName];
    if (slotFn) {
      // 调用插槽函数并传入作用域参数
      const slotContent = slotFn({ rowData, colData: rowData[columnKey] });
      // 包装为 VNode 返回
      return h('div', { class: 'slot-cell-wrapper' }, slotContent);
    }
    return null;
  };

  /**
   * 表格列渲染函数集合
   * 定义各列类型的渲染逻辑
   */
  const columnRenderers = {
    /**
     * 默认文本列渲染
     */
    default: ({ column, rowData }) => {
      // 优先检查是否存在自定义插槽
      if (hasColumnSlot(column.key)) {
        return renderColumnSlot(column.key, rowData);
      }
      return h('span', rowData[column.key] ?? '-');
    },

    /**
     * 序号列渲染
     */
    index: ({ rowData }) => {
      return h('span', rowData[ctxSymbol.for('index')] ?? '-');
    },

    /**
     * 自定义渲染列渲染
     * 优先使用插槽渲染，若无插槽则显示默认文本
     */
    custom: ({ column, rowData }) => {
      // 优先检查是否存在自定义插槽
      if (hasColumnSlot(column.key)) {
        return renderColumnSlot(column.key, rowData);
      }
      return h('span', rowData[column.key] ?? '-');
    },

    /**
     * 链接列渲染
     */
    link: ({ column, rowData }) => {
      // 优先检查是否存在自定义插槽
      if (hasColumnSlot(column.key)) {
        return renderColumnSlot(column.key, rowData);
      }
      return h(
        ElButton,
        {
          size: 'small',
          link: true,
          type: 'primary',
          onClick: () => columnEventHandler(column, rowData),
        },
        () => rowData[column.key]
      );
    },

    /**
     * 弹窗列渲染
     */
    openModal: ({ column, rowData }) => {
      // 优先检查是否存在自定义插槽
      if (hasColumnSlot(column.key)) {
        return renderColumnSlot(column.key, rowData);
      }
      return h(
        ElButton,
        {
          size: 'small',
          link: true,
          type: 'primary',
          onClick: () => columnEventHandler(column, rowData),
        },
        () =>
          typeof column.text === 'function'
            ? column.text(rowData)
            : (column.text ?? rowData[column.key])
      );
    },

    /**
     * 可编辑表单项列渲染
     */
    formItem: ({ column, rowData }) => {
      // 优先检查是否存在自定义插槽
      if (hasColumnSlot(column.key)) {
        return renderColumnSlot(column.key, rowData);
      }
      // 简化处理：直接显示表单值
      const formItemConfig = column.formItemConfig;
      const value = formData.value[rowData[props.rowKeyName]]?.[column.key] ?? rowData[column.key];

      switch (formItemConfig?.type) {
        case 'switch':
          return h(ElSwitch, {
            modelValue: value,
            disabled: rowData[ctxSymbol.for('formItemDisable')],
            onChange: (val) => {
              formItemInputEventHandler(column, rowData, val);
            },
          });
        case 'checkbox':
          return h(ElCheckbox, {
            modelValue: value,
            disabled: rowData[ctxSymbol.for('formItemDisable')],
            onChange: (val) => {
              formItemInputEventHandler(column, rowData, val);
            },
          });
        case 'input':
          return h(ElInput, {
            modelValue: value,
            disabled: rowData[ctxSymbol.for('formItemDisable')],
            'onUpdate:modelValue': (val) => {
              formItemInputEventHandler(column, rowData, val);
            },
            clearable: true,
            ...(formItemConfig?.attrs || {}),
          });
        case 'number':
          return h(ElInputNumber, {
            modelValue: value,
            disabled: rowData[ctxSymbol.for('formItemDisable')],
            'onUpdate:modelValue': (val) => {
              formItemInputEventHandler(column, rowData, val);
            },
            ...(formItemConfig?.attrs || {}),
          });
        case 'select':
          return h(
            ElSelect,
            {
              modelValue: value,
              disabled: rowData[ctxSymbol.for('formItemDisable')],
              onChange: (val) => {
                formItemInputEventHandler(column, rowData, val);
              },
              clearable: true,
              ...(formItemConfig?.attrs || {}),
            },
            {
              default: () =>
                (column.options || []).map((optionItem) =>
                  h(ElOption, {
                    key: optionItem.value,
                    label: optionItem.label,
                    value: optionItem.value,
                    ...(optionItem.optionAttrs || {}),
                  })
                ),
            }
          );
        default:
          return h('span', value ?? '-');
      }
    },

    /**
     * 操作列渲染
     */
    operater: ({ column, rowData }) => {
      const buttons = [];
      for (const operaterItem of column.list) {
        // 检查按钮显示状态
        if (!rowData[ctxSymbol.for(`operater-${operaterItem.key}-show`)]) {
          continue;
        }

        if (operaterItem.type === 'button') {
          buttons.push(
            h(
              ElButton,
              {
                size: 'small',
                link: true,
                type: 'primary',
                onClick: () => operaterItemEventHandler(operaterItem, rowData),
              },
              () => operaterItem.text
            )
          );
        } else if (operaterItem.type === 'confirm') {
          buttons.push(
            h(
              ElPopconfirm,
              {
                title: `是否确认${operaterItem.text}？`,
                onConfirm: () => operaterItemEventHandler(operaterItem, rowData, 'confirm'),
                onCancel: () => operaterItemEventHandler(operaterItem, rowData, 'cancel'),
              },
              {
                reference: () =>
                  h(
                    ElButton,
                    {
                      size: 'small',
                      link: true,
                      type: 'primary',
                    },
                    () => operaterItem.text
                  ),
              }
            )
          );
        } else if (operaterItem.type === 'openModal') {
          buttons.push(
            h(
              ElButton,
              {
                size: 'small',
                link: true,
                type: 'primary',
                onClick: () => operaterItemEventHandler(operaterItem, rowData),
              },
              () => operaterItem.text
            )
          );
        }
      }

      return h(
        'div',
        { class: 'operater_wrapper' },
        buttons.map((btn, index) => h('span', { key: index, style: { marginRight: '8px' } }, [btn]))
      );
    },

    /**
     * 文件列表列渲染
     */
    fileList: ({ column, rowData }) => {
      // 优先检查是否存在自定义插槽
      if (hasColumnSlot(column.key)) {
        return renderColumnSlot(column.key, rowData);
      }
      const files = rowData[column.key] || [];
      if (files.length === 0) {
        return h('span', '-');
      }
      return h(
        'span',
        files.map((file) => h('span', { key: file.id, style: { marginRight: '4px' } }, [file.name]))
      );
    },
  };

  /**
   * 解析列宽度配置
   * el-table-v2 要求 width 为像素数值，需将各种格式转换为合理的像素值
   * - number 类型：直接作为像素值
   * - 字符串数字（如 '8'）：视为比例值，按容器宽度和总比例分配
   * - undefined/null：使用默认值
   * @param {Object[]} columnList - 列配置列表
   * @param {number} containerWidth - 容器宽度
   * @returns {number[]} 像素宽度数组
   */
  const parseColumnWidths = (columnList, containerWidth = 1200) => {
    const DEFAULT_WIDTH = 150;
    const MIN_WIDTH = 60;

    // 区分固定像素列和比例列
    const proportionColumns = [];
    let totalProportion = 0;
    let usedPixels = 0;

    for (const col of columnList) {
      const rawWidth = col.width;
      if (typeof rawWidth === 'number' && !isNaN(rawWidth) && rawWidth > 0) {
        // 数值类型：直接作为像素
        usedPixels += rawWidth;
      } else if (typeof rawWidth === 'string' && !isNaN(Number(rawWidth)) && Number(rawWidth) > 0) {
        // 字符串数字：视为比例值
        proportionColumns.push({ col, proportion: Number(rawWidth) });
        totalProportion += Number(rawWidth);
      } else {
        // 无宽度配置：使用默认值
        proportionColumns.push({ col, proportion: DEFAULT_WIDTH });
        totalProportion += DEFAULT_WIDTH;
      }
    }

    // 计算比例列的像素宽度
    const availablePixels = Math.max(containerWidth - usedPixels, MIN_WIDTH * columnList.length);
    const result = {};

    for (const { col, proportion } of proportionColumns) {
      const pixelWidth = Math.max(
        Math.round((proportion / totalProportion) * availablePixels),
        MIN_WIDTH
      );
      result[col.key] = pixelWidth;
    }

    // 处理固定像素列
    for (const col of columnList) {
      const rawWidth = col.width;
      if (typeof rawWidth === 'number' && !isNaN(rawWidth) && rawWidth > 0) {
        result[col.key] = rawWidth;
      } else if (!(col.key in result)) {
        result[col.key] = DEFAULT_WIDTH;
      }
    }

    return result;
  };

  /**
   * 虚拟表格列配置
   * 将 columnsConfig 转换为 el-table-v2 所需的格式
   */
  const virtualColumns = computed(() => {
    const columnsList = [];

    // 批量选择列
    if (props.selectMode) {
      columnsList.push({
        key: 'selection',
        dataKey: 'selection',
        title: '',
        width: 55,
        align: 'center',
        cellRenderer: ({ rowData }) => {
          return h('input', {
            type: 'checkbox',
            checked: selectedRowKeys.value.includes(rowData[props.rowKeyName]),
            onChange: (e) => toggleRowSelection(rowData, e.target.checked),
          });
        },
      });
    }

    // 计算列像素宽度映射（使用容器实际宽度）
    const widthMap = parseColumnWidths(columns.value, wrapWidth.value);

    // 动态列
    for (const column of columns.value) {
      const columnConfig = {
        key: column.key,
        dataKey: column.key,
        title: column.title,
        width: widthMap[column.key] || 150,
        align: column.align || 'left',
      };

      // 设置自定义渲染函数
      const renderer = columnRenderers[column.type];
      if (renderer) {
        columnConfig.cellRenderer = ({ rowData }) => renderer({ column, rowData });
      } else {
        // 默认渲染（支持插槽）
        columnConfig.cellRenderer = ({ rowData }) => {
          if (hasColumnSlot(column.key)) {
            return renderColumnSlot(column.key, rowData);
          }
          return h('span', rowData[column.key] ?? '-');
        };
      }

      columnsList.push(columnConfig);
    }

    return columnsList;
  });

  /**
   * 使用表格列表核心 hook，获取状态和方法
   */
  const {
    list,
    columns,
    pageNum,
    pageSize,
    totalNum,
    loading,
    formData,
    formItemInputEventHandler,
    operaterItemEventHandler,
    columnEventHandler,
    setFilterParams,
    clearFilterParams,
    setSorterParams,
    clearSorterParams,
    getListData,
    search,
    getRecordList,
    defineExposeConfig,
  } = useRecordList({ ...toRefs(props), ...attrs }, emits, null, ElMessage.success, null);

  /**
   * 已选中的行 keys
   */
  const selectedRowKeys = ref([]);

  /**
   * 树形数据属性配置
   * 自动检测数据是否为树形结构（任意行是否包含 children 字段），若是则返回 tree-props 配置
   * 默认使用 'children' 作为子节点字段名
   */
  const treeProps = computed(() => {
    const data = list.value;
    if (!data || data.length === 0) {
      return undefined;
    }
    // 检测是否存在任意行包含 children 字段（判断是否为树形数据）
    const hasTreeData = data.some(
      (row) => row.children !== undefined && Array.isArray(row.children)
    );
    if (hasTreeData) {
      return {
        children: 'children',
        hasChildren: 'hasChildren',
      };
    }
    return undefined;
  });

  /**
   * 收集行数据及其所有子节点的 rowKey
   * @param {Object} rowData - 行数据
   * @returns {Array} 所有关联的 rowKey 数组
   */
  const collectRowKeys = (rowData) => {
    const keys = [rowData[props.rowKeyName]];
    if (rowData.children && Array.isArray(rowData.children)) {
      for (const child of rowData.children) {
        keys.push(...collectRowKeys(child));
      }
    }
    return keys;
  };

  /**
   * 切换行选中状态
   * 支持树形数据：选中父节点时自动选中所有子节点
   * @param {Object} rowData - 行数据
   * @param {boolean} selected - 是否选中
   */
  const toggleRowSelection = (rowData, selected) => {
    // 获取当前行及其所有子节点的 key
    const keysToToggle = collectRowKeys(rowData);

    if (selected) {
      for (const key of keysToToggle) {
        if (!selectedRowKeys.value.includes(key)) {
          selectedRowKeys.value.push(key);
        }
      }
    } else {
      selectedRowKeys.value = selectedRowKeys.value.filter((key) => !keysToToggle.includes(key));
    }
    recordListSelectEvent();
  };

  /**
   * 虚拟表格事件处理
   */
  const virtualTableEvents = {
    /**
     * 虚拟表格点击事件
     */
    clickRow: ({ rowData }) => {
      console.log('虚拟表格点击', rowData);
    },
  };

  /**
   * 递归获取所有行（包括子节点）
   * @param {Array} rows - 行数据数组
   * @returns {Array} 扁平化的所有行
   */
  const getAllRows = (rows) => {
    const result = [];
    for (const row of rows) {
      result.push(row);
      if (row.children && Array.isArray(row.children)) {
        result.push(...getAllRows(row.children));
      }
    }
    return result;
  };

  /**
   * 表格行选择事件处理器
   * 支持树形数据，递归获取所有选中的行
   */
  const recordListSelectEvent = () => {
    const allRows = getAllRows(list.value);
    const selectedRows = allRows.filter((row) =>
      selectedRowKeys.value.includes(row[props.rowKeyName])
    );
    emits('selectRows', { rows: selectedRows, pageNum: pageNum.value });
  };

  /**
   * 监听选择模式变化
   */
  watch(
    () => props.selectMode,
    (n) => {
      if (!n) {
        selectedRowKeys.value = [];
      }
    }
  );

  /**
   * 暴露方法给父组件
   */
  defineExpose({
    ...defineExposeConfig,
    /**
     * 切换行选中状态
     */
    toggleRowSelection,
    /**
     * 获取已选中的行 keys
     */
    getSelectedRowKeys: () => selectedRowKeys.value,
  });

  /**
   * 表格容器尺寸
   */
  const tableBodyRef = shallowRef();
  const wrapHeight = ref();
  const wrapWidth = ref(1200);

  const setWrapSize = () => {
    if (tableBodyRef.value) {
      wrapHeight.value = tableBodyRef.value.clientHeight;
      wrapWidth.value = tableBodyRef.value.clientWidth;
    }
  };

  let setWrapSizeThrottleTimer;
  const setWrapSizeThrottle = () => {
    if (!setWrapSizeThrottleTimer) {
      setWrapSizeThrottleTimer = setTimeout(() => {
        setWrapSize();
        setWrapSizeThrottleTimer = null;
      }, 300);
    }
  };

  onMounted(() => {
    nextTick(() => {
      setWrapSize();
    });
    window.addEventListener('resize', setWrapSizeThrottle);
  });

  // 组件卸载时移除事件监听
  onBeforeUnmount(() => {
    window.removeEventListener('resize', setWrapSizeThrottle);
  });
</script>

<style lang="scss" scoped>
  /**
   * 分页组件样式
   */
  .pagination {
    margin-top: 15px;
    justify-content: flex-end;
  }

  /**
   * 操作列按钮样式
   */
  .operater_wrapper {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }

  /**
   * 插槽单元格包装器样式
   */
  .slot-cell-wrapper {
    width: 100%;
    height: 100%;
  }
</style>
