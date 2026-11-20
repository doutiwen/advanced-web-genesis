<template>
  <!-- 高级按钮组件 -->
  <!-- 根据权限控制显示，支持节流点击和异步加载状态 -->
  <a-button
    v-bind="_attrs"
    :loading="isLoading || _attrs.loading"
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
   * | confirm | Boolean \| Object | 再次确认配置；true 用默认值，对象支持 title/notice/okText/cancelText/type/attrs/beforeConfirm |
   * | download | String \| Blob \| Object | 下载配置；传入后点击执行下载，不再执行 onClick |
   *
   * 【confirm 配置】
   * 与 ele 版完全一致（见 core/common/index.js 的 confirmDefaults），
   * 其中 attrs 的 Element Plus 选项名由 ui/ant.js 映射为 antd 选项名。
   *
   * 【与 ele 版的差异】
   * modal 弹窗能力目前仅 ele 版实现（AdvModal 依赖 element-plus），ant 版不接入。
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
   *   <!-- 确认弹窗（自定义配置） -->
   *   <AdvButtonAnt :confirm="{ notice: '确定要删除这条数据吗？' }" onClick="handleDelete">删除</AdvButtonAnt>
   *
   *   <!-- 下载：直链或二进制数据，组件内不发起请求 -->
   *   <AdvButtonAnt download="/static/template.xlsx">下载模板</AdvButtonAnt>
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
   * 注入 UI 门面，确认弹窗与提示方法由 hook 内部按需取用
   */
  const { isLoading, throttleClick } = useAdvButton(props, attrs, route, ui);
</script>
