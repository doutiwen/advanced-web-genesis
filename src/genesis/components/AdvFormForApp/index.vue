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
  import AdvForm from '@common/components/AdvForm';
  import { computed, shallowRef, useCssModule } from 'vue';
  import { useForwardExpose } from '@common/utils/forwardExpose';

  /**
   * 核心表单组件引用
   */
  const advFormCoreRef = shallowRef(null);

  /**
   * 暴露给父组件的方法
   * 由 useForwardExpose 代理转发到 AdvForm 实例（含只读的 formData），
   * 应用层后续要追加自有方法时，通过第二个参数传入：useForwardExpose(ref, { ownMethod })
   */
  defineExpose(useForwardExpose(advFormCoreRef));
</script>
