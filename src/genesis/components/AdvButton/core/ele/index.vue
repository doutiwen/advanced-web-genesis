<template>
  <!-- 高级按钮组件 -->
  <!-- 根据权限控制显示，支持节流点击和异步加载状态 -->
  <el-button
    v-bind="_attrs"
    :loading="isLoading || _attrs.loading"
    @click="throttleClick"
  >
    <!-- 插槽透传：按钮插槽（不含 modal- 前缀的弹窗插槽）透传给 el-button -->
    <template
      v-for="(_, slotName) in buttonSlots"
      #[slotName]="slotProps"
    >
      <slot
        :name="slotName"
        v-bind="slotProps || {}"
      />
    </template>
  </el-button>

  <!-- 传入 modal 配置时自动挂载高级弹窗，点击按钮仅打开该弹窗 -->
  <AdvModal
    v-if="props.modal"
    ref="modalRef"
    :config="props.modal"
    @modalOpen="(payload) => emit('modalOpen', payload)"
    @modalClose="(payload) => emit('modalClose', payload)"
    @reloadList="() => emit('reloadList')"
  >
    <!-- 弹窗插槽透传：使用 modal- 前缀与 el-button 插槽区分，如 #modal-content -->
    <template
      v-for="(_, slotName) in modalSlots"
      #[slotName]="slotProps"
    >
      <slot
        :name="`modal-${slotName}`"
        v-bind="slotProps || {}"
      />
    </template>
  </AdvModal>
</template>

<script setup>
  /**
   * AdvButton 高级按钮组件
   *
   * 【组件功能】
   * 基于 Element Plus el-button 封装的高级按钮组件，支持权限控制、节流点击、异步加载状态和确认弹窗。
   *
   * 【核心特性】
   * 1. 权限控制：根据 buttonId 和路由元信息判断是否显示按钮
   * 2. 节流点击：支持配置 throttleTime 防止重复快速点击
   * 3. 异步加载：异步 onClick 函数自动显示 loading 状态
   * 4. 确认弹窗：支持配置 confirm 显示确认对话框后再执行 onClick
   * 5. 插槽透传：支持 el-button 的所有插槽
   *
   * 【Props 属性】
   * | 属性名 | 类型 | 说明 |
   * |--------|------|------|
   * | buttonId | String | 按钮权限标识，用于权限控制 |
   * | throttleTime | Number | 节流时间（毫秒），大于 0 时启用节流 |
   * | onClick | Function | 点击回调函数，支持同步和异步 |
   * | confirm | Boolean \| Object | 再次确认配置；true 使用默认值，对象支持下方字段 |
   * | download | String \| Blob \| Object \| Function | 下载配置；传入后点击执行下载，不再执行 onClick |
   * | modal | Object | 弹窗配置；传入后自动挂载 AdvModal，点击仅打开该弹窗（优先级最高） |
   * | modalPayload | Any \| Function | 打开 modal 时的入参，如表格行数据 |
   *
   * 【confirm 配置】
   * | 字段 | 默认值 | 说明 |
   * |------|--------|------|
   * | title | '提示' | 确认框标题 |
   * | notice | '是否确认执行此操作？' | 正文，支持 (event) => string \| Promise<string> |
   * | okText | '确认' | 确认按钮文案 |
   * | cancelText | '取消' | 取消按钮文案 |
   * | type | 'warning' | 图标类型 |
   * | attrs | {} | 透传给底层确认框的选项（ele 专属键见 ui/ant.js 映射表） |
   * | beforeConfirm | 无 | 返回 false 时跳过确认，直接执行 onClick |
   * | onCancel | 无 | 取消/关闭确认框时回调，参数为点击事件 |
   *
   * 【download 配置】
   * | 形态 | 说明 |
   * |------|------|
   * | String | 直链地址，文件名取 URL 末段 |
   * | Blob / File | 二进制数据，File 自动取 name 作文件名 |
   * | Object | { url?, blob?, filename?/name?, onSuccess?, onError? }，url 与 blob 二选一 |
   * | Function | () => String \| Blob \| Object \| Promise，点击时取数 |
   * 组件内不发起请求；文件名兜底：filename > File.name > URL 末段 > download_时间戳。
   * 可与 confirm 组合（先确认后下载），下载期间自动 loading。
   *
   * 【弹窗插槽】
   * 以 modal- 前缀传入弹窗插槽（前缀会被去掉后交给 AdvModal），例如 #modal-content / #modal-footer。
   *
   * 【使用示例】
   * <template>
   *   <!-- 基础使用 -->
   *   <AdvButton onClick="handleClick">点击按钮</AdvButton>
   *
   *   <!-- 权限控制 -->
   *   <AdvButton buttonId="add_user" onClick="handleAdd">添加用户</AdvButton>
   *
   *   <!-- 节流点击（500ms） -->
   *   <AdvButton :throttleTime="500" onClick="handleSubmit">提交</AdvButton>
   *
   *   <!-- 异步加载（自动显示 loading） -->
   *   <AdvButton onClick="asyncHandleSave">保存</AdvButton>
   *
   *   <!-- 确认弹窗 -->
   *   <AdvButton confirm onClick="handleDelete">删除</AdvButton>
   *
   *   <!-- 确认弹窗（自定义配置） -->
   *   <AdvButton :confirm="{ notice: '确定要删除这条数据吗？' }" onClick="handleDelete">删除</AdvButton>
   *
   *   <!-- 条件确认：满足条件时才弹出确认框 -->
   *   <AdvButton :confirm="{ beforeConfirm: (e) => needConfirm }" onClick="handleSubmit">提交</AdvButton>
   *
   *   <!-- 点击打开弹窗：modal 传入单个弹窗配置 -->
   *   <AdvButton :modal="{ title: '新增', form: formConfig, okButton: { onClick: handleSave } }">
   *     新增
   *   </AdvButton>
   *
   *   <!-- 直链下载：文件名取 URL 末段 -->
   *   <AdvButton download="/static/template.xlsx">下载模板</AdvButton>
   *
   *   <!-- 二进制数据下载：由调用方自行取数 -->
   *   <AdvButton :download="{ blob: excelBlob, filename: '订单.xlsx' }">导出</AdvButton>
   *
   *   <!-- 确认后下载 -->
   *   <AdvButton confirm :download="fileUrl">下载报表</AdvButton>
   * </template>
   */

  import { ref, computed, useSlots } from 'vue';
  import { useAdvButton, propsConfig } from '../common/index.js';
  import { useRoute } from 'vue-router';
  // 弹窗组件：传入 modal 配置时自动挂载
  import AdvModal from '@/genesis/components/AdvModal/index.js';
  // UI 能力门面：由 vite.config.js 的 @ui-kit 别名按 VITE_UI_LIB 指向 ele.js 或 ant.js，
  // 因此这里不再直接依赖 element-plus，实现文件与 UI 库解耦
  import ui from '@ui-kit';

  /**
   * 定义组件属性
   */
  const props = defineProps(propsConfig);

  defineOptions({
    inheritAttrs: false,
  });
  const attrs = useAttrs();
  const _attrs = { ...attrs };
  Reflect.deleteProperty(_attrs, 'onClick');

  /**
   * 获取当前路由信息
   */
  const route = useRoute();

  // 自动挂载的弹窗组件引用，点击按钮时调用其 openModal
  const modalRef = ref(null);

  // 插槽分流：modal- 前缀的交给弹窗，其余透传给 el-button
  const slots = useSlots();
  const buttonSlots = computed(() => {
    const result = {};
    for (const [name, slotFn] of Object.entries(slots)) {
      if (!name.startsWith('modal-')) {
        result[name] = slotFn;
      }
    }
    return result;
  });

  // 弹窗插槽集合：截取 modal- 前缀，如 #modal-content -> #content
  const modalSlots = computed(() => {
    const result = {};
    for (const [name, slotFn] of Object.entries(slots)) {
      if (name.startsWith('modal-')) {
        result[name.slice('modal-'.length)] = slotFn;
      }
    }
    return result;
  });

  /**
   * 弹窗事件：向父组件透传
   */
  const emit = defineEmits(['modalOpen', 'modalClose', 'reloadList']);

  /**
   * 使用按钮 Hook，获取显示状态、加载状态和点击处理函数
   */
  const { isLoading, throttleClick } = useAdvButton(props, attrs, route, ui, modalRef);
</script>
