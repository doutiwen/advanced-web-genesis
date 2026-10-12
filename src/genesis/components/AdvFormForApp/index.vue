<template>
  <AdvForm
    v-bind="$attrs"
    ref="advFormCoreRef"
  >
    <!-- 将所有插槽透传 -->
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
  </AdvForm>
</template>

<script setup>
  import AdvForm from '@/components/AdvForm/index.js';
  import { computed, shallowRef, useCssModule } from 'vue';

  /**
   * 核心表单组件引用
   */
  const advFormCoreRef = shallowRef(null);

  /**
   * 暴露给父组件的方法
   */
  defineExpose({
    submit: (...args) => advFormCoreRef.value?.submit(...args),
    clearFormData: (...args) => advFormCoreRef.value?.clearFormData(...args),
    setFormData: (...args) => advFormCoreRef.value?.setFormData(...args),
  });
</script>
