<template>
  <AdvModal
    v-bind="$attrs"
    :close-on-click-modal="false"
    ref="advModalCoreRef"
  >
    <!-- 将所有非 modal-*-footer 的插槽透传 -->
    <template
      v-for="(_, slotName) in $slots"
      :key="slotName"
      #[slotName]="slotProps"
    >
      <slot
        :name="slotName"
        v-bind="slotProps || {}"
      ></slot>
    </template>
  </AdvModal>
</template>

<script setup>
  import AdvModal from '@common/components/AdvModal';
  import { useForwardExpose } from '@common/utils/forwardExpose';
  /**
   * 核心弹窗组件引用
   */
  const advModalCoreRef = shallowRef(null);

  /**
   * 暴露给父组件的方法
   * 由 useForwardExpose 代理转发到 AdvModal 实例，
   * 应用层后续要追加自有方法时，通过第二个参数传入：useForwardExpose(ref, { ownMethod })
   */
  defineExpose(useForwardExpose(advModalCoreRef));
</script>
