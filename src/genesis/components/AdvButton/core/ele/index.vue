<template>
  <!-- 高级按钮组件 -->
  <!-- 根据权限控制显示，支持节流点击和异步加载状态 -->
  <el-button
    v-bind="_attrs"
    :loading="isLoading"
    @click="throttleClick"
  >
    <!-- 插槽透传：将所有插槽内容透传给 el-button -->
    <template
      v-for="(_, slotName) in $slots"
      #[slotName]="slotProps"
    >
      <slot
        :name="slotName"
        v-bind="slotProps || {}"
      />
    </template>
  </el-button>
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
   * | confirm | Boolean | 是否需要确认弹窗，为 true 时点击后先弹出确认对话框 |
   * | confirmMsg | String | 确认弹窗的提示消息，默认值为"是否确认执行此操作？" |
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
   *   <!-- 确认弹窗（自定义消息） -->
   *   <AdvButton confirm confirmMsg="确定要删除这条数据吗？" onClick="handleDelete">删除</AdvButton>
   * </template>
   */

  import { useAdvButton, propsConfig } from '../common/index.js';
  import { useRoute } from 'vue-router';
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

  /**
   * 使用按钮 Hook，获取显示状态、加载状态和点击处理函数
   */
  const { isLoading, throttleClick } = useAdvButton(
    props,
    attrs,
    route,
    ui.confirm,
    ui.message.warning
  );
</script>
