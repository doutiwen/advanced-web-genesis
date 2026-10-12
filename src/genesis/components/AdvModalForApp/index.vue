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
  import AdvModal from '@/components/AdvModal/index.js';
  /**
   * 核心弹窗组件引用
   */
  const advModalCoreRef = shallowRef(null);

  /**
   * 暴露给父组件的方法
   */
  defineExpose({
    openModal: (...args) => advModalCoreRef.value?.openModal(...args),
    closeModal: (...args) => advModalCoreRef.value?.closeModal(...args),
    getModalData: (key) => advModalCoreRef.value?.getModalData(key),
  });
</script>
