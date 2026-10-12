<template>
  <!-- 高级按钮组件 -->
  <!-- 根据权限控制显示，支持节流点击和异步加载状态 -->
  <a-button
    v-bind="_attrs"
    :loading="isLoading"
    @click="throttleClick"
  >
    <!-- 插槽透传：将所有插槽内容透传给 a-button -->
    <template
      v-for="(_, slotName) in $slots"
      #[slotName]="slotProps"
    >
      <slot
        :name="slotName"
        v-bind="slotProps || {}"
      />
    </template>
  </a-button>
</template>

<script setup>
  /**
   * AdvButton 高级按钮组件（Ant Design Vue 版）
   *
   * 【组件功能】
   * 基于 Ant Design Vue a-button 封装的高级按钮组件，支持节流点击、异步加载状态和确认弹窗。
   * 与 core/ele/index.vue 共用同一套业务逻辑（core/common/index.js），
   * 二者仅在 UI 层实现与 UI 能力注入上存在差异。
   *
   * 【核心特性】
   * 1. 节流点击：支持配置 throttleTime 防止重复快速点击
   * 2. 异步加载：异步 onClick 函数自动显示 loading 状态
   * 3. 确认弹窗：支持配置 confirm 显示确认对话框后再执行 onClick
   * 4. 插槽透传：支持 a-button 的所有插槽
   *
   * 【Props 属性】
   * | 属性名 | 类型 | 说明 |
   * |--------|------|------|
   * | throttleTime | Number \| String | 节流时间（毫秒），大于 0 时启用节流 |
   * | throttleNotice | String | 节流触发时的提示文案，默认"您点击过快，请稍后再试" |
   * | confirm | Boolean | 是否需要确认弹窗，为 true 时点击后先弹出确认对话框 |
   * | confirmNotice | String | 确认弹窗的提示消息，默认"是否确认执行此操作？" |
   *
   * 【与 ele 版的差异】
   * attrs 原样透传给 a-button，不做 props 语义转换，
   * 因此调用方需按 Ant Design Vue 规范书写按钮属性，例如：
   * 危险按钮写 type="primary" danger（而非 element 的 type="danger"），
   * 中号尺寸写 size="middle"（而非 element 的 size="default"），
   * 原生类型写 html-type（而非 element 的 native-type）。
   *
   * 【使用示例】
   * <template>
   *   <!-- 基础使用 -->
   *   <AdvButtonAnt onClick="handleClick">点击按钮</AdvButtonAnt>
   *
   *   <!-- 节流点击（500ms） -->
   *   <AdvButtonAnt :throttleTime="500" onClick="handleSubmit">提交</AdvButtonAnt>
   *
   *   <!-- 异步加载（自动显示 loading） -->
   *   <AdvButtonAnt onClick="asyncHandleSave">保存</AdvButtonAnt>
   *
   *   <!-- 确认弹窗 -->
   *   <AdvButtonAnt confirm onClick="handleDelete">删除</AdvButtonAnt>
   *
   *   <!-- 确认弹窗（自定义消息） -->
   *   <AdvButtonAnt confirm confirmNotice="确定要删除这条数据吗？" onClick="handleDelete">删除</AdvButtonAnt>
   * </template>
   */

  import { useAdvButton, propsConfig } from '../common/index.js';
  import { useRoute } from 'vue-router';
  // UI 能力门面：由 vite.config.js 的 @ui-kit 别名按 VITE_UI_LIB 指向 ele.js 或 ant.js。
  // antd 的 Modal.confirm 适配为 Promise 的逻辑已收敛到 @/ui/ant.js，本文件不再自行实现，
  // 也无需再显式依赖 ant-design-vue
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

  /**
   * 使用按钮 Hook，获取加载状态和点击处理函数
   * 注入 UI 门面提供的确认弹窗与警告提示方法
   */
  const { isLoading, throttleClick } = useAdvButton(
    props,
    attrs,
    route,
    ui.confirm,
    ui.message.warning
  );
</script>
