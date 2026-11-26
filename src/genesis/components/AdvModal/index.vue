<template>
  <!-- AdvModal 高级弹窗组件入口：单弹窗实现，转发配置与插槽到 core/ele/item.jsx -->
  <ModalItem
    ref="modalItemRef"
    :config="config"
    v-bind="$attrs"
    @modalOpen="(payload) => emit('modalOpen', payload)"
    @modalClose="(payload) => emit('modalClose', payload)"
    @reloadList="() => emit('reloadList')"
  >
    <!-- 插槽全量透传：content / footer / form-* -->
    <template
      v-for="(_, slotName) in $slots"
      #[slotName]="slotProps"
    >
      <slot
        :name="slotName"
        v-bind="slotProps || {}"
      />
    </template>
  </ModalItem>
</template>

<script setup>
  /**
   * AdvModal 高级弹窗组件（单弹窗）
   *
   * 【组件功能】
   * 对 core/ele/item.jsx 的薄封装：接收单个弹窗配置 config，
   * 向父组件暴露 openModal / closeModal / getBindData，并透传插槽与事件。
   *
   * 【Props 属性】
   * | 属性名 | 类型 | 必填 | 说明 |
   * |--------|------|------|------|
   * | config | Object | 是 | 单个弹窗配置对象（title / form / okButton / cancelButton 等） |
   *
   * 【事件】
   * | 事件名 | 说明 |
   * |--------|------|
   * | modalOpen | 弹窗打开时触发 |
   * | modalClose | 弹窗关闭时触发 |
   * | reloadList | 弹窗请求刷新列表时触发 |
   *
   * 【暴露方法】
   * | 方法名 | 说明 |
   * |--------|------|
   * | openModal | 打开弹窗 |
   * | closeModal | 关闭弹窗 |
   * | getBindData | 获取弹窗数据 |
   */
  import { ref } from 'vue';
  import ModalItem from './core/ele/item.jsx';
  import { useForwardExpose } from '@common/utils/forwardExpose';

  defineOptions({
    name: 'adv-modal',
    inheritAttrs: false,
  });

  defineProps({
    /**
     * 单个弹窗配置对象
     */
    config: {
      type: Object,
      required: true,
    },
  });

  const emit = defineEmits(['modalOpen', 'modalClose', 'reloadList']);

  // 内部弹窗项组件引用，用于向父组件转发操作方法
  const modalItemRef = ref(null);

  /**
   * 暴露弹窗操作方法给父组件
   * 由 useForwardExpose 代理转发到 ModalItem 实例，后续新增方法无需在此同步
   */
  defineExpose(useForwardExpose(modalItemRef));
</script>
