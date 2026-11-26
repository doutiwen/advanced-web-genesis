import { createPinia, defineStore } from 'pinia';

// 基础 store：当前项目只保留一个 data 属性，后续按需扩展
export const useStore = defineStore('store', {
  state: () => ({
    data: null,
  }),
});

const pinia = createPinia();

export default pinia;
