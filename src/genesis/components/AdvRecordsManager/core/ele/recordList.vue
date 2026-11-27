<template>
  <!-- 表格列表容器 -->
  <div
    :class="['record-list-wrapper', props.wrapperClassName]"
    ref="tableBodyRef"
  >
    <!-- 表格组件 -->
    <el-table
      :data="list"
      :rowKey="props.rowKeyName"
      :style="props.style"
      :max-height="wrapHeight"
      v-loading="loading"
      v-bind="tableUiProps"
      v-on="props.UiEvents"
      ref="elTableRef"
      @select="recordListSelectEvent"
      @select-all="recordListSelectEvent"
      @filter-change="recordListFiltersEvent"
      @sort-change="recordListSortEvent"
    >
      <!-- 勾选列 -->
      <el-table-column
        v-if="selectMode"
        :selectable="props.UiProps?.selectable || null"
        type="selection"
        width="55"
      ></el-table-column>

      <!-- 树形数据占位列：仅列表数据为树形结构时渲染 -->
      <el-table-column
        v-if="isTreeList"
        key="empty"
        fixed="left"
        width="50"
      />

      <!-- 动态列 -->
      <el-table-column
        v-for="column in columns"
        :min-width="column.type === 'index' ? 0 : column.width"
        :width="column.type === 'index' ? column.width : 'auto'"
        v-bind="column.UiProps"
        :key="column.key"
        :prop="column.key"
        :label="column.title"
        type="default"
      >
        <template
          #default="scope"
          v-if="column.type"
        >
          <!-- 序号列（index 类型）：数据源为行数据中的 Symbol.for('index')，树形数据按层级内缩 -->
          <span
            v-if="column.type === 'index'"
            :style="{
              paddingLeft: isTreeList
                ? `${((scope.row[ctxSymbol.for('level')] || 1) - 1) * 12}px`
                : undefined,
            }"
          >
            {{ scope.row[ctxSymbol.for('index')] }}
          </span>

          <!-- 自定义渲染列 -->
          <slot
            v-if="column.type === 'custom'"
            :name="`recordList-column-${column.key}`"
            :rowData="scope.row"
            :colData="scope.row[column.key]"
          ></slot>

          <!-- 链接列 -->
          <AdvButton
            v-if="column.type === 'link'"
            @click="columnEventHandler(column, scope.row)"
            size="small"
            link
            type="primary"
          >
            {{ scope.row[column.key] }}
          </AdvButton>

          <!-- 弹窗列（openModal 类型）：按钮自带 modal，行数据作为打开入参 -->
          <AdvButton
            v-if="column.type === 'openModal'"
            :modal="column.modal"
            :modalPayload="scope.row[ctxSymbol.for('originalData')] ?? scope.row"
            @click="columnEventHandler(column, scope.row)"
            @reloadList="getListData"
            size="small"
            link
            type="primary"
            v-bind="column.UiProps"
          >
            {{
              typeof column.text === 'function'
                ? column.text(scope.row)
                : (column.text ?? scope.row[column.key])
            }}
          </AdvButton>

          <!-- 可编辑表单项列 -->
          <template v-if="column.type === 'formItem'">
            <!-- 开关 -->
            <el-switch
              v-if="column.formItemConfig.type === 'switch'"
              :disabled="scope.row[ctxSymbol.for('formItemDisable')]"
              v-model="formData[scope.row[props.rowKeyName]][column.key]"
              @change="(e) => formItemInputEventHandler(column, scope.row, e)"
              v-bind="column.formItemConfig.UiProps"
            />
            <!-- 复选框 -->
            <el-checkbox
              v-if="column.formItemConfig.type === 'checkbox'"
              :disabled="scope.row[ctxSymbol.for('formItemDisable')]"
              v-model="formData[scope.row[props.rowKeyName]][column.key]"
              @change="(e) => formItemInputEventHandler(column, scope.row, e)"
              v-bind="column.formItemConfig.UiProps"
            >
              {{ column.UiProps.label }}
            </el-checkbox>
            <!-- 输入框 -->
            <el-input
              v-else-if="column.formItemConfig.type === 'input'"
              :disabled="scope.row[ctxSymbol.for('formItemDisable')]"
              v-model="formData[scope.row[props.rowKeyName]][column.key]"
              @change="(e) => formItemInputEventHandler(column, scope.row, e)"
              v-bind="column.formItemConfig.UiProps"
              clearable
            />
            <!-- 数字输入框 -->
            <el-input-number
              v-else-if="column.formItemConfig.type === 'number'"
              :disabled="scope.row[ctxSymbol.for('formItemDisable')]"
              v-model.number="formData[scope.row[props.rowKeyName]][column.key]"
              @change="(e) => formItemInputEventHandler(column, scope.row, e)"
              v-bind="column.formItemConfig.UiProps"
            />
            <!-- 下拉选择 -->
            <el-select
              v-else-if="column.formItemConfig.type === 'select'"
              :disabled="scope.row[ctxSymbol.for('formItemDisable')]"
              v-model="formData[scope.row[props.rowKeyName]][column.key]"
              @change="(e) => formItemInputEventHandler(column, scope.row, e)"
              v-bind="column.formItemConfig.UiProps"
              clearable
            >
              <el-option
                v-for="optionItem in column.options"
                :key="optionItem.value"
                :label="optionItem.label"
                :value="optionItem.value"
                v-bind="optionItem.optionAttrs"
              />
            </el-select>
            <!-- 树形选择 -->
            <el-tree-select
              v-else-if="column.formItemConfig.type === 'treeSelect'"
              :disabled="scope.row[ctxSymbol.for('formItemDisable')]"
              v-model="formData[scope.row[props.rowKeyName]][column.key]"
              :tree-data="column.options"
              :dropdown-style="{ maxHeight: '400px', overflow: 'auto' }"
              @change="(e) => formItemInputEventHandler(column, scope.row, e)"
              v-bind="column.formItemConfig.UiProps"
            />
          </template>

          <!-- 文件列表列 -->
          <template v-if="column.type === 'fileList'">
            <el-popover
              v-for="fileItem in scope.row[column.key]"
              :key="fileItem.id || fileItem.name"
              :title="column.title"
              trigger="hover"
            >
              <!-- reference 为 hover 触发元素；缺失时弹层没有宿主，整个单元格不会渲染内容 -->
              <template #reference>
                <span class="fileList_download_btn">{{ fileItem.name }}</span>
              </template>
              <template
                v-if="fileItem.content"
                #default
              >
                <p v-if="fileItem.content.text">
                  {{ fileItem.content.text }}
                </p>
                <img
                  class="fileList_popover_pic"
                  v-else-if="fileItem.content.pic"
                  :src="fileItem.content.pic"
                />
              </template>
            </el-popover>
          </template>
        </template>
      </el-table-column>

      <!-- 操作列：由 operater 属性独立配置 -->
      <el-table-column
        v-if="props.operater"
        :key="props.operater.key || 'operater'"
        :prop="props.operater.key || 'operater'"
        :label="props.operater.title"
        :min-width="props.operater.width"
        :width="'auto'"
        v-bind="props.operater.UiProps"
      >
        <template #default="scope">
          <div class="operater_wrapper">
            <template
              v-for="operaterItem in props.operater.buttons"
              :key="operaterItem.key"
            >
              <template v-if="scope.row[ctxSymbol.for(`operater-${operaterItem.key}-show`)]">
                <!-- 统一按钮：confirm / download / modal 由 AdvButton 处理 -->
                <AdvButton
                  v-if="operaterItem.type !== 'formItemOperater'"
                  v-bind="resolveOperaterButtonProps(operaterItem, scope.row)"
                >
                  {{ operaterItem.text }}
                </AdvButton>

                <!-- 表单操作器 -->
                <template v-else>
                  <AdvButton
                    v-if="scope.row[ctxSymbol.for('formItemDisable')]"
                    link
                    size="small"
                    type="primary"
                    @click="() => operaterItemEventHandler(operaterItem, scope.row, 'entry')"
                  >
                    {{ operaterItem.text }}
                  </AdvButton>
                  <template v-else>
                    <el-button-group>
                      <AdvButton
                        size="small"
                        link
                        type="primary"
                        @click="() => operaterItemEventHandler(operaterItem, scope.row, 'submit')"
                        :loading="scope.row[ctxSymbol.for('operater-formItemOperater-loading')]"
                      >
                        保存
                      </AdvButton>
                      <AdvButton
                        size="small"
                        link
                        @click="() => operaterItemEventHandler(operaterItem, scope.row, 'exit')"
                      >
                        取消
                      </AdvButton>
                    </el-button-group>
                  </template>
                </template>
              </template>
            </template>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
  /**
   * RecordList - 表格列表组件
   *
   * 【组件功能】
   * 基于 Element Plus el-table 封装的高级表格列表组件，
   * 支持多种列类型渲染、批量选择、排序、筛选、分页等功能。
   *
   * 【组件架构】
   * RecordList (当前组件，UI层)
   *   ├── el-table (Element Plus 表格组件)
   *   ├── el-pagination (分页组件)
   *   └── useRecordList (核心 hook，业务逻辑)
   *
   * 【列类型说明】
   * | 类型 | 说明 |
   * |------|------|
   * | default | 默认文本列 |
   * | index | 序号列 |
   * | custom | 自定义渲染列（通过插槽） |
   * | link | 链接列（点击跳转/查看详情） |
   * | openModal | 弹窗列（点击打开弹窗） |
   * | formItem | 可编辑表单项列（开关、输入框、选择器等） |
   * | fileList | 文件列表列 |
   *
   * 【操作列】
   * 操作列由 operater 属性独立配置，结构为 { key, title, width, UiProps, buttons }，
   * 不再作为 cols 中的一种列类型。
   *
   * 【核心特性】
   * 1. 动态列渲染：根据 cols 配置动态生成表格列
   * 2. 批量选择：支持跨页批量选择
   * 3. 可编辑列：支持在表格内直接编辑表单元素
   * 4. 排序筛选：支持表格列排序和筛选
   * 5. 分页：内置分页组件
   */

  import {
    nextTick,
    toRefs,
    toValue,
    watchEffect,
    useAttrs,
    ref,
    onMounted,
    shallowRef,
    computed,
  } from 'vue';
  import { ElMessage } from 'element-plus';
  import { useRecordList, recordListProps, recordListEmits } from '../common/recordList.js';
  // 按钮统一由 AdvButton 渲染
  import AdvButton from '@common/components/AdvButton';

  /**
   * 组件属性定义
   */
  const props = defineProps(recordListProps);

  /**
   * 组件事件定义
   */
  const emits = defineEmits(recordListEmits);

  /**
   * 表格 UI 属性
   * selectable 仅用于批量选择列，不向下透传给 el-table
   */
  const tableUiProps = computed(() => {
    const { selectable, ...restUiProps } = props.UiProps || {};
    return restUiProps;
  });

  /**
   * 表格组件引用
   */
  const elTableRef = shallowRef();

  /**
   * 上下文符号，用于存储行级状态
   */
  const ctxSymbol = Symbol;

  /**
   * 非 props 属性
   */
  const attrs = useAttrs();

  /**
   * 设置列筛选列表
   * @param {Object} columnItem - 列配置项
   * @param {Array} columnList - 列列表
   */
  const setFilterList = (columnItem, columnList) => {
    if (!columnItem.UiProps) {
      columnItem.UiProps = {
        filters: [],
      };
    } else {
      columnItem.UiProps.filters = [];
    }

    if (getVarType(columnItem.getFilterList) === 'asyncFunction') {
      // 异步获取筛选列表
      columnItem.getFilterList().then((filtersList) => {
        toRef(columnItem.UiProps, 'filters').value = filtersList;
      });
    } else if (getVarType(columnItem.getFilterList) === 'function') {
      // 同步获取筛选列表
      const filtersList = columnItem.getFilterList();
      toRef(columnItem.UiProps, 'filters').value = filtersList;
    }
  };

  // 分页切换 / 外部设置勾选后，回显已勾选行
  const renderSelectedRowCallback = (rows) => {
    for (const row of rows) {
      elTableRef.value.toggleRowSelection(row, true);
    }
  };

  // 清空表格勾选
  const clearSelectedRowCallback = () => {
    elTableRef.value?.clearSelection();
  };

  /**
   * 使用表格列表核心 hook，获取状态和方法
   */
  const {
    list,
    columns,
    loading,
    formData,
    selectMode,
    formItemInputEventHandler,
    operaterItemEventHandler,
    resolveOperaterButtonProps,
    columnEventHandler,
    setFilterParams,
    clearFilterParams,
    setSorterParams,
    clearSorterParams,
    getListData,
    search,
    getRecordList,
    defineExposeConfig,
    recordListSelectEvent,
  } = useRecordList(
    { ...toRefs(props), ...attrs },
    emits,
    setFilterList,
    ElMessage.success,
    renderSelectedRowCallback,
    clearSelectedRowCallback
  );

  /**
   * 当前数据是否为树形结构（存在带子节点的行）
   */
  const isTreeList = computed(() =>
    list.value.some((item) => Array.isArray(item.children) && item.children.length > 0)
  );

  /**
   * 筛选信息对象，存储当前筛选条件
   */
  const recordListFiltersInfo = {};

  /**
   * 表格筛选事件处理器
   * @param {Object} sourceFilters - 筛选条件对象
   */
  const recordListFiltersEvent = (sourceFilters) => {
    console.log('列表筛查', sourceFilters);
    if (sourceFilters) {
      for (const elRecordListColKey of Object.keys(sourceFilters)) {
        const columnIndex = Number(elRecordListColKey.replace(/^.+_(\d+)$/g, '$1')) - 1;
        const columnKey = props.cols[columnIndex].key;
        recordListFiltersInfo[columnKey] = [...sourceFilters[elRecordListColKey]];
        if (!recordListFiltersInfo[columnKey].length) {
          Reflect.deleteProperty(recordListFiltersInfo, columnKey);
        }
      }
    }

    if (Object.keys(recordListFiltersInfo).length) {
      setFilterParams(recordListFiltersInfo);
    } else {
      clearFilterParams();
    }
    search();
  };

  /**
   * 排序信息对象，存储当前排序条件
   */
  let recordListSortInfo = {};

  /**
   * 表格排序事件处理器
   * @param {Object} sorter - 排序信息对象
   * @param {string} sorter.prop - 排序字段
   * @param {string} sorter.order - 排序方向（ascending/descending）
   */
  const recordListSortEvent = (sorter) => {
    console.log('列表排序', sorter);
    if (sorter.order) {
      recordListSortInfo[sorter.prop] = sorter.order === 'ascending' ? 'asc' : 'desc';
    } else {
      recordListSortInfo = {};
    }
    if (Object.keys(recordListSortInfo).length) {
      setSorterParams(recordListSortInfo);
    } else {
      clearSorterParams();
    }
    search();
  };

  /**
   * 暴露方法给父组件
   */
  defineExpose(defineExposeConfig);

  /**
   * 表格高度计算
   */
  const wrapHeight = ref();
  const tableBodyRef = shallowRef();
  const setWrapHeight = () => {
    wrapHeight.value = tableBodyRef.value.clientHeight;
  };
  let setWrapHeightThrottleTimer;
  const setWrapHeightThrottle = () => {
    if (!setWrapHeightThrottleTimer) {
      setWrapHeightThrottleTimer = setTimeout(() => {
        setWrapHeight();
        setWrapHeightThrottleTimer = null;
      }, 300);
    }
  };
  // 使用 ResizeObserver 监听 el-table 父元素容器（tableBodyRef 所在 div）的高度变化，替代全局 window resize 事件
  let wrapResizeObserver;
  let lastWrapHeight = 0;
  onMounted(() => {
    nextTick(() => {
      setWrapHeight();
    });
    lastWrapHeight = tableBodyRef.value?.clientHeight ?? 0;
    wrapResizeObserver = new ResizeObserver(() => {
      const currentHeight = tableBodyRef.value?.clientHeight;
      if (currentHeight !== undefined && currentHeight !== lastWrapHeight) {
        lastWrapHeight = currentHeight;
        setWrapHeightThrottle();
      }
    });
    if (tableBodyRef.value) {
      wrapResizeObserver.observe(tableBodyRef.value);
    }
  });
  onUnmounted(() => {
    wrapResizeObserver?.disconnect();
  });
</script>

<style lang="scss" scoped>
  /**
   * 文件列表弹出框图片样式
   */
  .fileList_popover_pic {
    width: 100%;
    display: block;
  }

  /**
   * 文件下载按钮样式
   */
  .fileList_download_btn {
    display: inline-block;
    margin-right: 8px;
    cursor: pointer;
    color: #1890ff;
    font-size: 14px;
  }
</style>
